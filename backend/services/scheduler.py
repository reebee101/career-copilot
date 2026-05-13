from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from models.database import AsyncSessionLocal, JobPosting
from services.job_service import search_jobs_adzuna, search_jobs_serpapi, search_jobs_wuzzuf, search_jobs_linkedin, _demo_jobs
from config import get_settings
from datetime import datetime

settings = get_settings()
scheduler = AsyncIOScheduler()


async def fetch_and_store_jobs(cv_skills: list[str] = None):
    """Fetch from Wuzzuf, LinkedIn, Adzuna, SerpAPI and store in DB.
    cv_skills: list of skills from the user's CV — used to search for relevant jobs in ANY field.
    """
    print(f"[Scheduler] Fetching jobs at {datetime.utcnow().isoformat()} | skills={cv_skills}")

    jobs = []

    # Egypt: Wuzzuf + LinkedIn — search using actual CV skills so results match any field
    wuzzuf_jobs = await search_jobs_wuzzuf(cv_skills)
    jobs.extend(wuzzuf_jobs)
    print(f"[Scheduler] Wuzzuf: {len(wuzzuf_jobs)} jobs")

    linkedin_jobs = await search_jobs_linkedin(cv_skills)
    jobs.extend(linkedin_jobs)
    print(f"[Scheduler] LinkedIn: {len(linkedin_jobs)} jobs")

    # International: Adzuna (if key set) — use CV skills as search keywords
    if settings.adzuna_app_id and settings.adzuna_api_key:
        adzuna_jobs = await search_jobs_adzuna(
            keywords=cv_skills or ["software engineer", "developer"],
            countries=[c for c in settings.job_search_countries if c != "eg"],
        )
        jobs.extend(adzuna_jobs)
        print(f"[Scheduler] Adzuna: {len(adzuna_jobs)} jobs")

    # SerpAPI (if key set)
    if settings.serpapi_key:
        for kw in (cv_skills or ["software engineer"])[:2]:
            serp = await search_jobs_serpapi(f"{kw} Egypt")
            jobs.extend(serp)

    # Fallback to diverse demo jobs if completely empty
    if not jobs:
        jobs = _demo_jobs()
        print("[Scheduler] No real jobs fetched, using demo data")

    new_count = 0
    async with AsyncSessionLocal() as db:
        for job_data in jobs:
            existing = await db.execute(
                select(JobPosting).where(JobPosting.external_id == job_data["external_id"])
            )
            if existing.scalar_one_or_none():
                continue

            db.add(JobPosting(
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
            ))
            new_count += 1

        await db.commit()

    print(f"[Scheduler] Stored {new_count} new jobs")
    return new_count


def start_scheduler():
    scheduler.add_job(fetch_and_store_jobs, trigger=IntervalTrigger(hours=6),
                      id="fetch_jobs", replace_existing=True)
    scheduler.start()
    print("[Scheduler] Started — fetching jobs every 6 hours")


def stop_scheduler():
    scheduler.shutdown()
