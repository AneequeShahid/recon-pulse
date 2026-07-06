import os
import httpx
from app.models import ReportData

async def send_discord_alert(report: ReportData) -> None:
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL", "")
    if not webhook_url:
        return

    try:
        domain = report.url.replace("https://", "").replace("http://", "").split("/")[0]

        fields = [
            {
                "name": "Composite Security Score",
                "value": f"**{report.summary_score}/100** ({report.threat_level} Threat)",
                "inline": True
            },
            {
                "name": "Detections",
                "value": (
                    f"Reputation: {report.reputation.status if report.reputation else 'Unknown'}\n"
                    f"Headers Grade: {report.observatory.grade if report.observatory else 'Unknown'}"
                ),
                "inline": True
            }
        ]

        if report.remediation_steps:
            titles = [s["title"] for s in report.remediation_steps if "title" in s]
            if titles:
                fields.append({
                    "name": "Remediation Steps Required",
                    "value": "\n".join(f"• {t}" for t in titles),
                    "inline": False
                })

        embed = {
            "title": f"Shield Recon Pulse Alert: {domain}",
            "description": f"Scan completed for {report.url}.",
            "color": 0x10b981 if report.threat_level == "Low" else (
                     0xf59e0b if report.threat_level == "Medium" else (
                     0xf97316 if report.threat_level == "High" else 0xef4444)),
            "fields": fields,
            "footer": {
                "text": f"Report ID: {report.id} | Timestamp: {report.created_at.strftime('%Y-%m-%d %H:%M')}"
            }
        }

        payload = {
            "username": "Recon Pulse Security Bot",
            "embeds": [embed]
        }

        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(webhook_url, json=payload)
    except Exception as e:
        print(f"Failed sending Discord webhook alert: {e}")
