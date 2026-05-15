# Career Copilot Backend - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Python 3.11+
- Docker & Docker Compose (for containerized deployment)
- PostgreSQL (optional, for production)
- API Keys:
  - Groq API (required)
  - Adzuna API (optional, for job search)
  - JSearch/RapidAPI (optional, for enhanced job search)
  - GitHub Token (optional, for project integration)

## Environment Configuration

1. Copy the environment template:
```bash
cp .env.template .env
```

2. Configure required variables in `.env`:
```env
# Required
GROQ_API_KEY=your_groq_api_key

# Optional but recommended
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_API_KEY=your_adzuna_api_key
JSEARCH_API_KEY=your_rapidapi_key
GITHUB_TOKEN=your_github_token

# Application settings
ENVIRONMENT=production
LOG_LEVEL=INFO
RATE_LIMIT_PER_MINUTE=100
```

## Local Development

### Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install Playwright browsers (for auto-apply feature):
```bash
playwright install chromium
```

4. Initialize database:
```bash
python -c "import asyncio; from models.database import init_db; asyncio.run(init_db())"
```

### Run Development Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Access the API:
- API: http://localhost:8000
- Docs: http://localhost:8000/api/docs
- Health: http://localhost:8000/api/health

## Docker Deployment

### Build and Run

```bash
# Build image
docker build -t career-copilot-backend .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

### Docker Environment Variables

Set in `docker-compose.yml` or pass via command line:
```bash
docker run -d \
  -p 8000:8000 \
  -e GROQ_API_KEY=your_key \
  -e ENVIRONMENT=production \
  --name career-copilot \
  career-copilot-backend
```

## Production Deployment

### Using PostgreSQL

1. Update `.env`:
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/career_copilot
```

2. Uncomment PostgreSQL service in `docker-compose.yml`

3. Run migrations:
```bash
python -c "import asyncio; from models.database import init_db; asyncio.run(init_db())"
```

### Nginx Reverse Proxy

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name api.yourcareercopilot.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL with Let's Encrypt

```bash
sudo certbot --nginx -d api.yourcareercopilot.com
```

### Systemd Service

Create `/etc/systemd/system/career-copilot.service`:
```ini
[Unit]
Description=Career Copilot Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/career-copilot/backend
Environment="PATH=/opt/career-copilot/backend/venv/bin"
ExecStart=/opt/career-copilot/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable career-copilot
sudo systemctl start career-copilot
sudo systemctl status career-copilot
```

## Monitoring & Maintenance

### Health Checks

- Basic: `GET /api/health`
- Detailed: `GET /api/health/detailed`
- Liveness: `GET /api/health/live`
- Readiness: `GET /api/health/ready`

### Logs

```bash
# Docker logs
docker-compose logs -f backend

# Application logs
tail -f logs/app.log

# Systemd logs
sudo journalctl -u career-copilot -f
```

### Database Backup

SQLite:
```bash
cp career_copilot.db career_copilot_backup_$(date +%Y%m%d).db
```

PostgreSQL:
```bash
pg_dump -U user career_copilot > backup_$(date +%Y%m%d).sql
```

### Performance Tuning

1. **Rate Limiting**: Adjust `RATE_LIMIT_PER_MINUTE` in `.env`
2. **Cache TTL**: Modify `CACHE_TTL_SECONDS` for caching duration
3. **Database Pool**: Adjust pool size in `models/database.py`
4. **Worker Processes**: Use multiple Uvicorn workers:
   ```bash
   uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
   ```

### Troubleshooting

**Database locked errors:**
- Switch to PostgreSQL for production
- Reduce concurrent requests

**Memory issues:**
- Limit Uvicorn workers
- Increase container memory limits

**API rate limits:**
- Monitor job search API quotas
- Implement request caching

**Playwright errors:**
- Ensure browsers are installed: `playwright install chromium`
- Check system dependencies

## Security Checklist

- [ ] Change default secrets in `.env`
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS for production domains only
- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Enable rate limiting
- [ ] Regular security updates: `pip install --upgrade -r requirements.txt`
- [ ] Database backups scheduled
- [ ] Monitor logs for suspicious activity
- [ ] Restrict API access with authentication (if needed)

## Scaling

### Horizontal Scaling

Use load balancer with multiple instances:
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Vertical Scaling

Increase resources:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

## Support

For issues and questions:
- GitHub Issues: [Your Repository]
- Documentation: [Your Docs URL]
- Email: support@yourcareercopilot.com