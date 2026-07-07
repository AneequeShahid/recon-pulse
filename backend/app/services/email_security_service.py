import httpx
from typing import Optional
from app.models import EmailSecurity
from urllib.parse import urlparse

async def fetch_email_security(domain: str) -> EmailSecurity:
    try:
        parsed = urlparse(domain if domain.startswith('http') else f'https://{domain}')
        clean_domain = parsed.netloc.replace('www.', '') or domain.replace('www.', '')
        
        async with httpx.AsyncClient(timeout=10) as client:
            # Check SPF
            spf_res = await client.get(
                f"https://dns.google/resolve?name={clean_domain}&type=TXT"
            )
            txt_records = [
                r.get("data", "") 
                for r in spf_res.json().get("Answer", [])
            ]
            spf = any("v=spf1" in r for r in txt_records)
            dmarc_res = await client.get(
                f"https://dns.google/resolve?name=_dmarc.{clean_domain}&type=TXT"
            )
            dmarc_records = [
                r.get("data", "")
                for r in dmarc_res.json().get("Answer", [])
            ]
            dmarc = any("v=DMARC1" in r for r in dmarc_records)
            dkim_res = await client.get(
                f"https://dns.google/resolve?name=default._domainkey.{clean_domain}&type=TXT"
            )
            dkim = len(dkim_res.json().get("Answer", [])) > 0
            return EmailSecurity(
                spf=spf,
                dmarc=dmarc,
                dkim=dkim,
                spf_record=next((r for r in txt_records if "v=spf1" in r), None),
                dmarc_record=next((r for r in dmarc_records if "v=DMARC1" in r), None)
            )
    except Exception:
        return EmailSecurity(spf=False, dmarc=False, dkim=False)
