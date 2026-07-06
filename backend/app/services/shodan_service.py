import os
import httpx
from typing import Any

SHODAN_API_KEY = os.environ.get("SHODAN_API_KEY", "")


async def fetch_shodan_info(domain: str) -> dict[str, Any] | None:
    if not SHODAN_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.shodan.io/dns/resolve",
                params={"hostnames": domain, "key": SHODAN_API_KEY}
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            ip = data.get(domain)
            if not ip:
                return None

            resp2 = await client.get(
                f"https://api.shodan.io/shodan/host/{ip}",
                params={"key": SHODAN_API_KEY}
            )
            if resp2.status_code != 200:
                return {"ip": ip, "ports": [], "services": []}

            host = resp2.json()
            services = []
            for s in host.get("data", [])[:15]:
                services.append({
                    "port": s.get("port"),
                    "transport": s.get("transport"),
                    "product": s.get("product"),
                    "version": s.get("version"),
                    "name": s.get("_shodan", {}).get("module", s.get("product", "unknown"))
                })

            return {
                "ip": ip,
                "ports": list(set(s["port"] for s in services)),
                "services": services,
                "hostnames": host.get("hostnames", []),
                "os": host.get("os"),
                "vulns": list(host.get("vulns", {}).keys()) if host.get("vulns") else []
            }
    except Exception as e:
        print(f"Shodan error: {e}")
    return None
