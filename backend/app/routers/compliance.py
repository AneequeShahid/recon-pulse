from fastapi import APIRouter
from app.database import _get_report_sync
from app.services.compliance_service import map_report_to_compliance

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


@router.get("/report/{report_id}")
async def get_compliance_report(report_id: str):
    report = _get_report_sync(report_id)
    if not report:
        return {"error": "Report not found"}
    soc2, nist = map_report_to_compliance(report)
    return {"soc2": soc2, "nist_csf": nist}
