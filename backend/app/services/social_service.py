import httpx
from app.models import SocialPresence
from urllib.parse import urlparse

async def fetch_social_presence(domain: str) -> SocialPresence:
    try:
        parsed = urlparse(domain if domain.startswith('http') else f'https://{domain}')
        clean_domain = parsed.netloc.replace('www.', '') or domain.replace('www.', '')
        brand = clean_domain.split('.')[0]
        
        platforms = {
            "twitter": f"https://twitter.com/{brand}",
            "linkedin": f"https://linkedin.com/company/{brand}",
            "github": f"https://github.com/{brand}",
            "instagram": f"https://instagram.com/{brand}",
            "facebook": f"https://facebook.com/{brand}",
            "youtube": f"https://youtube.com/@{brand}",
        }
        results = {}
        async with httpx.AsyncClient(
            timeout=5,
            follow_redirects=True
        ) as client:
            for platform, url in platforms.items():
                try:
                    res = await client.head(url)
                    results[platform] = res.status_code == 200
                except Exception:
                    results[platform] = False
        return SocialPresence(**results)
    except Exception:
        return SocialPresence()
