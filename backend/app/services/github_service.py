import httpx
import os
from app.models import GitHubInfo

async def fetch_github_info(domain: str) -> GitHubInfo:
    try:
        # Extract the name without TLD (e.g., "google" from "google.com")
        org_name = domain.split(".")[0]
        
        headers = {
            "Accept": "application/vnd.github+json"
        }
        token = os.getenv("GITHUB_API_KEY")
        if token and token != "your_key_here":
            headers["Authorization"] = f"token {token}"
            
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"https://api.github.com/users/{org_name}", headers=headers)
            if res.status_code != 200:
                return GitHubInfo(exists=False)
                
            data = res.json()
            repos_count = data.get("public_repos")
            followers_count = data.get("followers")
            
            top_repos = []
            repos_res = await client.get(
                f"https://api.github.com/users/{org_name}/repos",
                params={"sort": "stars", "per_page": 5},
                headers=headers
            )
            if repos_res.status_code == 200:
                repos_data = repos_res.json()
                top_repos = [r.get("name") for r in repos_data if "name" in r]
                
            return GitHubInfo(
                exists=True,
                repos=repos_count,
                followers=followers_count,
                top_repos=top_repos
            )
    except Exception:
        return GitHubInfo(exists=False)
