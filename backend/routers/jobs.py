from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models.database import get_db, JobPosting
from services.scheduler import fetch_and_store_jobs
from services.job_service import _demo_jobs
from models.database import AsyncSessionLocal
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
    q = select(JobPosting).order_by(desc(JobPosting.fetched_at)).limit(limit).offset(offset)
    if remote_only:
        q = q.where(JobPosting.remote == True)
    if country:
        q = q.where(JobPosting.location.ilike(f"%{country}%"))

    result = await db.execute(q)
    jobs = result.scalars().all()

    # DB empty — fetch now synchronously so user sees something immediately
    if not jobs:
        await fetch_and_store_jobs()
        result = await db.execute(q)
        jobs = result.scalars().all()

    # Still empty — insert demo jobs directly and return them
    if not jobs:
        demo = _demo_jobs()
        async with AsyncSessionLocal() as session:
            for d in demo:
                session.add(JobPosting(
                    external_id=d["external_id"], title=d["title"], company=d["company"],
                    location=d["location"], description=d["description"], apply_url=d["apply_url"],
                    source=d["source"], salary_min=d.get("salary_min"), salary_max=d.get("salary_max"),
                    remote=d.get("remote", False), posted_at=datetime.utcnow(),
                ))
            await session.commit()
        result = await db.execute(q)
        jobs = result.scalars().all()

    return [_serialize(j) for j in jobs]


@router.get("/refresh")
async def refresh_jobs(
    background_tasks: BackgroundTasks,
    cv_skills: str = Query(None),
):
    """Trigger background job refresh."""
    skills = [s.strip() for s in cv_skills.split(",")] if cv_skills else None
    background_tasks.add_task(fetch_and_store_jobs, skills)
    return {"message": "Job refresh started in background — check back in ~15 seconds"}


@router.get("/refresh-sync")
async def refresh_jobs_sync(cv_skills: str = Query(None)):
    """Trigger job refresh and wait for results — used by the UI refresh button."""
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
        "country": "eg" if (is_egypt or j.source in ("wuzzuf", "demo")) else "",
    }
