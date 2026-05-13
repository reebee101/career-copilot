from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    groq_api_key: str = ""
    adzuna_app_id: str = ""
    adzuna_api_key: str = ""
    serpapi_key: str = ""
    jsearch_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./career_copilot.db"
    auto_apply_enabled: bool = False
    # Countries to search — 'eg' is always included via Wuzzuf/LinkedIn scrapers
    job_search_countries: List[str] = ["eg", "gb", "us", "ae"]
    # Fallback keywords used only when no CV skills are available
    job_search_keywords: List[str] = ["software engineer", "developer", "analyst", "manager"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()
