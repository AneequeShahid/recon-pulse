import httpx
import os
from typing import Optional
from pydantic import BaseModel

class PuppeteerResult(BaseModel):
    screenshot_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    favicon: Optional[str] = None

async def fetch_screenshot_and_meta(url: str) -> Optional[PuppeteerResult]:
    try:
        service_url = os.getenv("PUPPETEER_SERVICE_URL", "http://localhost:3001")
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(f"{service_url}/screenshot", json={"url": url})
            if res.status_code != 200:
                return None
            data = res.json()
            meta = data.get("metadata", {})
            screenshot_b64 = data.get("screenshot")
            screenshot_url = f"data:image/png;base64,{screenshot_b64}" if screenshot_b64 else None
            
            return PuppeteerResult(
                screenshot_url=screenshot_url,
                title=meta.get("title"),
                description=meta.get("description"),
                favicon=meta.get("favicon")
            )
    except Exception:
        return None
