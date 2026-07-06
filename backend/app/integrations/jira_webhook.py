import httpx
from typing import Any


async def create_jira_issue(summary: str, description: str, jira_url: str = "", jira_api_token: str = "", jira_project_key: str = "", jira_email: str = "", priority: str = "Medium") -> dict[str, Any] | None:
    if not all([jira_url, jira_email, jira_api_token, jira_project_key]):
        return None
    try:
        auth = (jira_email, jira_api_token)
        payload = {
            "fields": {
                "project": {"key": jira_project_key},
                "summary": summary,
                "description": {"type": "doc", "version": 1, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": description}]}
                ]},
                "issuetype": {"name": "Task"},
                "priority": {"name": priority}
            }
        }
        async with httpx.AsyncClient(timeout=10, auth=auth) as client:
            resp = await client.post(f"{jira_url}/rest/api/3/issue", json=payload)
            if resp.status_code in (200, 201):
                return resp.json()
            print(f"Jira API error: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Jira webhook error: {e}")
    return None
