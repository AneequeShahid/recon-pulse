from fastapi import APIRouter, HTTPException, BackgroundTasks
import uuid
from datetime import datetime
from app.models import ReportRequest, ReportData
from app.orchestrator import run_report
from app.database import get_report, save_report
from app.cache import get_cached

router = APIRouter()
root_router = APIRouter()

@router.post("/report")
async def create_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks
):
    # Normalize URL representation
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
        
    # Check 24-hour cache first
    cached_id = await get_cached(url)
    if cached_id:
        return {"report_id": cached_id, "cached": True}

    # Generate distinct report identifier
    report_id = str(uuid.uuid4())[:8]
    
    # Save the initial pending record so it can be queried immediately
    report = ReportData(
        id=report_id,
        url=url,
        created_at=datetime.now(),
        status="pending"
    )
    await save_report(report)

    # Schedule report scanning in the background
    background_tasks.add_task(run_report, report_id, url)

    return {"report_id": report_id, "cached": False}

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

