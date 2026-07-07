from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportRequest(BaseModel):
    url: str
    routing_rules: Optional[List[Dict[str, Any]]] = None
    jira_url: Optional[str] = None
    jira_email: Optional[str] = None
    jira_api_token: Optional[str] = None
    jira_project_key: Optional[str] = None
    github_token: Optional[str] = None
    github_repo: Optional[str] = None
    cloud_creds: Optional[Dict[str, Any]] = None
    public_mode: bool = False

class TechStack(BaseModel):
    technologies: List[str] = []
    categories: Dict[str, Any] = {}
    trackers: List[str] = []
    fonts: List[str] = []



class SecurityInfo(BaseModel):
    ssl_grade: Optional[str] = None
    headers_grade: Optional[str] = None
    https: bool = False

class PerformanceInfo(BaseModel):
    performance_score: Optional[int] = None
    lcp: Optional[float] = None
    cls: Optional[float] = None
    fcp: Optional[float] = None

class HostingInfo(BaseModel):
    ip: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None
    asn: Optional[str] = None
    provider_name: Optional[str] = None

class DomainInfo(BaseModel):
    registrar: Optional[str] = None
    created: Optional[str] = None
    expires: Optional[str] = None
    age_days: Optional[int] = None
    nameservers: Optional[List[str]] = None

class NewsItem(BaseModel):
    title: str
    source: str
    date: str
    url: str

class GitHubInfo(BaseModel):
    exists: bool = False
    repos: Optional[int] = None
    followers: Optional[int] = None
    top_repos: Optional[List[str]] = None

class ColorPalette(BaseModel):
    dominant: Optional[str] = None
    palette: Optional[List[str]] = None

class CarbonInfo(BaseModel):
    grams_per_view: Optional[float] = None
    cleaner_than: Optional[int] = None
    rating: Optional[str] = None

class TrafficInfo(BaseModel):
    tranco_rank: Optional[int] = None
    rank_label: Optional[str] = None

class RedirectHop(BaseModel):
    url: str
    status: int
    location: Optional[str] = None

class RedirectChain(BaseModel):
    hops: List[RedirectHop] = []
    total: int = 0

class EmailSecurity(BaseModel):
    spf: bool
    dmarc: bool
    dkim: bool
    spf_record: Optional[str] = None
    dmarc_record: Optional[str] = None

class SocialPresence(BaseModel):
    twitter: bool = False
    linkedin: bool = False
    github: bool = False
    instagram: bool = False
    facebook: bool = False
    youtube: bool = False

class WaybackInfo(BaseModel):
    first_seen: Optional[str] = None
    latest_snapshot: Optional[str] = None
    available: bool = False

class HTTPVersionInfo(BaseModel):
    http2: bool = False
    http3: bool = False

class RobotsInfo(BaseModel):
    robots_txt: Optional[str] = None
    sitemap_url: Optional[str] = None
    has_sitemap: bool = False

class BGPInfo(BaseModel):
    asn: Optional[str] = None
    prefixes_ipv4: int = 0
    prefixes_ipv6: int = 0
    upstreams_count: int = 0
    downstreams_count: int = 0
    peers_count: int = 0

class SubdomainTag(BaseModel):
    subdomain: str
    business_criticality: str = "Unknown"  # "Production" | "Staging" | "Sandbox" | "Unknown"

class SubdomainInfo(BaseModel):
    subdomains: List[str] = []
    total_count: int = 0
    tags: Optional[List[SubdomainTag]] = None  # Business criticality tags per subdomain

class ShodanService(BaseModel):
    port: int = 0
    transport: Optional[str] = None
    product: Optional[str] = None
    version: Optional[str] = None
    name: Optional[str] = None

class ShodanInfo(BaseModel):
    ip: Optional[str] = None
    ports: List[int] = []
    services: List[ShodanService] = []
    hostnames: List[str] = []
    os: Optional[str] = None
    vulns: List[str] = []

class SecurityTrailsInfo(BaseModel):
    subdomains: List[str] = []
    total_subdomains: int = 0
    dns_history: List[Dict[str, Any]] = []

class AlienVaultInfo(BaseModel):
    passive_dns: List[Dict[str, Any]] = []
    related_urls: List[str] = []
    reputation: Optional[int] = None
    threat_score: Optional[int] = None

class SSLabsInfo(BaseModel):
    grade: Optional[str] = None
    has_warnings: Optional[bool] = None
    is_exceptional: Optional[bool] = None
    protocol: Optional[str] = None
    chain_issues: Optional[bool] = None

class ComplianceResult(BaseModel):
    framework: str
    total_controls: int
    passed: int
    failed: int
    results: List[Dict[str, Any]]

class SBOMPackage(BaseModel):
    package_name: str
    ecosystem: str
    vuln_id: str
    summary: str
    severity: str = "Medium"
    cvss_score: Optional[float] = None
    aliases: List[str] = []
    fixed_version: Optional[str] = None
    source: str = "OSV.dev"


class SBOMInfo(BaseModel):
    packages: List[SBOMPackage] = []
    total_vulnerabilities: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0


class AttackPathNode(BaseModel):
    id: str
    label: str
    type: str  # "domain" | "subdomain" | "service" | "vuln" | "ip"
    severity: Optional[str] = None
    children: List[str] = []
    data: Optional[Dict[str, Any]] = None

class DarkWebIntel(BaseModel):
    breaches: List[Dict[str, Any]] = []
    leaked_subdomains: List[str] = []

class ShadowSubdomain(BaseModel):
    subdomain: str
    resolved_ip: Optional[str] = None
    source: str = "dns_bruteforce"  # "dns_bruteforce" | "crt_sh" | "dns_bruteforce+crt_sh"
    classification: str = "Unknown"  # "Production" | "Staging" | "Development" | "Admin" | "Mail" | "API" | "CDN" | "Unknown"

class ExposedSecret(BaseModel):
    type: str  # "aws_key" | "github_token" | "slack_token" | "jwt" | "private_key" | "git_config" | "generic_secret"
    file_url: str
    snippet: str = ""
    severity: str = "Medium"
    line_number: int = 0

class ReputationInfo(BaseModel):
    malicious_count: int = 0
    suspicious_count: int = 0
    total_scanners: int = 0
    status: str = "Clean"  # "Clean" | "Suspicious" | "Malicious" | "Unknown"

class ThreatIntel(BaseModel):
    virustotal_malicious: int = 0
    virustotal_suspicious: int = 0
    virustotal_clean: int = 0
    alienvault_pulses: int = 0
    alienvault_malicious: bool = False
    shodan_ports: List[int] = []
    shodan_vulns: List[str] = []
    shodan_org: Optional[str] = None
    threat_score: int = 0

class ObservatoryInfo(BaseModel):
    grade: Optional[str] = None
    score: Optional[int] = None
    tests_passed: int = 0
    tests_failed: int = 0


class Finding(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    severity: str = "Medium"
    source: str = "scan"
    is_promoted: bool = False
    case_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InvestigationCase(BaseModel):
    id: str
    report_id: str
    workspace_id: Optional[str] = None
    title: str
    status: str = "open"
    finding_ids: List[str] = []
    created_at: datetime
    notes: Optional[str] = None


class ReportData(BaseModel):
    id: str
    url: str
    screenshot_url: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    favicon: Optional[str] = None
    tech_stack: Optional[TechStack] = None
    security: Optional[SecurityInfo] = None
    performance: Optional[PerformanceInfo] = None
    hosting: Optional[HostingInfo] = None
    domain: Optional[DomainInfo] = None
    news: Optional[List[NewsItem]] = None
    github: Optional[GitHubInfo] = None
    colors: Optional[ColorPalette] = None
    carbon: Optional[CarbonInfo] = None
    traffic: Optional[TrafficInfo] = None
    dns_records: Optional[Dict[str, Any]] = None
    redirect_chain: Optional[RedirectChain] = None
    email_security: Optional[EmailSecurity] = None
    social: Optional[SocialPresence] = None
    wayback: Optional[WaybackInfo] = None
    http_version: Optional[HTTPVersionInfo] = None
    robots: Optional[RobotsInfo] = None
    threat_intel: Optional[ThreatIntel] = None
    bgp: Optional[BGPInfo] = None
    subdomains: Optional[SubdomainInfo] = None
    shadow_subdomains: Optional[List[ShadowSubdomain]] = None
    cloud_assets: Optional[Dict[str, List[Dict[str, Any]]]] = None
    exposed_secrets: Optional[List[ExposedSecret]] = None
    dns_drift: Optional[Dict[str, Any]] = None
    reputation: Optional[ReputationInfo] = None
    observatory: Optional[ObservatoryInfo] = None
    shodan: Optional[ShodanInfo] = None
    securitytrails: Optional[SecurityTrailsInfo] = None
    alienvault: Optional[AlienVaultInfo] = None
    ssllabs: Optional[SSLabsInfo] = None
    compliance_soc2: Optional[ComplianceResult] = None
    compliance_nist: Optional[ComplianceResult] = None
    darkweb: Optional[DarkWebIntel] = None
    sbom: Optional[SBOMInfo] = None
    attack_path: Optional[List[AttackPathNode]] = None
    summary_score: Optional[int] = None
    threat_level: Optional[str] = None
    remediation_steps: Optional[List[Dict[str, Any]]] = None
    findings: Optional[List[Finding]] = None
    created_at: datetime
    status: str  # "pending" | "partial" | "complete" | "error"





