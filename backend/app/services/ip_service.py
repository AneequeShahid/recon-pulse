import httpx
from app.models import HostingInfo

ASN_PROVIDERS = {
    "AS16509": "Amazon AWS",
    "AS15169": "Google Cloud",
    "AS13335": "Cloudflare",
    "AS14618": "Amazon AWS",
    "AS8075":  "Microsoft Azure",
    "AS20940": "Akamai",
    "AS54113": "Fastly",
    "AS19551": "Imperva",
    "AS36459": "GitHub",
    "AS2635":  "Automattic",
    "AS46606": "Unified Layer",
    "AS22612": "Namecheap",
    "AS26496": "GoDaddy",
    "AS46664": "DigitalOcean",
    "AS14061": "DigitalOcean",
    "AS135061":"Vultr",
    "AS20473": "Choopa/Vultr",
    "AS396982":"Google Cloud",
    "AS16276": "OVH",
    "AS24940": "Hetzner",
}

_cache = {}

async def fetch_hosting_info(domain: str) -> HostingInfo:
    if domain in _cache:
        return _cache[domain]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"http://ip-api.com/json/{domain}")
            if res.status_code != 200:
                res_info = HostingInfo()
                _cache[domain] = res_info
                return res_info
            data = res.json()
            if data.get("status") == "fail":
                res_info = HostingInfo()
                _cache[domain] = res_info
                return res_info
            
            as_raw = data.get("as", "")
            asn = as_raw.split(" ")[0] if as_raw else None
            provider_name = ASN_PROVIDERS.get(asn, "Other") if asn else None
            
            res_info = HostingInfo(
                ip=data.get("query"),
                country=data.get("country"),
                city=data.get("city"),
                isp=data.get("isp"),
                asn=asn,
                provider_name=provider_name
            )
            _cache[domain] = res_info
            return res_info
    except Exception:
        res_info = HostingInfo()
        _cache[domain] = res_info
        return res_info
