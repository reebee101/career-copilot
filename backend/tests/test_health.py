"""Tests for health check endpoints."""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    """Test basic health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "uptime_seconds" in data


def test_liveness_check():
    """Test Kubernetes liveness probe."""
    response = client.get("/api/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["alive"] is True


def test_readiness_check():
    """Test Kubernetes readiness probe."""
    response = client.get("/api/health/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "ready" in data


def test_detailed_health_check():
    """Test detailed health check with service status."""
    response = client.get("/api/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert "database" in data["services"]
    assert "groq_api" in data["services"]

# Made with Bob
