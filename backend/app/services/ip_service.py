import httpx
from app.models import HostingInfo

async def fetch_hosting_info(domain: str) -> HostingInfo:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"http://ip-api.com/json/{domain}")
            if res.status_code != 200:
                return HostingInfo()
            data = res.json()
            if data.get("status") == "fail":
                return HostingInfo()
            
            as_raw = data.get("as", "")
            asn = as_raw.split(" ")[0] if as_raw else None
            
            return HostingInfo(
                ip=data.get("query"),
                country=data.get("country"),
                city=data.get("city"),
                isp=data.get("isp"),
                asn=asn
            )
    except Exception:
        return HostingInfo()
