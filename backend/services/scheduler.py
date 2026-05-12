"""
scheduler.py — AI-powered background job fetcher

Runs every 6 hours:
1. Fetches AI/ML jobs
2. Deduplicates jobs
3. Matches jobs against uploaded CVs
4. Stores only enriched jobs
"""

from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from config import get_settings

from models.database import (
    AsyncSessionLocal,
    JobPosting,
    CVProfile,   # <-- use your actual model
)

from services.job_service import fetch_all_jobs
from services.cv_service import match_cv_to_job


settings = get_settings()

scheduler = AsyncIOScheduler()


# ──────────────────────────────────────────────────────────────
# Main scheduler task
# ──────────────────────────────────────────────────────────────

async def fetch_and_store_jobs():

    print(
        f"[Scheduler] Fetching jobs "
        f"at {datetime.utcnow().isoformat()}"
    )

    # Fetch jobs from all providers
    jobs = await fetch_all_jobs(
        keywords=settings.job_search_keywords,
        countries=settings.job_search_countries,
    )

    new_count = 0
    matched_count = 0

    async with AsyncSessionLocal() as db:

        # Load uploaded CV profiles
        profiles_result = await db.execute(
            select(CVProfile)
        )

        profiles = profiles_result.scalars().all()

        print(f"[Scheduler] Loaded {len(profiles)} CV profiles")

        for job_data in jobs:

            # ─────────────────────────────────────
            # Skip duplicates
            # ─────────────────────────────────────

            existing = await db.execute(
                select(JobPosting).where(
                    JobPosting.external_id
                    == job_data["external_id"]
                )
            )

            if existing.scalar_one_or_none():
                continue

            # ─────────────────────────────────────
            # AI matching
            # ─────────────────────────────────────

            best_match_score = 0
            best_match_data = None
            matched = False

            for profile in profiles:

                if not profile.raw_text:
                    continue

                try:

                    match_data = await match_cv_to_job(
                        cv_text=profile.raw_text,
                        jd_text=job_data["description"],
                    )

                    score = match_data.get(
                        "match_score",
                        0
                    )

                    # Track best match
                    if score > best_match_score:

                        best_match_score = score
                        best_match_data = match_data

                    # Threshold
                    if score >= 70:
                        matched = True

                except Exception as e:

                    print(
                        f"[Scheduler] Matching failed "
                        f"for profile {profile.id}: {e}"
                    )

            # ─────────────────────────────────────
            # Store enriched job
            # ─────────────────────────────────────

            job = JobPosting(

                external_id=job_data["external_id"],

                title=job_data["title"],

                company=job_data["company"],

                location=job_data.get("location", ""),

                description=job_data.get(
                    "description",
                    ""
                ),

                apply_url=job_data.get(
                    "apply_url",
                    ""
                ),

                source=job_data.get(
                    "source",
                    "unknown"
                ),

                salary_min=job_data.get(
                    "salary_min"
                ),

                salary_max=job_data.get(
                    "salary_max"
                ),

                remote=job_data.get(
                    "remote",
                    False
                ),

                posted_at=datetime.utcnow(),

                # ── AI matching ─────────────────

                match_score=best_match_score,

                matched=matched,

                matched_keywords=(
                    best_match_data.get(
                        "matched_keywords",
                        []
                    )
                    if best_match_data
                    else []
                ),

                missing_keywords=(
                    best_match_data.get(
                        "missing_keywords",
                        []
                    )
                    if best_match_data
                    else []
                ),

                match_reasoning=(
                    best_match_data.get(
                        "reasoning",
                        ""
                    )
                    if best_match_data
                    else ""
                ),
            )

            db.add(job)

            new_count += 1

            if matched:
                matched_count += 1

        await db.commit()

    print(
        f"[Scheduler] Stored "
        f"{new_count} new jobs"
    )

    print(
        f"[Scheduler] "
        f"{matched_count} matched jobs"
    )

    return new_count


# ──────────────────────────────────────────────────────────────
# Start scheduler
# ──────────────────────────────────────────────────────────────

def start_scheduler():

    scheduler.add_job(
        fetch_and_store_jobs,

        trigger=IntervalTrigger(hours=6),

        id="fetch_jobs",

        replace_existing=True,
    )

    scheduler.start()

    print(
        "[Scheduler] Started — "
        "fetching jobs every 6 hours"
    )


# ──────────────────────────────────────────────────────────────
# Stop scheduler
# ──────────────────────────────────────────────────────────────

def stop_scheduler():

    scheduler.shutdown()

    print("[Scheduler] Stopped")
