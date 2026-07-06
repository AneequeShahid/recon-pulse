from datetime import datetime, timedelta, timezone
from typing import Optional
import asyncio
from app.database import supabase

def _get_cached_sync(url: str) -> Optional[str]:
    try:
        # Find the most recent complete report for this exact URL
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
        
        # Check if the scan is less than 24 hours old
        created_at = datetime.fromisoformat(created_at_str)
        if datetime.now(timezone.utc) - created_at < timedelta(hours=24):
            return report_id
    except Exception as e:
        print(f"Error checking cache: {e}")
        pass
    return None

async def get_cached(url: str) -> Optional[str]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_cached_sync, url)
