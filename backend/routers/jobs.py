import re
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete, or_
from models.database import get_db, JobPosting, AsyncSessionLocal
from services.scheduler import fetch_and_store_jobs
from datetime import datetime

router = APIRouter()

EG_TERMS = ["egypt", "cairo", "alexandria", "alex", "giza", "hurghada", "luxor", "mansoura", "tanta", "zamalek", "maadi", "heliopolis"]

def _is_egypt_job(j: JobPosting) -> bool:
    loc = (j.location or "").lower()
    ctr = (j.country or "").lower()
    src = (j.source or "").lower()
    return (
        src == "wuzzuf" or
        ctr in ("eg", "egy", "egypt") or
        any(t in loc for t in EG_TERMS)
    )

@router.get("/")
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    remote_only: bool = False,
    country: str = None,
    limit: int = Query(150, le=300),
    offset: int = 0,
):
    # Base query — exclude demo jobs, newest first
    q = (select(JobPosting)
         .where(JobPosting.source != "demo")
         .order_by(desc(JobPosting.fetched_at))
         .limit(limit).offset(offset))

    if remote_only:
        q = q.where(JobPosting.remote == True)

    if country and country.lower() in ("egypt", "eg"):
        # Match Egypt by location text OR by country field OR by wuzzuf source
        q = q.where(
            or_(
                JobPosting.source == "wuzzuf",
                JobPosting.country.in_(["eg", "egy", "egypt"]),
                *[JobPosting.location.ilike(f"%{t}%") for t in EG_TERMS]
            )
        )
    elif country:
        q = q.where(
            or_(
                JobPosting.country.ilike(f"%{country}%"),
                JobPosting.location.ilike(f"%{country}%")
            )
        )

    result = await db.execute(q)
    jobs = result.scalars().all()

    # DB empty — fetch real jobs now
    if not jobs:
        await fetch_and_store_jobs()
        result = await db.execute(q)
        jobs = result.scalars().all()

    return [_serialize(j) for j in jobs]


@router.delete("/clear-demos")
async def clear_demos():
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
    is_eg = _is_egypt_job(j)
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
        "country": "eg" if is_eg else ("remote" if j.remote else ""),
    }
