import httpx
from app.models import RobotsInfo

async def fetch_robots_and_sitemap(domain: str) -> RobotsInfo:
    robots_txt = None
    sitemap_url = None
    has_sitemap = False
    
    # Try fetching robots.txt
    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
            res = await client.get(f"https://{domain}/robots.txt")
            if res.status_code == 200:
                robots_txt = res.text[:2000]
    except Exception:
        try:
            async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
                res = await client.get(f"http://{domain}/robots.txt")
                if res.status_code == 200:
                    robots_txt = res.text[:2000]
        except Exception:
            pass

    # Parse sitemap location from robots.txt if present
    if robots_txt:
        for line in robots_txt.splitlines():
            if line.strip().lower().startswith("sitemap:"):
                parts = line.split(":", 1)
                if len(parts) > 1:
                    sitemap_url = parts[1].strip()
                    has_sitemap = True
                    break

    # If sitemap URL is not parsed, attempt default sitemap.xml route
    if not sitemap_url:
        test_url = f"https://{domain}/sitemap.xml"
        try:
            async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
                res = await client.get(test_url)
                if res.status_code == 200:
                    sitemap_url = test_url
                    has_sitemap = True
        except Exception:
            test_url = f"http://{domain}/sitemap.xml"
            try:
                async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
                    res = await client.get(test_url)
                    if res.status_code == 200:
                        sitemap_url = test_url
                        has_sitemap = True
            except Exception:
                pass

    return RobotsInfo(
        robots_txt=robots_txt,
        sitemap_url=sitemap_url,
        has_sitemap=has_sitemap
    )
