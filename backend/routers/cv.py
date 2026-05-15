from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, CVProfile, CVVersion
from services.cv_service import extract_cv_text, analyze_cv, score_cv_against_jd, generate_full_cover_letter, generate_interview_prep
from pydantic import BaseModel
import uuid

router = APIRouter()


class JDScoreRequest(BaseModel):
    session_id: str
    jd_text: str
    company: str = ""
    role: str = ""


class CoverLetterRequest(BaseModel):
    session_id: str
    jd_text: str
    company: str
    role: str


class InterviewPrepRequest(BaseModel):
    session_id: str
    role: str
    company: str = ""


@router.post("/upload")
async def upload_cv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a CV (PDF or DOCX), extract text, run full analysis."""
    if not file.filename.lower().endswith((".pdf", ".docx", ".doc", ".txt")):
        raise HTTPException(400, "Unsupported file type. Upload PDF, DOCX, or TXT.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 5MB.")

    try:
        cv_text = extract_cv_text(content, file.filename)
    except Exception as e:
        raise HTTPException(422, f"Could not parse file: {e}")

    if len(cv_text.strip()) < 100:
        raise HTTPException(422, "CV appears empty or unreadable.")

    analysis = await analyze_cv(cv_text)
    session_id = str(uuid.uuid4())

    profile = CVProfile(
        session_id=session_id,
        name=analysis.get("name", ""),
        email=analysis.get("email", ""),
        raw_text=cv_text,
        analysis=analysis,
        ats_score=analysis.get("ats_score", 0),
    )
    db.add(profile)
    await db.commit()

    return {
        "session_id": session_id,
        "name": profile.name,
        "ats_score": profile.ats_score,
        "analysis": analysis,
    }


@router.get("/profile/{session_id}")
async def get_profile(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found. Please upload your CV.")
    return {"session_id": session_id, "name": profile.name, "ats_score": profile.ats_score, "analysis": profile.analysis}


@router.post("/score-against-jd")
async def score_against_jd(req: JDScoreRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found.")

    scoring = await score_cv_against_jd(profile.raw_text, req.jd_text)
    return scoring


@router.post("/cover-letter")
async def cover_letter(req: CoverLetterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found.")

    letter = await generate_full_cover_letter(profile.raw_text, req.jd_text, req.company, req.role)
    return {"cover_letter": letter}


@router.post("/interview-prep")
async def interview_prep(req: InterviewPrepRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found.")

    questions = await generate_interview_prep(profile.raw_text, req.role, req.company)
    return {"questions": questions}


@router.get("/raw/{session_id}")
async def get_raw_cv(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found.")
    return {"session_id": session_id, "raw_text": profile.raw_text}


class EditCVRequest(BaseModel):
    session_id: str
    raw_text: str


@router.put("/edit")
async def edit_cv(req: EditCVRequest, db: AsyncSession = Depends(get_db)):
    if len(req.raw_text.strip()) < 100:
        raise HTTPException(400, "CV text too short.")

    result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found.")

    # Re-run full analysis on edited text
    analysis = await analyze_cv(req.raw_text)
    
    # Get current version number
    version_result = await db.execute(
        select(CVVersion)
        .where(CVVersion.session_id == req.session_id)
        .order_by(CVVersion.version_number.desc())
    )
    last_version = version_result.scalars().first()
    next_version = (last_version.version_number + 1) if last_version else 1
    
    # Calculate changes
    old_words = len(profile.raw_text.split())
    new_words = len(req.raw_text.split())
    word_diff = new_words - old_words
    score_diff = analysis.get("ats_score", 0) - profile.ats_score
    
    change_summary = f"Score: {score_diff:+.0f} | Words: {word_diff:+d}"
    
    # Save version
    version = CVVersion(
        session_id=req.session_id,
        version_number=next_version,
        raw_text=req.raw_text,
        analysis=analysis,
        ats_score=analysis.get("ats_score", 0),
        word_count=new_words,
        change_summary=change_summary
    )
    db.add(version)

    # Update profile
    profile.raw_text = req.raw_text
    profile.analysis = analysis
    profile.ats_score = analysis.get("ats_score", 0)
    profile.name = analysis.get("name", profile.name)

    await db.commit()
    await db.refresh(profile)

    return {
        "session_id": profile.session_id,
        "name": profile.name,
        "ats_score": profile.ats_score,
        "analysis": analysis,
        "version_number": next_version,
    }


@router.get("/download/{session_id}")
async def download_cv(session_id: str, db: AsyncSession = Depends(get_db)):
    """Download current CV as a text file."""
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found.")
    
    # Create filename from name or use default
    filename = f"{profile.name.replace(' ', '_')}_CV.txt" if profile.name else "CV.txt"
    
    return Response(
        content=profile.raw_text,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/versions/{session_id}")
async def get_cv_versions(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get all CV versions for analytics dashboard."""
    result = await db.execute(
        select(CVVersion)
        .where(CVVersion.session_id == session_id)
        .order_by(CVVersion.created_at.desc())
    )
    versions = result.scalars().all()
    
    return {
        "versions": [
            {
                "id": v.id,
                "version_number": v.version_number,
                "ats_score": v.ats_score,
                "word_count": v.word_count,
                "change_summary": v.change_summary,
                "created_at": v.created_at.isoformat(),
                "skills_count": len(v.analysis.get("skills", [])) if v.analysis else 0,
                "experience_years": v.analysis.get("experience_years", 0) if v.analysis else 0,
            }
            for v in versions
        ]
    }


