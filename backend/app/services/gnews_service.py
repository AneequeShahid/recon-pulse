import httpx
import os
from typing import List
from app.models import NewsItem

async def fetch_news(domain: str) -> List[NewsItem]:
    try:
        api_key = os.getenv("GNEWS_API_KEY")
        if not api_key or api_key == "your_key_here":
            return []
            
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                "https://gnews.io/api/v4/search",
                params={
                    "q": domain,
                    "token": api_key,
                    "max": 5,
                    "lang": "en"
                }
            )
            if res.status_code != 200:
                return []
                
            data = res.json()
            articles = data.get("articles", [])
            items = []
            for art in articles:
                items.append(
                    NewsItem(
                        title=art.get("title", ""),
                        source=art.get("source", {}).get("name", "Unknown"),
                        date=art.get("publishedAt", "")[:10],
                        url=art.get("url", "")
                    )
                )
            return items
    except Exception:
        return []
