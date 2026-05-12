import httpx
import re
from datetime import datetime
from config import get_settings

settings = get_settings()

ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

COUNTRY_MAP = {"gb": "United Kingdom", "us": "United States", "ae": "UAE", "eg": "Egypt"}


# ── Wuzzuf scraper ─────────────────────────────────────────────

async def search_jobs_wuzzuf(cv_skills: list[str] = None) -> list[dict]:
    """Scrape Wuzzuf.net for Egypt jobs matching CV skills."""
    keywords = cv_skills[:4] if cv_skills else ["machine learning", "AI engineer", "data scientist", "computer vision"]
    results = []
    seen = set()

    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS, follow_redirects=True) as client:
        for kw in keywords[:3]:
            try:
                resp = await client.get(
                    "https://wuzzuf.net/search/jobs/",
                    params={"q": kw, "filters[country][0]": "Egypt"}
                )
                if resp.status_code != 200:
                    continue

                html = resp.text

                # Extract job cards - Wuzzuf uses data attributes
                # Try to find job data in structured format
                job_titles = re.findall(r'<h2[^>]*class="[^"]*css-m604qf[^"]*"[^>]*>.*?<a[^>]+href="(/jobs/[^"]+)"[^>]*>([^<]+)</a>', html, re.DOTALL)
                companies_raw = re.findall(r'class="[^"]*css-17s97q8[^"]*"[^>]*>([^<]+)</a>', html)
                locations_raw = re.findall(r'class="[^"]*css-5wys0e[^"]*"[^>]*>([^<]+)</span>', html)
                tags_raw = re.findall(r'class="[^"]*css-1ve4b75[^"]*"[^>]*>([^<]+)</a>', html)

                for i, (url_path, title) in enumerate(job_titles[:8]):
                    full_url = f"https://wuzzuf.net{url_path}"
                    if full_url in seen:
                        continue
                    seen.add(full_url)

                    company = companies_raw[i].strip() if i < len(companies_raw) else "Company"
                    location = locations_raw[i].strip() if i < len(locations_raw) else "Egypt"
                    remote = "remote" in title.lower() or "remote" in location.lower()

                    results.append({
                        "external_id": f"wuzzuf_{abs(hash(full_url))}",
                        "title": title.strip(),
                        "company": company,
                        "location": location,
                        "description": f"{title.strip()} at {company} — {location}. Apply on Wuzzuf.",
                        "apply_url": full_url,
                        "source": "wuzzuf",
                        "salary_min": None,
                        "salary_max": None,
                        "remote": remote,
                        "posted_at": datetime.utcnow().isoformat(),
                        "country": "eg",
                    })
            except Exception as e:
                print(f"Wuzzuf error ({kw}): {e}")

    return results


# ── LinkedIn public job search ─────────────────────────────────

async def search_jobs_linkedin(cv_skills: list[str] = None) -> list[dict]:
    """Search LinkedIn public job listings for Egypt."""
    keywords = cv_skills[:3] if cv_skills else ["machine learning", "AI engineer", "data scientist"]
    results = []
    seen = set()

    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS, follow_redirects=True) as client:
        for kw in keywords[:2]:
            try:
                resp = await client.get(
                    "https://www.linkedin.com/jobs/search/",
                    params={
                        "keywords": kw,
                        "location": "Egypt",
                        "f_TPR": "r604800",  # last week
                        "position": 1,
                        "pageNum": 0,
                    }
                )
                if resp.status_code != 200:
                    continue

                html = resp.text

                # LinkedIn job cards
                titles = re.findall(r'<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>\s*([^<]+)\s*</h3>', html)
                companies = re.findall(r'<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>.*?<a[^>]*>([^<]+)</a>', html, re.DOTALL)
                locations = re.findall(r'<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>\s*([^<]+)\s*</span>', html)
                links = re.findall(r'<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"', html)

                for i, title in enumerate(titles[:6]):
                    url = links[i] if i < len(links) else ""
                    if not url or url in seen:
                        continue
                    seen.add(url)

                    company = companies[i].strip() if i < len(companies) else "Company"
                    location = locations[i].strip() if i < len(locations) else "Egypt"

                    results.append({
                        "external_id": f"linkedin_{abs(hash(url))}",
                        "title": title.strip(),
                        "company": company,
                        "location": location,
                        "description": f"{title.strip()} at {company} — {location}. Apply on LinkedIn.",
                        "apply_url": url.split("?")[0],
                        "source": "linkedin",
                        "salary_min": None,
                        "salary_max": None,
                        "remote": "remote" in title.lower() or "remote" in location.lower(),
                        "posted_at": datetime.utcnow().isoformat(),
                        "country": "eg",
                    })
            except Exception as e:
                print(f"LinkedIn error ({kw}): {e}")

    return results


