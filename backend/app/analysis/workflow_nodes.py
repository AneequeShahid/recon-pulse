"""
Shuffle-style workflow orchestration.

Each scanner service is a standalone WorkflowNode with execute(context).
ExecutionQueue runs nodes concurrently with per-node timeouts.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine, Optional

from app.models import ReportData
from app.services import (
    alienvault_service,
    bgp_service,
    carbon_service,
    dns_service,
    email_security_service,
    github_service,
    gnews_service,
    http_version_service,
    ip_service,
    observatory_service,
    pagespeed_service,
    puppeteer_service,
    rdap_service,
    redirect_service,
    reputation_service,
    robots_service,
    securitytrails_service,
    shodan_service,
    social_service,
    ssl_service,
    ssllabs_service,
    subdomain_service,
    tranco_service,
    wappalyzer_service,
    wayback_service,
)


async def wrap_with_timeout(coro: Coroutine[Any, Any, Any], timeout_sec: float) -> Any:
    return await asyncio.wait_for(coro, timeout=timeout_sec)


@dataclass
class ScanContext:
    report_id: str
    url: str
    domain: str
    report: ReportData
    hosting: Any = None
    asn: Optional[str] = None
    results: dict[str, Any] = field(default_factory=dict)


class WorkflowNode(ABC):
    name: str
    timeout: float = 7.0
    depends_on_hosting: bool = False

    @abstractmethod
    async def execute(self, context: ScanContext) -> Any:
        ...


class ServiceWorkflowNode(WorkflowNode):
    """Adapter that wraps an existing async service callable."""

    def __init__(
        self,
        name: str,
        fn: Callable[..., Coroutine[Any, Any, Any]],
        timeout: float = 7.0,
        arg_builder: Callable[[ScanContext], tuple] | None = None,
        depends_on_hosting: bool = False,
    ) -> None:
        self.name = name
        self.fn = fn
        self.timeout = timeout
        self.arg_builder = arg_builder or (lambda ctx: (ctx.domain,))
        self.depends_on_hosting = depends_on_hosting

    async def execute(self, context: ScanContext) -> Any:
        args = self.arg_builder(context)
        return await wrap_with_timeout(self.fn(*args), self.timeout)


class ExecutionQueue:
    """Runs a list of WorkflowNodes concurrently, storing results on context."""

    def __init__(self, nodes: list[WorkflowNode]) -> None:
        self.nodes = nodes

    async def run_all(self, context: ScanContext) -> dict[str, Any]:
        async def _run_node(node: WorkflowNode) -> tuple[str, Any]:
            try:
                result = await node.execute(context)
                return node.name, result
            except Exception as exc:
                print(f"[WORKFLOW] Node '{node.name}' failed: {exc}")
                return node.name, exc

        outcomes = await asyncio.gather(*[_run_node(n) for n in self.nodes], return_exceptions=False)

        for name, result in outcomes:
            context.results[name] = None if isinstance(result, Exception) else result

        return context.results


def build_scan_queue() -> ExecutionQueue:
    """Construct the default scanner workflow (mirrors legacy orchestrator)."""
    nodes: list[WorkflowNode] = [
        ServiceWorkflowNode("screenshot", puppeteer_service.fetch_screenshot_and_meta, 7, lambda c: (c.url,)),
        ServiceWorkflowNode("tech_stack", wappalyzer_service.fetch_tech_stack, 7, lambda c: (c.url,)),
        ServiceWorkflowNode("domain", rdap_service.fetch_domain_info, 7),
        ServiceWorkflowNode("dns", dns_service.fetch_dns_records, 5),
        ServiceWorkflowNode("security", ssl_service.fetch_ssl_grade, 15),
        ServiceWorkflowNode("performance", pagespeed_service.fetch_performance, 7, lambda c: (c.url,)),
        ServiceWorkflowNode("news", gnews_service.fetch_news, 7),
        ServiceWorkflowNode("github", github_service.fetch_github_info, 7),
        ServiceWorkflowNode("carbon", carbon_service.fetch_carbon, 7, lambda c: (c.url,)),
        ServiceWorkflowNode("traffic", tranco_service.fetch_rank, 7),
        ServiceWorkflowNode("redirect_chain", redirect_service.fetch_redirect_chain, 7, lambda c: (c.url,)),
        ServiceWorkflowNode("email_security", email_security_service.fetch_email_security, 7),
        ServiceWorkflowNode("social", social_service.fetch_social_presence, 7),
        ServiceWorkflowNode("wayback", wayback_service.fetch_wayback_info, 15),
        ServiceWorkflowNode("http_version", http_version_service.check_http_version, 7),
        ServiceWorkflowNode("robots", robots_service.fetch_robots_and_sitemap, 7),
        ServiceWorkflowNode(
            "bgp",
            bgp_service.fetch_bgp_info,
            7,
            lambda c: (c.asn,),
            depends_on_hosting=True,
        ),
        ServiceWorkflowNode("subdomains", subdomain_service.fetch_subdomains, 7),
        ServiceWorkflowNode("reputation", reputation_service.fetch_domain_reputation, 5),
        ServiceWorkflowNode("observatory", observatory_service.fetch_observatory_grade, 7),
        ServiceWorkflowNode("shodan", shodan_service.fetch_shodan_info, 10),
        ServiceWorkflowNode("securitytrails", securitytrails_service.fetch_securitytrails_info, 15),
        ServiceWorkflowNode("alienvault", alienvault_service.fetch_alienvault_pulses, 10),
        ServiceWorkflowNode("ssllabs", ssllabs_service.fetch_ssllabs_grade, 30),
    ]
    return ExecutionQueue(nodes)


def apply_results_to_report(context: ScanContext) -> None:
    """Map workflow node outputs onto the ReportData model."""
    report = context.report
    r = context.results

    screenshot_data = r.get("screenshot")
    if screenshot_data:
        report.screenshot_url = screenshot_data.screenshot_url
        report.og_title = screenshot_data.title
        report.og_description = screenshot_data.description
        report.favicon = screenshot_data.favicon

    report.tech_stack = r.get("tech_stack")
    report.domain = r.get("domain")
    report.hosting = context.hosting
    report.dns_records = r.get("dns")
    report.security = r.get("security")
    report.performance = r.get("performance")
    report.news = r.get("news")
    report.github = r.get("github")
    report.carbon = r.get("carbon")
    report.traffic = r.get("traffic")
    report.redirect_chain = r.get("redirect_chain")
    report.email_security = r.get("email_security")
    report.social = r.get("social")
    report.wayback = r.get("wayback")
    report.http_version = r.get("http_version")
    report.robots = r.get("robots")
    report.bgp = r.get("bgp")
    report.subdomains = r.get("subdomains")
    report.reputation = r.get("reputation")
    report.observatory = r.get("observatory")
    report.shodan = r.get("shodan")
    report.securitytrails = r.get("securitytrails")
    report.alienvault = r.get("alienvault")
    report.ssllabs = r.get("ssllabs")
