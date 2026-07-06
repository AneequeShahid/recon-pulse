import httpx
from typing import Optional
from pydantic import BaseModel

class PuppeteerResult(BaseModel):
    screenshot_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    favicon: Optional[str] = None

async def fetch_screenshot_and_meta(url: str) -> Optional[PuppeteerResult]:
    try:
        # Use Microlink API to fetch metadata and screenshot url
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(f"https://api.microlink.io/?url={url}&screenshot=true")
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "success":
                    inner_data = data.get("data", {})
                    screenshot_url = inner_data.get("screenshot", {}).get("url")
                    title = inner_data.get("title")
                    description = inner_data.get("description")
                    logo_url = inner_data.get("logo", {}).get("url")
                    
                    result = PuppeteerResult(
                        screenshot_url=screenshot_url,
                        title=title,
                        description=description,
                        favicon=logo_url
                    )
                    print(f"[Microlink Success] Resolved screenshot and metadata: {result}")
                    return result
            
            # Fallback to direct embed URL if JSON call fails
            embed_url = f"https://api.microlink.io/?url={url}&screenshot=true&meta=false&embed=screenshot.url"
            result = PuppeteerResult(
                screenshot_url=embed_url,
                title=None,
                description=None,
                favicon=None
            )
            print(f"[Microlink Fallback] JSON request failed (status={res.status_code}). Using embed URL: {result}")
            return result
    except Exception as e:
        # Fallback even on complete timeout/failure
        embed_url = f"https://api.microlink.io/?url={url}&screenshot=true&meta=false&embed=screenshot.url"
        result = PuppeteerResult(
            screenshot_url=embed_url,
            title=None,
            description=None,
            favicon=None
        )
        print(f"[Microlink Exception] Error: {e}. Using fallback embed URL: {result}")
        return result
