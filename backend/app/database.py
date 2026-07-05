import sqlite3
from typing import Optional
import asyncio
from app.models import ReportData

DB_PATH = "recon_pulse.db"

def init_db():
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

# Initialize the SQLite database on import
init_db()

def _save_report_sync(report: ReportData) -> None:
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
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return ReportData.model_validate_json(row[0])

def _update_report_sync(report: ReportData) -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    data_str = report.model_dump_json()
    cursor.execute(
        "UPDATE reports SET status = ?, data = ? WHERE id = ?",
        (report.status, data_str, report.id)
    )
    conn.commit()
    conn.close()

async def save_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _save_report_sync, report)

async def get_report(report_id: str) -> Optional[ReportData]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_report_sync, report_id)

async def update_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _update_report_sync, report)
