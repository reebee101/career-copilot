import httpx
import re
import json
from datetime import datetime
from config import get_settings

settings = get_settings()
ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"
COUNTRY_MAP = {"gb": "United Kingdom", "us": "United States", "ae": "UAE", "eg": "Egypt"}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
}


# ── Remotive API (free, no key, remote-friendly) ───────────────

async def search_jobs_remotive(cv_skills: list[str] = None) -> list[dict]:
    """Remotive.com public API — free, no auth, real jobs, Egypt-friendly remote."""
    keywords = cv_skills[:3] if cv_skills else ["software", "engineer", "developer"]
    results = []
    seen = set()

    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS) as client:
        for kw in keywords[:3]:
            try:
                resp = await client.get(
                    "https://remotive.com/api/remote-jobs",
                    params={"search": kw, "limit": 15}
                )
                if resp.status_code != 200:
                    continue
                for job in resp.json().get("jobs", []):
                    url = job.get("url", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    results.append({
                        "external_id": f"remotive_{job.get('id', abs(hash(url)))}",
                        "title": job.get("title", "").strip(),
                        "company": job.get("company_name", "Company"),
                        "location": job.get("candidate_required_location") or "Remote – Worldwide",
                        "description": re.sub(r'<[^>]+>', '', job.get("description", ""))[:600],
                        "apply_url": url,
                        "source": "remotive",
                        "salary_min": None,
                        "salary_max": None,
                        "remote": True,
                        "posted_at": job.get("publication_date", datetime.utcnow().isoformat()),
                        "country": "remote",
                    })
            except Exception as e:
                print(f"[Remotive] Error ({kw}): {e}")

    print(f"[Remotive] {len(results)} jobs")
    return results


# ── Arbeitnow API (free, no key, international + remote) ───────

async def search_jobs_arbeitnow(cv_skills: list[str] = None) -> list[dict]:
    """Arbeitnow free job board API — no auth needed."""
    results = []
    seen = set()
    try:
        async with httpx.AsyncClient(timeout=20.0, headers=HEADERS) as client:
            resp = await client.get("https://www.arbeitnow.com/api/job-board-api")
            if resp.status_code == 200:
                for job in resp.json().get("data", [])[:30]:
                    url = job.get("url", "")
                    if not url or url in seen:
                        continue
                    # Filter for remote or MENA-friendly
                    is_remote = job.get("remote", False)
                    loc = job.get("location", "").lower()
                    if not is_remote and "egypt" not in loc and "mena" not in loc and "worldwide" not in loc and "anywhere" not in loc:
                        continue
                    seen.add(url)
                    results.append({
                        "external_id": f"arbeitnow_{abs(hash(url))}",
                        "title": job.get("title", "").strip(),
                        "company": job.get("company_name", "Company"),
                        "location": job.get("location", "Remote"),
                        "description": job.get("description", "")[:600],
                        "apply_url": url,
                        "source": "arbeitnow",
                        "salary_min": None,
                        "salary_max": None,
                        "remote": is_remote,
                        "posted_at": datetime.utcnow().isoformat(),
                        "country": "remote" if is_remote else "eg",
                    })
    except Exception as e:
        print(f"[Arbeitnow] Error: {e}")
    print(f"[Arbeitnow] {len(results)} jobs")
    return results


# ── Wuzzuf scraper (best-effort) ───────────────────────────────

async def search_jobs_wuzzuf(cv_skills: list[str] = None) -> list[dict]:
    keywords = cv_skills[:3] if cv_skills else ["software engineer", "developer", "analyst"]
    results = []
    seen = set()

    async with httpx.AsyncClient(timeout=25.0, headers=HEADERS, follow_redirects=True) as client:
        for kw in keywords[:3]:
            try:
                resp = await client.get(
                    "https://wuzzuf.net/search/jobs/",
                    params={"q": kw, "filters[country][0]": "Egypt", "start": 0}
                )
                if resp.status_code != 200:
                    continue
                html = resp.text

                # JSON-LD (most reliable)
                for blob in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL):
                    try:
                        data = json.loads(blob.strip())
                        for item in (data if isinstance(data, list) else [data]):
                            if item.get("@type") != "JobPosting":
                                continue
                            url = item.get("url", "")
                            if not url or url in seen:
                                continue
                            seen.add(url)
                            loc = item.get("jobLocation", {})
                            if isinstance(loc, list): loc = loc[0] if loc else {}
                            city = loc.get("address", {}).get("addressLocality", "Egypt") if isinstance(loc.get("address"), dict) else "Egypt"
                            results.append({
                                "external_id": f"wuzzuf_{abs(hash(url))}",
                                "title": item.get("title", "").strip(),
                                "company": item.get("hiringOrganization", {}).get("name", "Company"),
                                "location": f"{city}, Egypt",
                                "description": re.sub(r'<[^>]+>', '', item.get("description", ""))[:600],
                                "apply_url": url,
                                "source": "wuzzuf",
                                "salary_min": None, "salary_max": None,
                                "remote": "remote" in item.get("title", "").lower(),
                                "posted_at": datetime.utcnow().isoformat(),
                                "country": "eg",
                            })
                    except Exception:
                        pass

                # __NEXT_DATA__ fallback
                m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
                if m:
                    try:
                        nd = json.loads(m.group(1))
                        for job in nd.get("props", {}).get("pageProps", {}).get("data", {}).get("jobs", [])[:8]:
                            slug = job.get("slug", "")
                            url = f"https://wuzzuf.net/jobs/p/{slug}" if slug else ""
                            if not url or url in seen:
                                continue
                            seen.add(url)
                            results.append({
                                "external_id": f"wuzzuf_{abs(hash(url))}",
                                "title": job.get("title", "").strip(),
                                "company": job.get("company", {}).get("name", "Company"),
                                "location": "Cairo, Egypt",
                                "description": re.sub(r'<[^>]+>', '', job.get("description", ""))[:600],
                                "apply_url": url,
                                "source": "wuzzuf",
                                "salary_min": None, "salary_max": None,
                                "remote": False,
                                "posted_at": datetime.utcnow().isoformat(),
                                "country": "eg",
                            })
                    except Exception:
                        pass
            except Exception as e:
                print(f"[Wuzzuf] Error ({kw}): {e}")

    print(f"[Wuzzuf] {len(results)} jobs")
    return results


