@echo off
setlocal
set BACKEND=%~dp0backend
set FRONTEND=%~dp0frontend

echo AI Career Copilot - Starting...
echo.

REM Check .env
if not exist "%BACKEND%\.env" (
    copy "%BACKEND%\.env.template" "%BACKEND%\.env"
    echo IMPORTANT: Edit backend\.env and add your GROQ_API_KEY
    notepad "%BACKEND%\.env"
    pause
)

REM Python venv
if not exist "%BACKEND%\venv" (
    echo Creating Python virtual environment...
    python -m venv "%BACKEND%\venv"
)

echo Installing Python dependencies...
"%BACKEND%\venv\Scripts\pip" install -q -r "%BACKEND%\requirements.txt"

REM Install playwright
"%BACKEND%\venv\Scripts\playwright" install chromium 2>nul

REM Frontend
if not exist "%FRONTEND%\node_modules" (
    echo Installing frontend dependencies...
    cd "%FRONTEND%" && npm install --silent
)

echo Building frontend...
cd "%FRONTEND%" && npm run build --silent

echo.
echo Starting server at http://localhost:8000
echo API docs at http://localhost:8000/docs
echo.

cd "%BACKEND%"
"%BACKEND%\venv\Scripts\uvicorn" main:app --host 0.0.0.0 --port 8000 --reload
