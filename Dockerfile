# Official Playwright image — includes Python, Chromium, and all system deps
FROM mcr.microsoft.com/playwright/python:v1.52.0-jammy

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Playwright Chromium
RUN playwright install chromium

# Build frontend inside the image (no pre-built dist needed)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --silent

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend
COPY backend/ ./backend/

EXPOSE 8000

# Run from /app/backend so relative imports and ../frontend/dist path both work
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
