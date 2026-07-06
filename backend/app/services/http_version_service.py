import httpx
from app.models import HTTPVersionInfo

async def check_http_version(domain: str) -> HTTPVersionInfo:
    try:
        async with httpx.AsyncClient(http2=True, timeout=5, follow_redirects=True) as client:
            res = await client.get(f"https://{domain}")
            http_version = res.http_version
            http2_support = http_version == "HTTP/2"
            alt_svc = res.headers.get("Alt-Svc", "")
            http3_support = "h3" in alt_svc or http_version == "HTTP/3"
            
            return HTTPVersionInfo(
                http2=http2_support,
                http3=http3_support
            )
    except Exception:
        try:
            async with httpx.AsyncClient(http2=True, timeout=5, follow_redirects=True) as client:
                res = await client.get(f"http://{domain}")
                http_version = res.http_version
                http2_support = http_version == "HTTP/2"
                alt_svc = res.headers.get("Alt-Svc", "")
                http3_support = "h3" in alt_svc or http_version == "HTTP/3"
                return HTTPVersionInfo(
                    http2=http2_support,
                    http3=http3_support
                )
        except Exception:
            return HTTPVersionInfo()
