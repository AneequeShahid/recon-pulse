from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import os
import json
from app.database import _get_report_sync, _update_report_sync, save_case, get_case, list_cases_for_report
from app.models import InvestigationCase
from app.services.compliance_service import map_report_to_compliance
from app.services.darkweb_service import check_breached_credentials, check_leaked_subdomains
from app.services.verify_fix_service import verify_remediation
from app.integrations.jira_webhook import create_jira_issue
from app.integrations.github_webhook import create_github_issue
from urllib.parse import urlparse

router = APIRouter(prefix="/api/enterprise", tags=["enterprise"])


class TagRequest(BaseModel):
    subdomain: str
    business_criticality: str


@router.post("/report/{report_id}/tag")
async def tag_subdomain(report_id: str, req: TagRequest):
    report = _get_report_sync(report_id)
    if not report:
        return {"error": "Report not found"}

    if report.subdomains and report.subdomains.tags:
        tags = report.subdomains.tags
        existing = [t for t in tags if t.subdomain == req.subdomain]
        if existing:
            existing[0].business_criticality = req.business_criticality
        else:
            from app.models import SubdomainTag
            tags.append(SubdomainTag(subdomain=req.subdomain, business_criticality=req.business_criticality))
    elif report.subdomains:
        from app.models import SubdomainTag
        report.subdomains.tags = [SubdomainTag(subdomain=req.subdomain, business_criticality=req.business_criticality)]

    _update_report_sync(report)
    return {"status": "ok", "tag": req.subdomain, "criticality": req.business_criticality}


@router.get("/report/{report_id}/compliance")
async def get_compliance(report_id: str):
    report = _get_report_sync(report_id)
    if not report:
        return {"error": "Report not found"}
    soc2, nist = map_report_to_compliance(report)
    return {"soc2": soc2, "nist_csf": nist}


@router.get("/report/{report_id}/darkweb")
async def get_darkweb_intel(report_id: str):
    report = _get_report_sync(report_id)
    if not report:
        return {"error": "Report not found"}
    parsed = urlparse(report.url)
    domain = parsed.netloc or parsed.path.split("/")[0]
    domain = domain.replace("www.", "")

    import asyncio
    breaches, leaked_subs = await asyncio.gather(
        check_breached_credentials(domain),
        check_leaked_subdomains(domain),
        return_exceptions=True
    )
    return {
        "breaches": breaches if not isinstance(breaches, Exception) else [],
        "leaked_subdomains": leaked_subs if not isinstance(leaked_subs, Exception) else []
    }


@router.post("/report/{report_id}/verify-fix")
async def verify_report_fix(report_id: str):
    result = await verify_remediation(report_id)
    return result


class IssueRequest(BaseModel):
    title: str
    description: str
    type: str = "jira"
    jira_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_project_key: str = ""
    github_token: str = ""
    github_repo: str = ""


@router.post("/report/{report_id}/create-issue")
async def create_ticket(report_id: str, req: IssueRequest):
    report = _get_report_sync(report_id)
    if not report:
        return {"error": "Report not found"}

    body = f"{req.description}\n\n---\nRecon Pulse Report: {report_id}\nURL: {report.url}\nScore: {report.summary_score}/100\nThreat: {report.threat_level}"

    if req.type == "jira":
        result = await create_jira_issue(req.title, body, req.jira_url, req.jira_api_token, req.jira_project_key, req.jira_email)
        return {"integration": "jira", "result": result or "Jira API error"}
    elif req.type == "github":
        result = await create_github_issue(req.title, body, req.github_token, req.github_repo, labels=["security", "recon-pulse"])
        return {"integration": "github", "result": result or "GitHub API error"}
    return {"error": "Unknown integration type"}


class PromoteToCaseRequest(BaseModel):
    finding_ids: List[str]
    title: Optional[str] = None
    workspace_id: Optional[str] = None
    notes: Optional[str] = None


@router.post("/report/{report_id}/promote-to-case")
async def promote_to_case(
    report_id: str,
    req: PromoteToCaseRequest,
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
):
    """
    TheHive-style case promotion: move selected findings into an investigation workspace.
    Marks findings as promoted and links them to a new case record.
    """
    report = _get_report_sync(report_id)
    if not report:
        return {"error": "Report not found"}

    if not report.findings:
        return {"error": "No findings on this report"}

    if not req.finding_ids:
        return {"error": "finding_ids is required"}

    finding_map = {f.id: f for f in report.findings}
    missing = [fid for fid in req.finding_ids if fid not in finding_map]
    if missing:
        return {"error": "Findings not found", "missing_ids": missing}

    case_id = str(uuid.uuid4())[:8]
    workspace = req.workspace_id or x_workspace_id or "anonymous"
    title = req.title or f"Investigation: {report.url}"

    for fid in req.finding_ids:
        finding = finding_map[fid]
        finding.is_promoted = True
        finding.case_id = case_id

    case = InvestigationCase(
        id=case_id,
        report_id=report_id,
        workspace_id=workspace,
        title=title,
        status="open",
        finding_ids=req.finding_ids,
        created_at=datetime.now(),
        notes=req.notes,
    )

    _update_report_sync(report)
    await save_case(case)

    promoted = [finding_map[fid].model_dump(mode="json") for fid in req.finding_ids]
    return {
        "status": "promoted",
        "case": case.model_dump(mode="json"),
        "findings": promoted,
    }


@router.get("/report/{report_id}/cases")
async def get_report_cases(report_id: str):
    report = _get_report_sync(report_id)
    if not report:
        return {"error": "Report not found"}
    cases = await list_cases_for_report(report_id)
    return {"cases": [c.model_dump(mode="json") for c in cases]}


SHARE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "shares")
os.makedirs(SHARE_DIR, exist_ok=True)


class ShareRequest(BaseModel):
    data: str


@router.post("/workspace/share")
async def share_workspace(req: ShareRequest):
    import uuid
    share_id = str(uuid.uuid4())[:12]
    path = os.path.join(SHARE_DIR, f"{share_id}.json")
    try:
        with open(path, "w") as f:
            f.write(req.data)
        return {"share_id": share_id, "url": f"/api/workspace/share/{share_id}"}
    except Exception as e:
        return {"error": f"Failed to store share: {e}"}


@router.get("/workspace/share/{share_id}")
async def get_shared_workspace(share_id: str):
    safe = share_id.replace("..", "").replace("/", "").replace("\\", "")
    path = os.path.join(SHARE_DIR, f"{safe}.json")
    if not os.path.isfile(path):
        return {"error": "Share not found or expired"}
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"error": f"Failed to read share: {e}"}


@router.get("/community/intel")
async def get_community_intel():
    from app.services.community_intel_service import get_community_intel
    return {"intel": get_community_intel()}


@router.get("/audit/verify-chain")
async def verify_audit_chain():
    from app.database import _verify_chain_sync
    return _verify_chain_sync()


@router.get("/cases/{case_id}")
async def get_investigation_case(case_id: str):
    case = await get_case(case_id)
    if not case:
        return {"error": "Case not found"}

    report = _get_report_sync(case.report_id)
    findings = []
    if report and report.findings:
        id_set = set(case.finding_ids)
        findings = [f.model_dump(mode="json") for f in report.findings if f.id in id_set]

    return {
        "case": case.model_dump(mode="json"),
        "findings": findings,
    }
