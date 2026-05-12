"""
APScheduler-based daily job fetcher.
Runs every 6 hours, stores new jobs in DB, optionally auto-applies.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from models.database import AsyncSessionLocal, JobPosting
from services.job_service import search_jobs_adzuna, search_jobs_serpapi
from config import get_settings
from datetime import datetime

settings = get_settings()
scheduler = AsyncIOScheduler()


async def fetch_and_store_jobs():
    """Fetch new jobs and store unique ones in DB."""
    print(f"[Scheduler] Fetching jobs at {datetime.utcnow().isoformat()}")
    jobs = await search_jobs_adzuna(
        keywords=settings.job_search_keywords,
        countries=settings.job_search_countries,
    )

    if settings.serpapi_key:
        for kw in settings.job_search_keywords[:2]:
            serp_jobs = await search_jobs_serpapi(kw)
            jobs.extend(serp_jobs)

    new_count = 0
    async with AsyncSessionLocal() as db:
        for job_data in jobs:
            # Skip if already in DB
            existing = await db.execute(
                select(JobPosting).where(JobPosting.external_id == job_data["external_id"])
            )
            if existing.scalar_one_or_none():
                continue

            job = JobPosting(
                external_id=job_data["external_id"],
                title=job_data["title"],
                company=job_data["company"],
                location=job_data["location"],
                description=job_data["description"],
                apply_url=job_data["apply_url"],
                source=job_data["source"],
                salary_min=job_data.get("salary_min"),
                salary_max=job_data.get("salary_max"),
                remote=job_data.get("remote", False),
                posted_at=datetime.utcnow(),
            )
            db.add(job)
            new_count += 1

        await db.commit()

    print(f"[Scheduler] Stored {new_count} new jobs")
    return new_count


def start_scheduler():
    scheduler.add_job(
        fetch_and_store_jobs,
        trigger=IntervalTrigger(hours=6),
        id="fetch_jobs",
        replace_existing=True,
    )
    scheduler.start()
    print("[Scheduler] Started — fetching jobs every 6 hours")


def stop_scheduler():
    scheduler.shutdown()
