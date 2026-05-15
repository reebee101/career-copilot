from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.database import get_db, Application, CVProfile
from services.apply_service import auto_apply
from services.cv_service import score_cv_against_jd, generate_full_cover_letter
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from collections import Counter
import os
import json

router = APIRouter()


class CreateApplicationRequest(BaseModel):
    session_id: str
    company: str
    role: str
    apply_url: str = ""
    jd_text: str = ""
    job_id: Optional[int] = None


class UpdateStatusRequest(BaseModel):
    status: str
    notes: str = ""
    rejection_reason: str = ""
    rejection_stage: str = ""
    rejection_feedback: str = ""


class AutoApplyRequest(BaseModel):
    session_id: str
    application_id: int
    phone: str = ""
    linkedin_url: str = ""


@router.get("/")
async def list_applications(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Application)
        .where(Application.session_id == session_id)
        .order_by(Application.created_at.desc())
    )
    apps = result.scalars().all()
    return [_serialize(a) for a in apps]


@router.post("/")
async def create_application(req: CreateApplicationRequest, db: AsyncSession = Depends(get_db)):
    """Create application — optionally scores CV against JD and generates cover letter."""
    # Get CV
    cv_result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = cv_result.scalar_one_or_none()

    missing_keywords = []
    tailored_bullets = []
    cover_letter = ""
    match_score = 0.0
    cv_score = 0.0

    if profile and req.jd_text:
        try:
            scoring = await score_cv_against_jd(profile.raw_text, req.jd_text)
            match_score = scoring.get("match_score", 0)
            missing_keywords = scoring.get("missing_keywords", [])
            tailored_bullets = scoring.get("tailored_bullets", [])

            cover_letter_data = await generate_full_cover_letter(
                profile.raw_text, req.jd_text, req.company, req.role
            )
            cover_letter = cover_letter_data
        except Exception as e:
            print(f"Scoring error: {e}")

        cv_score = profile.ats_score

    app = Application(
        session_id=req.session_id,
        company=req.company,
        role=req.role,
        apply_url=req.apply_url,
        jd_text=req.jd_text,
        status="saved",
        match_score=match_score,
        cv_score=cv_score,
        missing_keywords=missing_keywords,
        tailored_bullets=tailored_bullets,
        cover_letter=cover_letter,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return _serialize(app)


@router.patch("/{app_id}/status")
async def update_status(app_id: int, req: UpdateStatusRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    valid_statuses = ["saved", "applied", "interview", "offer", "rejected"]
    if req.status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")

    app.status = req.status
    app.notes = req.notes or app.notes
    if req.status == "applied" and not app.applied_at:
        app.applied_at = datetime.utcnow()
    
    # Handle rejection data
    if req.status == "rejected":
        app.rejection_reason = req.rejection_reason
        app.rejection_stage = req.rejection_stage
        app.rejection_feedback = req.rejection_feedback
        
        # Generate AI insights for rejection
        if app.jd_text:
            try:
                insights = await _generate_rejection_insights(app, db)
                app.ai_insights = insights
            except Exception as e:
                print(f"Error generating rejection insights: {e}")
    
    app.updated_at = datetime.utcnow()

    await db.commit()
    return _serialize(app)


@router.delete("/{app_id}")
async def delete_application(app_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    await db.delete(app)
    await db.commit()
    return {"deleted": True}


@router.post("/auto-apply")
async def trigger_auto_apply(
    req: AutoApplyRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger auto-apply for a saved application."""
    app_result = await db.execute(select(Application).where(Application.id == req.application_id))
    app = app_result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    if app.auto_applied:
        raise HTTPException(400, "Already auto-applied to this position")

    if not app.apply_url:
        raise HTTPException(400, "No apply URL set for this application")

    cv_result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = cv_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "CV not found. Upload your CV first.")

    # Save CV to temp file for Playwright
    import tempfile, os
    cv_path = None
    if profile.raw_text:
        tmp = tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w")
        tmp.write(profile.raw_text)
        tmp.close()
        cv_path = tmp.name

    name_parts = profile.name.split() if profile.name else ["", ""]
    candidate = {
        "name": profile.name,
        "first_name": name_parts[0] if name_parts else "",
        "last_name": name_parts[-1] if len(name_parts) > 1 else "",
        "email": profile.email,
        "phone": req.phone,
        "linkedin_url": req.linkedin_url,
    }

    async def do_apply():
        result = await auto_apply(app.apply_url, cv_path, app.cover_letter, candidate)
        async with db.begin():
            if result.success:
                app.auto_applied = True
                app.status = "applied"
                app.applied_at = datetime.utcnow()
                app.notes = (app.notes or "") + f"\nAuto-applied: {result.message}"
            else:
                app.notes = (app.notes or "") + f"\nAuto-apply failed: {result.message}"
            app.updated_at = datetime.utcnow()
        if cv_path and os.path.exists(cv_path):
            os.unlink(cv_path)

    background_tasks.add_task(do_apply)
    return {"message": "Auto-apply started in background. Check application status shortly."}


@router.get("/rejection-insights/{session_id}")
async def get_rejection_insights(session_id: str, db: AsyncSession = Depends(get_db)):
    """Analyze all rejections and provide actionable insights."""
    # Get all rejected applications
    result = await db.execute(
        select(Application)
        .where(Application.session_id == session_id, Application.status == "rejected")
        .order_by(Application.created_at.desc())
    )
    rejections = result.scalars().all()
    
    if not rejections:
        return {
            "total_rejections": 0,
            "insights": [],
            "patterns": {},
            "recommendations": []
        }
    
    # Analyze patterns
    rejection_stages = [r.rejection_stage for r in rejections if r.rejection_stage]
    rejection_reasons = [r.rejection_reason for r in rejections if r.rejection_reason]
    
    stage_counts = Counter(rejection_stages)
    reason_counts = Counter(rejection_reasons)
    
    # Common missing keywords across rejections
    all_missing_keywords = []
    for r in rejections:
        all_missing_keywords.extend(r.missing_keywords)
    keyword_counts = Counter(all_missing_keywords)
    
    # Calculate metrics
    avg_match_score = sum(r.match_score for r in rejections) / len(rejections) if rejections else 0
    avg_cv_score = sum(r.cv_score for r in rejections) / len(rejections) if rejections else 0
    
    # Generate insights
    insights = []
    
    # Stage analysis
    if stage_counts:
        most_common_stage = stage_counts.most_common(1)[0]
        insights.append({
            "type": "stage_pattern",
            "severity": "high" if most_common_stage[1] > len(rejections) * 0.5 else "medium",
            "title": f"Most rejections at {most_common_stage[0]} stage",
            "description": f"{most_common_stage[1]} out of {len(rejections)} rejections occurred during {most_common_stage[0]}",
            "recommendation": _get_stage_recommendation(most_common_stage[0])
        })
    
    # Keyword analysis
    if keyword_counts:
        top_missing = keyword_counts.most_common(3)
        insights.append({
            "type": "missing_keywords",
            "severity": "high",
            "title": "Frequently missing keywords",
            "description": f"These keywords appear in {len([k for k in top_missing if k[1] > 1])} rejected applications",
            "keywords": [k[0] for k in top_missing],
            "recommendation": f"Add these skills to your CV: {', '.join([k[0] for k in top_missing[:3]])}"
        })
    
    # Score analysis
    if avg_match_score < 70:
        insights.append({
            "type": "low_match_score",
            "severity": "critical",
            "title": "Low average match score",
            "description": f"Your average match score for rejected applications is {avg_match_score:.1f}%",
            "recommendation": "Tailor your CV more specifically to each job description before applying"
        })
    
    if avg_cv_score < 75:
        insights.append({
            "type": "low_cv_score",
            "severity": "high",
            "title": "CV needs improvement",
            "description": f"Your CV ATS score averages {avg_cv_score:.1f} for rejected applications",
            "recommendation": "Use the CV editor to improve your ATS score before applying to more jobs"
        })
    
    # AI insights from individual rejections
    ai_insights = []
    for r in rejections:
        if r.ai_insights:
            ai_insights.append({
                "company": r.company,
                "role": r.role,
                "insights": r.ai_insights
            })
    
    return {
        "total_rejections": len(rejections),
        "insights": insights,
        "patterns": {
            "stages": dict(stage_counts),
            "reasons": dict(reason_counts),
            "top_missing_keywords": [{"keyword": k, "count": c} for k, c in keyword_counts.most_common(10)],
            "avg_match_score": round(avg_match_score, 1),
            "avg_cv_score": round(avg_cv_score, 1),
        },
        "recommendations": _generate_recommendations(insights, rejections),
        "detailed_rejections": ai_insights[:5]  # Top 5 most recent with AI insights
    }


def _get_stage_recommendation(stage: str) -> str:
    """Get recommendation based on rejection stage."""
    recommendations = {
        "screening": "Your CV may not be passing ATS screening. Focus on adding relevant keywords and improving your ATS score.",
        "phone_screen": "Practice your elevator pitch and ensure you can clearly articulate your experience in 2-3 minutes.",
        "technical": "Strengthen your technical skills. Consider taking courses or building projects in areas where you're weak.",
        "behavioral": "Prepare better STAR (Situation, Task, Action, Result) stories. Practice common behavioral questions.",
        "final": "You're getting close! Focus on cultural fit, asking insightful questions, and showing enthusiasm.",
        "offer": "Negotiate better or reconsider your requirements. You're clearly qualified but something in the final stage isn't working."
    }
    return recommendations.get(stage, "Review your application strategy and consider getting feedback from mentors.")


def _generate_recommendations(insights: List[dict], rejections: List[Application]) -> List[str]:
    """Generate actionable recommendations based on insights."""
    recommendations = []
    
    # Check for patterns
    if len(rejections) > 5:
        recommendations.append("You've had multiple rejections. Consider taking a break to revamp your CV and application strategy.")
    
    # Check for low scores
    low_match = any(i["type"] == "low_match_score" for i in insights)
    if low_match:
        recommendations.append("Create custom CV versions for different job types instead of using one generic CV.")
    
    # Check for missing keywords
    missing_kw = any(i["type"] == "missing_keywords" for i in insights)
    if missing_kw:
        recommendations.append("Use the Projects feature to build portfolio items that demonstrate the missing skills.")
    
    # Check for stage patterns
    stage_pattern = next((i for i in insights if i["type"] == "stage_pattern"), None)
    if stage_pattern and stage_pattern["severity"] == "high":
        recommendations.append(f"Focus on improving your {stage_pattern['title'].split()[-2]} stage performance.")
    
    if not recommendations:
        recommendations.append("Keep applying and learning from each rejection. Track feedback carefully.")
    
    return recommendations


async def _generate_rejection_insights(app: Application, db: AsyncSession) -> dict:
    """Generate AI-powered insights for a specific rejection."""
    from services.cv_service import client as groq_client
    
    # Get CV profile
    cv_result = await db.execute(select(CVProfile).where(CVProfile.session_id == app.session_id))
    profile = cv_result.scalar_one_or_none()
    
    if not profile or not app.jd_text:
        return {}
    
    try:
        
        prompt = f"""Analyze this job application rejection and provide insights:

Company: {app.company}
Role: {app.role}
Rejection Stage: {app.rejection_stage or 'Unknown'}
Rejection Reason: {app.rejection_reason or 'Not specified'}
Feedback Received: {app.rejection_feedback or 'None'}

CV Match Score: {app.match_score}%
Missing Keywords: {', '.join(app.missing_keywords[:10])}

Job Description (excerpt):
{app.jd_text[:500]}...

Provide a JSON response with:
1. "likely_reason": Most likely reason for rejection (1 sentence)
2. "skill_gaps": List of 3-5 specific skills to develop
3. "cv_improvements": List of 3 specific CV improvements
4. "next_steps": List of 3 actionable next steps

Keep it concise and actionable."""

        response = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        
        # Try to parse as JSON
        try:
            # Remove markdown code blocks if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            insights = json.loads(content.strip())
        except:
            # Fallback to text parsing
            insights = {"raw_analysis": content}
        
        return insights
        
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        return {"error": str(e)}


def _serialize(a: Application) -> dict:
    return {
        "id": a.id,
        "company": a.company,
        "role": a.role,
        "apply_url": a.apply_url,
        "jd_text": a.jd_text,
        "status": a.status,
        "match_score": a.match_score,
        "cv_score": a.cv_score,
        "missing_keywords": a.missing_keywords,
        "tailored_bullets": a.tailored_bullets,
        "cover_letter": a.cover_letter,
        "notes": a.notes,
        "auto_applied": a.auto_applied,
        "rejection_reason": a.rejection_reason,
        "rejection_stage": a.rejection_stage,
        "rejection_feedback": a.rejection_feedback,
        "ai_insights": a.ai_insights,
        "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }
