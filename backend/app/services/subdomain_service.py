import httpx
from typing import Set
from app.models import SubdomainInfo

async def fetch_subdomains(domain: str) -> SubdomainInfo:
    if not domain:
        return SubdomainInfo()
        
    url = f"https://crt.sh/?q={domain}&output=json"
    try:
        async with httpx.AsyncClient(timeout=7) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return SubdomainInfo()
            
            data = res.json()
            subdomains: Set[str] = set()
            
            for item in data:
                name_value = item.get("name_value", "")
                # Split multiple names if certificate contains alt names
                names = [n.strip().lower() for n in name_value.split("\n")]
                for name in names:
                    # Filter subdomains
                    if name.endswith(domain) and name != domain and not name.startswith("*."):
                        subdomains.add(name)
            
            subdomains_list = sorted(list(subdomains))
            return SubdomainInfo(
                subdomains=subdomains_list[:15],
                total_count=len(subdomains_list)
            )
    except Exception as e:
        print(f"Subdomain fetch error for {domain}: {e}")
        return SubdomainInfo()
