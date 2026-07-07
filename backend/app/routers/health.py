from fastapi import APIRouter
import os
router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "pagespeed": bool(os.getenv("PAGESPEED_API_KEY")),
        "github": bool(os.getenv("GITHUB_API_KEY")),
        "gnews": bool(os.getenv("GNEWS_API_KEY")),
        "virustotal": bool(os.getenv("VIRUSTOTAL_API_KEY")),
        "alienvault": bool(os.getenv("ALIENVAULT_OTX_KEY")),
        "shodan": bool(os.getenv("SHODAN_API_KEY")),
        "supabase": bool(os.getenv("SUPABASE_URL")),
    }
