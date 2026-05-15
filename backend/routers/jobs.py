from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete, or_, func, and_
from models.database import get_db, JobPosting, AsyncSessionLocal
from services.scheduler import fetch_and_store_jobs
from datetime import datetime

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
):
    total = (await db.execute(select(func.count()).select_from(JobPosting))).scalar()
    if total == 0:
        print("[Jobs] DB empty — fetching now...")
        await fetch_and_store_jobs()

    q = select(JobPosting).order_by(desc(JobPosting.fetched_at)).limit(limit).offset(offset)

    if remote_only:
        q = q.where(JobPosting.remote == True)
    elif country and country.lower() in ("egypt", "eg"):
        q = q.where(_eg_filter())

    result = await db.execute(q)
    jobs = result.scalars().all()

    if not jobs and country and country.lower() in ("egypt", "eg"):
        print("[Jobs] Egypt returned 0 — re-fetching...")
        await fetch_and_store_jobs()
        result = await db.execute(q)
        jobs = result.scalars().all()

    return [_serialize(j) for j in jobs]


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
