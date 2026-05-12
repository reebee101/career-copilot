# 🤖 AI Career Copilot

A full-stack AI-powered job hunt platform for ML/AI engineers. Built with your existing skills: **FastAPI + Python backend, React frontend, Playwright automation, Groq AI**.

---

## ✨ Features

| Feature | How it works |
|---|---|
| **CV Upload & Analysis** | Upload PDF/DOCX → Groq extracts text, scores ATS (0-100), identifies gaps, rewrites bullets |
| **Live Job Search** | Adzuna API fetches ML/AI jobs every 6 hours across Egypt, UAE, UK, US |
| **JD Analyzer** | Paste any job description → match score, missing keywords, tailored bullets, cover letter |
| **Bullet Rewriter** | All your CV bullets rewritten with action verb + metric + impact |
| **Application Tracker** | Kanban board: Saved → Applied → Interview → Offer/Rejected |
| **Auto-Apply** | Playwright fills and submits forms on LinkedIn Easy Apply, Greenhouse, Lever |
| **Interview Prep** | Questions generated from your actual projects + AI feedback on practice answers |
| **Upskill Roadmap** | Certifications and projects ranked by ROI for your specific gaps |

---

## 🚀 Quick Start

### Requirements
- Python 3.10+
- Node.js 18+
- An [Groq API key](https://console.groq.com)

### 1. Clone and start (Mac/Linux)
```bash
git clone <your-repo>
cd career-copilot
chmod +x start.sh
./start.sh
```

### 1. Clone and start (Windows)
```cmd
git clone <your-repo>
cd career-copilot
start.bat
```

The script will:
- Create a Python virtual environment
- Install all dependencies
- Build the React frontend
- Install Playwright browsers
- Start the server at **http://localhost:8000**

### 2. Configure API keys
Edit `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...   # Required

# Job search (free tier, 250 req/day)
ADZUNA_APP_ID=...              # https://developer.adzuna.com
ADZUNA_API_KEY=...

# Auto-apply (enable when ready)
AUTO_APPLY_ENABLED=false        # Change to true to enable
```

---

## 🏗 Architecture

```
career-copilot/
├── backend/
│   ├── main.py                 # FastAPI app + CORS + static serving
│   ├── config.py               # Pydantic settings from .env
│   ├── models/
│   │   └── database.py         # SQLAlchemy async models (SQLite)
│   ├── routers/
│   │   ├── cv.py               # Upload, analyze, score vs JD, cover letter
│   │   ├── jobs.py             # List/refresh job board
│   │   ├── applications.py     # CRUD + auto-apply trigger
│   │   └── interview.py        # Practice feedback
│   └── services/
│       ├── cv_service.py       # Groq API calls (analysis, scoring, bullets)
│       ├── job_service.py      # Adzuna + SerpAPI + mock data fallback
│       ├── apply_service.py    # Playwright auto-apply (LinkedIn/Greenhouse/Lever)
│       └── scheduler.py        # APScheduler — fetches jobs every 6h
└── frontend/
    └── src/
        ├── App.jsx             # All UI: Dashboard, Jobs, JD Analyzer, Tracker...
        ├── api.js              # All fetch calls to backend
        └── index.css           # Global styles
```

**Stack:**
- Backend: FastAPI, SQLAlchemy (async), SQLite, APScheduler, Groq SDK, PyMuPDF, Playwright
- Frontend: React 18, Vite, Lucide icons — no heavy UI library
- AI: Groq LLaMA (cv analysis, scoring, cover letters, interview feedback)
- Job data: Adzuna API (free) + SerpAPI Google Jobs (optional)
- Auto-apply: Playwright Chromium (headless)

---

## 🤖 Auto-Apply

Auto-apply uses Playwright to fill application forms. It's designed to be **surgical, not spammy**.

**Supported ATS:**
- ✅ LinkedIn Easy Apply
- ✅ Greenhouse
- ✅ Lever
- ⚠️ Generic (partial — fills fields, flags for manual submit)
- ❌ Workday (too complex, requires login)

**To enable:**
1. Set `AUTO_APPLY_ENABLED=true` in `.env`
2. In the app, click **Auto-apply** on any saved application
3. Enter your phone number and LinkedIn URL
4. The app applies in the background and updates the tracker

**Important:** LinkedIn requires you to be logged in. For LinkedIn jobs, use their browser session by adding cookie-based auth (see `apply_service.py` comments).

---

## 📡 API Docs

After starting: **http://localhost:8000/docs** (Swagger UI)

Key endpoints:
```
POST /api/cv/upload              — Upload CV file
POST /api/cv/score-against-jd   — Score CV vs job description
POST /api/cv/cover-letter        — Generate cover letter
GET  /api/jobs/                  — List all fetched jobs
GET  /api/jobs/refresh           — Trigger manual job fetch
POST /api/applications/          — Create application (auto-scores + cover letter)
POST /api/applications/auto-apply — Trigger Playwright auto-apply
PATCH /api/applications/{id}/status — Update status
POST /api/interview/practice-feedback — AI feedback on practice answers
```

---

## 🌐 Deployment

### Free: Railway.app
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```
Set env vars in Railway dashboard.

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/
RUN pip install -r backend/requirements.txt
RUN playwright install chromium --with-deps
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Render.com
- Build command: `pip install -r backend/requirements.txt && cd frontend && npm install && npm run build`
- Start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 🔧 Extending

**Add a new job source:** Add a function in `services/job_service.py` returning normalized job dicts, call it in `fetch_and_store_jobs()`.

**Support a new ATS:** Add a handler in `services/apply_service.py`, update `detect_ats()`.

**Swap SQLite for Postgres:** Change `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
```

---

## 📋 Roadmap
- [ ] LinkedIn cookie-based auth for Easy Apply
- [ ] Email notifications for new matching jobs
- [ ] Multi-CV support (different CVs for different roles)
- [ ] Salary benchmarking per role/country
- [ ] Chrome extension for 1-click job saving
