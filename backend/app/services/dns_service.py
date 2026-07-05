import httpx
import asyncio
from typing import Dict, List, Any

async def fetch_dns_records(domain: str) -> Dict[str, Any]:
    record_types = ["A", "AAAA", "MX", "TXT", "NS"]
    
    async def fetch_type(client: httpx.AsyncClient, rtype: str) -> List[str]:
        try:
            res = await client.get(
                "https://cloudflare-dns.com/dns-query",
                params={"name": domain, "type": rtype},
                headers={"Accept": "application/dns-json"}
            )
            if res.status_code == 200:
                data = res.json()
                answers = data.get("Answer", [])
                return [ans.get("data") for ans in answers if "data" in ans]
        except Exception:
            pass
        return []

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            tasks = [fetch_type(client, rtype) for rtype in record_types]
            results = await asyncio.gather(*tasks)
            return {
                rtype: results[i]
                for i, rtype in enumerate(record_types)
            }
    except Exception:
        return {rtype: [] for rtype in record_types}
