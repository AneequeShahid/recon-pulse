import pytest
from unittest.mock import AsyncMock, patch

from app.analysis.workflow_nodes import (
    ScanContext,
    ExecutionQueue,
    ServiceWorkflowNode,
    build_scan_queue,
    apply_results_to_report,
)
from app.models import ReportData
from datetime import datetime


@pytest.mark.asyncio
async def test_execution_queue_runs_nodes():
    async def mock_fn(domain):
        return {"domain": domain}

    node = ServiceWorkflowNode("test_node", mock_fn, timeout=2)
    queue = ExecutionQueue([node])

    report = ReportData(id="r1", url="https://example.com", created_at=datetime.now(), status="pending")
    context = ScanContext(report_id="r1", url="https://example.com", domain="example.com", report=report)

    results = await queue.run_all(context)
    assert results["test_node"] == {"domain": "example.com"}


@pytest.mark.asyncio
async def test_execution_queue_handles_node_failure():
    async def failing_fn(domain):
        raise RuntimeError("service down")

    node = ServiceWorkflowNode("fail_node", failing_fn, timeout=2)
    queue = ExecutionQueue([node])

    report = ReportData(id="r1", url="https://example.com", created_at=datetime.now(), status="pending")
    context = ScanContext(report_id="r1", url="https://example.com", domain="example.com", report=report)

    results = await queue.run_all(context)
    assert results["fail_node"] is None


def test_build_scan_queue_has_expected_nodes():
    queue = build_scan_queue()
    names = {n.name for n in queue.nodes}
    assert "shodan" in names
    assert "ssllabs" in names
    assert "dns" in names
    assert len(queue.nodes) == 24


def test_apply_results_to_report():
    report = ReportData(id="r1", url="https://example.com", created_at=datetime.now(), status="pending")
    context = ScanContext(
        report_id="r1",
        url="https://example.com",
        domain="example.com",
        report=report,
        results={"dns": {"A": ["1.2.3.4"]}, "tech_stack": None},
    )
    apply_results_to_report(context)
    assert report.dns_records == {"A": ["1.2.3.4"]}
