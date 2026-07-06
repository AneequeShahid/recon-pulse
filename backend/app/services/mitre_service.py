from typing import List, Dict

MITRE_MAP = [
    {"technique_id": "T1190", "name": "Exploit Public-Facing Application", "tactic": "Initial Access", "severity": "Critical", "remediation_match": "Security Header|Observatory|WAF"},
    {"technique_id": "T1195", "name": "Supply Chain Compromise", "tactic": "Initial Access", "severity": "High", "remediation_match": "Certificate|SSL"},
    {"technique_id": "T1566", "name": "Phishing", "tactic": "Initial Access", "severity": "High", "remediation_match": "Email|SPF|DMARC|Spoofing"},
    {"technique_id": "T1573", "name": "Encrypted Channel", "tactic": "Command & Control", "severity": "Medium", "remediation_match": "SSL|TLS|Cipher|Protocol"},
    {"technique_id": "T1557", "name": "Adversary-in-the-Middle", "tactic": "Credential Access", "severity": "High", "remediation_match": "HTTPS|Redirect|HSTS"},
    {"technique_id": "T1590", "name": "Gather Victim Network Information", "tactic": "Reconnaissance", "severity": "Medium", "remediation_match": "Subdomain|Exposure|Attack Surface"},
    {"technique_id": "T1589", "name": "Gather Victim Identity Information", "tactic": "Reconnaissance", "severity": "Low", "remediation_match": "Social|LinkedIn"},
    {"technique_id": "T1089", "name": "BITS Jobs", "tactic": "Defense Evasion", "severity": "Medium", "remediation_match": "Security Header|CSP|HSTS"},
    {"technique_id": "T1071", "name": "Application Layer Protocol", "tactic": "Command & Control", "severity": "Low", "remediation_match": "HTTP|Protocol"},
    {"technique_id": "T1040", "name": "Network Sniffing", "tactic": "Credential Access", "severity": "Medium", "remediation_match": "Protocol|TLS"},
    {"technique_id": "T1204", "name": "User Execution", "tactic": "Execution", "severity": "Medium", "remediation_match": "Performance|Tracking|Script"},
]

CRITICAL_CVE_MAP = {
    "CVE-202": "T1190",
    "CVE-2021-": "T1190",
    "CVE-2022-": "T1190",
    "CVE-2023-": "T1190",
    "CVE-2024-": "T1190",
    "CVE-201": "T1190",
}

TECHNIQUE_TO_TACTIC = {
    "T1190": "Initial Access",
    "T1195": "Initial Access",
    "T1566": "Initial Access",
    "T1573": "Command & Control",
    "T1557": "Credential Access",
    "T1590": "Reconnaissance",
    "T1589": "Reconnaissance",
    "T1089": "Defense Evasion",
    "T1071": "Command & Control",
    "T1040": "Credential Access",
    "T1204": "Execution",
}


def map_mitre_for_remediation(title: str, description: str, vulns: List[str] | None = None) -> List[Dict[str, str]]:
    combined = f"{title} {description}".lower()
    matches = []

    for mapping in MITRE_MAP:
        keywords = mapping["remediation_match"].lower().split("|")
        if any(kw in combined for kw in keywords):
            matches.append({
                "technique_id": mapping["technique_id"],
                "name": mapping["name"],
                "tactic": mapping["tactic"],
            })

    if vulns:
        for vuln in vulns:
            for prefix, tech_id in CRITICAL_CVE_MAP.items():
                if vuln.upper().startswith(prefix) and not any(m["technique_id"] == tech_id for m in matches):
                    tactic = TECHNIQUE_TO_TACTIC.get(tech_id, "Unknown")
                    matches.append({"technique_id": tech_id, "name": "Exploit Public-Facing Application", "tactic": tactic})

    return matches

