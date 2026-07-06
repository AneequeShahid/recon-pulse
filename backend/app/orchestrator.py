import asyncio
import uuid
from datetime import datetime
from urllib.parse import urlparse
from app.services import (
    rdap_service, ip_service, dns_service,
    ssl_service, pagespeed_service, gnews_service,
    github_service, carbon_service, tranco_service,
    puppeteer_service, wappalyzer_service, redirect_service,
    email_security_service, social_service, wayback_service,
    http_version_service, robots_service, bgp_service,
    subdomain_service, reputation_service, observatory_service
)
from app.models import ReportData
from app.database import save_report, update_report

async def wrap_with_timeout(coro, timeout_sec):
    return await asyncio.wait_for(coro, timeout=timeout_sec)

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
    print("[ORCHESTRATOR] running all services in parallel")
    
    # We will gather target hosting info first to resolve ASN for the BGP check
    try:
        hosting_resolved = await wrap_with_timeout(ip_service.fetch_hosting_info(domain), 5)
    except Exception as e:
        print(f"Initial hosting pre-fetch failed: {e}")
        hosting_resolved = None

    asn = hosting_resolved.asn if hosting_resolved else None

    results = await asyncio.gather(
        wrap_with_timeout(puppeteer_service.fetch_screenshot_and_meta(url), 7),
        wrap_with_timeout(wappalyzer_service.fetch_tech_stack(url), 7),
        wrap_with_timeout(rdap_service.fetch_domain_info(domain), 7),
        wrap_with_timeout(dns_service.fetch_dns_records(domain), 5),
        wrap_with_timeout(ssl_service.fetch_ssl_grade(domain), 15),
        wrap_with_timeout(pagespeed_service.fetch_performance(url), 7),
        wrap_with_timeout(gnews_service.fetch_news(domain), 7),
        wrap_with_timeout(github_service.fetch_github_info(domain), 7),
        wrap_with_timeout(carbon_service.fetch_carbon(url), 7),
        wrap_with_timeout(tranco_service.fetch_rank(domain), 7),
        wrap_with_timeout(redirect_service.fetch_redirect_chain(url), 7),
        wrap_with_timeout(email_security_service.fetch_email_security(domain), 7),
        wrap_with_timeout(social_service.fetch_social_presence(domain), 7),
        wrap_with_timeout(wayback_service.fetch_wayback_info(domain), 15),
        wrap_with_timeout(http_version_service.check_http_version(domain), 7),
        wrap_with_timeout(robots_service.fetch_robots_and_sitemap(domain), 7),
        wrap_with_timeout(bgp_service.fetch_bgp_info(asn), 7),
        wrap_with_timeout(subdomain_service.fetch_subdomains(domain), 7),
        wrap_with_timeout(reputation_service.fetch_domain_reputation(domain), 5),
        wrap_with_timeout(observatory_service.fetch_observatory_grade(domain), 7),
        return_exceptions=True
    )

    # If any task threw an exception, default to None to keep report generation robust
    (screenshot_data, tech, domain_info, dns,
     security, performance, news, github,
     carbon, traffic, redirect_chain, email_security,
     social, wayback, http_version, robots,
     bgp, subdomains, reputation, observatory) = [
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
    report.hosting = hosting_resolved
    report.dns_records = dns
    report.security = security
    report.performance = performance
    report.news = news
    report.github = github
    report.carbon = carbon
    report.traffic = traffic
    report.redirect_chain = redirect_chain
    report.email_security = email_security
    report.social = social
    report.wayback = wayback
    report.http_version = http_version
    report.robots = robots
    report.bgp = bgp
    report.subdomains = subdomains
    report.reputation = reputation
    report.observatory = observatory
    report.status = "complete"

    # Update database record
    await update_report(report)





