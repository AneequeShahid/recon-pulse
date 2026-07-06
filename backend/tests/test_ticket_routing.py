import pytest
from datetime import datetime
from app.models import ReportData, Finding
from app.services.ticket_routing_service import _match_finding, _build_issue_title, _build_issue_body


def make_finding(severity="Medium", source="scan", asset_tag="", title="Test Finding"):
    return Finding(
        id="f1",
        title=title,
        description="A test finding description",
        severity=severity,
        source=source,
        metadata={"asset_tag": asset_tag} if asset_tag else {},
    )


def make_report():
    return ReportData(
        id="r1",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        summary_score=45,
        threat_level="Medium",
    )


class TestMatchFinding:
    def test_match_severity(self):
        f = make_finding(severity="Critical")
        assert _match_finding(f, {"severity": "Critical"})
        assert not _match_finding(f, {"severity": "Low"})

    def test_match_source(self):
        f = make_finding(source="scan")
        assert _match_finding(f, {"source": "scan"})
        assert not _match_finding(f, {"source": "alienvault"})

    def test_match_asset_tag(self):
        f = make_finding(asset_tag="Production")
        assert _match_finding(f, {"asset_tag": "Production"})
        assert not _match_finding(f, {"asset_tag": "Staging"})

    def test_match_all(self):
        f = make_finding(severity="High", source="scan", asset_tag="Production")
        assert _match_finding(f, {"severity": "High", "source": "scan", "asset_tag": "Production"})

    def test_match_empty_condition(self):
        f = make_finding()
        assert _match_finding(f, {})

    def test_match_case_insensitive(self):
        f = make_finding(severity="CRITICAL")
        assert _match_finding(f, {"severity": "critical"})


class TestBuildIssueTitle:
    def test_title_format(self):
        f = make_finding(title="Open Port 22")
        r = make_report()
        title = _build_issue_title(f, r)
        assert "[Recon Pulse]" in title
        assert "Open Port 22" in title
        assert "example.com" in title

    def test_body_contains_fields(self):
        f = make_finding(severity="High", title="Weak Cipher")
        r = make_report()
        body = _build_issue_body(f, r)
        assert "Weak Cipher" in body
        assert "High" in body
        assert "example.com" in body

    def test_default_description(self):
        f = Finding(id="f1", title="No Desc")
        r = make_report()
        body = _build_issue_body(f, r)
        assert "No description provided" in body
