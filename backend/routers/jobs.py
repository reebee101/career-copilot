from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models.database import get_db, JobPosting
from services.job_service import search_jobs_adzuna
from services.scheduler import fetch_and_store_jobs
from datetime import datetime

router = APIRouter()


@router.get("/")
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    remote_only: bool = False,
    country: str = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
):
    """List all fetched jobs, newest first."""
    q = select(JobPosting).order_by(desc(JobPosting.fetched_at)).limit(limit).offset(offset)
    if remote_only:
        q = q.where(JobPosting.remote == True)
    if country:
        q = q.where(JobPosting.location.ilike(f"%{country}%"))

    result = await db.execute(q)
    jobs = result.scalars().all()

    # If DB empty, fetch now
    if not jobs:
        await fetch_and_store_jobs()
        result = await db.execute(q)
        jobs = result.scalars().all()

    return [_serialize_job(j) for j in jobs]


@router.get("/refresh")
async def refresh_jobs(background_tasks: BackgroundTasks):
    """Manually trigger a job fetch."""
    background_tasks.add_task(fetch_and_store_jobs)
    return {"message": "Job refresh started in background"}


@router.get("/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        from fastapi import HTTPException
        raise HTTPException(404, "Job not found")
    return _serialize_job(job)


def _serialize_job(j: JobPosting) -> dict:
    return {
        "id": j.id,
        "external_id": j.external_id,
        "title": j.title,
        "company": j.company,
        "location": j.location,
        "description": j.description[:500] + "..." if len(j.description) > 500 else j.description,
        "description_full": j.description,
        "apply_url": j.apply_url,
        "source": j.source,
        "salary_min": j.salary_min,
        "salary_max": j.salary_max,
        "remote": j.remote,
        "posted_at": j.posted_at.isoformat() if j.posted_at else None,
    }
