"""
job_service.py — AI/ML job aggregation service

Sources:
- Adzuna
- SerpAPI Google Jobs
- Mock/demo jobs fallback

Features:
- Deduplication
- Normalized schema
- Remote detection
- Fresh-job prioritization
- Production-safe error handling
"""

import httpx
from datetime import datetime
from config import get_settings

settings = get_settings()

ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"

# ──────────────────────────────────────────────────────────────
# Default AI/ML search keywords
# ──────────────────────────────────────────────────────────────

ML_KEYWORDS = [
    "machine learning engineer",
    "AI engineer",
    "deep learning engineer",
    "computer vision engineer",
    "NLP engineer",
    "MLOps engineer",
    "LLM engineer",
    "data scientist",
]

COUNTRY_MAP = {
    "gb": "United Kingdom",
    "us": "United States",
    "ae": "UAE",
    "eg": "Egypt",
    "de": "Germany",
    "ca": "Canada",
    "au": "Australia",
}

# ──────────────────────────────────────────────────────────────
# Main Aggregator
# ──────────────────────────────────────────────────────────────

async def fetch_all_jobs(
    keywords: list[str] | None = None,
    countries: list[str] | None = None,
) -> list[dict]:
    """
    Fetch jobs from all enabled providers.
    Returns deduplicated normalized jobs.
    """

    keywords = keywords or ML_KEYWORDS[:3]
    countries = countries or settings.job_search_countries

    all_jobs = []

    # Adzuna
    adzuna_jobs = await search_jobs_adzuna(
        keywords=keywords,
        countries=countries,
    )

    all_jobs.extend(adzuna_jobs)

    # SerpAPI
    if settings.serpapi_key:
        for keyword in keywords[:2]:
            serp_jobs = await search_jobs_serpapi(keyword)
            all_jobs.extend(serp_jobs)

    # Deduplicate
    deduped = {}
    for job in all_jobs:
        deduped[job["external_id"]] = job

    final_jobs = list(deduped.values())

    print(f"[Jobs] Aggregated {len(final_jobs)} jobs")

    return final_jobs if final_jobs else _mock_jobs()


# ──────────────────────────────────────────────────────────────
# Adzuna
# ──────────────────────────────────────────────────────────────

async def search_jobs_adzuna(
    keywords: list[str] | None = None,
    countries: list[str] | None = None,
    max_per_query: int = 10,
) -> list[dict]:
    """
    Search Adzuna for AI/ML jobs.
    """

    if not settings.adzuna_app_id or not settings.adzuna_api_key:
        print("[Adzuna] Missing API keys — using mock jobs")
        return _mock_jobs()

    keywords = keywords or ML_KEYWORDS[:3]
    countries = countries or settings.job_search_countries

    results = []
    seen_ids = set()

    async with httpx.AsyncClient(timeout=20.0) as client:

        for country in countries:

            for keyword in keywords[:2]:

                try:
                    response = await client.get(
                        f"{ADZUNA_BASE}/{country}/search/1",
                        params={
                            "app_id": settings.adzuna_app_id,
                            "app_key": settings.adzuna_api_key,
                            "what": keyword,
                            "results_per_page": max_per_query,
                            "sort_by": "date",
                            "content-type": "application/json",
                        }
                    )

                    if response.status_code != 200:
                        print(
                            f"[Adzuna] Failed "
                            f"{country}/{keyword} "
                            f"({response.status_code})"
                        )
                        continue

                    data = response.json()

                    for raw_job in data.get("results", []):

                        ext_id = f"adzuna_{raw_job.get('id', '')}"

                        if ext_id in seen_ids:
                            continue

                        seen_ids.add(ext_id)

                        results.append(
                            _normalize_adzuna(raw_job, country)
                        )

                except Exception as e:
                    print(f"[Adzuna] Error ({country}/{keyword}): {e}")

    return results


