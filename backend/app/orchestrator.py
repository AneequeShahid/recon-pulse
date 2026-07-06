import asyncio
from datetime import datetime
from urllib.parse import urlparse

from app.models import AttackPathNode, DarkWebIntel, ReportData
from app.database import update_report
from app.analysis.scoring import calculate_pulse_score
from app.analysis.remediation import generate_remediation_steps
from app.analysis.workflow_nodes import (
    ScanContext,
    build_scan_queue,
    apply_results_to_report,
    wrap_with_timeout,
)
from app.analysis.scanner_engine import (
    TemplateExecutor,
    is_template_scan_active,
    build_findings_from_report,
)
from app.services import ip_service
from app.services.notification_service import send_discord_alert


async def _run_legacy_gather(context: ScanContext) -> None:
    """
    Fallback path: original asyncio.gather orchestration.
    Used when the workflow queue is unavailable or fails.
    """
    from app.services import (
        rdap_service, dns_service,
        ssl_service, pagespeed_service, gnews_service,
        github_service, carbon_service, tranco_service,
        puppeteer_service, wappalyzer_service, redirect_service,
        email_security_service, social_service, wayback_service,
        http_version_service, robots_service, bgp_service,
        subdomain_service, reputation_service, observatory_service,
        shodan_service, securitytrails_service, alienvault_service,
        ssllabs_service,
    )

    domain = context.domain
    url = context.url
    asn = context.asn

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
        wrap_with_timeout(shodan_service.fetch_shodan_info(domain), 10),
        wrap_with_timeout(securitytrails_service.fetch_securitytrails_info(domain), 15),
        wrap_with_timeout(alienvault_service.fetch_alienvault_pulses(domain), 10),
        wrap_with_timeout(ssllabs_service.fetch_ssllabs_grade(domain), 30),
        return_exceptions=True,
    )

    keys = [
        "screenshot", "tech_stack", "domain", "dns", "security", "performance",
        "news", "github", "carbon", "traffic", "redirect_chain", "email_security",
        "social", "wayback", "http_version", "robots", "bgp", "subdomains",
        "reputation", "observatory", "shodan", "securitytrails", "alienvault", "ssllabs",
    ]
    for key, result in zip(keys, results):
        context.results[key] = None if isinstance(result, Exception) else result


async def _run_scan_workflow(context: ScanContext) -> None:
    """Primary path: Shuffle-style ExecutionQueue."""
    try:
        queue = build_scan_queue()
        await queue.run_all(context)
    except Exception as exc:
        print(f"[ORCHESTRATOR] Workflow queue failed, falling back to legacy gather: {exc}")
        await _run_legacy_gather(context)


async def _run_post_scan_enrichment(context: ScanContext) -> bool:
    """CISA KEV, compliance, dark web, attack path, scoring — unchanged logic."""
    report = context.report
    domain = context.domain
    tech = report.tech_stack
    subdomains = report.subdomains
    shodan = report.shodan

    kev_match = False
    try:
        from app.services.cisa_kev_service import fetch_cisa_kev, check_kev_match
        kev_list = await wrap_with_timeout(fetch_cisa_kev(), 10)
        if tech and tech.technologies:
            kev_match = check_kev_match(tech.technologies, kev_list)
    except Exception as e:
        print(f"[ORCHESTRATOR] CISA KEV check failed: {e}")

    try:
        from app.services.compliance_service import map_report_to_compliance
        soc2, nist = map_report_to_compliance(report)
        report.compliance_soc2 = soc2
        report.compliance_nist = nist
    except Exception as e:
        print(f"[ORCHESTRATOR] Compliance mapping failed: {e}")

    try:
        from app.services.sbom_service import fetch_sbom_vulnerabilities
        from app.models import SBOMInfo, SBOMPackage
        if tech and tech.technologies:
            sbom_vulns = await wrap_with_timeout(fetch_sbom_vulnerabilities(tech.technologies), 15)
            critical = sum(1 for v in sbom_vulns if v.get("severity") == "Critical")
            high = sum(1 for v in sbom_vulns if v.get("severity") == "High")
            medium = sum(1 for v in sbom_vulns if v.get("severity") == "Medium")
            report.sbom = SBOMInfo(
                packages=[SBOMPackage(**v) for v in sbom_vulns],
                total_vulnerabilities=len(sbom_vulns),
                critical_count=critical,
                high_count=high,
                medium_count=medium,
            )
    except Exception as e:
        print(f"[ORCHESTRATOR] SBOM check failed: {e}")

    try:
        from app.services.darkweb_service import check_breached_credentials, check_leaked_subdomains
        breaches, leaked = await asyncio.gather(
            check_breached_credentials(domain),
            check_leaked_subdomains(domain),
            return_exceptions=True,
        )
        report.darkweb = DarkWebIntel(
            breaches=breaches if not isinstance(breaches, Exception) else [],
            leaked_subdomains=leaked if not isinstance(leaked, Exception) else [],
        )
    except Exception as e:
        print(f"[ORCHESTRATOR] Dark web check failed: {e}")

    try:
        from app.analysis.attack_path import build_attack_path
        report.attack_path = build_attack_path(report)
    except Exception as e:
        print(f"[ORCHESTRATOR] Attack path build failed: {e}")

    try:
        from app.services.shadow_it_service import fetch_shadow_subdomains
        report.shadow_subdomains = await wrap_with_timeout(fetch_shadow_subdomains(domain), 15)
    except Exception as e:
        print(f"[ORCHESTRATOR] Shadow IT discovery failed: {e}")

    score, level = calculate_pulse_score(report)
    report.summary_score = score
    report.threat_level = level

    if kev_match:
        report.threat_level = "Critical"
        if report.summary_score and report.summary_score > 30:
            report.summary_score = max(0, report.summary_score - 15)

    report.remediation_steps = generate_remediation_steps(report)
    return kev_match


