import httpx
from typing import Any


async def create_github_issue(title: str, body: str, github_token: str = "", github_repo: str = "", labels: list[str] | None = None) -> dict[str, Any] | None:
    if not all([github_token, github_repo]):
        return None
    try:
        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        payload = {"title": title, "body": body}
        if labels:
            payload["labels"] = labels
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://api.github.com/repos/{github_repo}/issues",
                json=payload, headers=headers
            )
            if resp.status_code in (200, 201):
                return resp.json()
            print(f"GitHub API error: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"GitHub webhook error: {e}")
    return None
