from datetime import datetime
from app.models import ReportData, ReputationInfo, SecurityInfo, ObservatoryInfo
from app.analysis.scoring import calculate_pulse_score

def test_score_boundaries_perfect():
    # Construct a perfect security report
    report = ReportData(
        id="test-id",
        url="https://google.com",
        created_at=datetime.now(),
        status="complete",
        reputation=ReputationInfo(malicious_count=0, total_scanners=70, status="Clean"),
        security=SecurityInfo(ssl_grade="A+", headers_grade="A", https=True),
        observatory=ObservatoryInfo(grade="A", score=100, tests_passed=12, tests_failed=0)
    )
    score, level = calculate_pulse_score(report)
    # The default safes populate the rest. Let's verify we get high score
    assert score >= 90
    assert level == "Low"

def test_score_boundaries_failed_reputation():
    from app.models import PerformanceInfo, SubdomainInfo, EmailSecurity, HTTPVersionInfo
    report = ReportData(
        id="test-id",
        url="https://malicious.com",
        created_at=datetime.now(),
        status="complete",
        reputation=ReputationInfo(malicious_count=5, total_scanners=70, status="Malicious"),
        security=SecurityInfo(ssl_grade="F", headers_grade="F", https=False),
        observatory=ObservatoryInfo(grade="F", score=0, tests_passed=0, tests_failed=12),
        performance=PerformanceInfo(performance_score=0),
        subdomains=SubdomainInfo(subdomains=["s1","s2","s3","s4","s5","s6","s7","s8","s9","s10","s11","s12","s13","s14","s15"]),
        email_security=EmailSecurity(spf=False, dmarc=False, dkim=False),
        http_version=HTTPVersionInfo(http2=False, http3=False)
    )
    score, level = calculate_pulse_score(report)
    assert score == 0
    assert level == "Critical"

def test_score_defaults_are_safe():
    # Empty fields should trigger default safes, keeping the score high (Low/Medium Threat)
    report = ReportData(
        id="test-id",
        url="https://timeout.com",
        created_at=datetime.now(),
        status="complete"
    )
    score, level = calculate_pulse_score(report)
    assert score >= 70
    assert level in ["Low", "Medium"]
