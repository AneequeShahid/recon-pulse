import asyncio
import httpx
from app.models import ObservatoryInfo

async def fetch_observatory_grade(domain: str) -> ObservatoryInfo:
    if not domain:
        return ObservatoryInfo()
        
    url = f"https://observatory-api.mdn.mozilla.org/api/v1/analyze?host={domain}"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            # POST to trigger or retrieve cached analysis
            res = await client.post(url, data={"hidden": "true"})
            if res.status_code != 200:
                # Try GET as fallback
                res = await client.get(url)
                if res.status_code != 200:
                    return ObservatoryInfo()
            
            data = res.json()
            # If pending, wait a bit and poll once
            state = data.get("state")
            if state in ["PENDING", "STARTING"]:
                await asyncio.sleep(2.0)
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
            
            grade = data.get("grade")
            score = data.get("score")
            
            # Simple assessment of test details if available
            passed = 0
            failed = 0
            # Poll scanner results if available
            scan_url = f"https://observatory-api.mdn.mozilla.org/api/v1/getScanResults?scan={data.get('scan_id')}"
            if data.get("scan_id"):
                try:
                    s_res = await client.get(scan_url)
                    if s_res.status_code == 200:
                        s_data = s_res.json()
                        for key, val in s_data.items():
                            if isinstance(val, dict):
                                if val.get("pass", False):
                                    passed += 1
                                else:
                                    failed += 1
                except Exception:
                    pass
            
            return ObservatoryInfo(
                grade=grade,
                score=score,
                tests_passed=passed,
                tests_failed=failed
            )
    except Exception as e:
        print(f"Observatory grade fetch error for {domain}: {e}")
        return ObservatoryInfo()
