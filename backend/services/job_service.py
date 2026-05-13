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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


# ── Wuzzuf scraper ─────────────────────────────────────────────

async def search_jobs_wuzzuf(cv_skills: list[str] = None) -> list[dict]:
    """Scrape Wuzzuf.net — robust multi-pattern extractor."""
    keywords = (cv_skills[:3] if cv_skills else ["software engineer", "developer", "data analyst"])
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
                    print(f"[Wuzzuf] HTTP {resp.status_code} for '{kw}'")
                    continue

                html = resp.text

                # Pattern 1: JSON-LD structured data (most reliable)
                json_ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
                for blob in json_ld:
                    try:
                        data = json.loads(blob.strip())
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            if item.get("@type") == "JobPosting":
                                url = item.get("url", "")
                                if not url or url in seen:
                                    continue
                                seen.add(url)
                                loc = item.get("jobLocation", {})
                                if isinstance(loc, list):
                                    loc = loc[0] if loc else {}
                                location = loc.get("address", {}).get("addressLocality", "Egypt") if isinstance(loc.get("address"), dict) else "Cairo, Egypt"
                                results.append({
                                    "external_id": f"wuzzuf_{abs(hash(url))}",
                                    "title": item.get("title", "").strip(),
                                    "company": item.get("hiringOrganization", {}).get("name", "Company"),
                                    "location": f"{location}, Egypt",
                                    "description": item.get("description", "")[:600],
                                    "apply_url": url,
                                    "source": "wuzzuf",
                                    "salary_min": None, "salary_max": None,
                                    "remote": "remote" in item.get("title", "").lower(),
                                    "posted_at": datetime.utcnow().isoformat(),
                                    "country": "eg",
                                })
                    except Exception:
                        pass

                # Pattern 2: Next.js __NEXT_DATA__ JSON
                next_data = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
                if next_data:
                    try:
                        nd = json.loads(next_data.group(1))
                        jobs_arr = (nd.get("props", {}).get("pageProps", {})
                                    .get("data", {}).get("jobs", []))
                        for job in jobs_arr[:8]:
                            slug = job.get("slug", "")
                            url = f"https://wuzzuf.net/jobs/p/{slug}" if slug else ""
                            if not url or url in seen:
                                continue
                            seen.add(url)
                            results.append({
                                "external_id": f"wuzzuf_{abs(hash(url))}",
                                "title": job.get("title", "").strip(),
                                "company": job.get("company", {}).get("name", "Company"),
                                "location": job.get("country", {}).get("title", "Cairo, Egypt"),
                                "description": job.get("description", "")[:600],
                                "apply_url": url,
                                "source": "wuzzuf",
                                "salary_min": None, "salary_max": None,
                                "remote": job.get("workType", "") == "remote",
                                "posted_at": datetime.utcnow().isoformat(),
                                "country": "eg",
                            })
                    except Exception:
                        pass

                # Pattern 3: HTML regex fallback
                if not any(r["source"] == "wuzzuf" for r in results):
                    anchors = re.findall(r'href="(/jobs/p/[^"]+)"[^>]*>\s*<[^>]+>\s*([^<]{5,100})', html)
                    companies = re.findall(r'data-company[^>]*>([^<]{2,60})<', html)
                    for i, (path, title) in enumerate(anchors[:8]):
                        url = f"https://wuzzuf.net{path.split('?')[0]}"
                        if url in seen:
                            continue
                        seen.add(url)
                        results.append({
                            "external_id": f"wuzzuf_{abs(hash(url))}",
                            "title": title.strip(),
                            "company": companies[i].strip() if i < len(companies) else "Company",
                            "location": "Cairo, Egypt",
                            "description": f"{title.strip()} position in Egypt. Apply on Wuzzuf.",
                            "apply_url": url,
                            "source": "wuzzuf",
                            "salary_min": None, "salary_max": None,
                            "remote": "remote" in title.lower(),
                            "posted_at": datetime.utcnow().isoformat(),
                            "country": "eg",
                        })

                print(f"[Wuzzuf] '{kw}': {len([r for r in results if r['source'] == 'wuzzuf'])} total")

            except Exception as e:
                print(f"[Wuzzuf] Error ({kw}): {e}")

    return results


# ── LinkedIn public job search ─────────────────────────────────

