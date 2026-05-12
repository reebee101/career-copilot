#!/bin/bash
# ── AI Career Copilot — One-command startup ──────────────────
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"

echo "🤖 AI Career Copilot — Starting up..."
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 not found. Install it first: https://python.org"
  exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install it first: https://nodejs.org"
  exit 1
fi

# Setup .env
if [ ! -f "$BACKEND/.env" ]; then
  echo "⚠️  No .env found. Copying template..."
  cp "$BACKEND/.env.template" "$BACKEND/.env"
  echo ""
  echo "📝 IMPORTANT: Edit backend/.env and add your GROQ_API_KEY"
  echo "   Then re-run this script."
  echo ""
  read -p "Press Enter to open .env in your editor, or Ctrl+C to exit: "
  ${EDITOR:-nano} "$BACKEND/.env"
fi

# Python venv
if [ ! -d "$BACKEND/venv" ]; then
  echo "📦 Creating Python virtual environment..."
  python3 -m venv "$BACKEND/venv"
fi

echo "📦 Installing Python dependencies..."
"$BACKEND/venv/bin/pip" install -q --upgrade pip
"$BACKEND/venv/bin/pip" install -q -r "$BACKEND/requirements.txt"

# Install Playwright browsers (first time only)
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "🎭 Installing Playwright browsers (first time only, ~200MB)..."
  "$BACKEND/venv/bin/playwright" install chromium
fi

# Frontend deps
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd "$FRONTEND" && npm install --silent
fi

# Build frontend
echo "🔨 Building frontend..."
cd "$FRONTEND" && npm run build --silent

echo ""
echo "✅ All set! Starting server..."
echo "🌐 Open: http://localhost:8000"
echo "📚 API docs: http://localhost:8000/docs"
echo ""

# Start backend (serves both API + built frontend)
cd "$BACKEND"
"$BACKEND/venv/bin/python" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
