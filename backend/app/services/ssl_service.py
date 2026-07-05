import ssl
import socket
import httpx
import asyncio
from datetime import datetime
from typing import Tuple, Optional
from app.models import SecurityInfo

def _check_ssl_and_headers(domain: str) -> Tuple[Optional[str], Optional[str], bool]:
    ssl_grade = "F"
    headers_grade = "F"
    https = False
    
    # 1. Connect and parse SSL certificate details
    try:
        context = ssl.create_default_context()
        # Enforce socket timeout to avoid blocking
        with socket.create_connection((domain, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                https = True
                
                not_after_str = cert.get("notAfter")
                if not_after_str:
                    # e.g., 'May 23 12:00:00 2026 GMT'
                    try:
                        # Strip extra spaces if any
                        clean_date = " ".join(not_after_str.split())
                        # Python strptime parses without GMT timezone parsing issues using %Z or simple slice
                        not_after = datetime.strptime(clean_date[:20], "%b %d %H:%M:%S %Y")
                        days_left = (not_after - datetime.utcnow()).days
                        if days_left <= 0:
                            ssl_grade = "F"
                        elif days_left < 30:
                            ssl_grade = "B"
                        else:
                            ssl_grade = "A"
                    except Exception:
                        ssl_grade = "A"
                else:
                    ssl_grade = "A"
    except Exception:
        ssl_grade = "F"
        
    # 2. Check HTTP response security headers
    try:
        # Use http/https appropriately, check redirected final destination headers
        with httpx.Client(timeout=5, follow_redirects=True) as client:
            res = client.get(f"https://{domain}")
            headers = {k.lower(): v for k, v in res.headers.items()}
            
            hsts = "strict-transport-security" in headers
            csp = "content-security-policy" in headers
            xfo = "x-frame-options" in headers
            xcto = "x-content-type-options" in headers
            
            score = sum([hsts, csp, xfo, xcto])
            if score == 4:
                headers_grade = "A+"
            elif score == 3:
                headers_grade = "A"
            elif score == 2:
                headers_grade = "B"
            elif score == 1:
                headers_grade = "C"
            else:
                headers_grade = "F"
    except Exception:
        headers_grade = "F"
        
    return ssl_grade, headers_grade, https

async def fetch_ssl_grade(domain: str) -> SecurityInfo:
    try:
        loop = asyncio.get_running_loop()
        ssl_grade, headers_grade, https = await loop.run_in_executor(
            None, _check_ssl_and_headers, domain
        )
        return SecurityInfo(
            ssl_grade=ssl_grade,
            headers_grade=headers_grade,
            https=https
        )
    except Exception:
        return SecurityInfo()
