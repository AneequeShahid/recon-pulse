import re
import httpx
from urllib.parse import urljoin, urlparse
from typing import List, Optional
from app.models import ExposedSecret

SECRET_PATTERNS: List[dict] = [
    {
        "type": "aws_key",
        "pattern": re.compile(r"AKIA[0-9A-Z]{16}"),
        "severity": "Critical",
        "description": "AWS Access Key ID",
    },
    {
        "type": "github_token",
        "pattern": re.compile(r"(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}"),
        "severity": "Critical",
        "description": "GitHub Token",
    },
    {
        "type": "slack_token",
        "pattern": re.compile(r"xox[baprs]-[A-Za-z0-9\-]{10,}"),
        "severity": "Critical",
        "description": "Slack Token",
    },
    {
        "type": "jwt",
        "pattern": re.compile(r"eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"),
        "severity": "High",
        "description": "JSON Web Token (JWT)",
    },
    {
        "type": "private_key",
        "pattern": re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----"),
        "severity": "Critical",
        "description": "Private Key",
    },
    {
        "type": "google_api_key",
        "pattern": re.compile(r"AIza[0-9A-Za-z\-_]{35}"),
        "severity": "High",
        "description": "Google API Key",
    },
    {
        "type": "stripe_key",
        "pattern": re.compile(r"sk_live_[0-9A-Za-z]{24,}"),
        "severity": "Critical",
        "description": "Stripe Secret Key",
    },
    {
        "type": "heroku_api_key",
        "pattern": re.compile(r"heroku:[0-9A-Za-z\-_]{36,}"),
        "severity": "High",
        "description": "Heroku API Key",
    },
    {
        "type": "twilio_key",
        "pattern": re.compile(r"SK[0-9A-Fa-f]{32}"),
        "severity": "High",
        "description": "Twilio API Key",
    },
    {
        "type": "generic_secret",
        "pattern": re.compile(r"(?i)(?:api_key|apikey|secret|password|token)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}"),
        "severity": "Medium",
        "description": "Generic API Secret",
    },
]

GIT_EXPOSURE_PATHS = [
    ".git/HEAD",
    ".git/config",
    ".git/index",
    ".gitignore",
    ".env",
    "config.js",
    "config.json",
    "credentials.json",
    "secrets.yml",
    "secrets.yaml",
    ".npmrc",
    ".dockercfg",
    "docker-compose.yml",
    "Dockerfile",
    "Jenkinsfile",
    "terraform.tfvars",
    "s3cmd.conf",
    ".s3cfg",
    ".ftpconfig",
    ".pgpass",
    "id_rsa",
    "id_rsa.pub",
    ".htpasswd",
    "wp-config.php",
    "configuration.php",
    "config.php",
    "settings.py",
    "settings.json",
    "appsettings.json",
    "web.config",
    "env.php",
    ".env.local",
    ".env.production",
    ".env.development",
]


def _detect_git_exposure(domain: str, path: str, content: str) -> Optional[ExposedSecret]:
    if "ref:" in content or "HEAD" in content:
        return ExposedSecret(
            type="git_config",
            file_url=f"https://{domain}/{path}",
            snippet=content[:120].strip(),
            severity="Critical",
            line_number=0,
        )
    return None


def _scan_content(content: str, file_url: str) -> List[ExposedSecret]:
    secrets: List[ExposedSecret] = []
    for rule in SECRET_PATTERNS:
        for match in rule["pattern"].finditer(content):
            start = max(0, match.start() - 20)
            end = min(len(content), match.end() + 20)
            snippet = content[start:end].strip()
            secrets.append(ExposedSecret(
                type=rule["type"],
                file_url=file_url,
                snippet=snippet[:200],
                severity=rule["severity"],
                line_number=content[:match.start()].count("\n") + 1,
            ))
    return secrets


async def scan_for_secrets(domain: str, tech_technologies: List[str]) -> List[ExposedSecret]:
    if not domain:
        return []

    found: List[ExposedSecret] = []
    seen_snippets: set = set()

    async with httpx.AsyncClient(timeout=5, follow_redirects=True, verify=False) as client:

        # Check JS files from tech stack
        js_urls = set()
        base = f"https://{domain}"
        possible_js = [
            f"/static/js/main.js", f"/static/js/bundle.js",
            f"/assets/js/app.js", f"/dist/js/app.js",
            f"/app.js", f"/bundle.js",
        ]
        for js_path in possible_js:
            js_urls.add(urljoin(base, js_path))

        # Also try common script paths
        js_urls.add(urljoin(base, "/js/app.js"))
        js_urls.add(urljoin(base, "/js/main.js"))
        js_urls.add(urljoin(base, "/assets/application.js"))

        for js_url in js_urls:
            try:
                resp = await client.get(js_url)
                if resp.status_code == 200 and resp.text:
                    secrets = _scan_content(resp.text, js_url)
                    for s in secrets:
                        if s.snippet not in seen_snippets:
                            seen_snippets.add(s.snippet)
                            found.append(s)
            except Exception:
                pass

        # Check .git and sensitive file exposure
        for path in GIT_EXPOSURE_PATHS:
            try:
                url = urljoin(base, path)
                resp = await client.get(url)
                if resp.status_code == 200 and resp.text:
                    content = resp.text[:500]
                    snippet_key = content[:100]
                    if snippet_key in seen_snippets:
                        continue
                    seen_snippets.add(snippet_key)

                    if path.startswith(".git"):
                        git_secret = _detect_git_exposure(domain, path, content)
                        if git_secret:
                            found.append(git_secret)
                        
                    secrets = _scan_content(content, url)
                    found.extend(secrets)
            except Exception:
                pass

    # Deduplicate by type
    deduplicated: List[ExposedSecret] = []
    seen_types: set = set()
    for s in found:
        key = f"{s.type}:{s.file_url}"
        if key not in seen_types:
            seen_types.add(key)
            deduplicated.append(s)

    return deduplicated
