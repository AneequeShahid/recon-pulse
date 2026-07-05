import httpx
from app.models import DomainInfo
from datetime import datetime

async def fetch_domain_info(domain: str) -> DomainInfo:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"https://rdap.org/domain/{domain}")
            if res.status_code != 200:
                return DomainInfo()
            data = res.json()
            created = next(
                (e["eventDate"] for e in data.get("events", [])
                 if e["eventAction"] == "registration"), None)
            expires = next(
                (e["eventDate"] for e in data.get("events", [])
                 if e["eventAction"] == "expiration"), None)
            age = None
            if created:
                try:
                    age = (datetime.now() - datetime.fromisoformat(created[:10])).days
                except Exception:
                    pass
            
            registrar = None
            entities = data.get("entities", [])
            if entities:
                try:
                    # Parse registrar name from vcardArray
                    vcard = entities[0].get("vcardArray", [])
                    if len(vcard) > 1:
                        for item in vcard[1]:
                            if item[0] == 'fn':
                                registrar = item[3]
                                break
                except Exception:
                    pass

            return DomainInfo(
                registrar=registrar,
                created=created[:10] if created else None,
                expires=expires[:10] if expires else None,
                age_days=age,
                nameservers=[ns["ldhName"] for ns in data.get("nameservers", []) if "ldhName" in ns]
            )
    except Exception:
        return DomainInfo()
