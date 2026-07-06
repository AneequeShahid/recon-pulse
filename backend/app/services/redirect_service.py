import httpx
from typing import Optional, List
from app.models import RedirectChain, RedirectHop

async def fetch_redirect_chain(url: str) -> RedirectChain:
    try:
        hops = []
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=10
        ) as client:
            current = url
            for _ in range(10):  # max 10 hops
                try:
                    res = await client.get(current)
                    hops.append(RedirectHop(
                        url=current,
                        status=res.status_code,
                        location=str(res.headers.get("location", ""))
                    ))
                    if res.status_code not in (301, 302, 303, 307, 308):
                        break
                    current = str(res.headers.get("location", ""))
                    if not current:
                        break
                except Exception:
                    break
        return RedirectChain(hops=hops, total=len(hops))
    except Exception:
        return RedirectChain(hops=[], total=0)
