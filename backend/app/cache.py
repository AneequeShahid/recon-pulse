import sqlite3
from datetime import datetime, timedelta
from typing import Optional
import asyncio
from app.database import DB_PATH

def _get_cached_sync(url: str) -> Optional[str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Find the most recent complete report for this exact URL
    cursor.execute(
        "SELECT id, created_at FROM reports WHERE url = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1",
        (url,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    
    report_id, created_at_str = row
    try:
        # Check if the scan is less than 24 hours old
        created_at = datetime.fromisoformat(created_at_str)
        if datetime.now() - created_at < timedelta(hours=24):
            return report_id
    except Exception:
        pass
    return None

async def get_cached(url: str) -> Optional[str]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_cached_sync, url)
