from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment configuration variables
load_dotenv()

from app.routers import report, health
from app.middleware.rate_limit import RateLimitMiddleware

app = FastAPI(
    title="Recon Pulse API",
    description="Full intelligence scanner API for any website",
    version="1.0.0"
)

# Enable CORS for frontend local development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable Rate Limiting (max 15 requests per 60s per IP for trigger endpoint)
app.add_middleware(RateLimitMiddleware, limit=15, window=60)

# Include endpoint routes
app.include_router(report.router, prefix="/api")
app.include_router(report.root_router)
app.include_router(health.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Recon Pulse API is running"}
