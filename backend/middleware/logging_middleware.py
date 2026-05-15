"""Request/response logging middleware."""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests and responses with timing."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        logger.info(f"→ {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log response
            logger.info(
                f"← {request.method} {request.url.path} "
                f"[{response.status_code}] {duration:.3f}s"
            )
            
            # Add timing header
            response.headers["X-Process-Time"] = str(duration)
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"✗ {request.method} {request.url.path} "
                f"failed after {duration:.3f}s: {e}"
            )
            raise

# Made with Bob
