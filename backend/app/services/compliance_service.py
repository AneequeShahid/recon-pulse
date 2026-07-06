from typing import Any
from app.models import ReportData


SOC2_MAPPING = {
    "CC2.1": "Security headers configured (Observatory grade A/B)",
    "CC2.2": "HTTPS enforced",
    "CC3.1": "Email security (SPF/DMARC) protects communication channels",
    "CC4.1": "Subdomain inventory limits attack surface",
    "CC5.1": "Reputation monitoring detects malicious activity",
    "CC6.1": "TLS/SSL encryption (A-grade or higher)",
    "CC7.1": "HTTP/2 protocol reduces latency and improves security posture",
}

NIST_CSF_MAPPING = {
    "ID.AM-1": "Asset inventory: subdomains, tech stack, and hosting identified",
    "ID.AM-2": "Business criticality tags applied to production assets",
    "ID.RA-1": "Reputation engine scans for threats",
    "ID.RA-3": "CISA KEV threat intelligence integrated",
    "PR.DS-1": "Data-in-transit encryption (TLS/SSL grade check)",
    "PR.DS-2": "Email security controls (SPF/DMARC)",
    "PR.AC-1": "HTTPS redirect enforced",
    "PR.AC-5": "Network segmentation via subdomain grouping",
    "DE.CM-1": "Continuous monitoring of security headers (Observatory)",
    "DE.CM-4": "Malicious domain reputation monitoring",
    "RS.MI-2": "Remediation steps generated for identified gaps",
    "RC.RP-1": "Verify-fix cycle for automated remediation validation",
}


def map_report_to_compliance(report: ReportData) -> dict[str, Any]:
    soc2_results = []
    nist_results = []

    for control_id, description in SOC2_MAPPING.items():
        passed = _check_soc2_control(control_id, report)
        soc2_results.append({
            "control_id": control_id,
            "description": description,
            "status": "Pass" if passed else "Fail",
            "notes": "" if passed else f"Control {control_id} requires attention"
        })

    for control_id, description in NIST_CSF_MAPPING.items():
        passed = _check_nist_control(control_id, report)
        nist_results.append({
            "control_id": control_id,
            "description": description,
            "status": "Pass" if passed else "Fail",
            "notes": "" if passed else f"Control {control_id} requires attention"
        })

    return {
        "framework": "SOC2",
        "total_controls": len(soc2_results),
        "passed": sum(1 for r in soc2_results if r["status"] == "Pass"),
        "failed": sum(1 for r in soc2_results if r["status"] == "Fail"),
        "results": soc2_results
    }, {
        "framework": "NIST CSF",
        "total_controls": len(nist_results),
        "passed": sum(1 for r in nist_results if r["status"] == "Pass"),
        "failed": sum(1 for r in nist_results if r["status"] == "Fail"),
        "results": nist_results
    }


def _check_soc2_control(control_id: str, report: ReportData) -> bool:
    if control_id == "CC2.1":
        return report.observatory is not None and report.observatory.grade in ("A", "A+", "A-", "B", "B+", "B-")
    elif control_id == "CC2.2":
        return report.security is not None and report.security.https
    elif control_id == "CC3.1":
        return report.email_security is not None and report.email_security.spf and report.email_security.dmarc
    elif control_id == "CC4.1":
        return report.subdomains is not None and report.subdomains.total_count <= 20
    elif control_id == "CC5.1":
        return report.reputation is not None and report.reputation.malicious_count == 0
    elif control_id == "CC6.1":
        return report.security is not None and report.security.ssl_grade in ("A+", "A", "A-", "B", "B+", "B-")
    elif control_id == "CC7.1":
        return report.http_version is not None and report.http_version.http2
    return True


def _check_nist_control(control_id: str, report: ReportData) -> bool:
    if control_id == "ID.AM-1":
        return report.subdomains is not None or report.tech_stack is not None
    elif control_id == "ID.AM-2":
        return report.subdomains is not None and report.subdomains.tags is not None and len(report.subdomains.tags) > 0
    elif control_id == "ID.RA-1":
        return report.reputation is not None
    elif control_id == "ID.RA-3":
        return True
    elif control_id == "PR.DS-1":
        return report.security is not None and report.security.ssl_grade in ("A+", "A", "A-", "B", "B+", "B-")
    elif control_id == "PR.DS-2":
        return report.email_security is not None and report.email_security.spf and report.email_security.dmarc
    elif control_id == "PR.AC-1":
        return report.security is not None and report.security.https
    elif control_id == "PR.AC-5":
        return True
    elif control_id == "DE.CM-1":
        return report.observatory is not None
    elif control_id == "DE.CM-4":
        return report.reputation is not None
    elif control_id == "RS.MI-2":
        return True
    elif control_id == "RC.RP-1":
        return True
    return True