def _normalize_adzuna(job: dict, country: str) -> dict:

    title = job.get("title", "")
    description = job.get("description", "")

    return {
        "external_id": f"adzuna_{job.get('id', '')}",

        "title": title,

        "company": (
            job.get("company", {})
            .get("display_name", "Unknown")
        ),

        "location": (
            job.get("location", {})
            .get(
                "display_name",
                COUNTRY_MAP.get(country, country)
            )
        ),

        "description": description,

        "apply_url": job.get("redirect_url", ""),

        "source": "adzuna",

        "salary_min": job.get("salary_min"),

        "salary_max": job.get("salary_max"),

        "remote": (
            "remote" in title.lower()
            or "remote" in description.lower()
            or "hybrid" in description.lower()
        ),

        "posted_at": (
            job.get("created")
            or datetime.utcnow().isoformat()
        ),

        "country": country,
    }


# ──────────────────────────────────────────────────────────────
# SerpAPI Google Jobs
# ──────────────────────────────────────────────────────────────

async def search_jobs_serpapi(
    keyword: str = "machine learning engineer"
) -> list[dict]:

    if not settings.serpapi_key:
        return []

    async with httpx.AsyncClient(timeout=20.0) as client:

        try:
            response = await client.get(
                "https://serpapi.com/search",
                params={
                    "engine": "google_jobs",
                    "q": keyword,
                    "api_key": settings.serpapi_key,
                    "chips": "date_posted:today",
                }
            )

            if response.status_code != 200:
                print(f"[SerpAPI] Failed ({response.status_code})")
                return []

            data = response.json()

            return [
                _normalize_serpapi(job)
                for job in data.get("jobs_results", [])
            ]

        except Exception as e:
            print(f"[SerpAPI] Error: {e}")

    return []


def _normalize_serpapi(job: dict) -> dict:

    location = job.get("location", "")

    return {
        "external_id": (
            f"serp_{job.get('job_id', '')}"
        ),

        "title": job.get("title", ""),

        "company": job.get("company_name", ""),

        "location": location,

        "description": job.get("description", ""),

        "apply_url": (
            (job.get("related_links") or [{}])[0]
            .get("link", "")
        ),

        "source": "google_jobs",

        "salary_min": None,

        "salary_max": None,

        "remote": (
            "remote" in location.lower()
            or "hybrid" in location.lower()
        ),

        "posted_at": datetime.utcnow().isoformat(),

        "country": "global",
    }


# ──────────────────────────────────────────────────────────────
# Demo fallback jobs
# ──────────────────────────────────────────────────────────────

def _mock_jobs() -> list[dict]:

    now = datetime.utcnow().isoformat()

    return [
        {
            "external_id": "mock_001",
            "title": "Machine Learning Engineer",
            "company": "Instabug",
            "location": "Cairo, Egypt (Hybrid)",
            "description": (
                "Build and deploy ML models for crash detection "
                "and user behavior analysis using PyTorch, NLP, "
                "and MLOps pipelines."
            ),
            "apply_url": "https://instabug.com/careers",
            "source": "demo",
            "salary_min": 25000,
            "salary_max": 45000,
            "remote": False,
            "posted_at": now,
            "country": "eg",
        },

        {
            "external_id": "mock_002",
            "title": "AI Engineer – Computer Vision",
            "company": "Valeo Egypt",
            "location": "Cairo, Egypt",
            "description": (
                "Develop real-time computer vision systems "
                "using YOLOv8, OpenCV, TensorRT, and Python."
            ),
            "apply_url": "https://valeo.com/careers",
            "source": "demo",
            "salary_min": 30000,
            "salary_max": 55000,
            "remote": False,
            "posted_at": now,
            "country": "eg",
        },

        {
            "external_id": "mock_003",
            "title": "LLM / RAG Engineer",
            "company": "Wuzzuf",
            "location": "Remote – Egypt / MENA",
            "description": (
                "Build RAG pipelines, vector search systems, "
                "LangChain integrations, and FastAPI AI services."
            ),
            "apply_url": "https://wuzzuf.net/careers",
            "source": "demo",
            "salary_min": 35000,
            "salary_max": 60000,
            "remote": True,
            "posted_at": now,
            "country": "eg",
        },
    ]