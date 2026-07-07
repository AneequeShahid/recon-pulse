from fastapi import APIRouter, HTTPException, BackgroundTasks
import uuid
from datetime import datetime
from app.models import ReportRequest, ReportData
from app.orchestrator import run_report
from app.database import get_report, save_report, get_history
from app.cache import get_cached

router = APIRouter()
root_router = APIRouter()

@router.post("/report")
async def create_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks
):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
        
    cached_id = await get_cached(url)
    if cached_id:
        return {"report_id": cached_id, "cached": True}

    report_id = str(uuid.uuid4())[:8]
    
    report = ReportData(
        id=report_id,
        url=url,
        created_at=datetime.now(),
        status="pending"
    )
    await save_report(report)

    routing_keys = {}
    if req.jira_url or req.github_token:
        routing_keys = {
            "jira_url": req.jira_url or "",
            "jira_email": req.jira_email or "",
            "jira_api_token": req.jira_api_token or "",
            "jira_project_key": req.jira_project_key or "",
            "github_token": req.github_token or "",
            "github_repo": req.github_repo or "",
        }

    background_tasks.add_task(run_report, report_id, url, req.routing_rules, routing_keys, req.cloud_creds, req.public_mode)

    return {"report_id": report_id, "cached": False}

@router.post("/prefetch")
async def prefetch_domain(
    req: ReportRequest,
    background_tasks: BackgroundTasks
):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
        
    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    if not domain:
        domain = parsed.path.replace("www.", "").split("/")[0]

    from app.services import rdap_service, ip_service
    background_tasks.add_task(rdap_service.fetch_domain_info, domain)
    background_tasks.add_task(ip_service.fetch_hosting_info, domain)

    return {"status": "prefetching"}

@router.get("/report/history")
async def get_report_history(url: str):
    target_url = url.strip()
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url
    return await get_history(target_url)

@router.get("/report/{report_id}")
async def get_report_by_id(report_id: str) -> ReportData:
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

from fastapi.responses import StreamingResponse
import asyncio
import json

@router.get("/report/{report_id}/stream")
async def stream_report(report_id: str):
    async def event_generator():
        for _ in range(40):
            report = await get_report(report_id)
            if report:
                yield f"data: {report.model_dump_json()}\n\n"
                if report.status == "complete":
                    break
            await asyncio.sleep(1.5)
        yield "data: {\"status\": \"timeout\"}\n\n"
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@router.post("/report/{report_id}/refresh/{service_name}")
async def refresh_service(report_id: str, service_name: str) -> ReportData:
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    from urllib.parse import urlparse
    parsed = urlparse(report.url)
    domain = parsed.netloc.replace("www.", "")
    if not domain:
        domain = parsed.path.replace("www.", "").split("/")[0]
        
    url = report.url

    try:
        if service_name == "screenshot":
            from app.services import puppeteer_service
            screenshot_data = await puppeteer_service.fetch_screenshot_and_meta(url)
            if screenshot_data:
                report.screenshot_url = screenshot_data.screenshot_url
                report.og_title = screenshot_data.title
                report.og_description = screenshot_data.description
                report.favicon = screenshot_data.favicon
        elif service_name == "tech_stack":
            from app.services import wappalyzer_service
            report.tech_stack = await wappalyzer_service.fetch_tech_stack(url)
        elif service_name == "domain":
            from app.services import rdap_service
            report.domain = await rdap_service.fetch_domain_info(domain)
        elif service_name == "hosting":
            from app.services import ip_service
            report.hosting = await ip_service.fetch_hosting_info(domain)
        elif service_name == "dns":
            from app.services import dns_service
            report.dns_records = await dns_service.fetch_dns_records(domain)
        elif service_name == "security":
            from app.services import ssl_service
            report.security = await ssl_service.fetch_ssl_grade(domain)
        elif service_name == "performance":
            from app.services import pagespeed_service
            report.performance = await pagespeed_service.fetch_performance(url)
        elif service_name == "news":
            from app.services import gnews_service
            report.news = await gnews_service.fetch_news(domain)
        elif service_name == "github":
            from app.services import github_service
            report.github = await github_service.fetch_github_info(domain)
        elif service_name == "carbon":
            from app.services import carbon_service
            report.carbon = await carbon_service.fetch_carbon(url)
        elif service_name == "traffic":
            from app.services import tranco_service
            report.traffic = await tranco_service.fetch_rank(domain)
        elif service_name == "redirect_chain":
            from app.services import redirect_service
            report.redirect_chain = await redirect_service.fetch_redirect_chain(url)
        elif service_name == "email_security":
            from app.services import email_security_service
            report.email_security = await email_security_service.fetch_email_security(domain)
        elif service_name == "social":
            from app.services import social_service
            report.social = await social_service.fetch_social_presence(domain)
        elif service_name == "wayback":
            from app.services import wayback_service
            report.wayback = await wayback_service.fetch_wayback_info(domain)
        elif service_name == "http_version":
            from app.services import http_version_service
            report.http_version = await http_version_service.fetch_http_version(url)
        elif service_name == "robots":
            from app.services import robots_service
            report.robots = await robots_service.fetch_robots(domain)
        elif service_name == "threat_intel":
            from app.services import threat_intel_service
            report.threat_intel = await threat_intel_service.fetch_threat_intel(domain)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown service: {service_name}")
            
        # Re-enrich report
        from app.orchestrator import _run_post_scan_enrichment
        from app.analysis.workflow_nodes import ScanContext
        context = ScanContext(report_id=report_id, url=url, domain=domain, report=report)
        await _run_post_scan_enrichment(context)
        
        await save_report(report)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {e}")

@root_router.get("/r/{report_id}")
async def get_report_by_id_root(report_id: str) -> ReportData:
    return await get_report_by_id(report_id)

