import httpx
from app.models import HTTPVersionInfo

async def fetch_http_version(url: str) -> HTTPVersionInfo:
    try:
        async with httpx.AsyncClient(http2=True, timeout=7) as client:
            res = await client.get(url)
            http2 = res.http_version == "HTTP/2"
            alt_svc = res.headers.get("alt-svc","")
            http3 = "h3" in alt_svc
            return HTTPVersionInfo(http2=http2, http3=http3)
    except Exception:
        return HTTPVersionInfo()
