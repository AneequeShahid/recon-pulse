import httpx
from typing import Any

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
_cache: list[dict[str, Any]] | None = None


async def fetch_cisa_kev() -> list[dict[str, Any]]:
    global _cache
    if _cache is not None:
        return _cache
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(CISA_KEV_URL)
            if resp.status_code == 200:
                data = resp.json()
                _cache = data.get("vulnerabilities", [])
                return _cache
    except Exception as e:
        print(f"CISA KEV fetch error: {e}")
    return []


def check_kev_match(technologies: list[str], kev_list: list[dict[str, Any]]) -> bool:
    if not technologies or not kev_list:
        return False
    for vuln in kev_list:
        product = (vuln.get("product", "") or "").lower()
        vendor = (vuln.get("vendorProject", "") or "").lower()
        for tech in technologies:
            tech_lower = tech.lower()
            if product and (product in tech_lower or tech_lower in product):
                return True
            if vendor and (vendor in tech_lower or tech_lower in vendor):
                return True
    return False
