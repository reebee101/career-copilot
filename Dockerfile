FROM mcr.microsoft.com/playwright/python:v1.52.0-jammy

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

RUN playwright install chromium

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --silent

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

COPY backend/ ./backend/

# DB lives in /app/data — mount a volume here to persist across restarts
RUN mkdir -p /app/data
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/career_copilot.db

EXPOSE 8000
VOLUME ["/app/data"]

WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
