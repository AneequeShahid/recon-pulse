import httpx
from app.models import DomainInfo
from datetime import datetime

_cache = {}

async def fetch_domain_info(domain: str) -> DomainInfo:
    if domain in _cache:
        return _cache[domain]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"https://rdap.org/domain/{domain}")
            if res.status_code != 200:
                res_info = DomainInfo()
                _cache[domain] = res_info
                return res_info
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

            res_info = DomainInfo(
                registrar=registrar,
                created=created[:10] if created else None,
                expires=expires[:10] if expires else None,
                age_days=age,
                nameservers=[ns["ldhName"] for ns in data.get("nameservers", []) if "ldhName" in ns]
            )
            _cache[domain] = res_info
            return res_info
    except Exception:
        res_info = DomainInfo()
        _cache[domain] = res_info
        return res_info
