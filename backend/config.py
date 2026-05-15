from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional


class Settings(BaseSettings):
    # API Keys
    groq_api_key: str = ""
    adzuna_app_id: str = ""
    adzuna_api_key: str = ""
    serpapi_key: str = ""
    jsearch_api_key: str = ""
    github_token: str = ""  # GitHub Personal Access Token for repo creation
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./career_copilot.db"
    
    # Features
    auto_apply_enabled: bool = False
    
    # Job Search Configuration
    job_search_countries: List[str] = ["eg", "gb", "us", "ae"]
    job_search_keywords: List[str] = ["software engineer", "developer", "analyst", "manager"]
    
    # Application Settings
    environment: str = "development"  # development, staging, production
    log_level: str = "INFO"
    
    # Rate Limiting
    rate_limit_per_minute: int = 100
    
    # Cache Settings
    cache_ttl_seconds: int = 300  # 5 minutes
    
    # File Upload Limits
    max_file_size_mb: int = 50
    max_cv_size_mb: int = 5
    
    # Security
    allowed_origins: Optional[List[str]] = None
    
    # Monitoring
    enable_metrics: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings():
    return Settings()
