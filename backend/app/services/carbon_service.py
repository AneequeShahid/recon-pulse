import httpx
from app.models import CarbonInfo

async def fetch_carbon(url: str) -> CarbonInfo:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get("https://api.websitecarbon.com/site", params={"url": url})
            if res.status_code != 200:
                return CarbonInfo()
                
            data = res.json()
            stats = data.get("statistics", {})
            co2 = stats.get("co2", {})
            grid = co2.get("grid", {})
            grams = grid.get("grams")
            
            cleaner_than_raw = data.get("cleanerThan")
            cleaner_than = int(cleaner_than_raw * 100) if cleaner_than_raw is not None else None
            
            rating = "F"
            if grams is not None:
                if grams < 0.18:
                    rating = "A+"
                elif grams < 0.34:
                    rating = "A"
                elif grams < 0.49:
                    rating = "B"
                elif grams < 0.65:
                    rating = "C"
                elif grams < 0.85:
                    rating = "D"
                elif grams < 1.25:
                    rating = "E"
                else:
                    rating = "F"
            else:
                rating = None
                
            return CarbonInfo(
                grams_per_view=round(grams, 3) if grams is not None else None,
                cleaner_than=cleaner_than,
                rating=rating
            )
    except Exception:
        return CarbonInfo()
