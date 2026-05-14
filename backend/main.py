from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn, os, asyncio
from routers import cv, jobs, applications, interview
from models.database import init_db
from services.scheduler import start_scheduler, fetch_and_store_jobs

app = FastAPI(title="Career Copilot", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cv.router, prefix="/api/cv", tags=["CV"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])


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
