import time
from collections import defaultdict
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 15, window: int = 60):
        super().__init__(app)
        self.limit = limit  # Limit of trigger request count
        self.window = window  # Window duration in seconds
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Only rate limit the POST /api/report triggers
        if request.url.path == "/api/report" and request.method == "POST":
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            
            # Remove timestamps outside the sliding window
            self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window]
            
            if len(self.requests[client_ip]) >= self.limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many scans initiated. Rate limit exceeded. Please try again in 60 seconds."}
                )
            
            self.requests[client_ip].append(now)
            
        return await call_next(request)
