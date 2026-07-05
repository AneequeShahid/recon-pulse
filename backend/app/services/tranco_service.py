import httpx
from app.models import TrafficInfo

async def fetch_rank(domain: str) -> TrafficInfo:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"https://tranco-list.eu/api/ranks/domain/{domain}")
            if res.status_code != 200:
                return TrafficInfo()
                
            data = res.json()
            ranks = data.get("ranks", [])
            if not ranks:
                return TrafficInfo()
                
            rank = ranks[0].get("rank")
            
            label = "Low Traffic"
            if rank:
                if rank <= 1000:
                    label = "Top 1K (Extreme Traffic)"
                elif rank <= 10000:
                    label = "Top 10K (Very High Traffic)"
                elif rank <= 100000:
                    label = "Top 100K (High Traffic)"
                elif rank <= 1000000:
                    label = "Top 1M (Moderate Traffic)"
                    
            return TrafficInfo(
                tranco_rank=rank,
                rank_label=label
            )
    except Exception:
        return TrafficInfo()
