from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete, or_, func, and_
from models.database import get_db, JobPosting, CVProfile, AsyncSessionLocal
from services.scheduler import fetch_and_store_jobs
from services.recommendation_service import rank_jobs_by_cv, get_personalized_job_insights
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Strict Egypt city terms — no short strings that could false-match
EG_TERMS = ["egypt", "cairo", "alexandria", "giza", "hurghada",
            "luxor", "mansoura", "tanta", "maadi", "zamalek",
            "heliopolis", "nasr city", "new cairo", "6th of october"]


def _eg_filter():
    """Match jobs that are genuinely Egyptian — strict to avoid false positives."""
    return or_(
        JobPosting.source == "wuzzuf",
        and_(JobPosting.country != None, JobPosting.country != "",
             JobPosting.country.in_(["eg", "egy", "egypt"])),
        *[JobPosting.location.ilike(f"%{t}%") for t in EG_TERMS]
    )


@router.get("/")
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    remote_only: bool = False,
    country: str = None,
    limit: int = Query(200, le=500),
    offset: int = 0,
    session_id: str = None,
):
    """
    List jobs with optional AI-powered ranking.
    If session_id is provided, jobs are ranked by CV match.
    """
    total = (await db.execute(select(func.count()).select_from(JobPosting))).scalar()
    if total == 0:
        logger.info("Job database empty, fetching jobs...")
        await fetch_and_store_jobs()

    q = select(JobPosting).order_by(desc(JobPosting.fetched_at)).limit(limit).offset(offset)

    if remote_only:
        q = q.where(JobPosting.remote == True)
    elif country and country.lower() in ("egypt", "eg"):
        q = q.where(_eg_filter())

    result = await db.execute(q)
    jobs = result.scalars().all()

    if not jobs and country and country.lower() in ("egypt", "eg"):
        logger.info("No Egypt jobs found, re-fetching...")
        await fetch_and_store_jobs()
        result = await db.execute(q)
        jobs = result.scalars().all()

    serialized_jobs = [_serialize(j) for j in jobs]
    
    # AI-powered ranking if session_id provided
    if session_id:
        try:
            cv_result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
            profile = cv_result.scalar_one_or_none()
            
            if profile and profile.raw_text:
                logger.info(f"Ranking {len(serialized_jobs)} jobs for session {session_id}")
                serialized_jobs = await rank_jobs_by_cv(profile.raw_text, serialized_jobs, top_n=limit)
                logger.info(f"Jobs ranked, top match score: {serialized_jobs[0].get('match_score', 0) if serialized_jobs else 0}")
        except Exception as e:
            logger.error(f"Error ranking jobs: {e}")
            # Continue with unranked jobs

    return serialized_jobs


@router.delete("/clear-demos")
async def clear_demos(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(JobPosting).where(JobPosting.source == "demo"))
    await db.commit()
    return {"message": "Demo jobs cleared"}


@router.delete("/clear-all")
async def clear_all_jobs(db: AsyncSession = Depends(get_db)):
    """Wipe all cached jobs so they re-fetch fresh with correct country tags."""
    await db.execute(delete(JobPosting))
    await db.commit()
    return {"message": "All jobs cleared — will re-fetch on next load"}


@router.get("/refresh")
async def refresh_jobs(background_tasks: BackgroundTasks, cv_skills: str = Query(None)):
    skills = [s.strip() for s in cv_skills.split(",")] if cv_skills else None
    background_tasks.add_task(fetch_and_store_jobs, skills)
    return {"message": "Job refresh started"}


@router.get("/refresh-sync")
async def refresh_jobs_sync(cv_skills: str = Query(None)):
    skills = [s.strip() for s in cv_skills.split(",")] if cv_skills else None
    count = await fetch_and_store_jobs(skills)
    return {"message": f"Fetched {count} new jobs", "count": count}


@router.get("/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        from fastapi import HTTPException
        raise HTTPException(404, "Job not found")
    return _serialize(job)


@router.get("/recommended/{session_id}")
async def get_recommended_jobs(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, le=50),
):
    """
    Get AI-ranked job recommendations based on CV.
    Returns top matching jobs with match scores and reasons.
    """
    # Get CV
    cv_result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
    profile = cv_result.scalar_one_or_none()
    
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(404, "CV not found. Please upload your CV first.")
    
    # Get all jobs
    result = await db.execute(
        select(JobPosting)
        .order_by(desc(JobPosting.fetched_at))
        .limit(200)  # Get more jobs for better ranking
    )
    jobs = result.scalars().all()
    
    if not jobs:
        logger.info("No jobs available, fetching...")
        await fetch_and_store_jobs()
        result = await db.execute(
            select(JobPosting)
            .order_by(desc(JobPosting.fetched_at))
            .limit(200)
        )
        jobs = result.scalars().all()
    
    # Serialize and rank
    serialized_jobs = [_serialize(j) for j in jobs]
    ranked_jobs = await rank_jobs_by_cv(profile.raw_text, serialized_jobs, top_n=limit)
    
    return {
        "total": len(ranked_jobs),
        "jobs": ranked_jobs,
        "message": f"Top {len(ranked_jobs)} jobs ranked by AI based on your CV"
    }


@router.get("/{job_id}/insights")
async def get_job_insights(
    job_id: int,
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed AI insights on why a specific job matches your CV.
    """
    # Get job
    job_result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = job_result.scalar_one_or_none()
    
    if not job:
        from fastapi import HTTPException
        raise HTTPException(404, "Job not found")
    
    # Get CV
    cv_result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
    profile = cv_result.scalar_one_or_none()
    
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(404, "CV not found. Please upload your CV first.")
    
    # Get insights
    serialized_job = _serialize(job)
    insights = await get_personalized_job_insights(profile.raw_text, serialized_job)
    
    return {
        "job": serialized_job,
        "insights": insights
    }


def _serialize(j: JobPosting) -> dict:
    loc = (j.location or "").lower()
    ctr = (getattr(j, "country", "") or "").lower().strip()
    src = (j.source or "").lower()

    # Determine if genuinely Egyptian
    is_eg = (
        src == "wuzzuf" or
        ctr in ("eg", "egy", "egypt") or
        any(t in loc for t in EG_TERMS)
    )

    return {
        "id": j.id,
        "external_id": j.external_id,
        "title": j.title,
        "company": j.company,
        "location": j.location,
        "description": j.description[:500] + "..." if len(j.description or "") > 500 else j.description,
        "description_full": j.description,
        "apply_url": j.apply_url,
        "source": j.source,
        "salary_min": j.salary_min,
        "salary_max": j.salary_max,
        "remote": j.remote,
        "posted_at": j.posted_at.isoformat() if j.posted_at else None,
        "country": "eg" if is_eg else ("remote" if j.remote else "worldwide"),
    }
