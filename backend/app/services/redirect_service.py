import httpx
from typing import Optional, List
from app.models import RedirectChain, RedirectHop
from urllib.parse import urlparse

async def fetch_redirect_chain(url: str) -> RedirectChain:
    try:
        target_url = url.strip()
        if not target_url.startswith(("http://", "https://")):
            target_url = "https://" + target_url
            
        print(f"[REDIRECT] scanning: {target_url}")
        
        hops = []
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=10
        ) as client:
            current = target_url
            for _ in range(10):  # max 10 hops
                try:
                    res = await client.get(current)
                    location = str(res.headers.get("location", ""))
                    hops.append(RedirectHop(
                        url=current,
                        status=res.status_code,
                        location=location or None
                    ))
                    if res.status_code not in (301, 302, 303, 307, 308):
                        break
                    
                    if location.startswith("/"):
                        parsed = urlparse(current)
                        current = f"{parsed.scheme}://{parsed.netloc}{location}"
                    else:
                        current = location
                        
                    if not current:
                        break
                except Exception:
                    break
        return RedirectChain(hops=hops, total=len(hops))
    except Exception:
        return RedirectChain(hops=[], total=0)
