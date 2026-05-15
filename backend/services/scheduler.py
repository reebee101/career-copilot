from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from models.database import AsyncSessionLocal, JobPosting
from services.job_service import (
    search_jobs_jsearch, search_jobs_remotive, search_jobs_arbeitnow,
    search_jobs_wuzzuf, search_jobs_serpapi
)
from config import get_settings
from datetime import datetime

settings = get_settings()
scheduler = AsyncIOScheduler()


async def fetch_and_store_jobs(cv_skills: list[str] = None):
    print(f"[Scheduler] Fetching jobs | skills={cv_skills}")
    jobs = []

    # 1. JSearch — Egypt-focused, real jobs from Indeed/LinkedIn/Glassdoor
    if settings.jsearch_api_key:
        jsearch = await search_jobs_jsearch(cv_skills)
        jobs.extend(jsearch)
        print(f"[Scheduler] JSearch: {len(jsearch)} jobs")

    # 2. Wuzzuf — best Egypt source
    wuzzuf = await search_jobs_wuzzuf(cv_skills)
    jobs.extend(wuzzuf)
    print(f"[Scheduler] Wuzzuf: {len(wuzzuf)} jobs")

    # 3. Remotive — remote worldwide jobs
    remotive = await search_jobs_remotive(cv_skills)
    jobs.extend(remotive)
    print(f"[Scheduler] Remotive: {len(remotive)} jobs")

    # 4. Arbeitnow — remote worldwide jobs
    arbeitnow = await search_jobs_arbeitnow(cv_skills)
    jobs.extend(arbeitnow)
    print(f"[Scheduler] Arbeitnow: {len(arbeitnow)} jobs")

    # 5. SerpAPI — Egypt-specific Google Jobs (if key set)
    if settings.serpapi_key:
        for kw in (cv_skills or ["engineer", "analyst"])[:2]:
            serp = await search_jobs_serpapi(f"{kw} Cairo Egypt")
            jobs.extend(serp)
        print(f"[Scheduler] SerpAPI done")

    # NOTE: Adzuna removed — only returns US/UK jobs, not relevant

    new_count = 0
    async with AsyncSessionLocal() as db:
        for d in jobs:
            try:
                existing = await db.execute(
                    select(JobPosting).where(JobPosting.external_id == d["external_id"])
                )
                if existing.scalar_one_or_none():
                    continue
                db.add(JobPosting(
                    external_id=d["external_id"],
                    title=d["title"],
                    company=d["company"],
                    location=d["location"],
                    description=d["description"],
                    apply_url=d["apply_url"],
                    source=d["source"],
                    salary_min=d.get("salary_min"),
                    salary_max=d.get("salary_max"),
                    remote=d.get("remote", False),
                    country=d.get("country", ""),
                    posted_at=datetime.utcnow(),
                ))
                new_count += 1
            except Exception as e:
                print(f"[Scheduler] Error storing job: {e}")
        await db.commit()

    print(f"[Scheduler] Done — {new_count} new jobs stored ({len(jobs)} fetched)")
    return new_count


def start_scheduler():
    scheduler.add_job(fetch_and_store_jobs, trigger=IntervalTrigger(hours=6),
                      id="fetch_jobs", replace_existing=True)
    scheduler.start()
    print("[Scheduler] Started — fetching every 6 hours")


def stop_scheduler():
    scheduler.shutdown()