async def search_jobs_linkedin(cv_skills: list[str] = None) -> list[dict]:
    """Search LinkedIn public listings for Egypt."""
    keywords = (cv_skills[:2] if cv_skills else ["software engineer", "developer"])
    results = []
    seen = set()

    async with httpx.AsyncClient(timeout=25.0, headers=HEADERS, follow_redirects=True) as client:
        for kw in keywords[:2]:
            try:
                resp = await client.get(
                    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
                    params={
                        "keywords": kw,
                        "location": "Egypt",
                        "f_TPR": "r604800",
                        "start": 0,
                        "count": 10,
                    }
                )

                if resp.status_code != 200:
                    # Fallback: try the regular search page
                    resp = await client.get(
                        "https://www.linkedin.com/jobs/search/",
                        params={"keywords": kw, "location": "Egypt", "f_TPR": "r604800"}
                    )
                    if resp.status_code != 200:
                        print(f"[LinkedIn] HTTP {resp.status_code} for '{kw}'")
                        continue

                html = resp.text

                # Extract from JSON-LD
                json_ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
                for blob in json_ld:
                    try:
                        data = json.loads(blob.strip())
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            if item.get("@type") == "JobPosting":
                                url = item.get("url", "").split("?")[0]
                                if not url or url in seen:
                                    continue
                                seen.add(url)
                                loc = item.get("jobLocation", {})
                                if isinstance(loc, list):
                                    loc = loc[0] if loc else {}
                                location = loc.get("address", {}).get("addressLocality", "Egypt") if isinstance(loc.get("address"), dict) else "Egypt"
                                results.append({
                                    "external_id": f"linkedin_{abs(hash(url))}",
                                    "title": item.get("title", "").strip(),
                                    "company": item.get("hiringOrganization", {}).get("name", "Company"),
                                    "location": location,
                                    "description": item.get("description", "")[:600],
                                    "apply_url": url,
                                    "source": "linkedin",
                                    "salary_min": None, "salary_max": None,
                                    "remote": "remote" in item.get("title", "").lower(),
                                    "posted_at": datetime.utcnow().isoformat(),
                                    "country": "eg",
                                })
                    except Exception:
                        pass

                # HTML regex fallback
                titles = re.findall(r'class="base-search-card__title"[^>]*>\s*([^<]{3,100})\s*<', html)
                companies = re.findall(r'class="base-search-card__subtitle"[^>]*>.*?<[^>]+>([^<]{2,80})<', html, re.DOTALL)
                locations = re.findall(r'class="job-search-card__location"[^>]*>\s*([^<]{2,80})\s*<', html)
                links = re.findall(r'href="(https://[^"]*linkedin\.com/jobs/view/[^"?]+)', html)

                for i, title in enumerate(titles[:8]):
                    url = links[i].split("?")[0] if i < len(links) else ""
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    results.append({
                        "external_id": f"linkedin_{abs(hash(url))}",
                        "title": title.strip(),
                        "company": companies[i].strip() if i < len(companies) else "Company",
                        "location": locations[i].strip() if i < len(locations) else "Egypt",
                        "description": f"{title.strip()} role in Egypt. Apply on LinkedIn.",
                        "apply_url": url,
                        "source": "linkedin",
                        "salary_min": None, "salary_max": None,
                        "remote": "remote" in title.lower(),
                        "posted_at": datetime.utcnow().isoformat(),
                        "country": "eg",
                    })

                print(f"[LinkedIn] '{kw}': found {len(results)} total")

            except Exception as e:
                print(f"[LinkedIn] Error ({kw}): {e}")

    return results


# ── Adzuna (UK/US/UAE) ─────────────────────────────────────────

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

async def search_jobs_serpapi(keyword="software engineer Egypt"):
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
         "location": "Cairo, Egypt", "description": "Python, Go, microservices, PostgreSQL, Redis. 3+ yrs exp.",
         "apply_url": "https://wuzzuf.net", "source": "demo", "salary_min": 28000, "salary_max": 45000,
         "remote": False, "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_002", "title": "Senior Frontend Developer", "company": "Breadfast",
         "location": "Remote – Egypt", "description": "React, TypeScript, GraphQL. Remote-first team.",
         "apply_url": "https://wuzzuf.net", "source": "demo", "salary_min": 35000, "salary_max": 55000,
         "remote": True, "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_003", "title": "Data Analyst", "company": "Paymob",
         "location": "Cairo, Egypt", "description": "SQL, Python, Tableau. Fintech analytics.",
         "apply_url": "https://wuzzuf.net", "source": "demo", "salary_min": 22000, "salary_max": 38000,
         "remote": False, "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_004", "title": "DevOps Engineer", "company": "Instabug",
         "location": "Remote – Egypt", "description": "AWS, Kubernetes, Terraform, CI/CD.",
         "apply_url": "https://wuzzuf.net", "source": "demo", "salary_min": 40000, "salary_max": 65000,
         "remote": True, "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
        {"external_id": "demo_005", "title": "ML Engineer", "company": "Rology",
         "location": "Cairo, Egypt", "description": "PyTorch, TensorFlow, MLOps. Medical AI startup.",
         "apply_url": "https://wuzzuf.net", "source": "demo", "salary_min": 35000, "salary_max": 60000,
         "remote": False, "posted_at": datetime.utcnow().isoformat(), "country": "eg"},
    ]