# ── Adzuna ─────────────────────────────────────────────────────

async def search_jobs_adzuna(keywords=None, countries=None, max_per_query=10):
    if not settings.adzuna_app_id or not settings.adzuna_api_key:
        return []
    keywords = keywords or ["software engineer"]
    supported = [c for c in (countries or ["gb", "us", "ae"]) if c != "eg"]
    results = []
    seen_ids = set()
    async with httpx.AsyncClient(timeout=15.0) as client:
        for country in supported:
            for kw in keywords[:2]:
                try:
                    resp = await client.get(
                        f"{ADZUNA_BASE}/{country}/search/1",
                        params={"app_id": settings.adzuna_app_id, "app_key": settings.adzuna_api_key,
                                "what": kw, "results_per_page": max_per_query, "sort_by": "date"}
                    )
                    if resp.status_code == 200:
                        for job in resp.json().get("results", []):
                            eid = job.get("id", "")
                            if eid not in seen_ids:
                                seen_ids.add(eid)
                                results.append(_normalize_adzuna(job, country))
                except Exception as e:
                    print(f"[Adzuna] Error ({country}/{kw}): {e}")
    return results


def _normalize_adzuna(job, country):
    return {
        "external_id": f"adzuna_{job.get('id','')}",
        "title": job.get("title", ""),
        "company": job.get("company", {}).get("display_name", "Unknown"),
        "location": job.get("location", {}).get("display_name", COUNTRY_MAP.get(country, country)),
        "description": job.get("description", ""),
        "apply_url": job.get("redirect_url", ""),
        "source": "adzuna",
        "salary_min": job.get("salary_min"),
        "salary_max": job.get("salary_max"),
        "remote": "remote" in job.get("title", "").lower(),
        "posted_at": job.get("created", datetime.utcnow().isoformat()),
        "country": country,
    }


# ── SerpAPI ────────────────────────────────────────────────────

async def search_jobs_serpapi(keyword="software engineer Cairo Egypt EG"):
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
            print(f"[SerpAPI] Error: {e}")
    return []


def _normalize_serpapi(job):
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

