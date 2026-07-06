import os
import httpx
from typing import Any

SECURITYTRAILS_API_KEY = os.environ.get("SECURITYTRAILS_API_KEY", "")


async def fetch_securitytrails_info(domain: str) -> dict[str, Any] | None:
    if not SECURITYTRAILS_API_KEY:
        return None
    headers = {"APIKEY": SECURITYTRAILS_API_KEY, "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Subdomains
            resp = await client.get(
                f"https://api.securitytrails.com/v1/domain/{domain}/subdomains",
                headers=headers
            )
            subs = []
            if resp.status_code == 200:
                subs = resp.json().get("subdomains", [])[:25]

            # Historical DNS
            resp2 = await client.get(
                f"https://api.securitytrails.com/v1/history/{domain}/dns/a",
                headers=headers
            )
            dns_history = []
            if resp2.status_code == 200:
                dns_history = resp2.json().get("records", [])[:10]

            return {
                "subdomains": [f"{s}.{domain}" for s in subs],
                "total_subdomains": len(subs),
                "dns_history": [
                    {
                        "ip": r.get("ip"),
                        "first_seen": r.get("first_seen"),
                        "last_seen": r.get("last_seen"),
                        "organizations": r.get("organizations", [])
                    }
                    for r in dns_history
                ]
            }
    except Exception as e:
        print(f"SecurityTrails error: {e}")
    return None
