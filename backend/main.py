from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn, os
from routers import cv, jobs, applications, interview
from models.database import init_db
from services.scheduler import start_scheduler

app = FastAPI(title="AI Career Copilot", version="1.0.0")

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

if os.path.exists("../frontend/dist"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"status": "API running. Build frontend with: cd frontend && npm run build"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
