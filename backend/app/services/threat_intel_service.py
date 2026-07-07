import httpx, os
from app.models import ThreatIntel

async def fetch_threat_intel(domain: str) -> ThreatIntel:
    vt_key = os.getenv("VIRUSTOTAL_API_KEY")
    otx_key = os.getenv("ALIENVAULT_OTX_KEY")
    shodan_key = os.getenv("SHODAN_API_KEY")

    malicious = suspicious = clean = pulses = 0
    alienvault_malicious = False
    ports = []
    vulns = []
    shodan_org = None

    async with httpx.AsyncClient(timeout=10) as client:
        # VirusTotal
        if vt_key:
            try:
                vt_res = await client.get(
                    f"https://www.virustotal.com/api/v3/domains/{domain}",
                    headers={"x-apikey": vt_key}
                )
                if vt_res.status_code == 200:
                    stats = vt_res.json().get("data",{}).get("attributes",{}).get("last_analysis_stats",{})
                    malicious = stats.get("malicious", 0)
                    suspicious = stats.get("suspicious", 0)
                    clean = stats.get("harmless", 0)
            except Exception:
                pass

        # AlienVault OTX
        if otx_key:
            try:
                otx_res = await client.get(
                    f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/general",
                    headers={"X-OTX-API-KEY": otx_key}
                )
                if otx_res.status_code == 200:
                    data = otx_res.json()
                    pulses = data.get("pulse_info",{}).get("count", 0)
                    alienvault_malicious = pulses > 0
            except Exception:
                pass

        # Shodan
        if shodan_key:
            try:
                sh_res = await client.get(
                    f"https://api.shodan.io/dns/resolve?hostnames={domain}&key={shodan_key}"
                )
                if sh_res.status_code == 200:
                    ip = sh_res.json().get(domain)
                    if ip:
                        host_res = await client.get(
                            f"https://api.shodan.io/shodan/host/{ip}?key={shodan_key}"
                        )
                        if host_res.status_code == 200:
                            host = host_res.json()
                            ports = host.get("ports", [])
                            vulns = list(host.get("vulns", {}).keys())[:5]
                            shodan_org = host.get("org")
            except Exception:
                pass

    threat_score = min(100, (malicious * 10) + (suspicious * 3) + (pulses * 2) + (len(vulns) * 15))

    return ThreatIntel(
        virustotal_malicious=malicious,
        virustotal_suspicious=suspicious,
        virustotal_clean=clean,
        alienvault_pulses=pulses,
        alienvault_malicious=alienvault_malicious,
        shodan_ports=ports[:20],
        shodan_vulns=vulns,
        shodan_org=shodan_org,
        threat_score=threat_score
    )
