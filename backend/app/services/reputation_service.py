import os
import socket
import asyncio
import httpx
from app.models import ReputationInfo

DNSBL_LISTS = [
    "zen.spamhaus.org",
    "bl.spamcop.net",
    "dnsbl.sorbs.net",
    "spam.dnsbl.sorbs.net"
]

async def check_dnsbl(reversed_ip: str, dnsbl: str) -> bool:
    loop = asyncio.get_running_loop()
    query = f"{reversed_ip}.{dnsbl}"
    try:
        await loop.run_in_executor(None, socket.gethostbyname, query)
        return True  # If resolves, it is listed/blacklisted
    except Exception:
        return False

async def fetch_domain_reputation(domain: str) -> ReputationInfo:
    if not domain:
        return ReputationInfo()
        
    api_key = os.environ.get("VIRUSTOTAL_API_KEY", "")
    if api_key:
        url = f"https://www.virustotal.com/api/v3/domains/{domain}"
        headers = {"x-apikey": api_key}
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json().get("data", {})
                    stats = data.get("attributes", {}).get("last_analysis_stats", {})
                    
                    malicious = stats.get("malicious", 0)
                    suspicious = stats.get("suspicious", 0)
                    harmless = stats.get("harmless", 0)
                    undetected = stats.get("undetected", 0)
                    total = malicious + suspicious + harmless + undetected
                    
                    status = "Clean"
                    if malicious > 3:
                        status = "Malicious"
                    elif malicious > 0 or suspicious > 0:
                        status = "Suspicious"
                        
                    return ReputationInfo(
                        malicious_count=malicious,
                        suspicious_count=suspicious,
                        total_scanners=total or 70,
                        status=status
                    )
        except Exception as e:
            print(f"VirusTotal fetch failed, falling back to DNSBL: {e}")
            
    # Keyless Fallback: DNSBL check
    try:
        loop = asyncio.get_running_loop()
        ip = await loop.run_in_executor(None, socket.gethostbyname, domain)
        parts = ip.split(".")
        if len(parts) == 4:
            reversed_ip = ".".join(parts[::-1])
            tasks = [check_dnsbl(reversed_ip, dnsbl) for dnsbl in DNSBL_LISTS]
            results = await asyncio.gather(*tasks)
            malicious = sum(1 for r in results if r)
            
            status = "Clean"
            if malicious > 1:
                status = "Malicious"
            elif malicious > 0:
                status = "Suspicious"
                
            return ReputationInfo(
                malicious_count=malicious,
                suspicious_count=0,
                total_scanners=len(DNSBL_LISTS),
                status=status
            )
    except Exception as e:
        print(f"DNSBL reputation check error for {domain}: {e}")
        
    return ReputationInfo(status="Unknown")
