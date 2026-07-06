from datetime import datetime
from app.models import ReportData, Finding, TechStack
from app.services.community_intel_service import _anonymize_report, get_community_intel


class TestAnonymizeReport:
    def test_with_findings_and_tech(self):
        report = ReportData(
            id="r1",
            url="https://example.com",
            created_at=datetime.now(),
            status="complete",
            tech_stack=TechStack(technologies=["React", "Node.js", "AWS"]),
            findings=[
                Finding(id="f1", title="Missing HSTS", severity="Medium", source="scan"),
            ],
        )
        result = _anonymize_report(report)
        assert result is not None
        assert "finding_hash" in result
        assert result["finding_type"] == "Missing HSTS"
        assert result["severity"] == "Medium"
        assert "React" in result["tech_tags"]

    def test_no_findings(self):
        report = ReportData(
            id="r2",
            url="https://example.com",
            created_at=datetime.now(),
            status="complete",
            findings=[],
        )
        assert _anonymize_report(report) is None

    def test_no_tech_stack(self):
        report = ReportData(
            id="r3",
            url="https://example.com",
            created_at=datetime.now(),
            status="complete",
            findings=[
                Finding(id="f1", title="Open Port", severity="High", source="scan"),
            ],
        )
        result = _anonymize_report(report)
        assert result is not None
        assert result["tech_tags"] == "[]"

    def test_anonymized_does_not_contain_url(self):
        report = ReportData(
            id="r4",
            url="https://sensitive-company.com",
            created_at=datetime.now(),
            status="complete",
            findings=[
                Finding(id="f1", title="Leaked Credentials", severity="Critical", source="scan"),
            ],
        )
        result = _anonymize_report(report)
        assert result is not None
        assert "sensitive-company.com" not in result["finding_hash"]
        assert result["finding_type"] != "https://sensitive-company.com"


class TestCommunityIntel:
    def test_get_intel_returns_list(self):
        result = get_community_intel(limit=5)
        assert isinstance(result, list)
