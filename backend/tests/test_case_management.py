from datetime import datetime
import uuid

import pytest

from app.models import Finding, ReportData, InvestigationCase
from app.database import _save_case_sync, _get_case_sync, _list_cases_for_report_sync, _get_report_sync, _save_report_sync
from app.routers.enterprise import promote_to_case, PromoteToCaseRequest


@pytest.fixture
def sample_report_with_findings():
    report_id = f"testrep-{uuid.uuid4().hex[:8]}"
    report = ReportData(
        id=report_id,
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        findings=[
            Finding(id="f1", title="Weak SSL", severity="High", source="remediation"),
            Finding(id="f2", title="Missing DMARC", severity="High", source="template"),
            Finding(id="f3", title="Open Port", severity="Medium", source="shodan"),
        ],
    )
    _save_report_sync(report)
    return report


@pytest.mark.asyncio
async def test_promote_to_case(sample_report_with_findings):
    req = PromoteToCaseRequest(
        finding_ids=["f1", "f2"],
        title="SSL & Email Investigation",
        workspace_id="ws-test",
        notes="Priority review",
    )
    result = await promote_to_case("testrep1", req, x_workspace_id="ws-test")

    assert result["status"] == "promoted"
    assert result["case"]["title"] == "SSL & Email Investigation"
    assert set(result["case"]["finding_ids"]) == {"f1", "f2"}

    updated = _get_report_sync("testrep1")
    assert updated is not None
    promoted = [f for f in updated.findings if f.is_promoted]
    assert len(promoted) == 2
    assert all(f.case_id == result["case"]["id"] for f in promoted)

    case = _get_case_sync(result["case"]["id"])
    assert case is not None
    assert case.workspace_id == "ws-test"
    assert case.notes == "Priority review"


@pytest.mark.asyncio
async def test_promote_to_case_missing_finding(sample_report_with_findings):
    req = PromoteToCaseRequest(finding_ids=["f1", "nonexistent"])
    result = await promote_to_case("testrep1", req)
    assert "error" in result
    assert result["missing_ids"] == ["nonexistent"]


def test_case_persistence():
    case = InvestigationCase(
        id="case01",
        report_id="rep01",
        workspace_id="ws1",
        title="Test Case",
        finding_ids=["a", "b"],
        created_at=datetime.now(),
        notes="note",
    )
    _save_case_sync(case)
    loaded = _get_case_sync("case01")
    assert loaded is not None
    assert loaded.title == "Test Case"
    assert loaded.finding_ids == ["a", "b"]

    cases = _list_cases_for_report_sync("rep01")
    assert any(c.id == "case01" for c in cases)