# ── Adzuna (UK/US/UAE — not Egypt) ────────────────────────────

async def search_jobs_adzuna(keywords: list[str] = None, countries: list[str] = None, max_per_query: int = 10) -> list[dict]:
    if not settings.adzuna_app_id or not settings.adzuna_api_key:
        return []

    keywords = keywords or ["machine learning engineer", "AI engineer", "deep learning"]
    # Adzuna doesn't support 'eg', filter it out
    supported = [c for c in (countries or ["gb", "us", "ae"]) if c != "eg"]
    results = []
    seen_ids = set()

    async with httpx.AsyncClient(timeout=15.0) as client:
        for country in supported:
            for kw in keywords[:2]:
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
                        for job in resp.json().get("results", []):
                            ext_id = job.get("id", "")
                            if ext_id not in seen_ids:
                                seen_ids.add(ext_id)
                                results.append(_normalize_adzuna(job, country))
                except Exception as e:
                    print(f"Adzuna error ({country}/{kw}): {e}")

    return results


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
        "remote": "remote" in job.get("title", "").lower(),
        "posted_at": job.get("created", datetime.utcnow().isoformat()),
        "country": country,
    }


# ── SerpAPI Google Jobs ────────────────────────────────────────

async def search_jobs_serpapi(keyword: str = "machine learning engineer Egypt") -> list[dict]:
    if not settings.serpapi_key:
        return []
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get("https://serpapi.com/search", params={
                "engine": "google_jobs", "q": keyword,
                "api_key": settings.serpapi_key, "chips": "date_posted:week",
            })
            if resp.status_code == 200:
                return [_normalize_serpapi(j) for j in resp.json().get("jobs_results", [])]
        except Exception as e:
            print(f"SerpAPI error: {e}")
    return []


def _normalize_serpapi(job: dict) -> dict:
    return {
        "external_id": f"serp_{abs(hash(job.get('title','') + job.get('company_name','')))}",
        "title": job.get("title", ""),
        "company": job.get("company_name", ""),
        "location": job.get("location", "Egypt"),
        "description": job.get("description", ""),
        "apply_url": (job.get("related_links") or [{}])[0].get("link", ""),
        "source": "google_jobs",
        "salary_min": None, "salary_max": None,
        "remote": "remote" in job.get("location", "").lower(),
        "posted_at": datetime.utcnow().isoformat(),
        "country": "eg",
    }


# ── Demo fallback ──────────────────────────────────────────────

def _demo_jobs() -> list[dict]:
    return [
        {
            "external_id": "demo_001", "title": "ML Engineer", "company": "Vodafone Egypt",
            "location": "Cairo, Egypt", "description": "Build ML models for telecom. Python, TensorFlow, Spark.",
            "apply_url": "https://wuzzuf.net", "source": "demo",
            "salary_min": 28000, "salary_max": 48000, "remote": False,
            "posted_at": datetime.utcnow().isoformat(), "country": "eg",
        },
        {
            "external_id": "demo_002", "title": "LLM / RAG Engineer", "company": "Wuzzuf",
            "location": "Remote – Egypt / MENA", "description": "Build RAG pipelines. LangChain, ChromaDB, FastAPI.",
            "apply_url": "https://wuzzuf.net", "source": "demo",
            "salary_min": 35000, "salary_max": 60000, "remote": True,
            "posted_at": datetime.utcnow().isoformat(), "country": "eg",
        },
    ]
