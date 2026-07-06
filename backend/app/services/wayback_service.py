import httpx
from typing import Optional
from app.models import WaybackInfo

async def fetch_wayback_info(domain: str) -> WaybackInfo:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                f"https://archive.org/wayback/available?url={domain}&timestamp=19990101"
            )
            data = res.json()
            earliest = data.get("archived_snapshots", {}).get("closest", {})
            res2 = await client.get(
                f"https://archive.org/wayback/available?url={domain}"
            )
            data2 = res2.json()
            latest = data2.get("archived_snapshots", {}).get("closest", {})
            
            first_seen = None
            if earliest and earliest.get("timestamp"):
                first_seen = earliest.get("timestamp")[:4]
                
            latest_snapshot = None
            if latest and latest.get("url"):
                latest_snapshot = latest.get("url")
                
            return WaybackInfo(
                first_seen=first_seen,
                latest_snapshot=latest_snapshot,
                available=bool(earliest)
            )
    except Exception:
        return WaybackInfo(available=False)