async def run_report(report_id: str, url: str, routing_rules: list | None = None, routing_keys: dict | None = None, cloud_creds: dict | None = None, public_mode: bool = False) -> None:
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    if not domain:
        domain = parsed.path.replace("www.", "").split("/")[0]

    report = ReportData(
        id=report_id,
        url=url,
        created_at=datetime.now(),
        status="pending",
    )

    context = ScanContext(
        report_id=report_id,
        url=url,
        domain=domain,
        report=report,
    )

    print("[ORCHESTRATOR] running scan workflow")

    try:
        context.hosting = await wrap_with_timeout(ip_service.fetch_hosting_info(domain), 5)
    except Exception as e:
        print(f"Initial hosting pre-fetch failed: {e}")
        context.hosting = None

    context.asn = context.hosting.asn if context.hosting else None

    await _run_scan_workflow(context)
    apply_results_to_report(context)

    await _run_post_scan_enrichment(context)

    template_findings = []
    if is_template_scan_active(domain):
        print(f"[ORCHESTRATOR] Template scanner active for {domain}")
        try:
            executor = TemplateExecutor()
            template_findings = await executor.execute(url, domain, report)
        except Exception as e:
            print(f"[ORCHESTRATOR] Template scanner failed (non-breaking): {e}")
    else:
        print(f"[ORCHESTRATOR] Template scanner inactive for {domain} — skipping")

    report.findings = build_findings_from_report(report, template_findings or None)
    report.status = "complete"

    await update_report(report)

    try:
        await send_discord_alert(report)
    except Exception as e:
        print(f"[ORCHESTRATOR] Discord alert failed: {e}")

    if routing_rules and routing_keys:
        try:
            from app.services.ticket_routing_service import apply_ticket_rules
            results = await apply_ticket_rules(report, routing_rules, routing_keys)
            if results:
                print(f"[ORCHESTRATOR] Ticket routing: {len(results)} tickets created")
                for r in results:
                    print(f"  {r['integration']}: {r['finding_title']} — {'OK' if r['success'] else 'FAILED'}")
        except Exception as e:
            print(f"[ORCHESTRATOR] Ticket routing failed: {e}")

    if cloud_creds:
        try:
            from app.services.cloud_scan_service import scan_all_clouds
            report.cloud_assets = await scan_all_clouds(cloud_creds)
            print(f"[ORCHESTRATOR] Cloud scan: {sum(len(v) for v in report.cloud_assets.values())} assets found")
        except Exception as e:
            print(f"[ORCHESTRATOR] Cloud scan failed: {e}")

    if public_mode:
        try:
            from app.services.community_intel_service import submit_community_intel
            submitted = await submit_community_intel(report)
            if submitted:
                print(f"[ORCHESTRATOR] Community intel submitted for {domain}")
        except Exception as e:
            print(f"[ORCHESTRATOR] Community intel submission failed: {e}")

    try:
        from app.services.drift_service import check_dns_drift
        report.dns_drift = await wrap_with_timeout(check_dns_drift(domain), 10)
    except Exception as e:
        print(f"[ORCHESTRATOR] DNS drift check failed: {e}")

    try:
        from app.services.secret_scan_service import scan_for_secrets
        tech_list = report.tech_stack.technologies if report.tech_stack else []
        secrets = await wrap_with_timeout(scan_for_secrets(domain, tech_list), 15)
        if secrets:
            report.exposed_secrets = secrets
            print(f"[ORCHESTRATOR] Secret scan: {len(secrets)} secrets found")
    except Exception as e:
        print(f"[ORCHESTRATOR] Secret scan failed: {e}")
