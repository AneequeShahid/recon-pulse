import os
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.analysis.scanner_engine import (
    ScanTemplate,
    TemplateCatalog,
    TemplateExecutor,
    is_template_scan_active,
    build_findings_from_report,
)
from app.models import Finding, ReportData, EmailSecurity, SecurityInfo, ShodanInfo


def test_template_catalog_loads_yaml(tmp_path):
    (tmp_path / "test-tpl.yaml").write_text(
        "id: test-id\nname: Test Template\nmatcher: admin\nseverity: High\n",
        encoding="utf-8",
    )
    catalog = TemplateCatalog(templates_dir=tmp_path)
    templates = catalog.load()
    assert len(templates) == 1
    assert templates[0].id == "test-id"
    assert templates[0].severity == "High"


def test_is_template_scan_active_default_off():
    os.environ.pop("ENABLE_TEMPLATE_SCANNER", None)
    os.environ.pop("TEMPLATE_SCAN_DOMAINS", None)
    assert is_template_scan_active("example.com") is False


def test_is_template_scan_active_allowlist():
    os.environ["TEMPLATE_SCAN_DOMAINS"] = "example.com, test.org"
    os.environ.pop("ENABLE_TEMPLATE_SCANNER", None)
    assert is_template_scan_active("example.com") is True
    assert is_template_scan_active("other.com") is False
    os.environ.pop("TEMPLATE_SCAN_DOMAINS", None)


def test_is_template_scan_active_global_flag():
    os.environ["ENABLE_TEMPLATE_SCANNER"] = "true"
    assert is_template_scan_active("any-domain.com") is True
    os.environ.pop("ENABLE_TEMPLATE_SCANNER", None)


def test_template_executor_word_match():
    executor = TemplateExecutor()
    template = ScanTemplate(id="xss", name="XSS Indicator", matcher="php", matcher_type="word", target="tech_stack")
    assert executor._matches(template, "WordPress PHP Apache") is True
    assert executor._matches(template, "nginx only") is False


def test_template_executor_regex_match():
    executor = TemplateExecutor()
    template = ScanTemplate(
        id="weak",
        name="Weak SSL",
        matcher=r'"ssl_grade": "(C|D|F)',
        matcher_type="regex",
        target="security",
    )
    surface = '{"ssl_grade": "F", "https": false}'
    assert executor._matches(template, surface) is True


def test_build_findings_from_report():
    report = ReportData(
        id="r1",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        remediation_steps=[{"title": "Fix SSL", "description": "Upgrade TLS"}],
        shodan=ShodanInfo(vulns=["CVE-2024-1234"]),
    )
    findings = build_findings_from_report(report)
    assert len(findings) >= 2
    titles = {f.title for f in findings}
    assert "Fix SSL" in titles
    assert any("CVE-2024-1234" in t for t in titles)


@pytest.mark.asyncio
async def test_template_executor_execute_with_report():
    catalog = TemplateCatalog()
    catalog._templates = [
        ScanTemplate(
            id="no-dmarc",
            name="Missing DMARC",
            matcher='"dmarc": false',
            matcher_type="word",
            severity="High",
            target="email_security",
        )
    ]
    executor = TemplateExecutor(catalog=catalog)

    report = ReportData(
        id="r1",
        url="https://example.com",
        created_at=datetime.now(),
        status="complete",
        email_security=EmailSecurity(spf=True, dmarc=False, dkim=False),
    )

    with patch.object(executor, "_build_surfaces", new_callable=AsyncMock) as mock_surfaces:
        mock_surfaces.return_value = {
            "email_security": '{"spf": true, "dmarc": false, "dkim": false}',
            "response": "",
            "headers": "",
        }
        findings = await executor.execute("https://example.com", "example.com", report)

    assert len(findings) == 1
    assert findings[0].id == "tpl-no-dmarc"
    assert findings[0].severity == "High"
    assert findings[0].source == "template"
