import httpx
import os
from app.models import PerformanceInfo

async def fetch_performance(url: str) -> PerformanceInfo:
    try:
        api_key = os.getenv("PAGESPEED_API_KEY")
        endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
        params = {
            "url": url,
            "category": "performance"
        }
        if api_key and api_key != "your_key_here":
            params["key"] = api_key
            
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(endpoint, params=params)
            print(f"[PAGESPEED] status: {res.status_code}")
            print(f"[PAGESPEED] response: {res.text[:200]}")
            if res.status_code != 200:
                return PerformanceInfo()
                
            data = res.json()
            lh = data.get("lighthouseResult", {})
            categories = lh.get("categories", {})
            perf_score_raw = categories.get("performance", {}).get("score")
            perf_score = int(perf_score_raw * 100) if perf_score_raw is not None else None
            
            audits = lh.get("audits", {})
            
            lcp_val = audits.get("largest-contentful-paint", {}).get("numericValue")
            lcp = round(lcp_val / 1000.0, 2) if lcp_val is not None else None
            
            cls_val = audits.get("cumulative-layout-shift", {}).get("numericValue")
            cls = round(cls_val, 3) if cls_val is not None else None
            
            fcp_val = audits.get("first-contentful-paint", {}).get("numericValue")
            fcp = round(fcp_val / 1000.0, 2) if fcp_val is not None else None
            
            return PerformanceInfo(
                performance_score=perf_score,
                lcp=lcp,
                cls=cls,
                fcp=fcp
            )
    except Exception:
        return PerformanceInfo()
