from datetime import datetime
from app.models import ReportData, SecurityInfo, ObservatoryInfo, EmailSecurity, HTTPVersionInfo
from app.analysis.remediation import generate_remediation_steps


def test_remediation_empty_when_perfect():
    report = ReportData(
        id="test-id",
        url="https://google.com",
        created_at=datetime.now(),
        status="complete",
        security=SecurityInfo(ssl_grade="A+", https=True),
        observatory=ObservatoryInfo(grade="A", score=100, tests_passed=12, tests_failed=0),
        email_security=EmailSecurity(spf=True, dmarc=True, dkim=True),
        http_version=HTTPVersionInfo(http2=True, http3=True)
    )
    steps = generate_remediation_steps(report)
    assert len(steps) == 0


def test_remediation_security_headers():
    report = ReportData(
        id="test-id",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        observatory=ObservatoryInfo(grade="F", score=20, tests_passed=2, tests_failed=10),
        security=SecurityInfo(https=True),
        email_security=EmailSecurity(spf=True, dmarc=True, dkim=True)
    )
    steps = generate_remediation_steps(report)
    titles = [s["title"] for s in steps]
    assert "Configure Missing Security Headers" in titles


def test_remediation_https_redirect():
    report = ReportData(
        id="test-id",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        security=SecurityInfo(ssl_grade="A+", https=False),
        email_security=EmailSecurity(spf=True, dmarc=True, dkim=True),
        http_version=HTTPVersionInfo(http2=True, http3=True)
    )
    steps = generate_remediation_steps(report)
    titles = [s["title"] for s in steps]
    assert "Enforce Global HTTPS Redirect" in titles


def test_remediation_email_security():
    report = ReportData(
        id="test-id",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        email_security=EmailSecurity(spf=False, dmarc=False, dkim=False),
        security=SecurityInfo(ssl_grade="A+", https=True),
        http_version=HTTPVersionInfo(http2=True, http3=True)
    )
    steps = generate_remediation_steps(report)
    titles = [s["title"] for s in steps]
    assert any("Email" in t for t in titles)


def test_remediation_all_severity():
    report = ReportData(
        id="test-id",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        security=SecurityInfo(ssl_grade="F", https=False),
        observatory=ObservatoryInfo(grade="F", score=0, tests_passed=0, tests_failed=12),
        email_security=EmailSecurity(spf=False, dmarc=False, dkim=False),
        http_version=HTTPVersionInfo(http2=False, http3=False)
    )
    steps = generate_remediation_steps(report)
    assert len(steps) >= 4


def test_remediation_null_metrics():
    report = ReportData(
        id="test-id",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete"
    )
    steps = generate_remediation_steps(report)
    assert isinstance(steps, list)


def test_remediation_partial_data():
    report = ReportData(
        id="test-id",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        security=SecurityInfo(ssl_grade="C", https=True),
        email_security=EmailSecurity(spf=True, dmarc=False, dkim=True)
    )
    steps = generate_remediation_steps(report)
    titles = [s["title"] for s in steps]
    assert "Upgrade TLS / SSL Configuration" in titles
    assert any("Email" in t for t in titles)
