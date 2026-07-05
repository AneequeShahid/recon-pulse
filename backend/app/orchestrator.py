import asyncio
import uuid
from datetime import datetime
from urllib.parse import urlparse
from app.services import (
    rdap_service, ip_service, dns_service,
    ssl_service, pagespeed_service, gnews_service,
    github_service, carbon_service, tranco_service,
    puppeteer_service, wappalyzer_service
)
from app.models import ReportData
from app.database import save_report, update_report

async def run_report(report_id: str, url: str) -> None:
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    if not domain:
        domain = parsed.path.replace("www.", "").split("/")[0]

    # Instantiate report model structure for updating results
    report = ReportData(
        id=report_id,
        url=url,
        created_at=datetime.now(),
        status="pending"
    )

    # Fire all scanner services in parallel (all configured with a 10s maximum timeout)
    results = await asyncio.gather(
        puppeteer_service.fetch_screenshot_and_meta(url),
        wappalyzer_service.fetch_tech_stack(url),
        rdap_service.fetch_domain_info(domain),
        ip_service.fetch_hosting_info(domain),
        dns_service.fetch_dns_records(domain),
        ssl_service.fetch_ssl_grade(domain),
        pagespeed_service.fetch_performance(url),
        gnews_service.fetch_news(domain),
        github_service.fetch_github_info(domain),
        carbon_service.fetch_carbon(url),
        tranco_service.fetch_rank(domain),
        return_exceptions=True
    )

    # If any task threw an exception, default to None to keep report generation robust
    (screenshot_data, tech, domain_info, hosting,
     dns, security, performance, news,
     github, carbon, traffic) = [
        None if isinstance(r, Exception) else r
        for r in results
    ]

    # Populate final results
    if screenshot_data:
        report.screenshot_url = screenshot_data.screenshot_url
        report.og_title = screenshot_data.title
        report.og_description = screenshot_data.description
        report.favicon = screenshot_data.favicon
        
    report.tech_stack = tech
    report.domain = domain_info
    report.hosting = hosting
    report.dns_records = dns
    report.security = security
    report.performance = performance
    report.news = news
    report.github = github
    report.carbon = carbon
    report.traffic = traffic
    report.status = "complete"

    # Update database record
    await update_report(report)
