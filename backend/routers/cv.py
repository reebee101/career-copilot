from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, CVProfile
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
    }
