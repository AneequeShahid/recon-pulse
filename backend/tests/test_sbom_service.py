"""Tests for SBOM / Supply Chain analysis service."""

import pytest


@pytest.mark.asyncio
async def test_sbom_empty_tech_stack():
    from app.services.sbom_service import fetch_sbom_vulnerabilities
    result = await fetch_sbom_vulnerabilities([])
    assert result == []


@pytest.mark.asyncio
async def test_sbom_known_ecosystem():
    from app.services.sbom_service import fetch_sbom_vulnerabilities
    # Use a well-known package to get real results
    result = await fetch_sbom_vulnerabilities(["log4j"])
    assert isinstance(result, list)
    # log4j should have known vulns
    if result:
        assert any("CVE" in r.get("vuln_id", "") or "GHSA" in r.get("vuln_id", "") for r in result)
        assert all(r.get("package_name") == "log4j" for r in result)


@pytest.mark.asyncio
async def test_sbom_unknown_ecosystem():
    from app.services.sbom_service import fetch_sbom_vulnerabilities
    result = await fetch_sbom_vulnerabilities(["FictionalTech12345"])
    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_sbom_multiple_techs():
    from app.services.sbom_service import fetch_sbom_vulnerabilities
    result = await fetch_sbom_vulnerabilities(["express", "django"])
    assert isinstance(result, list)


def test_severity_inference():
    from app.services.sbom_service import _infer_severity
    assert _infer_severity(9.5, []) == "Critical"
    assert _infer_severity(7.5, []) == "High"
    assert _infer_severity(5.0, []) == "Medium"
    assert _infer_severity(2.0, []) == "Low"
    assert _infer_severity(None, ["CVE-2024-12345"]) == "Critical"
    assert _infer_severity(None, ["CVE-2023-12345"]) == "High"
    assert _infer_severity(None, ["Something"]) == "Medium"


def test_ecosystem_map_has_entries():
    from app.services.sbom_service import ECOSYSTEM_MAP
    assert len(ECOSYSTEM_MAP) > 20
    assert ECOSYSTEM_MAP["django"] == "PyPI"
    assert ECOSYSTEM_MAP["express"] == "npm"
    assert ECOSYSTEM_MAP["log4j"] == "Maven"
