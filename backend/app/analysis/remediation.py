from typing import List, Dict, Any
from app.models import ReportData
from app.services.mitre_service import map_mitre_for_remediation


def _append(report: ReportData, steps: List[Dict[str, Any]], entry: Dict[str, Any]) -> None:
    vulns = []
    if report.shodan and report.shodan.vulns:
        vulns = report.shodan.vulns
    entry["mitre_attack"] = map_mitre_for_remediation(entry.get("title", ""), entry.get("description", ""), vulns)
    steps.append(entry)


def generate_remediation_steps(report: ReportData) -> List[Dict[str, Any]]:
    steps = []

    domain_hint = _extract_domain(report.url)

    # 1. Security Headers (Poor Observatory grade)
    _check_security_headers(report, steps, domain_hint)

    # 2. HTTPS Redirect
    _check_https_enforcement(report, steps, domain_hint)

    # 3. Email Security (SPF / DMARC)
    _check_email_security(report, steps, domain_hint)

    # 4. Weak TLS / SSL Grade
    _check_ssl_grade(report, steps, domain_hint)

    # 5. Subdomain Exposure
    _check_subdomain_exposure(report, steps, domain_hint)

    # 6. HTTP/2 Support
    _check_http_protocol(report, steps, domain_hint)

    return steps


def _extract_domain(url: str) -> str:
    if not url:
        return "example.com"
    for prefix in ("https://", "http://"):
        if url.startswith(prefix):
            return url[len(prefix):].split("/")[0].lstrip("www.")
    return url.split("/")[0].lstrip("www.")


def _check_security_headers(report: ReportData, steps: List[Dict[str, Any]], domain: str) -> None:
    grade = None
    if report.observatory and report.observatory.grade:
        grade = report.observatory.grade.upper()

    bad_grades = {"C+", "C", "C-", "D+", "D", "D-", "F"}
    has_issues = grade and grade in bad_grades

    if not has_issues:
        if report.observatory and report.observatory.tests_failed is not None and report.observatory.tests_failed > 5:
            has_issues = True

    if has_issues:
        _append(report, steps, {
            "title": "Configure Missing Security Headers",
            "description": (
                "Your web server is missing critical security headers. "
                "Apply these configuration blocks to mitigate Clickjacking, XSS, and MIME-sniffing exploits."
            ),
            "nginx": (
                "# Add to your server {} block inside nginx.conf\n"
                "add_header Strict-Transport-Security \"max-age=63072000; includeSubDomains; preload\" always;\n"
                "add_header X-Frame-Options \"SAMEORIGIN\" always;\n"
                "add_header X-Content-Type-Options \"nosniff\" always;\n"
                "add_header Referrer-Policy \"no-referrer-when-downgrade\" always;\n"
                "add_header Content-Security-Policy \"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline';\" always;\n"
                "add_header Permissions-Policy \"geolocation=(), microphone=(), camera=()\" always;"
            ),
            "apache": (
                "# Add to your virtual host config (.htaccess / httpd.conf)\n"
                "<IfModule mod_headers.c>\n"
                "  Header set Strict-Transport-Security \"max-age=63072000; includeSubDomains; preload\"\n"
                "  Header set X-Frame-Options \"SAMEORIGIN\"\n"
                "  Header set X-Content-Type-Options \"nosniff\"\n"
                "  Header set Referrer-Policy \"no-referrer-when-downgrade\"\n"
                "  Header set Content-Security-Policy \"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline';\"\n"
                "  Header set Permissions-Policy \"geolocation=(), microphone=(), camera=()\"\n"
                "</IfModule>"
            )
        })


def _check_https_enforcement(report: ReportData, steps: List[Dict[str, str]], domain: str) -> None:
    redirect_required = False
    if report.security is not None:
        if not report.security.https:
            redirect_required = True
    if report.redirect_chain is not None:
        if report.redirect_chain.total == 0 or not any("https" in h.url.lower() for h in report.redirect_chain.hops):
            redirect_required = True

    if redirect_required:
        _append(report, steps, {
            "title": "Enforce Global HTTPS Redirect",
            "description": (
                "Global traffic should be securely redirected to HTTPS. "
                "Implement this redirect rule inside your server virtual host block."
            ),
            "nginx": (
                "# Force HTTP to HTTPS redirects\n"
                "server {\n"
                "    listen 80;\n"
                f"    server_name {domain} www.{domain};\n"
                "    return 301 https://$host$request_uri;\n"
                "}"
            ),
            "apache": (
                "# Redirect HTTP to HTTPS in .htaccess\n"
                "RewriteEngine On\n"
                "RewriteCond %{HTTPS} off\n"
                "RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]"
            )
        })


