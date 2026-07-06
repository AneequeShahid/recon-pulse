from fastapi import APIRouter

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("/config")
async def get_integration_config():
    return {
        "message": "Integration keys are managed client-side",
        "configured": False
    }
