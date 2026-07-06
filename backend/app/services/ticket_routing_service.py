from typing import Any, Dict, List, Optional
from app.models import ReportData, Finding
from app.integrations.jira_webhook import create_jira_issue
from app.integrations.github_webhook import create_github_issue


RoutingRule = Dict[str, Any]
RoutingResult = Dict[str, Any]


def _match_finding(finding: Finding, condition: Dict[str, Any]) -> bool:
    severity = condition.get("severity", "").lower()
    asset_tag = condition.get("asset_tag", "").lower()
    source = condition.get("source", "").lower()

    if severity and (finding.severity or "").lower() != severity:
        return False
    if source and (finding.source or "").lower() != source:
        return False
    if asset_tag:
        meta_tag = (finding.metadata or {}).get("asset_tag", "").lower()
        if meta_tag != asset_tag:
            return False
    return True


def _build_issue_title(finding: Finding, report: ReportData) -> str:
    return f"[Recon Pulse] {finding.title} — {report.url}"


def _build_issue_body(finding: Finding, report: ReportData) -> str:
    return (
        f"**Finding:** {finding.title}\n"
        f"**Severity:** {finding.severity}\n"
        f"**Source:** {finding.source}\n"
        f"**Target:** {report.url}\n"
        f"**Score:** {report.summary_score}/100 — {report.threat_level}\n"
        f"**Report ID:** {report.id}\n"
        f"---\n"
        f"{finding.description or 'No description provided.'}"
    )


async def apply_ticket_rules(
    report: ReportData,
    rules: List[RoutingRule],
    integration_keys: Dict[str, Any],
) -> List[RoutingResult]:
    if not rules or not report.findings:
        return []

    results: List[RoutingResult] = []

    for rule in rules:
        condition = rule.get("condition", {})
        action = rule.get("action", {})
        integration = action.get("integration", "").lower()
        label = rule.get("label", "Unnamed Rule")

        for finding in report.findings:
            if not _match_finding(finding, condition):
                continue

            title = _build_issue_title(finding, report)
            body = _build_issue_body(finding, report)

            if integration == "jira":
                result = await create_jira_issue(
                    summary=title,
                    description=body,
                    jira_url=integration_keys.get("jira_url", ""),
                    jira_api_token=integration_keys.get("jira_api_token", ""),
                    jira_project_key=integration_keys.get("jira_project_key", ""),
                    jira_email=integration_keys.get("jira_email", ""),
                    priority=action.get("priority", "Medium"),
                )
                results.append({
                    "rule": label,
                    "integration": "jira",
                    "finding_id": finding.id,
                    "finding_title": finding.title,
                    "success": result is not None,
                })

            elif integration == "github":
                result = await create_github_issue(
                    title=title,
                    body=body,
                    github_token=integration_keys.get("github_token", ""),
                    github_repo=integration_keys.get("github_repo", ""),
                    labels=action.get("labels", ["security", "recon-pulse"]),
                )
                results.append({
                    "rule": label,
                    "integration": "github",
                    "finding_id": finding.id,
                    "finding_title": finding.title,
                    "success": result is not None,
                })

    return results
