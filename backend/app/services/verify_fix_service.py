from app.database import _get_report_sync, _update_report_sync
from app.models import ReportData
from typing import Optional


async def verify_remediation(report_id: str) -> dict:
    try:
        report = _get_report_sync(report_id)
        if not report:
            return {"status": "error", "message": "Report not found"}

        if report.status != "complete":
            return {"status": "error", "message": "Report scan not complete"}

        from app.analysis.remediation import generate_remediation_steps
        steps = generate_remediation_steps(report)

        if len(steps) == 0:
            report.remediation_steps = []
            _update_report_sync(report)
            return {"status": "resolved", "message": "All remediation steps confirmed fixed"}

        report.remediation_steps = steps
        _update_report_sync(report)
        return {
            "status": "unresolved",
            "message": f"{len(steps)} remediation step(s) still pending",
            "remaining_steps": [s["title"] for s in steps]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
