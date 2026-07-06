import httpx
from typing import Any

HAVEIBEENPWNED_API = "https://haveibeenpwned.com/api/v3"


async def check_breached_credentials(domain: str) -> list[dict[str, Any]]:
    results = []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{HAVEIBEENPWNED_API}/breaches",
                params={"domain": domain}
            )
            if resp.status_code == 200:
                breaches = resp.json()
                for breach in breaches:
                    results.append({
                        "source": "HaveIBeenPwned",
                        "breach_name": breach.get("Name", "Unknown"),
                        "breach_date": breach.get("BreachDate", "Unknown"),
                        "data_classes": breach.get("DataClasses", []),
                        "description": breach.get("Description", "")[:200]
                    })
    except Exception as e:
        print(f"Dark web credential check error: {e}")
    return results


async def check_leaked_subdomains(domain: str) -> list[str]:
    leaked = []
    try:
        url = f"https://urlscan.io/api/v1/search/?q=domain:{domain}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                for result in data.get("results", [])[:20]:
                    page = result.get("page", {})
                    sub = page.get("domain", "")
                    if sub and sub != domain and sub.endswith(domain):
                        leaked.append(sub)
    except Exception as e:
        print(f"Leaked subdomain check error: {e}")
    return leaked