def _check_email_security(report: ReportData, steps: List[Dict[str, str]], domain: str) -> None:
    email = report.email_security
    if email is None:
        return
    missing = []
    if not email.spf:
        missing.append("SPF")
    if not email.dmarc:
        missing.append("DMARC")
    if not missing:
        return

    spf_txt = f"v=spf1 mx a include:_spf.{domain} ~all"
    dmarc_txt = f"v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@{domain}"
    dns_lines = [f"# DNS TXT Record for SPF\nHost: @\nValue: {spf_txt}"]
    dns_lines.append(f"\n# DNS TXT Record for DMARC\nHost: _dmarc\nValue: {dmarc_txt}")

    _append(report, steps, {
        "title": f"Configure Email Spoofing Protocols ({' & '.join(missing)})",
        "description": (
            "Your domain lacks full email security protocols, exposing you to spoofing and phishing. "
            "Configure these DNS TXT records inside your DNS hosting zone (e.g. Cloudflare, Route53, Namecheap)."
        ),
        "nginx": "\n\n".join(dns_lines),
        "apache": "# See DNS values above. No server config required."
    })


def _check_ssl_grade(report: ReportData, steps: List[Dict[str, str]], domain: str) -> None:
    if report.security is None or report.security.ssl_grade is None:
        return
    grade = report.security.ssl_grade.upper().lstrip("+")
    weak_grades = {"C", "D", "F"}
    if grade not in weak_grades:
        return

    _append(report, steps, {
        "title": "Upgrade TLS / SSL Configuration",
        "description": (
            "Your SSL grade is weak. Modern TLS configuration is required to protect data in transit."
        ),
        "nginx": (
            "# Enforce modern TLS in nginx.conf\n"
            "ssl_protocols TLSv1.2 TLSv1.3;\n"
            "ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;\n"
            "ssl_prefer_server_ciphers on;\n"
            "ssl_session_cache shared:SSL:10m;\n"
            "ssl_session_timeout 10m;"
        ),
        "apache": (
            "# Enforce modern TLS in httpd-ssl.conf\n"
            "SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1\n"
            "SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384\n"
            "SSLHonorCipherOrder on\n"
            "SSLSessionCache shmcb:/path/to/ssl_scache(512000)\n"
            "SSLSessionCacheTimeout 300"
        )
    })


def _check_subdomain_exposure(report: ReportData, steps: List[Dict[str, str]], domain: str) -> None:
    if report.subdomains is None:
        return
    subs = report.subdomains.subdomains or []
    count = len(subs)
    if count < 10:
        return

    sub_list = "\n".join(f"  - {s}" for s in subs[:20])
    if len(subs) > 20:
        sub_list += f"\n  - ... and {len(subs) - 20} more"

    _append(report, steps, {
        "title": "Reduce Subdomain Exposure",
        "description": (
            f"Your domain has {count} publicly discoverable subdomains. "
            "Each subdomain expands the attack surface. Consider consolidating or removing unused hosts."
        ),
        "nginx": (
            "# Block unnecessary subdomain exposure via wildcard in server_name\n"
            "# Only list subdomains that need to be served:\n"
            f"server {{\n"
            f"    listen 443 ssl;\n"
            f"    server_name {domain}\n"
            f"    # Add only required subdomains below\n"
            f"    # server_name www.{domain} api.{domain};\n"
            f"    ...\n"
            f"}}\n\n"
            f"# Discovered subdomains:\n{sub_list}"
        ),
        "apache": (
            "# Restrict virtual hosts to only necessary subdomains\n"
            f"<VirtualHost *:443>\n"
            f"    ServerName {domain}\n"
            f"    # ServerAlias www.{domain}\n"
            f"    # Add only required aliases\n"
            f"</VirtualHost>\n\n"
            f"# Discovered subdomains:\n{sub_list}"
        )
    })


def _check_http_protocol(report: ReportData, steps: List[Dict[str, str]], domain: str) -> None:
    if report.http_version is None:
        return
    if report.http_version.http2:
        return

    _append(report, steps, {
        "title": "Enable HTTP/2 Support",
        "description": (
            "HTTP/2 provides multiplexing, header compression, and faster page loads. "
            "Enabling it improves both performance and modern protocol compliance."
        ),
        "nginx": (
            "# Enable HTTP/2 in nginx.conf\n"
            "server {\n"
            "    listen 443 ssl http2;\n"
            "    server_name {};\n"
            "    ...\n"
            "}"
        ),
        "apache": (
            "# Enable HTTP/2 in httpd.conf\n"
            "Protocols h2 http/1.1\n\n"
            "# Load mod_http2 (if not already loaded)\n"
            "LoadModule http2_module modules/mod_http2.so"
        )
    })