@router.get("/versions/{session_id}/{version_id}")
async def get_cv_version_detail(session_id: str, version_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed information for a specific CV version."""
    result = await db.execute(
        select(CVVersion)
        .where(CVVersion.session_id == session_id, CVVersion.id == version_id)
    )
    version = result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(404, "Version not found.")
    
    return {
        "id": version.id,
        "version_number": version.version_number,
        "raw_text": version.raw_text,
        "analysis": version.analysis,
        "ats_score": version.ats_score,
        "word_count": version.word_count,
        "change_summary": version.change_summary,
        "created_at": version.created_at.isoformat(),
    }


@router.get("/versions/{session_id}/{version_id}/download")
async def download_cv_version(session_id: str, version_id: int, db: AsyncSession = Depends(get_db)):
    """Download a specific CV version."""
    result = await db.execute(
        select(CVVersion)
        .where(CVVersion.session_id == session_id, CVVersion.id == version_id)
    )
    version = result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(404, "Version not found.")
    
    # Get profile for name
    profile_result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
    profile = profile_result.scalar_one_or_none()
    name = profile.name if profile else "CV"
    
    filename = f"{name.replace(' ', '_')}_v{version.version_number}.txt"
    
    return Response(
        content=version.raw_text,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/analytics/{session_id}")
async def get_cv_analytics(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get comprehensive analytics for CV version history."""
    # Get all versions
    result = await db.execute(
        select(CVVersion)
        .where(CVVersion.session_id == session_id)
        .order_by(CVVersion.created_at.asc())
    )
    versions = result.scalars().all()
    
    if not versions:
        raise HTTPException(404, "No versions found for this session.")
    
    # Calculate analytics
    timeline = []
    ats_scores = []
    word_counts = []
    skills_progression = []
    
    for v in versions:
        timeline.append({
            "version": v.version_number,
            "date": v.created_at.isoformat(),
            "change": v.change_summary,
        })
        
        ats_scores.append({
            "version": v.version_number,
            "score": v.ats_score,
            "date": v.created_at.isoformat(),
        })
        
        word_counts.append({
            "version": v.version_number,
            "count": v.word_count,
            "date": v.created_at.isoformat(),
        })
        
        skills_count = len(v.analysis.get("skills", [])) if v.analysis else 0
        skills_progression.append({
            "version": v.version_number,
            "count": skills_count,
            "date": v.created_at.isoformat(),
        })
    
    # Calculate improvements
    first_version = versions[0]
    latest_version = versions[-1]
    
    ats_improvement = latest_version.ats_score - first_version.ats_score
    word_change = latest_version.word_count - first_version.word_count
    
    first_skills = len(first_version.analysis.get("skills", [])) if first_version.analysis else 0
    latest_skills = len(latest_version.analysis.get("skills", [])) if latest_version.analysis else 0
    skills_change = latest_skills - first_skills
    
    return {
        "summary": {
            "total_versions": len(versions),
            "first_version_date": first_version.created_at.isoformat(),
            "latest_version_date": latest_version.created_at.isoformat(),
            "current_ats_score": latest_version.ats_score,
            "ats_improvement": round(ats_improvement, 1),
            "current_word_count": latest_version.word_count,
            "word_count_change": word_change,
            "current_skills_count": latest_skills,
            "skills_added": skills_change,
        },
        "timeline": timeline,
        "charts": {
            "ats_scores": ats_scores,
            "word_counts": word_counts,
            "skills_progression": skills_progression,
        }
    }
