import os
import httpx
from typing import Any

ALIENVAULT_OTX_KEY = os.environ.get("ALIENVAULT_OTX_KEY", "")


async def fetch_alienvault_pulses(domain: str) -> dict[str, Any] | None:
    if not ALIENVAULT_OTX_KEY:
        return None
    headers = {"X-OTX-API-KEY": ALIENVAULT_OTX_KEY}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns",
                headers=headers
            )
            passive_dns = []
            if resp.status_code == 200:
                passive_dns = resp.json().get("passive_dns", [])[:10]

            resp2 = await client.get(
                f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/url_list",
                headers=headers
            )
            urls = []
            if resp2.status_code == 200:
                urls = resp2.json().get("url_list", [])[:10]

            resp3 = await client.get(
                f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/reputation",
                headers=headers
            )
            reputation = None
            if resp3.status_code == 200:
                reputation = resp3.json()

            return {
                "passive_dns": [
                    {
                        "hostname": r.get("hostname"),
                        "address": r.get("address"),
                        "first_seen": r.get("first_seen"),
                        "last_seen": r.get("last_seen"),
                        "record_type": r.get("record_type")
                    }
                    for r in passive_dns
                ],
                "related_urls": [u.get("url") for u in urls if u.get("url")],
                "reputation": reputation.get("reputation") if reputation else None,
                "threat_score": reputation.get("threat_score") if reputation else None
            }
    except Exception as e:
        print(f"AlienVault OTX error: {e}")
    return None
