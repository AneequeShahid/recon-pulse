import httpx
from app.models import RobotsInfo

async def fetch_robots(domain: str) -> RobotsInfo:
    try:
        async with httpx.AsyncClient(timeout=7, follow_redirects=True) as client:
            r = await client.get(f"https://{domain}/robots.txt")
            robots_txt = r.text[:2000] if r.status_code == 200 else None
            sitemap_url = None
            if robots_txt:
                for line in robots_txt.splitlines():
                    if line.lower().startswith("sitemap:"):
                        sitemap_url = line.split(":",1)[1].strip()
                        break
            has_sitemap = sitemap_url is not None
            return RobotsInfo(
                robots_txt=robots_txt,
                sitemap_url=sitemap_url,
                has_sitemap=has_sitemap
            )
    except Exception:
        return RobotsInfo()
