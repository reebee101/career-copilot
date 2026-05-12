from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, Application, CVProfile
from services.apply_service import auto_apply
from services.cv_service import score_cv_against_jd, generate_full_cover_letter
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import os

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


def _serialize(a: Application) -> dict:
    return {
        "id": a.id,
        "company": a.company,
        "role": a.role,
        "apply_url": a.apply_url,
        "status": a.status,
        "match_score": a.match_score,
        "cv_score": a.cv_score,
        "missing_keywords": a.missing_keywords,
        "tailored_bullets": a.tailored_bullets,
        "cover_letter": a.cover_letter,
        "notes": a.notes,
        "auto_applied": a.auto_applied,
        "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }
