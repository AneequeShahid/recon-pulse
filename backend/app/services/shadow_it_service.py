import asyncio
import socket
import httpx
from typing import Set, List, Optional
from app.models import ShadowSubdomain

COMMON_SUBDOMAINS = [
    "www", "mail", "remote", "blog", "webmail", "server", "ns1", "ns2",
    "smtp", "secure", "vpn", "admin", "cdn", "api", "dev", "staging",
    "test", "demo", "m", "mobile", "app", "portal", "my", "shop", "store",
    "support", "help", "status", "docs", "forum", "community", "wiki",
    "ftp", "ssh", "git", "jenkins", "jira", "confluence", "nexus",
    "prometheus", "grafana", "kibana", "elastic", "kafka", "redis",
    "mysql", "db", "database", "mongo", "postgres", "couchdb",
    "jenkins", "sonar", "artifactory", "docker", "k8s", "kubernetes",
    "swagger", "redoc", "graphql", "rest", "soap", "xmlrpc", "odata",
    "backup", "monitor", "monitoring", "alert", "alerts", "logs",
    "assets", "static", "static1", "static2", "img", "images", "css",
    "js", "fonts", "media", "video", "cdn1", "cdn2",
    "stage", "prod", "production", "develop", "development", "qa",
    "uat", "preprod", "beta", "alpha", "canary", "release",
    "corp", "intranet", "employee", "hr", "payroll", "time",
    "web", "webserver", "web01", "web02", "app01", "app02",
    "db01", "db02", "cache", "caching", "memcache", "varnish",
    "lb", "loadbalancer", "haproxy", "nginx", "apache", "iis",
    "auth", "login", "signin", "register", "sso", "oauth", "openid",
    "billing", "invoice", "payment", "checkout", "cart", "orders",
    "chat", "live", "meet", "video", "voice", "phone", "fax",
    "news", "press", "media", "pr", "events", "calendar",
    "partners", "partner", "vendors", "supplier", "suppliers",
    "careers", "jobs", "apply", "recruit", "talent",
    "analytics", "stats", "statistics", "metrics", "reporting",
    "dir", "directory", "list", "catalog", "catalogue",
    "smtp2", "pop3", "imap", "exchange", "owa", "outlook",
    "lync", "skype", "teams", "slack", "discord",
    "sip", "voip", "phone", "call", "contact", "ring",
    "survey", "feedback", "suggestion", "vote",
    "legal", "privacy", "terms", "gdpr", "ccpa",
    "investor", "investors", "ir", "financials", "sec",
    "training", "learn", "academy", "university", "campus",
    "iot", "sensor", "sensors", "device", "devices", "gateway",
]

SUBDOMAIN_CLASSIFICATION_RULES = [
    ("staging", "Staging"), ("stage", "Staging"),
    ("dev", "Development"), ("develop", "Development"), ("development", "Development"),
    ("test", "Development"), ("qa", "Development"), ("uat", "Development"),
    ("preprod", "Staging"), ("beta", "Staging"), ("alpha", "Development"),
    ("canary", "Staging"),
    ("admin", "Admin"), ("administrator", "Admin"),
    ("mail", "Mail"), ("smtp", "Mail"), ("imap", "Mail"), ("pop3", "Mail"),
    ("webmail", "Mail"), ("exchange", "Mail"), ("owa", "Mail"), ("outlook", "Mail"),
    ("api", "API"), ("graphql", "API"), ("rest", "API"), ("swagger", "API"),
    ("cdn", "CDN"), ("cdn1", "CDN"), ("cdn2", "CDN"),
    ("static", "CDN"), ("static1", "CDN"), ("static2", "CDN"),
]

def classify_subdomain(prefix: str) -> str:
    lower = prefix.lower()
    for keyword, classification in SUBDOMAIN_CLASSIFICATION_RULES:
        if keyword in lower:
            return classification
    return "Unknown"

async def _resolve_dns(prefix: str, domain: str, sem: asyncio.Semaphore) -> Optional[str]:
    fqdn = f"{prefix}.{domain}"
    try:
        async with sem:
            info = await asyncio.to_thread(socket.getaddrinfo, fqdn, 80)
            if info:
                return info[0][4][0]
    except (socket.gaierror, OSError):
        pass
    return None

async def _fetch_crtsh_extended(domain: str) -> Set[str]:
    url = f"https://crt.sh/?q={domain}&output=json"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return set()
            data = res.json()
            subdomains: Set[str] = set()
            for item in data:
                name_value = item.get("name_value", "")
                names = [n.strip().lower() for n in name_value.split("\n")]
                for name in names:
                    if name.endswith(domain) and name != domain and not name.startswith("*."):
                        subdomains.add(name)
            return subdomains
    except Exception as e:
        print(f"Shadow IT crt.sh error for {domain}: {e}")
        return set()

async def fetch_shadow_subdomains(domain: str) -> List[ShadowSubdomain]:
    if not domain:
        return []

    crt_subs = await _fetch_crtsh_extended(domain)
    known_prefixes = set()
    for sub in crt_subs:
        prefix = sub.replace("." + domain, "")
        known_prefixes.add(prefix)

    sem = asyncio.Semaphore(15)
    tasks = [asyncio.ensure_future(_resolve_dns(p, domain, sem)) for p in COMMON_SUBDOMAINS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    shadow = []
    seen = set()

    for prefix, ip in zip(COMMON_SUBDOMAINS, results):
        ip_str = ip if isinstance(ip, str) else None
        if ip_str:
            from_dns_bruteforce = True
            in_crt = prefix in known_prefixes
            if in_crt:
                source = "crt_sh"
                in_crt = True
            else:
                source = "dns_bruteforce"
            classification = classify_subdomain(prefix)
            fqdn = f"{prefix}.{domain}"
            if fqdn not in seen:
                seen.add(fqdn)
                shadow.append(ShadowSubdomain(
                    subdomain=fqdn,
                    resolved_ip=ip_str,
                    source=source if not in_crt else "crt_sh",
                    classification=classification,
                ))

    for sub in sorted(crt_subs):
        if sub not in seen:
            seen.add(sub)
            prefix = sub.replace("." + domain, "")
            shadow.append(ShadowSubdomain(
                subdomain=sub,
                resolved_ip=None,
                source="crt_sh",
                classification=classify_subdomain(prefix),
            ))

    shadow.sort(key=lambda s: s.classification)
    return shadow
