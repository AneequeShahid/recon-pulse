import httpx
from typing import Any


async def fetch_ssllabs_grade(domain: str) -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://api.ssllabs.com/api/v3/analyze",
                params={"host": domain, "all": "done"}
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            if data.get("status") != "READY":
                return None

            endpoint = (data.get("endpoints") or [{}])[0]
            return {
                "grade": endpoint.get("grade"),
                "grade_trust_ignored": endpoint.get("gradeTrustIgnored"),
                "has_warnings": endpoint.get("hasWarnings"),
                "is_exceptional": endpoint.get("isExceptional"),
                "progress": data.get("progress"),
                "protocol": data.get("protocol"),
                "chain_issues": data.get("chain", {}).get("issues", False)
            }
    except Exception as e:
        print(f"SSL Labs error: {e}")
    return None
