import os
import sqlite3
from typing import Optional
import asyncio
from supabase import create_client, Client
from app.models import ReportData

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
DB_PATH = "recon_pulse.db"

# Initialize Supabase client (with local mock fallback to avoid crash on import)
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase: {e}")
        supabase = None

def _init_sqlite_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            status TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

if not supabase:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY missing. Falling back to local SQLite database.")
    _init_sqlite_db()

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
    if supabase:
        supabase.table("reports").insert(_report_to_row(report)).execute()
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        data_str = report.model_dump_json()
        cursor.execute(
            "INSERT INTO reports (id, url, status, data, created_at) VALUES (?, ?, ?, ?, ?)",
            (report.id, report.url, report.status, data_str, report.created_at.isoformat())
        )
        conn.commit()
        conn.close()

def _get_report_sync(report_id: str) -> Optional[ReportData]:
    if supabase:
        response = supabase.table("reports").select("*").eq("id", report_id).execute()
        if not response.data:
            return None
        return _row_to_report(response.data[0])
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return ReportData.model_validate_json(row[0])

def _update_report_sync(report: ReportData) -> None:
    if supabase:
        supabase.table("reports").update(_report_to_row(report)).eq("id", report.id).execute()
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        data_str = report.model_dump_json()
        cursor.execute(
            "UPDATE reports SET status = ?, data = ? WHERE id = ?",
            (report.status, data_str, report.id)
        )
        conn.commit()
        conn.close()

def _get_cached_sync(url: str) -> Optional[str]:
    try:
        if supabase:
            response = supabase.table("reports") \
                .select("id, created_at") \
                .eq("url", url) \
                .eq("status", "complete") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
                
            if not response.data:
                return None
                
            row = response.data[0]
            report_id = row.get("id")
            created_at_str = row.get("created_at")
        else:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, created_at FROM reports WHERE url = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1",
                (url,)
            )
            row = cursor.fetchone()
            conn.close()
            if not row:
                return None
            report_id, created_at_str = row
        
        from datetime import datetime, timedelta, timezone
        created_at = datetime.fromisoformat(created_at_str)
        now = datetime.now(timezone.utc) if created_at.tzinfo else datetime.now()
        if now - created_at < timedelta(hours=24):
            return report_id
    except Exception as e:
        print(f"Error checking cache: {e}")
        pass
    return None

async def save_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _save_report_sync, report)

async def get_report(report_id: str) -> Optional[ReportData]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_report_sync, report_id)

async def update_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _update_report_sync, report)

async def get_cached(url: str) -> Optional[str]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_cached_sync, url)
