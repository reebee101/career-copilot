from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    groq_api_key: str = ""
    adzuna_app_id: str = ""
    adzuna_api_key: str = ""
    serpapi_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./career_copilot.db"
    auto_apply_enabled: bool = False
    job_search_countries: List[str] = ["eg", "gb", "us", "ae"]
    job_search_keywords: List[str] = ["machine learning engineer", "AI engineer", "deep learning engineer"]

    class Config:
        env_file = ".env"

@lru_cache
def get_settings():
    return Settings()