def _demo_jobs():
    return [
        {"external_id": "demo_001", "title": "Software Engineer – Backend", "company": "Vodafone Egypt",
         "location": "Cairo, Egypt", "description": "Python, Go, microservices, PostgreSQL.",
         "apply_url": "https://wuzzuf.net/search/jobs/?q=software+engineer", "source": "demo",
         "salary_min": 28000, "salary_max": 45000, "remote": False,
         "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_002", "title": "Senior Frontend Developer", "company": "Breadfast",
         "location": "Remote – Egypt", "description": "React, TypeScript, GraphQL. Remote-first.",
         "apply_url": "https://wuzzuf.net/search/jobs/?q=frontend", "source": "demo",
         "salary_min": 35000, "salary_max": 55000, "remote": True,
         "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_003", "title": "ML Engineer", "company": "Rology",
         "location": "Cairo, Egypt", "description": "PyTorch, TensorFlow, MLOps. Medical AI.",
         "apply_url": "https://wuzzuf.net/search/jobs/?q=machine+learning", "source": "demo",
         "salary_min": 35000, "salary_max": 60000, "remote": False,
         "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_004", "title": "DevOps Engineer", "company": "Instabug",
         "location": "Remote – Egypt", "description": "AWS, Kubernetes, Terraform, CI/CD.",
         "apply_url": "https://wuzzuf.net/search/jobs/?q=devops", "source": "demo",
         "salary_min": 40000, "salary_max": 65000, "remote": True,
         "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_005", "title": "Data Analyst", "company": "Paymob",
         "location": "Cairo, Egypt", "description": "SQL, Python, Tableau. Fintech analytics.",
         "apply_url": "https://wuzzuf.net/search/jobs/?q=data+analyst", "source": "demo",
         "salary_min": 22000, "salary_max": 38000, "remote": False,
         "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
    ]


# ── JSearch API (RapidAPI) ─────────────────────────────────────
# Aggregates Indeed, LinkedIn, Glassdoor, ZipRecruiter and more.
# Free tier: 200 req/month — https://rapidapi.com/letscrape-6bfbbb/api/jsearch

JSEARCH_COMPANIES_EGYPT = [
    "Vodafone Egypt", "PwC Egypt", "P&G Egypt", "Cisco Egypt",
    "Oracle Egypt", "IBM Egypt", "Microsoft Egypt", "Amazon Egypt",
    "McKinsey Egypt", "Deloitte Egypt", "EY Egypt", "KPMG Egypt",
]

async def search_jobs_jsearch(cv_skills: list[str] = None) -> list[dict]:
    """JSearch via RapidAPI — real jobs from Indeed, LinkedIn, Glassdoor for Egypt."""
    if not settings.jsearch_api_key:
        return []

    headers = {
        "X-RapidAPI-Key": settings.jsearch_api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }

    results = []
    seen = set()
    keywords = cv_skills[:3] if cv_skills else ["software engineer", "data analyst", "developer"]

    # Search using multiple Egypt identifiers to maximize results
    egypt_terms = ["Egypt", "Cairo", "EG", "Alexandria"]
    queries = []
    for kw in keywords[:2]:
        for term in egypt_terms[:2]:  # 2 skills × 2 terms = 4 queries
            queries.append(f"{kw} {term}")
    queries += [f"{company}" for company in JSEARCH_COMPANIES_EGYPT[:4]]

    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        for query in queries[:6]:  # stay within free tier
            try:
                resp = await client.get(
                    "https://jsearch.p.rapidapi.com/search",
                    params={
                        "query": query,
                        "page": "1",
                        "num_pages": "1",
                        "date_posted": "month",
                        "remote_jobs_only": "false",
                        "employment_types": "FULLTIME,PARTTIME,CONTRACTOR",
                    }
                )
                if resp.status_code != 200:
                    print(f"[JSearch] HTTP {resp.status_code} for '{query}'")
                    continue

                for job in resp.json().get("data", []):
                    job_id = job.get("job_id", "")
                    if not job_id or job_id in seen:
                        continue
                    seen.add(job_id)

                    # Filter: only Egypt or remote
                    country = (job.get("job_country") or "").upper()
                    city = (job.get("job_city") or "").lower()
                    state = (job.get("job_state") or "").lower()
                    full_location = f"{city} {state} {country}".lower()
                    is_remote = job.get("job_is_remote", False)
                    is_egypt = (
                        country in ("EG", "EGY", "EGYPT") or
                        any(x in full_location for x in ["egypt", "cairo", "alexandria", "giza", "eg"])
                    )

                    if not is_egypt and not is_remote:
                        continue

                    apply_url = (
                        job.get("job_apply_link") or
                        job.get("job_google_link") or
                        job.get("employer_website") or ""
                    )

                    salary_min = job.get("job_min_salary")
                    salary_max = job.get("job_max_salary")

                    location = f"{job.get('job_city', '')}, {job.get('job_country', 'Egypt')}".strip(", ")
                    if is_remote:
                        location = f"Remote — {location}" if location else "Remote"

                    results.append({
                        "external_id": f"jsearch_{job_id}",
                        "title": (job.get("job_title") or "").strip(),
                        "company": (job.get("employer_name") or "Company").strip(),
                        "location": location or "Egypt",
                        "description": (job.get("job_description") or "")[:800],
                        "apply_url": apply_url,
                        "source": job.get("job_publisher", "jsearch").lower().replace(" ", "_"),
                        "salary_min": salary_min,
                        "salary_max": salary_max,
                        "remote": is_remote,
                        "posted_at": job.get("job_posted_at_datetime_utc", datetime.utcnow().isoformat()),
                        "country": "eg" if is_egypt else "remote",
                        "logo": job.get("employer_logo"),
                    })

                print(f"[JSearch] '{query}': {len(results)} total so far")

            except Exception as e:
                print(f"[JSearch] Error ('{query}'): {e}")

    return results
