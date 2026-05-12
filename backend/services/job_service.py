import httpx
import json
from datetime import datetime
from config import get_settings

settings = get_settings()

ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"

ML_KEYWORDS = [
    "machine learning engineer",
    "AI engineer",
    "deep learning engineer",
    "computer vision engineer",
    "NLP engineer",
    "MLOps engineer",
    "data scientist",
    "LLM engineer",
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

async def search_jobs_adzuna(
    keywords: list[str] = None,
    countries: list[str] = None,
    max_per_query: int = 10,
) -> list[dict]:
    """Search Adzuna for ML/AI jobs. Returns normalized job list."""
    if not settings.adzuna_app_id or not settings.adzuna_api_key:
        return _mock_jobs()  # Return mock data if no API key

    keywords = keywords or ML_KEYWORDS[:3]
    countries = countries or settings.job_search_countries
    results = []
    seen_ids = set()

    async with httpx.AsyncClient(timeout=15.0) as client:
        for country in countries:
            for kw in keywords[:2]:  # Limit to avoid rate limits
                try:
                    resp = await client.get(
                        f"{ADZUNA_BASE}/{country}/search/1",
                        params={
                            "app_id": settings.adzuna_app_id,
                            "app_key": settings.adzuna_api_key,
                            "what": kw,
                            "results_per_page": max_per_query,
                            "content-type": "application/json",
                            "sort_by": "date",
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for job in data.get("results", []):
                            ext_id = job.get("id", "")
                            if ext_id in seen_ids:
                                continue
                            seen_ids.add(ext_id)
                            results.append(_normalize_adzuna(job, country))
                except Exception as e:
                    print(f"Adzuna error ({country}/{kw}): {e}")
                    continue

    return results if results else _mock_jobs()


def _normalize_adzuna(job: dict, country: str) -> dict:
    salary = job.get("salary_min"), job.get("salary_max")
    return {
        "external_id": f"adzuna_{job.get('id', '')}",
        "title": job.get("title", ""),
        "company": job.get("company", {}).get("display_name", "Unknown"),
        "location": job.get("location", {}).get("display_name", COUNTRY_MAP.get(country, country)),
        "description": job.get("description", ""),
        "apply_url": job.get("redirect_url", ""),
        "source": "adzuna",
        "salary_min": salary[0],
        "salary_max": salary[1],
        "remote": "remote" in job.get("title", "").lower() or "remote" in job.get("description", "").lower(),
        "posted_at": job.get("created", datetime.utcnow().isoformat()),
        "country": country,
    }


async def search_jobs_serpapi(keyword: str = "machine learning engineer") -> list[dict]:
    """Google Jobs via SerpAPI — richer results, requires paid key."""
    if not settings.serpapi_key:
        return []

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "engine": "google_jobs",
                    "q": keyword,
                    "api_key": settings.serpapi_key,
                    "chips": "date_posted:today",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return [_normalize_serpapi(j) for j in data.get("jobs_results", [])]
        except Exception as e:
            print(f"SerpAPI error: {e}")
    return []


def _normalize_serpapi(job: dict) -> dict:
    return {
        "external_id": f"serp_{job.get('job_id', job.get('title','')[:20])}",
        "title": job.get("title", ""),
        "company": job.get("company_name", ""),
        "location": job.get("location", ""),
        "description": job.get("description", ""),
        "apply_url": (job.get("related_links") or [{}])[0].get("link", ""),
        "source": "google_jobs",
        "salary_min": None,
        "salary_max": None,
        "remote": "remote" in job.get("location", "").lower(),
        "posted_at": datetime.utcnow().isoformat(),
        "country": "global",
    }


def _mock_jobs() -> list[dict]:
    """Demo jobs shown when no API keys are configured."""
    return [
        {
            "external_id": "mock_001",
            "title": "Machine Learning Engineer",
            "company": "Instabug",
            "location": "Cairo, Egypt (Hybrid)",
            "description": "Build and deploy ML models for crash detection and user behavior analysis. Requirements: PyTorch, Python, MLOps experience, experience with NLP or anomaly detection preferred. 2+ years experience.",
            "apply_url": "https://instabug.com/careers",
            "source": "demo",
            "salary_min": 25000,
            "salary_max": 45000,
            "remote": False,
            "posted_at": datetime.utcnow().isoformat(),
            "country": "eg",
        },
        {
            "external_id": "mock_002",
            "title": "AI Engineer – Computer Vision",
            "company": "Valeo Egypt",
            "location": "Cairo, Egypt",
            "description": "Develop real-time computer vision systems for ADAS (Advanced Driver Assistance Systems). YOLOv8, OpenCV, TensorRT, Python. Experience with BDD100K or similar autonomous driving datasets is a strong plus.",
            "apply_url": "https://valeo.com/careers",
            "source": "demo",
            "salary_min": 30000,
            "salary_max": 55000,
            "remote": False,
            "posted_at": datetime.utcnow().isoformat(),
            "country": "eg",
        },
        {
            "external_id": "mock_003",
            "title": "LLM / RAG Engineer",
            "company": "Wuzzuf (Remote)",
            "location": "Remote – Egypt / MENA",
            "description": "Build RAG pipelines, LLM integrations, and AI-powered search for our job platform. LangChain, ChromaDB, FastAPI, LLaMA/GPT APIs, vector databases. Prior production RAG experience required.",
            "apply_url": "https://wuzzuf.net/careers",
            "source": "demo",
            "salary_min": 35000,
            "salary_max": 60000,
            "remote": True,
            "posted_at": datetime.utcnow().isoformat(),
            "country": "eg",
        },
        {
            "external_id": "mock_004",
            "title": "Junior ML Engineer",
            "company": "Breadfast",
            "location": "Cairo, Egypt",
            "description": "Demand forecasting, recommendation systems, and supply chain ML. Python, scikit-learn, time-series (ARIMA, LSTM), SQL. We value people who ship end-to-end not just notebooks.",
            "apply_url": "https://breadfast.com/careers",
            "source": "demo",
            "salary_min": 20000,
            "salary_max": 35000,
            "remote": False,
            "posted_at": datetime.utcnow().isoformat(),
            "country": "eg",
        },
        {
            "external_id": "mock_005",
            "title": "NLP Engineer",
            "company": "Vodafone Egypt",
            "location": "Cairo, Egypt (On-site)",
            "description": "Build Arabic NLP models for customer support automation. Transformers, BERT/AraBERT, Hugging Face, FastAPI. Experience with Arabic language processing is a plus.",
            "apply_url": "https://vodafone.com.eg/careers",
            "source": "demo",
            "salary_min": 28000,
            "salary_max": 48000,
            "remote": False,
            "posted_at": datetime.utcnow().isoformat(),
            "country": "eg",
        },
    ]
