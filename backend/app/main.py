from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import report, health, enterprise, compliance, playbooks, collaboration
from app.integrations.router import router as integrations_router
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.audit_middleware import AuditMiddleware

app = FastAPI(
    title="Recon Pulse API",
    description="Enterprise CTEM platform — full intelligence scanner",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware, limit=15, window=60)
app.add_middleware(AuditMiddleware)

app.include_router(report.router, prefix="/api")
app.include_router(report.root_router)
app.include_router(health.router, prefix="/api")
app.include_router(enterprise.router)
app.include_router(compliance.router)
app.include_router(integrations_router)
app.include_router(playbooks.router)
app.include_router(collaboration.router)


@app.get("/")
async def root():
    return {"message": "Recon Pulse API is running"}
