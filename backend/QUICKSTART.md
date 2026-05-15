# 🚀 Career Copilot - Quick Start Guide

## Prerequisites

- **Python 3.11+** (Check: `python --version`)
- **pip** (Python package manager)
- **Git** (for cloning)

## 📦 Installation (5 minutes)

### Step 1: Clone the Repository
```bash
cd backend
```

### Step 2: Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Install Playwright (for auto-apply feature)
```bash
playwright install chromium
```

### Step 5: Configure Environment Variables
```bash
# Copy template
cp .env.template .env

# Edit .env file and add your API keys
```

**Minimum Required Configuration (.env):**
```env
# REQUIRED - Get free key at: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# OPTIONAL - For job search (free tier available)
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_API_KEY=your_adzuna_api_key

# OPTIONAL - For enhanced job search
JSEARCH_API_KEY=your_rapidapi_key

# OPTIONAL - For GitHub integration
GITHUB_TOKEN=your_github_token
```

### Step 6: Initialize Database
```bash
python -c "import asyncio; from models.database import init_db; asyncio.run(init_db())"
```

### Step 7: Run the Server
```bash
# Development mode (with auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or simply
python main.py
```

## ✅ Verify Installation

### 1. Check Server is Running
Open browser: http://localhost:8000

You should see:
```json
{"status": "Career Copilot API running"}
```

### 2. Check API Documentation
Open: http://localhost:8000/api/docs

You should see interactive Swagger UI with all endpoints.

### 3. Check Health Status
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00",
  "uptime_seconds": 5
}
```

## 🎯 Quick Test

### Test 1: Upload CV
```bash
curl -X POST "http://localhost:8000/api/cv/upload" \
  -F "file=@path/to/your/cv.pdf"
```

### Test 2: Get Jobs
```bash
curl "http://localhost:8000/api/jobs/?limit=10"
```

### Test 3: Health Check
```bash
curl "http://localhost:8000/api/health/detailed"
```

## 🔧 Common Issues & Solutions

### Issue 1: "Module not found"
**Solution:**
```bash
# Make sure virtual environment is activated
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue 2: "GROQ_API_KEY not found"
**Solution:**
1. Get free API key: https://console.groq.com
2. Add to `.env` file:
   ```env
   GROQ_API_KEY=gsk_your_key_here
   ```
3. Restart server

### Issue 3: "Port 8000 already in use"
**Solution:**
```bash
# Use different port
uvicorn main:app --reload --port 8001

# Or kill process using port 8000
# Windows: netstat -ano | findstr :8000
# Mac/Linux: lsof -ti:8000 | xargs kill
```

### Issue 4: "Database locked"
**Solution:**
```bash
# Delete database and reinitialize
rm career_copilot.db
python -c "import asyncio; from models.database import init_db; asyncio.run(init_db())"
```

### Issue 5: Playwright errors
**Solution:**
```bash
# Reinstall browsers
playwright install chromium

# Install system dependencies (Linux)
playwright install-deps
```

## 📁 Project Structure

```
backend/
├── main.py                 # Application entry point
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (create this)
├── career_copilot.db     # SQLite database (auto-created)
│
├── models/
│   ├── database.py       # Database models
│   └── __init__.py
│
├── routers/              # API endpoints
│   ├── cv.py            # CV upload & analysis
│   ├── jobs.py          # Job search & recommendations
│   ├── applications.py  # Application tracking
│   ├── interview.py     # Interview simulator
│   ├── projects.py      # Project analysis
│   ├── health.py        # Health checks
│   └── __init__.py
│
├── services/            # Business logic
│   ├── cv_service.py
│   ├── job_service.py
│   ├── apply_service.py
│   ├── project_service.py
│   ├── recommendation_service.py
│   ├── scheduler.py
│   └── __init__.py
│
├── middleware/          # Custom middleware
│   ├── error_handler.py
│   ├── logging_middleware.py
│   ├── rate_limiter.py
│   └── __init__.py
│
├── utils/              # Utility functions
│   ├── logger.py
│   ├── cache.py
│   ├── validators.py
│   └── __init__.py
│
└── tests/              # Test suite
    ├── test_health.py
    ├── conftest.py
    └── __init__.py
```

## 🎮 Using the API

### 1. Upload CV
```python
import requests

# Upload PDF
with open('my_cv.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/cv/upload',
        files={'file': f}
    )
    data = response.json()
    session_id = data['session_id']
    print(f"ATS Score: {data['ats_score']}")
```

### 2. Get Recommended Jobs
```python
# Get AI-ranked jobs
response = requests.get(
    f'http://localhost:8000/api/jobs/recommended/{session_id}',
    params={'limit': 20}
)
jobs = response.json()

for job in jobs['jobs']:
    print(f"{job['title']} at {job['company']}")
    print(f"Match: {job['match_score']}%")
    print(f"Reasons: {', '.join(job['match_reasons'])}")
    print()
```

### 3. Start Interactive Interview
```python
# Start interview
response = requests.post(
    'http://localhost:8000/api/interview/start-interactive',
    json={
        'session_id': session_id,
        'role': 'Software Engineer',
        'company': 'Google',
        'difficulty': 'medium'
    }
)
data = response.json()
interview_id = data['interview_id']
print(f"Question: {data['question']}")

# Answer question
response = requests.post(
    'http://localhost:8000/api/interview/answer-interactive',
    json={
        'interview_id': interview_id,
        'session_id': session_id,
        'answer': 'Your answer here...'
    }
)
result = response.json()
print(f"Feedback: {result['feedback']}")
print(f"Next Question: {result['next_question']}")
```

## 🔥 Hot Tips

### Tip 1: Auto-reload on Code Changes
The `--reload` flag automatically restarts the server when you modify code:
```bash
uvicorn main:app --reload
```

### Tip 2: View Logs
```bash
# Logs are saved to logs/app.log
tail -f logs/app.log

# Windows
Get-Content logs/app.log -Wait
```

### Tip 3: Test with Swagger UI
1. Go to http://localhost:8000/api/docs
2. Click "Try it out" on any endpoint
3. Fill in parameters
4. Click "Execute"

### Tip 4: Clear Database
```bash
# Start fresh
rm career_copilot.db
python -c "import asyncio; from models.database import init_db; asyncio.run(init_db())"
```

### Tip 5: Run Tests
```bash
pytest tests/ -v
```

## 🐳 Docker Alternative

If you prefer Docker:

```bash
# Build image
docker build -t career-copilot-backend .

# Run container
docker run -d \
  -p 8000:8000 \
  -e GROQ_API_KEY=your_key \
  --name career-copilot \
  career-copilot-backend

# View logs
docker logs -f career-copilot

# Stop
docker stop career-copilot
```

Or use Docker Compose:
```bash
docker-compose up -d
```

## 📚 Next Steps

1. **Frontend Setup**: Set up the React frontend in `../frontend/`
2. **API Keys**: Get optional API keys for enhanced features
3. **Customization**: Modify prompts in `services/` for your use case
4. **Deployment**: See `DEPLOYMENT.md` for production setup

## 🆘 Getting Help

- **API Docs**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/api/health/detailed
- **Logs**: Check `logs/app.log`
- **Issues**: Check error messages in terminal

## 🎉 You're Ready!

Your Career Copilot backend is now running at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/api/docs
- **Health**: http://localhost:8000/api/health

Start building amazing career tools! 🚀