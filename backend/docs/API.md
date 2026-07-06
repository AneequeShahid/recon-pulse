# Recon Pulse API

Base URL: `http://localhost:8000`

All requests should include the `X-Workspace-Id` header for audit tracking.

---

## Scan Endpoints

### POST /api/report

Start a new scan. Returns a `report_id` for polling.

```bash
curl -X POST http://localhost:8000/api/report \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: my-workspace" \
  -d '{"url": "https://example.com"}'
```

**Optional routing fields:**

```json
{
  "url": "https://example.com",
  "routing_rules": [
    {
      "label": "Critical → Jira",
      "condition": {"severity": "Critical"},
      "action": {"integration": "jira", "priority": "Highest"}
    }
  ],
  "jira_url": "https://mycompany.atlassian.net",
  "jira_email": "user@company.com",
  "jira_api_token": "token123",
  "github_token": "ghp_xxx",
  "github_repo": "owner/repo",
  "cloud_creds": {
    "aws": {"access_key_id": "...", "secret_access_key": "..."}
  }
}
```

Response: `{"report_id": "abc12345", "cached": false}`

---

### GET /api/report/{report_id}

Get the full report JSON.

```bash
curl http://localhost:8000/api/report/abc12345
```

---

### GET /api/report/{report_id}/stream

Server-Sent Events (SSE) stream for real-time report updates.

```bash
curl -N http://localhost:8000/api/report/abc12345/stream
```

---

### GET /api/report/history?url={url}

Get score history for a URL (last 15 scans).

```bash
curl "http://localhost:8000/api/report/history?url=https://example.com"
```

---

### POST /api/prefetch

Pre-warm cache for a domain (runs RDAP + IP lookup in background).

```bash
curl -X POST http://localhost:8000/api/prefetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

---

## Enterprise Endpoints

### POST /api/enterprise/report/{report_id}/tag

Tag a subdomain with business criticality.

```bash
curl -X POST http://localhost:8000/api/enterprise/report/abc12345/tag \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "admin.example.com", "business_criticality": "Production"}'
```

### POST /api/enterprise/report/{report_id}/create-issue

Create a Jira or GitHub issue from a finding.

```bash
curl -X POST http://localhost:8000/api/enterprise/report/abc12345/create-issue \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix HSTS", "description": "Missing HSTS header", "type": "jira", "jira_url": "...", "jira_email": "...", "jira_api_token": "..."}'
```

### POST /api/enterprise/report/{report_id}/verify-fix

Verify a remediation has been applied.

```bash
curl -X POST http://localhost:8000/api/enterprise/report/abc12345/verify-fix
```

### POST /api/enterprise/report/{report_id}/promote-to-case

Promote findings to an investigation case (TheHive-style).

```bash
curl -X POST http://localhost:8000/api/enterprise/report/abc12345/promote-to-case \
  -H "Content-Type: application/json" \
  -H "X-Workspace-Id: my-workspace" \
  -d '{"finding_ids": ["f1", "f2"], "title": "Investigation: critical vulns"}'
```

### GET /api/enterprise/report/{report_id}/cases

List investigation cases for a report.

### GET /api/enterprise/cases/{case_id}

Get a specific investigation case with its findings.

### GET /api/enterprise/audit/verify-chain

Verify the integrity of the audit log hash chain.

```bash
curl http://localhost:8000/api/enterprise/audit/verify-chain
```

### POST /api/enterprise/workspace/share

Upload a workspace snapshot for sharing.

```bash
curl -X POST http://localhost:8000/api/enterprise/workspace/share \
  -H "Content-Type: application/json" \
  -d '{"data": "{\"version\":1,\"workspace_id\":\"...\"}"}'
```

### GET /api/enterprise/workspace/share/{share_id}

Download a shared workspace snapshot.

---

## Remediation Playbooks

### GET /api/playbooks

List available playbooks.

```bash
curl http://localhost:8000/api/playbooks
```

### GET /api/playbooks/{playbook_id}

Get a specific remediation playbook.

```bash
curl http://localhost:8000/api/playbooks/missing-hsts-header
```

---

## Integrations

### GET /api/integrations/config

Health check for integrations configuration.

---

## Compliance

### GET /api/enterprise/report/{report_id}/compliance

Get SOC2 and NIST CSF compliance mapping for a report.

---

## Dark Web Intel

### GET /api/enterprise/report/{report_id}/darkweb

Get breach and leaked subdomain intelligence for a report.

---

## Health

### GET /

Root health check.

```bash
curl http://localhost:8000/
```

Response: `{"message": "Recon Pulse API is running"}`
