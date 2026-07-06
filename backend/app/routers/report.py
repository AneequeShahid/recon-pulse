from fastapi import APIRouter, HTTPException, BackgroundTasks
import uuid
from datetime import datetime
from app.models import ReportRequest, ReportData
from app.orchestrator import run_report
from app.database import get_report, save_report, get_history
from app.cache import get_cached

router = APIRouter()
root_router = APIRouter()

@router.post("/report")
async def create_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks
):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
        
    cached_id = await get_cached(url)
    if cached_id:
        return {"report_id": cached_id, "cached": True}

    report_id = str(uuid.uuid4())[:8]
    
    report = ReportData(
        id=report_id,
        url=url,
        created_at=datetime.now(),
        status="pending"
    )
    await save_report(report)

    routing_keys = {}
    if req.jira_url or req.github_token:
        routing_keys = {
            "jira_url": req.jira_url or "",
            "jira_email": req.jira_email or "",
            "jira_api_token": req.jira_api_token or "",
            "jira_project_key": req.jira_project_key or "",
            "github_token": req.github_token or "",
            "github_repo": req.github_repo or "",
        }

    background_tasks.add_task(run_report, report_id, url, req.routing_rules, routing_keys, req.cloud_creds, req.public_mode)

    return {"report_id": report_id, "cached": False}

@router.post("/prefetch")
async def prefetch_domain(
    req: ReportRequest,
    background_tasks: BackgroundTasks
):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
        
    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    if not domain:
        domain = parsed.path.replace("www.", "").split("/")[0]

    from app.services import rdap_service, ip_service
    background_tasks.add_task(rdap_service.fetch_domain_info, domain)
    background_tasks.add_task(ip_service.fetch_hosting_info, domain)

    return {"status": "prefetching"}

@router.get("/report/history")
async def get_report_history(url: str):
    target_url = url.strip()
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url
    return await get_history(target_url)

@router.get("/report/{report_id}")
async def get_report_by_id(report_id: str) -> ReportData:
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

from fastapi.responses import StreamingResponse
import asyncio
import json

@router.get("/report/{report_id}/stream")
async def stream_report(report_id: str):
    async def event_generator():
        for _ in range(30):  # max 30 polls = 45 seconds
            report = await get_report(report_id)
            if report:
                yield f"data: {report.model_dump_json()}\n\n"
                if report.status == "complete":
                    break
            await asyncio.sleep(1.5)
        yield "data: {\"status\": \"timeout\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

@root_router.get("/r/{report_id}")
async def get_report_by_id_root(report_id: str) -> ReportData:
    return await get_report_by_id(report_id)

