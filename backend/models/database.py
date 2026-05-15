from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker, mapped_column, Mapped
from sqlalchemy import String, Text, DateTime, Float, Boolean, JSON, Index
from datetime import datetime
from config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Create engine with connection pooling
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=5,
    max_overflow=10
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

class CVProfile(Base):
    __tablename__ = "cv_profiles"
    __table_args__ = (
        Index('idx_cv_session_created', 'session_id', 'created_at'),
    )
    
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    raw_text: Mapped[str] = mapped_column(Text, default="")
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    ats_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class JobPosting(Base):
    __tablename__ = "job_postings"
    __table_args__ = (
        Index('idx_job_country_fetched', 'country', 'fetched_at'),
        Index('idx_job_remote_fetched', 'remote', 'fetched_at'),
        Index('idx_job_source_posted', 'source', 'posted_at'),
    )
    
    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300), index=True)
    company: Mapped[str] = mapped_column(String(200), index=True)
    location: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    apply_url: Mapped[str] = mapped_column(String(500), default="")
    source: Mapped[str] = mapped_column(String(50), default="adzuna", index=True)
    salary_min: Mapped[float] = mapped_column(Float, nullable=True)
    salary_max: Mapped[float] = mapped_column(Float, nullable=True)
    remote: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    country: Mapped[str] = mapped_column(String(10), default="", index=True)
    posted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        Index('idx_app_session_status', 'session_id', 'status'),
        Index('idx_app_session_created', 'session_id', 'created_at'),
    )
    
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    company: Mapped[str] = mapped_column(String(200), index=True)
    role: Mapped[str] = mapped_column(String(300))
    apply_url: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(50), default="saved", index=True)
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    cv_score: Mapped[float] = mapped_column(Float, default=0.0)
    missing_keywords: Mapped[list] = mapped_column(JSON, default=list)
    tailored_bullets: Mapped[list] = mapped_column(JSON, default=list)
    cover_letter: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    auto_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    applied_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        Index('idx_project_session_created', 'session_id', 'created_at'),
        Index('idx_project_integrated', 'integrated_to_cv'),
    )
    
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    project_name: Mapped[str] = mapped_column(String(300), index=True)
    project_type: Mapped[str] = mapped_column(String(100), default="")
    tech_stack: Mapped[list] = mapped_column(JSON, default=list)
    complexity: Mapped[str] = mapped_column(String(50), default="")
    cv_description: Mapped[str] = mapped_column(Text, default="")
    bullet_points: Mapped[list] = mapped_column(JSON, default=list)
    key_features: Mapped[list] = mapped_column(JSON, default=list)
    technical_highlights: Mapped[list] = mapped_column(JSON, default=list)
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    github_url: Mapped[str] = mapped_column(String(500), default="")
    github_repo_name: Mapped[str] = mapped_column(String(200), default="")
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    integrated_to_cv: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    # User-provided metadata for better CV descriptions
    project_date: Mapped[str] = mapped_column(String(100), default="")
    is_team_project: Mapped[bool] = mapped_column(Boolean, default=False)
    team_size: Mapped[int] = mapped_column(nullable=True)
    your_role: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

async def init_db():
    """Initialize database with tables and indexes."""
    logger.info("Initializing database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Migrate: add country column if it doesn't exist (for existing DBs)
        try:
            await conn.exec_driver_sql(
                "ALTER TABLE job_postings ADD COLUMN country VARCHAR(10) DEFAULT ''"
            )
            logger.info("Migration: added country column to job_postings")
        except Exception:
            pass  # Column already exists
    
    logger.info("Database initialized successfully")

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
