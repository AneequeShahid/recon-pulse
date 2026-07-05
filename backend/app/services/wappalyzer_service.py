import httpx
from app.models import TechStack

async def fetch_tech_stack(url: str) -> TechStack:
    technologies = []
    categories = {}
    
    def add_tech(name: str, category: str):
        if name not in technologies:
            technologies.append(name)
        if category not in categories:
            categories[category] = []
        if name not in categories[category]:
            categories[category].append(name)

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            res = await client.get(url)
            html = res.text.lower()
            headers = {k.lower(): v.lower() for k, v in res.headers.items()}
            
            # 1. Inspect HTTP response headers
            server = headers.get("server", "")
            if "cloudflare" in server or "cf-ray" in headers:
                add_tech("Cloudflare", "CDN")
            if "vercel" in server or "x-vercel-id" in headers:
                add_tech("Vercel", "Hosting")
            if "netlify" in server or "x-nf-request-id" in headers:
                add_tech("Netlify", "Hosting")
            if "litespeed" in server:
                add_tech("LiteSpeed", "Web Server")
            if "nginx" in server:
                add_tech("Nginx", "Web Server")
            if "apache" in server:
                add_tech("Apache", "Web Server")
            
            # 2. Inspect HTML source code signatures
            # CMS platforms
            if "wp-content" in html or "wp-includes" in html or "generator\" content=\"wordpress" in html:
                add_tech("WordPress", "CMS")
            
            # Frameworks & Libraries
            if "/_next/" in html or "__next_data__" in html:
                add_tech("Next.js", "Web Framework")
                add_tech("React", "Frontend Library")
            elif "react-dom" in html or "data-reactroot" in html or "_react" in html:
                add_tech("React", "Frontend Library")
                
            if "vue.js" in html or "vue.runtime" in html or "data-v-" in html or "__vue__" in html:
                add_tech("Vue.js", "Frontend Library")
                
            if "ng-version" in html or "ng-app" in html:
                add_tech("Angular", "Frontend Library")
                
            if "jquery" in html:
                add_tech("jQuery", "Frontend Library")
                
            # CSS UI Styles
            if "bootstrap.min.css" in html or "bootstrap.css" in html or "bootstrap.min.js" in html:
                add_tech("Bootstrap", "CSS Framework")
                
            if "tailwind.min.css" in html or "tailwind.css" in html:
                add_tech("Tailwind CSS", "CSS Framework")
            elif "tailwind" in html and ("class=\"bg-" in html or "class=\"flex " in html):
                add_tech("Tailwind CSS", "CSS Framework")
                    
            # Analytics and tags
            if "gtag" in html or "google-analytics.com" in html or "googletagmanager.com/gtm.js" in html:
                add_tech("Google Analytics", "Analytics")
                
            if "static.hotjar.com" in html:
                add_tech("Hotjar", "Analytics")
                
            if "font-awesome" in html or "font-awesome.min.css" in html:
                add_tech("Font Awesome", "Icon Font")

            return TechStack(
                technologies=technologies,
                categories=categories
            )
    except Exception:
        return TechStack()
