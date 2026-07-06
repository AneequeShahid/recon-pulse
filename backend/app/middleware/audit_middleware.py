from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.database import _create_audit_log_sync
import time


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response: Response = await call_next(request)
        elapsed = time.time() - start

        if elapsed > 2.0 or request.method in ("POST", "PUT", "DELETE"):
            try:
                workspace_id = request.headers.get("X-Workspace-Id") or "anonymous"

                _create_audit_log_sync(
                    workspace_id=workspace_id,
                    action=f"{request.method} {request.url.path}",
                    resource=request.url.path,
                    details=f"status={response.status_code} elapsed={elapsed:.2f}s",
                    ip_address=request.client.host if request.client else None
                )
            except Exception:
                pass

        return response
