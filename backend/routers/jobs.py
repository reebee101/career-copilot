from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from models.database import get_db, JobPosting, AsyncSessionLocal
from services.scheduler import fetch_and_store_jobs
from datetime import datetime

router = APIRouter()


@router.get("/")
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    remote_only: bool = False,
    country: str = None,
    limit: int = Query(100, le=200),
    offset: int = 0,
):
    # Always exclude demo jobs
    q = (select(JobPosting)
         .where(JobPosting.source != "demo")
         .order_by(desc(JobPosting.fetched_at))
         .limit(limit).offset(offset))
    if remote_only:
        q = q.where(JobPosting.remote == True)
    if country:
        q = q.where(JobPosting.location.ilike(f"%{country}%"))

    result = await db.execute(q)
    jobs = result.scalars().all()

    # DB empty or only demos — fetch real jobs now
    if not jobs:
        await fetch_and_store_jobs()
        result = await db.execute(q)
        jobs = result.scalars().all()

    return [_serialize(j) for j in jobs]


@router.delete("/clear-demos")
async def clear_demos():
    """Remove all demo jobs from the database."""
    async with AsyncSessionLocal() as db:
        await db.execute(delete(JobPosting).where(JobPosting.source == "demo"))
        await db.commit()
    return {"message": "Demo jobs cleared"}


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


def _serialize(j: JobPosting) -> dict:
    loc = (j.location or "").lower()
    is_egypt = any(x in loc for x in ["egypt", "cairo", "alexandria", "giza"])
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
        "country": "eg" if (is_egypt or j.source == "wuzzuf") else "remote" if j.remote else "",
    }
