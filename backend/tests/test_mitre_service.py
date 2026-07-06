from datetime import datetime
from app.models import ReportData, SecurityInfo, EmailSecurity, HTTPVersionInfo, ObservatoryInfo
from app.analysis.remediation import generate_remediation_steps


def test_mitre_mapping_present():
    report = ReportData(
        id="test-id",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        security=SecurityInfo(ssl_grade="F", https=False),
        email_security=EmailSecurity(spf=False, dmarc=False, dkim=False),
        http_version=HTTPVersionInfo(http2=False, http3=False),
        observatory=ObservatoryInfo(grade="F", score=10, tests_passed=0, tests_failed=10),
    )
    steps = generate_remediation_steps(report)
    assert len(steps) >= 4
    for step in steps:
        assert "mitre_attack" in step, f"Step '{step['title']}' missing mitre_attack"
        assert len(step["mitre_attack"]) > 0, f"Step '{step['title']}' has empty mitre_attack"


def test_mitre_mapping_empty_when_perfect():
    report = ReportData(
        id="test-id",
        url="https://google.com",
        created_at=datetime.now(),
        status="complete",
        security=SecurityInfo(ssl_grade="A+", https=True),
        observatory=ObservatoryInfo(grade="A", score=100, tests_passed=12, tests_failed=0),
        email_security=EmailSecurity(spf=True, dmarc=True, dkim=True),
        http_version=HTTPVersionInfo(http2=True, http3=True),
    )
    steps = generate_remediation_steps(report)
    assert len(steps) == 0


def test_mitre_keyword_matching():
    from app.services.mitre_service import map_mitre_for_remediation
    result = map_mitre_for_remediation("Missing Security Headers", "Observatory grade is F", [])
    techniques = [m["technique_id"] for m in result]
    assert "T1190" in techniques  # Security Header|Observatory|WAF
    assert "T1089" in techniques  # Security Header|CSP|HSTS

    ssl_result = map_mitre_for_remediation("Upgrade TLS", "Weak SSL certificate config", [])
    ssl_techs = [m["technique_id"] for m in ssl_result]
    assert "T1195" in ssl_techs  # Certificate|SSL
    assert "T1573" in ssl_techs  # SSL|TLS|Cipher|Protocol


def test_mitre_cve_mapping():
    from app.services.mitre_service import map_mitre_for_remediation
    vulns = ["CVE-2024-12345", "CVE-2023-67890"]
    result = map_mitre_for_remediation("Some title", "Some description", vulns)
    techniques = [m["technique_id"] for m in result]
    assert "T1190" in techniques  # CVE prefix maps to T1190


def test_mitre_tactic_lookup():
    from app.services.mitre_service import TECHNIQUE_TO_TACTIC
    assert TECHNIQUE_TO_TACTIC["T1190"] == "Initial Access"
    assert TECHNIQUE_TO_TACTIC["T1566"] == "Initial Access"
    assert TECHNIQUE_TO_TACTIC["T1557"] == "Credential Access"
    assert TECHNIQUE_TO_TACTIC["T1071"] == "Command & Control"
