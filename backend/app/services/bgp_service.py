import httpx
from app.models import BGPInfo

async def fetch_bgp_info(asn: str) -> BGPInfo:
    if not asn:
        return BGPInfo()
    
    # Extract numerical part of ASN (e.g., AS13335 -> 13335)
    asn_num = asn.upper().replace("AS", "").strip()
    if not asn_num.isdigit():
        return BGPInfo(asn=asn)
        
    url = f"https://api.bgpview.io/asn/{asn_num}"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return BGPInfo(asn=asn)
            
            data = res.json().get("data", {})
            prefixes = data.get("prefixes_count", {})
            return BGPInfo(
                asn=asn,
                prefixes_ipv4=prefixes.get("ipv4", 0),
                prefixes_ipv6=prefixes.get("ipv6", 0),
                upstreams_count=data.get("upstreams_count", 0),
                downstreams_count=data.get("downstreams_count", 0),
                peers_count=data.get("peers_count", 0)
            )
    except Exception as e:
        print(f"BGP fetch error for {asn}: {e}")
        return BGPInfo(asn=asn)
