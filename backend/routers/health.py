"""Health check and monitoring endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from models.database import get_db
from config import get_settings
import time
from datetime import datetime

router = APIRouter()
settings = get_settings()

# Track startup time
startup_time = time.time()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": int(time.time() - startup_time)
    }


@router.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """Detailed health check with database and service status."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": int(time.time() - startup_time),
        "services": {}
    }
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        health_status["services"]["database"] = {
            "status": "healthy",
            "type": "sqlite" if "sqlite" in settings.database_url else "postgresql"
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check Groq API
    health_status["services"]["groq_api"] = {
        "status": "configured" if settings.groq_api_key else "not_configured"
    }
    
    # Check job search APIs
    health_status["services"]["job_search"] = {
        "adzuna": "configured" if settings.adzuna_api_key else "not_configured",
        "jsearch": "configured" if settings.jsearch_api_key else "not_configured",
        "serpapi": "configured" if settings.serpapi_key else "not_configured"
    }
    
    # Check GitHub integration
    health_status["services"]["github"] = {
        "status": "configured" if settings.github_token else "not_configured"
    }
    
    # Check auto-apply
    health_status["services"]["auto_apply"] = {
        "status": "enabled" if settings.auto_apply_enabled else "disabled"
    }
    
    return health_status


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Kubernetes-style readiness probe."""
    try:
        await db.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception:
        return {"ready": False}, 503


@router.get("/health/live")
async def liveness_check():
    """Kubernetes-style liveness probe."""
    return {"alive": True}

# Made with Bob
