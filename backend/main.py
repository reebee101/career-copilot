from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import uvicorn, os, asyncio
from routers import cv, jobs, applications, interview, projects, health
from models.database import init_db
from services.scheduler import start_scheduler, fetch_and_store_jobs
from middleware.error_handler import (
    global_exception_handler,
    validation_exception_handler,
    database_exception_handler
)
from middleware.logging_middleware import LoggingMiddleware
from middleware.rate_limiter import RateLimiter
from utils.logger import setup_logging
from config import get_settings

# Setup logging
setup_logging(log_level="INFO", log_file="logs/app.log")

settings = get_settings()

app = FastAPI(
    title="Career Copilot API",
    version="2.0.0",
    description="AI-powered career management platform with CV analysis, job search, and application tracking",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS Configuration - More restrictive in production
allowed_origins = ["*"] if os.getenv("ENVIRONMENT") != "production" else [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://your-production-domain.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"]
)

# Add custom middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimiter, requests_per_minute=100)

# Exception handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(cv.router, prefix="/api/cv", tags=["CV"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])


@app.on_event("startup")
async def startup():
    await init_db()
    start_scheduler()
    # Fire-and-forget background job fetch so the board is never empty
    asyncio.get_event_loop().create_task(_startup_fetch())


async def _startup_fetch():
    """Runs after startup completes — fetches jobs in the background."""
    await asyncio.sleep(2)  # let the server fully start first
    print("[Startup] Fetching jobs in background...")
    try:
        count = await fetch_and_store_jobs()
        print(f"[Startup] Done — {count} new jobs stored")
    except Exception as e:
        print(f"[Startup] Job fetch error: {e}")


if os.path.exists("../frontend/dist"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"status": "Career Copilot API running"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
