import httpx
from app.models import TechStack

async def fetch_tech_stack(url: str) -> TechStack:
    print("[WAPPALYZER] starting scan for:", url)
    
    pythonsignatures = {
      "React": ["react", "react-dom", "_reactFiber"],
      "Next.js": ["__next", "_next/static"],
      "Vue": ["vue.js", "__vue__"],
      "Angular": ["ng-version", "angular"],
      "WordPress": ["wp-content", "wp-includes"],
      "Shopify": ["shopify", "cdn.shopify"],
      "Tailwind": ["tailwind"],
      "Bootstrap": ["bootstrap"],
      "jQuery": ["jquery"],
      "Google Analytics": ["google-analytics", "gtag"],
      "Cloudflare": ["cloudflare", "__cf_bm"],
      "Nginx": ["nginx"],
      "Apache": ["apache"],
      "Laravel": ["laravel"],
      "Django": ["django", "csrftoken"],
    }
    
    categories_map = {
        "React": "Frontend Library",
        "Next.js": "Web Framework",
        "Vue": "Frontend Library",
        "Angular": "Frontend Library",
        "WordPress": "CMS",
        "Shopify": "E-Commerce",
        "Tailwind": "CSS Framework",
        "Bootstrap": "CSS Framework",
        "jQuery": "Frontend Library",
        "Google Analytics": "Analytics",
        "Cloudflare": "CDN",
        "Nginx": "Web Server",
        "Apache": "Web Server",
        "Laravel": "Web Framework",
        "Django": "Web Framework",
    }

    technologies = []
    categories = {}

    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        res = await client.get(url)
        html_body = res.text.lower()
        
        # Scan headers: server, x-powered-by, set-cookie
        headers_to_check = [
            res.headers.get("server", ""),
            res.headers.get("x-powered-by", ""),
            res.headers.get("set-cookie", "")
        ]
        headers_combined = " ".join(headers_to_check).lower()
        
        # Scan HTML body for match keywords
        for tech, keywords in pythonsignatures.items():
            matched = False
            # Check in combined headers
            for kw in keywords:
                if kw.lower() in headers_combined:
                    matched = True
                    break
            # Check in html body
            if not matched:
                for kw in keywords:
                    if kw.lower() in html_body:
                        matched = True
                        break
            
            if matched:
                if tech not in technologies:
                    technologies.append(tech)
                cat = categories_map.get(tech, "Other")
                if cat not in categories:
                    categories[cat] = []
                if tech not in categories[cat]:
                    categories[cat].append(tech)

    print(f"[WAPPALYZER] detected: {technologies}")
    return TechStack(
        technologies=technologies,
        categories=categories
    )
