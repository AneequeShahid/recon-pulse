#!/usr/bin/env python3
"""recon-pulse-cli — CI/CD integration for Recon Pulse security scanning.

Usage:
    python recon-pulse-cli.py <api_url> <target_url> [--score-threshold=70] [--workspace-id=<id>]

Examples:
    python recon-pulse-cli.py http://localhost:8000 https://example.com --score-threshold=60
    python recon-pulse-cli.py http://localhost:8000 https://example.com --workspace-id=ci-$(git rev-parse HEAD)
"""

import sys
import time
import json
import urllib.request
import urllib.parse


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)

    api_url = args[0].rstrip("/")
    target = args[1]

    threshold = 70
    workspace_id = f"ci-{int(time.time())}"
    for a in args[2:]:
        if a.startswith("--score-threshold="):
            threshold = int(a.split("=")[1])
        elif a.startswith("--workspace-id="):
            workspace_id = a.split("=")[1]

    payload = json.dumps({"url": target}).encode()
    headers = {
        "Content-Type": "application/json",
        "X-Workspace-Id": workspace_id,
    }

    print(f"[recon-pulse] Scanning {target}...")
    print(f"[recon-pulse] API: {api_url}")
    print(f"[recon-pulse] Threshold: {threshold}")
    print(f"[recon-pulse] Workspace: {workspace_id}")

    try:
        req = urllib.request.Request(
            f"{api_url}/api/report",
            data=payload,
            headers=headers,
        )
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        report_id = result.get("report_id")
        if not report_id:
            print(f"[recon-pulse] ERROR: No report_id in response: {result}")
            sys.exit(1)
        print(f"[recon-pulse] Report ID: {report_id}")
    except Exception as e:
        print(f"[recon-pulse] ERROR: Failed to start scan: {e}")
        sys.exit(1)

    # Poll until complete
    for attempt in range(30):
        time.sleep(2)
        try:
            req = urllib.request.Request(
                f"{api_url}/api/report/{report_id}",
                headers={"X-Workspace-Id": workspace_id},
            )
            resp = urllib.request.urlopen(req, timeout=10)
            report = json.loads(resp.read())
            status = report.get("status", "unknown")
            score = report.get("summary_score", 0)
            threat = report.get("threat_level", "unknown")
            print(f"[recon-pulse] [{attempt + 1}/30] status={status} score={score} threat={threat}")

            if status == "complete":
                remediations = len(report.get("remediation_steps", []))
                assets = report.get("cloud_assets", {})
                secrets = report.get("exposed_secrets", [])
                print(f"[recon-pulse] Scan complete!")
                print(f"[recon-pulse] Score: {score}/100 — {threat}")
                print(f"[recon-pulse] Remediation steps: {remediations}")
                if assets:
                    total = sum(len(v) for v in assets.values())
                    print(f"[recon-pulse] Cloud assets: {total}")
                if secrets:
                    print(f"[recon-pulse] Exposed secrets: {len(secrets)}")
                print(f"[recon-pulse] Report: {api_url}/r/{report_id}")

                if score < threshold:
                    print(f"[recon-pulse] FAILED: Score {score} below threshold {threshold}")
                    sys.exit(1)
                else:
                    print(f"[recon-pulse] PASSED: Score {score} meets threshold {threshold}")
                    sys.exit(0)

            if status == "error":
                print(f"[recon-pulse] ERROR: Scan failed")
                sys.exit(1)
        except Exception as e:
            print(f"[recon-pulse] Poll error: {e}")

    print(f"[recon-pulse] TIMEOUT: Scan did not complete within 60 seconds")
    sys.exit(1)


if __name__ == "__main__":
    main()
