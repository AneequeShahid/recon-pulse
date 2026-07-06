import asyncio
from typing import List, Dict, Any, Optional

# OSV.dev API: https://osv.dev/docs/
OSV_QUERY_URL = "https://api.osv.dev/v1/query"
OSV_GET_URL = "https://api.osv.dev/v1/vulns/"

# Map Wappalyzer tech names to OSV ecosystems
ECOSYSTEM_MAP: Dict[str, str] = {
    # JavaScript / Node
    "express": "npm", "next.js": "npm", "react": "npm", "vue.js": "npm",
    "angular": "npm", "svelte": "npm", "jquery": "npm", "lodash": "npm",
    "moment.js": "npm", "chart.js": "npm", "d3.js": "npm", "axios": "npm",
    "socket.io": "npm", "passport": "npm", "helmet": "npm", "body-parser": "npm",
    "webpack": "npm", "babel": "npm", "typescript": "npm", "eslint": "npm",
    "next": "npm", "nuxt.js": "npm", "gatsby": "npm",
    # Python
    "django": "PyPI", "flask": "PyPI", "fastapi": "PyPI", "bottle": "PyPI",
    "tornado": "PyPI", "aiohttp": "PyPI", "requests": "PyPI", "urllib3": "PyPI",
    "celery": "PyPI", "sqlalchemy": "PyPI", "pandas": "PyPI", "numpy": "PyPI",
    "jinja2": "PyPI", "werkzeug": "PyPI", "starlette": "PyPI",
    # PHP
    "laravel": "Packagist", "symfony": "Packagist", "wordpress": "Packagist",
    "drupal": "Packagist", "joomla": "Packagist", "magento": "Packagist",
    "phpunit": "Packagist", "monolog": "Packagist", "guzzle": "Packagist",
    # Ruby
    "ruby on rails": "RubyGems", "rails": "RubyGems", "sinatra": "RubyGems",
    "devise": "RubyGems", "puma": "RubyGems", "rack": "RubyGems",
    # Java / JVM
    "spring boot": "Maven", "spring": "Maven", "hibernate": "Maven",
    "tomcat": "Maven", "jetty": "Maven", "struts": "Maven", "log4j": "Maven",
    "jackson": "Maven", "netty": "Maven", "elasticsearch": "Maven",
    "logback": "Maven", "junit": "Maven",
    # Go
    "go": "Go", "gin": "Go", "echo": "Go", "mux": "Go", "cobra": "Go",
    # Rust
    "rust": "crates.io", "actix": "crates.io", "rocket": "crates.io",
    "tokio": "crates.io", "serde": "crates.io",
    # .NET
    "asp.net": "NuGet", ".net": "NuGet", "mono": "NuGet",
    # Other
    "nginx": "Go", "apache": "Go", "redis": "Go",
}


async def fetch_sbom_vulnerabilities(technologies: List[str]) -> List[Dict[str, Any]]:
    if not technologies:
        return []

    results: List[Dict[str, Any]] = []
    tasks = []

    for tech in technologies:
        tech_lower = tech.lower()
        ecosystem = None
        # Exact match
        if tech_lower in ECOSYSTEM_MAP:
            ecosystem = ECOSYSTEM_MAP[tech_lower]
        # Fuzzy match
        if not ecosystem:
            for key, eco in ECOSYSTEM_MAP.items():
                if key in tech_lower or tech_lower in key:
                    ecosystem = eco
                    break

        if not ecosystem:
            continue

        tasks.append(_query_osv(tech, ecosystem))

    if not tasks:
        return results

    responses = await asyncio.gather(*tasks, return_exceptions=True)
    for resp in responses:
        if isinstance(resp, Exception) or resp is None:
            continue
        if isinstance(resp, list):
            results.extend(resp)

    return results


async def _query_osv(package_name: str, ecosystem: str) -> Optional[List[Dict[str, Any]]]:
    try:
        import json
        import urllib.request
        import urllib.error

        body = json.dumps({
            "package": {"name": package_name.lower(), "ecosystem": ecosystem},
        }).encode()

        req = urllib.request.Request(
            OSV_QUERY_URL,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
            return []

        vulns = data.get("vulns", [])
        packages = []

        for vuln in vulns[:5]:
            vuln_id = vuln.get("id", "")
            if not vuln_id:
                continue

            try:
                with urllib.request.urlopen(f"{OSV_GET_URL}{vuln_id}", timeout=5) as detail_resp:
                    detail = json.loads(detail_resp.read().decode())
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
                detail = vuln

            summary = detail.get("summary", "") or detail.get("details", "") or "No description"
            aliases = detail.get("aliases", [])
            severity = detail.get("severity", [])
            cvss_score = None
            for s in severity:
                if s.get("type") == "CVSS":
                    cvss_score = s.get("score")

            affected = detail.get("affected", [])
            fixed_version = None
            if affected:
                for a in affected:
                    ranges = a.get("ranges", [])
                    for r in ranges:
                        events = r.get("events", [])
                        for ev in events:
                            if "fixed" in ev:
                                fixed_version = ev["fixed"]

            packages.append({
                "package_name": package_name,
                "ecosystem": ecosystem,
                "vuln_id": vuln_id,
                "summary": summary[:200],
                "severity": _infer_severity(cvss_score, aliases),
                "cvss_score": cvss_score,
                "aliases": aliases[:3],
                "fixed_version": fixed_version,
                "source": "OSV.dev",
            })

        return packages
    except Exception as e:
        print(f"[SBOM] Error querying OSV for {package_name}: {e}")
        return []


def _infer_severity(cvss_score: Optional[float], aliases: List[str]) -> str:
    if cvss_score is not None:
        if cvss_score >= 9.0:
            return "Critical"
        elif cvss_score >= 7.0:
            return "High"
        elif cvss_score >= 4.0:
            return "Medium"
        elif cvss_score > 0:
            return "Low"
    alias_str = " ".join(aliases).lower()
    if any(kw in alias_str for kw in ["critical", "cve-2024", "cve-2025"]):
        return "Critical"
    if "cve-2023" in alias_str:
        return "High"
    return "Medium"
