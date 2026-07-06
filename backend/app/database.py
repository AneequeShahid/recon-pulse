import os
from typing import Optional
import asyncio
from supabase import create_client, Client
from app.models import ReportData

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def _report_to_row(report: ReportData) -> dict:
    return {
        "id": report.id,
        "url": report.url,
        "screenshot_url": report.screenshot_url,
        "og_title": report.og_title,
        "og_description": report.og_description,
        "favicon": report.favicon,
        "tech_stack": report.tech_stack.model_dump(mode="json") if report.tech_stack else None,
        "security": report.security.model_dump(mode="json") if report.security else None,
        "performance": report.performance.model_dump(mode="json") if report.performance else None,
        "hosting": report.hosting.model_dump(mode="json") if report.hosting else None,
        "domain": report.domain.model_dump(mode="json") if report.domain else None,
        "news": [item.model_dump(mode="json") for item in report.news] if report.news else None,
        "github": report.github.model_dump(mode="json") if report.github else None,
        "colors": report.colors.model_dump(mode="json") if report.colors else None,
        "carbon": report.carbon.model_dump(mode="json") if report.carbon else None,
        "traffic": report.traffic.model_dump(mode="json") if report.traffic else None,
        "dns_records": report.dns_records,
        "created_at": report.created_at.isoformat(),
        "status": report.status,
    }

def _row_to_report(row: dict) -> ReportData:
    return ReportData.model_validate(row)

def _save_report_sync(report: ReportData) -> None:
    supabase.table("reports").insert(_report_to_row(report)).execute()

def _get_report_sync(report_id: str) -> Optional[ReportData]:
    response = supabase.table("reports").select("*").eq("id", report_id).execute()
    if not response.data:
        return None
    return _row_to_report(response.data[0])

def _update_report_sync(report: ReportData) -> None:
    supabase.table("reports").update(_report_to_row(report)).eq("id", report.id).execute()

async def save_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _save_report_sync, report)

async def get_report(report_id: str) -> Optional[ReportData]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_report_sync, report_id)

async def update_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _update_report_sync, report)
