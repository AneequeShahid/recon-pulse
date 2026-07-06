"""
Nuclei-style YAML template scanner.

Templates live in backend/app/templates/ and declare id, matcher, and severity.
TemplateExecutor loads them and runs matchers against scan surfaces built from
the target URL and completed report context.
"""

from __future__ import annotations

import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Optional

import httpx
import yaml
from pydantic import BaseModel, Field

from app.models import Finding, ReportData

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


class ScanTemplate(BaseModel):
    id: str
    name: str
    matcher: str
    severity: str = "Medium"
    matcher_type: str = "word"  # "word" | "regex"
    target: str = "response"  # response | tech_stack | headers | security | email_security


class TemplateCatalog:
    """Loads and caches YAML templates from disk."""

    def __init__(self, templates_dir: Path | None = None) -> None:
        self.templates_dir = templates_dir or TEMPLATES_DIR
        self._templates: list[ScanTemplate] | None = None

    def load(self, force_reload: bool = False) -> list[ScanTemplate]:
        if self._templates is not None and not force_reload:
            return self._templates

        templates: list[ScanTemplate] = []
        if not self.templates_dir.is_dir():
            self._templates = templates
            return templates

        for path in sorted(self.templates_dir.glob("*.yaml")):
            try:
                raw = yaml.safe_load(path.read_text(encoding="utf-8"))
                if isinstance(raw, dict) and raw.get("id"):
                    templates.append(ScanTemplate.model_validate(raw))
            except Exception as exc:
                print(f"[TEMPLATE] Failed to load {path.name}: {exc}")

        self._templates = templates
        return templates


def is_template_scan_active(domain: str) -> bool:
    """Per-domain gate — template scanning is opt-in to stay non-breaking."""
    if os.environ.get("ENABLE_TEMPLATE_SCANNER", "").lower() == "true":
        return True

    allowlist = os.environ.get("TEMPLATE_SCAN_DOMAINS", "")
    if not allowlist.strip():
        return False

    allowed = {d.strip().lower() for d in allowlist.split(",") if d.strip()}
    return domain.lower() in allowed


class TemplateExecutor:
    """Runs loaded templates against a target and returns Finding objects."""

    def __init__(self, catalog: TemplateCatalog | None = None) -> None:
        self.catalog = catalog or TemplateCatalog()

    async def execute(
        self,
        url: str,
        domain: str,
        report: ReportData | None = None,
    ) -> list[Finding]:
        templates = self.catalog.load()
        if not templates:
            return []

        surfaces = await self._build_surfaces(url, domain, report)
        findings: list[Finding] = []

        for template in templates:
            surface = surfaces.get(template.target, surfaces.get("response", ""))
            if not surface:
                continue
            if self._matches(template, surface):
                findings.append(
                    Finding(
                        id=f"tpl-{template.id}",
                        title=template.name,
                        description=f"Template '{template.id}' matched on {template.target}",
                        severity=template.severity,
                        source="template",
                        metadata={
                            "template_id": template.id,
                            "matcher": template.matcher,
                            "matcher_type": template.matcher_type,
                            "target": template.target,
                        },
                    )
                )

        return findings

    async def _build_surfaces(
        self,
        url: str,
        domain: str,
        report: ReportData | None,
    ) -> dict[str, str]:
        surfaces: dict[str, str] = {}

        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url if url.startswith("http") else f"https://{domain}")
                surfaces["response"] = resp.text[:50_000]
                surfaces["headers"] = json.dumps(dict(resp.headers))
        except Exception as exc:
            print(f"[TEMPLATE] HTTP fetch failed for {domain}: {exc}")
            surfaces["response"] = ""
            surfaces["headers"] = ""

        if report:
            if report.tech_stack and report.tech_stack.technologies:
                surfaces["tech_stack"] = " ".join(report.tech_stack.technologies).lower()
            if report.security:
                surfaces["security"] = json.dumps(report.security.model_dump(mode="json"))
            if report.email_security:
                surfaces["email_security"] = json.dumps(report.email_security.model_dump(mode="json"))

        return surfaces

    def _matches(self, template: ScanTemplate, surface: str) -> bool:
        if template.matcher_type == "regex":
            try:
                return bool(re.search(template.matcher, surface, re.IGNORECASE))
            except re.error:
                return False

        return template.matcher.lower() in surface.lower()


def build_findings_from_report(
    report: ReportData,
    template_findings: list[Finding] | None = None,
) -> list[Finding]:
    """Aggregate scan outputs into unified Finding objects."""
    findings: list[Finding] = []
    seen_titles: set[str] = set()

    if template_findings:
        for f in template_findings:
            findings.append(f)
            seen_titles.add(f.title)

    if report.remediation_steps:
        for i, step in enumerate(report.remediation_steps):
            title = step.get("title", f"Finding {i}")
            if title in seen_titles:
                continue
            seen_titles.add(title)
            findings.append(
                Finding(
                    id=f"rem-{uuid.uuid4().hex[:8]}",
                    title=title,
                    description=step.get("description"),
                    severity=_severity_from_title(title),
                    source="remediation",
                    metadata={"remediation": step},
                )
            )

    if report.shodan and report.shodan.vulns:
        for vuln in report.shodan.vulns:
            title = f"Shodan Vulnerability: {vuln}"
            if title in seen_titles:
                continue
            seen_titles.add(title)
            findings.append(
                Finding(
                    id=f"shodan-{vuln}",
                    title=title,
                    description=f"Known vulnerability detected via Shodan: {vuln}",
                    severity="Critical",
                    source="shodan",
                    metadata={"cve": vuln},
                )
            )

    return findings


def _severity_from_title(title: str) -> str:
    lower = title.lower()
    if any(k in lower for k in ("critical", "vulnerability", "breach", "exploit")):
        return "Critical"
    if any(k in lower for k in ("ssl", "tls", "https", "dmarc", "spf")):
        return "High"
    if any(k in lower for k in ("header", "subdomain", "exposure")):
        return "Medium"
    return "Low"
