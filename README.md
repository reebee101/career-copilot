# 🤖 AI Career Copilot

A full-stack AI-powered job hunt platform for ML/AI engineers. Built with your existing skills: **FastAPI + Python backend, React frontend, Playwright automation, Groq AI**.

---

## ✨ Features

| Feature | How it works |
|---|---|
| **CV Upload & Analysis** | Upload PDF/DOCX → Groq extracts text, scores ATS (0-100), identifies gaps, rewrites bullets |
| **Live Job Search** | Adzuna API fetches ML/AI jobs every 6 hours across Egypt, UAE, UK, US |
| **JD Analyzer** | Paste any job description → match score, missing keywords, tailored bullets, cover letter |
| **Project Upload → CV** | Upload project ZIP → AI analyzes code → generates CV-ready descriptions → creates GitHub repo → adds to CV |
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
GROQ_API_KEY=gsk_...           # Required - Get from https://console.groq.com

# Job search (free tier, 250 req/day)
ADZUNA_APP_ID=...              # https://developer.adzuna.com
ADZUNA_API_KEY=...

# GitHub integration (optional - for creating repos from projects)
GITHUB_TOKEN=ghp_...           # Personal Access Token with 'repo' scope

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

## 📦 Projects Feature (NEW!)

Turn your code into CV-ready descriptions in seconds:

1. **Upload project ZIP** → AI analyzes your code
2. **Tell AI what YOU did** → Provide your specific role and contributions
3. **Get CV bullets** → AI generates professional descriptions with metrics
4. **Create GitHub repo** (optional) → One-click repo with professional README
5. **Add to CV** → Seamlessly integrate into your CV with updated ATS score

**Example workflow:**
```
Upload "ecommerce-api.zip" →
Fill form: "Built authentication and payment systems using Node.js..." →
AI generates: "Developed RESTful API handling 10K+ requests/day..." →
Create GitHub repo → Add to CV → ATS score: 72 → 80 (+8 points)
```

See [PROJECTS_FEATURE.md](./PROJECTS_FEATURE.md) for detailed documentation.

---


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
