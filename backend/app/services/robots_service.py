import httpx
from app.models import RobotsInfo
from urllib.parse import urlparse

async def fetch_robots(domain: str) -> RobotsInfo:
    try:
        parsed = urlparse(domain if domain.startswith('http') else f'https://{domain}')
        clean_domain = parsed.netloc.replace('www.', '') or domain.replace('www.', '')
        
        async with httpx.AsyncClient(timeout=7, follow_redirects=True) as client:
            r = await client.get(f"https://{clean_domain}/robots.txt")
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

async def fetch_robots_and_sitemap(domain: str) -> RobotsInfo:
    return await fetch_robots(domain)
