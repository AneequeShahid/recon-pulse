# Recon Pulse — Integration Plan for Phases 15–34

Based on research of Nuclei (template scanner), Shuffle (SOAR), and TheHive (incident response).

---

## I. Intelligence & Context (The "Brain")

### Phase 15: MITRE ATT&CK Mapping

**Research Source:** Nuclei

**Finding:** Nuclei does NOT natively support MITRE ATT&CK — its `Classification` struct covers CVE, CWE, CVSS, EPSS, CPE only. Tags are the flexible mechanism (`tags: "cve,cve2021,rce"`).

**Plan:**
- Add a `mitre_attack` field to Nuclei's `model.Info` classification block (upstream contribution) OR maintain a local mapping table: `{cve -> technique_id}` using MITRE CVE-to-technique dataset.
- In Recon Pulse, create `backend/app/services/mitre_service.py` that maps vulnerability findings (CVE IDs, weakness types) to ATT&CK techniques using a local JSON mapping file.
- Store mapping as `{technique_id, technique_name, tactic, platform}` in report model.
- Display in frontend as "ATT&CK Technique: T1190 (Exploit Public-Facing Application)" badge.

**Pattern Adoption:** Use Nuclei's metadata index approach — prebuild a MITRE mapping index to avoid per-scan lookups.

---

### Phase 16: Supply Chain Graph (SBOM)

**Research Source:** Nuclei

**Finding:** Nuclei detects tech stacks via HTTP fingerprinting but doesn't generate SBOMs.

**Plan:**
- From `tech_stack` detected by Wappalyzer, map JavaScript libraries to known CVEs using a lightweight SBOM database (OSV.dev API or Grype's database).
- Create `backend/app/services/sbom_service.py` that:
  1. Receives tech stack from scan result
  2. Queries OSV.dev API for known vulnerabilities
  3. Returns SBOM JSON (package name, version, CVE list, severity)
- Add `sbom` field to `ReportData` model: `list[SBOMPackage]`

**Pattern Adoption:** Use Nuclei's operator pattern — define matchers per library version to detect known vulnerable versions.

---

### Phase 17: Business Criticality Scoring

**Research Source:** Recon Pulse (already built)

**Status:** Already implemented — `SubdomainTag` model with Production/Staging/Sandbox/Unknown, 1.5x risk multiplier in scoring.

---

### Phase 18: Shadow IT Discovery

**Research Source:** Nuclei

**Finding:** Nuclei supports DNS bruteforce via `dns` protocol templates with wordlist-based subdomain discovery.

**Plan:**
- Extend `backend/app/services/subdomain_service.py` to use Nuclei-style DNS bruteforce:
  - Load a common subdomain wordlist (~10k entries)
  - For each word, query DNS A/AAAA/CNAME records
  - Also check Certificate Transparency logs (crt.sh) for unindexed subdomains
- Run this as a parallel task in the orchestrator
- New field: `shadow_subdomains: list[str]` in report (separate from known subdomains)

**Pattern Adoption:** Use Nuclei's concurrent work pool pattern for DNS bruteforce with configurable rate limiting.

---

### Phase 19: CISA KEV Integration

**Research Source:** Recon Pulse (already built)

**Status:** Already implemented — `cisa_kev_service.py` fetches KEV catalog, matches against findings, elevates to Critical.

---

## II. Automated Response (The "Muscle")

### Phase 20: Verified Patching

**Research Source:** Recon Pulse (already built)

**Status:** Already implemented — `verify_fix_service.py` re-checks remediation, marks Resolved.

---

### Phase 21: Auto-Ticket Routing

**Research Source:** Shuffle

**Finding:** Shuffle uses OpenAPI-defined app connectors, webhook-to-workflow mapping, and credential-per-app with groups.

**Plan:**
- Build a **rule engine** in `backend/app/services/ticket_routing_service.py`:
  - Rules format: `{condition: {severity: "Critical", asset_tag: "Production"}, action: {integration: "jira", project: "SEC", priority: "Highest"}}`
  - Accept integration keys from frontend (client-side encrypted)
  - Match findings against rules on scan completion
- Extend existing `create_jira_issue` and `create_github_issue` to accept rule-based routing config
- Store rules locally in frontend localStorage (not on server)

**Pattern Adoption:** 
- Shuffle's webhook-to-workflow mapping pattern — each scan completion triggers a "webhook" that runs routing rules
- Shuffle's credential-per-app model — each integration has its own stored credentials (client-side encrypted)

---

### Phase 22: Ephemeral Infrastructure Scanning

**Research Source:** Nuclei

**Finding:** Nuclei supports `headless` protocol for browser-based scanning and `code` protocol for local execution.

**Plan:**
- Create `backend/app/services/cloud_scan_service.py` that accepts cloud provider credentials (client-side encrypted):
  - AWS: list EC2 instances, ECS tasks, Lambda functions
  - GCP: list Compute instances, Cloud Run services
  - Azure: list VMs, Container Instances
- For each ephemeral asset discovered, run a lightweight scan (ports + TLS + tech stack)
- Credentials stored in frontend localStorage, passed via encrypted request headers

**Pattern Adoption:** Nuclei's multi-protocol execution — run different scan types per asset type (HTTP for web, DNS for LB, TCP for ports).

---

### Phase 23: Secret Scanning

**Research Source:** TruffleHog (referenced in roadmap), Nuclei

**Finding:** Nuclei's `file` protocol can read local files, and `code` protocol can execute detection scripts.

**Plan:**
- Create `backend/app/services/secret_scan_service.py`:
  - Fetch target page JS files, .git/config, and common secret exposure paths
  - Use regex patterns for API keys, tokens, passwords (AWS keys, GitHub tokens, Slack tokens, etc.)
  - Check `.git/HEAD` and `.git/config` exposure (Nuclei's git-config-exposure template pattern)
- Run as parallel task in orchestrator
- New field: `exposed_secrets: list[ExposedSecret]` in report

**Pattern Adoption:** Adopt Nuclei's matcher pattern — define secret patterns as YAML-like rules with severity, category, and remediation.

---

### Phase 24: Remediation Playbook Library

**Research Source:** Nuclei

**Finding:** Nuclei templates include `remediation` field and `reference` URLs for fixes.

**Plan:**
- Create `static/playbooks/` directory with JSON-structured playbooks:
  ```json
  {
    "id": "missing-hsts-header",
    "title": "Enable HSTS Header",
    "severity": "medium",
    "nginx": "add_header Strict-Transport-Security \"max-age=63072000\" always;",
    "apache": "Header always set Strict-Transport-Security \"max-age=63072000\"",
    "terraform": "...",
    "ansible": "..."
  }
  ```
- Expose via `/api/playbooks/{id}` endpoint
- Frontend download button in remediation modal

---

## III. Platform & Professional Ecosystem (The "Scale")

### Phase 25: Audit Log Immutability

**Research Source:** Shuffle

**Finding:** Shuffle encrypts credentials at rest using `SHUFFLE_ENCRYPTION_MODIFIER` env var.

**Plan:**
- Hash each audit log entry using SHA-256 with a rolling hash chain (each entry includes the hash of the previous entry)
- Sign the latest hash with a server-side key
- Expose `/api/audit/verify-chain` endpoint to verify immutability
- This creates a tamper-evident log chain for SOC2/NIST compliance

**Pattern Adoption:** Shuffle's encryption-at-rest pattern for sensitive data.

---

### Phase 26: Multi-Tenant Workspace SDK

**Research Source:** Recon Pulse (already built — SessionWorkspace), Shuffle

**Finding:** Shuffle supports org-scoped data isolation with inheritance.

**Plan:**
- Enhance `frontend/src/hooks/SessionWorkspace.tsx` with export/import:
  - Export: `workspace_snapshot.json` containing scan history, integration keys (encrypted), preferences
  - Import: validate and load snapshot into localStorage
- Create a minimal "team share" endpoint on backend that accepts encrypted workspace snapshots and returns a share link (optional, no mandatory cloud DB)

---

### Phase 27: False Positive Suppression

**Research Source:** TheHive (case management)

**Plan:**
- Add `false_positives` table to local DB:
  ```sql
  CREATE TABLE IF NOT EXISTS false_positives (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    finding_hash TEXT NOT NULL,  -- hash of (report_id + finding_type + detail)
    justification TEXT,
    created_at TEXT NOT NULL
  )
  ```
- Frontend: "Mark as False Positive" button on each finding row with a justification textarea
- Backend: `POST /api/enterprise/report/{report_id}/false-positive` — stores the suppression
- On subsequent scans, skip findings matching a false positive hash for that workspace
- Workspace-scoped (not user-scoped) to align with Zero-Friction model

---

### Phase 28: API-First Headless Mode

**Plan:**
- Create `docs/API.md` documenting all existing endpoints:
  - `POST /api/report` — start scan
  - `GET /api/report/{id}/stream` — SSE result stream
  - `GET /api/report/{id}` — get report JSON
  - `GET /api/report/history` — scan history (workspace-filtered)
  - `POST /api/enterprise/report/{id}/verify-fix` — verify remediation
  - `POST /api/enterprise/report/{id}/tag` — tag subdomain
  - `POST /api/enterprise/report/{id}/create-issue` — create ticket with client credentials
- Include curl examples for each
- Add `X-Workspace-Id` header requirement documentation

---

### Phase 29: CI/CD Pipeline Integration

**Research Source:** Shuffle

**Finding:** Shuffle uses pipeline webhooks (handlePipelineCallback) that accept external CI/CD events.

**Plan:**
- Create `recon-pulse-cli` as a simple Python script:
  ```python
  #!/usr/bin/env python3
  # recon-pulse-cli
  import requests, sys
  
  api_url = sys.argv[1]
  target = sys.argv[2]
  threshold = int(sys.argv.get(3, 70))
  workspace_id = "ci-$(git rev-parse HEAD)"
  
  resp = requests.post(f"{api_url}/api/report", json={"url": target}, 
                        headers={"X-Workspace-Id": workspace_id})
  report_id = resp.json()["report_id"]
  # Poll until complete...
  # If score < threshold: sys.exit(1)
  ```
- GitHub Action template in `.github/workflows/recon-pulse-scan.yml`
- Fail pipeline if Pulse Score below configurable threshold

---

## IV. The "Ultimate" Edge

### Phase 30: Attack Path Visualization

**Research Source:** Recon Pulse (already built — AttackPathView with react-flow)

**Status:** Already implemented.

---

### Phase 31: Drift Detection

**Research Source:** Nuclei

**Finding:** Nuclei can re-scan on schedule via cron/interval.

**Plan:**
- After scan completion, store DNS A/AAAA/CNAME records for the domain
- On next scan (or background check), compare current DNS records against stored baseline
- If changed: trigger re-scan and flag "Drift Detected" in report
- New field: `dns_drift: {baseline: [...], current: [...], changed: bool}`
- Implement via a lightweight background scheduler in orchestrator (apscheduler or simple thread)

---

### Phase 32: Collaborative Remediation

**Research Source:** TheHive

**Plan:**
- Enhance SessionWorkspace to support `shared_workspace_id`:
  - Users can enter a peer's workspace ID to create a "collaboration session"
  - Comments stored in localStorage per workspace, synced via optional backend relay endpoint
- Backend relay (optional, opt-in): `POST /api/workspace/sync` — accepts encrypted comment payloads
- Comments format: `{finding_hash, author: "alias", comment: "string", timestamp}`
- Frontend: comment thread UI on each finding in detail modal

---

### Phase 33: Regulatory Compliance Dashboard

**Research Source:** Recon Pulse (already built — compliance_soc2 + compliance_nist)

**Status:** Already implemented.

---

### Phase 34: Public/Private Scan Mode

**Research Source:** Shuffle

**Finding:** Shuffle supports cloud vs onprem execution environments.

**Plan:**
- Add `public_mode: bool` toggle to the scan request
- When enabled: after scan completes, anonymize the report (remove URL/IP) and submit findings hash to a public IoC database
- Backend endpoint: `POST /api/community/intel` — accepts anonymized findings
- Community intel DB: optional, opt-in, separate deployment
- Frontend toggle: "Contribute to Community Intel" in settings panel

---

## Summary of Patterns to Adopt

| Phase | Pattern Source | Pattern |
|-------|---------------|---------|
| 15 | Nuclei | Metadata index for fast MITRE mapping lookups |
| 16 | Nuclei | Operator/matcher pattern for library version detection |
| 18 | Nuclei | Concurrent work pool with rate-limited DNS bruteforce |
| 21 | Shuffle | Webhook-to-workflow mapping, credential-per-app model |
| 22 | Nuclei | Multi-protocol execution per asset type |
| 23 | Nuclei | YAML-like matcher rules for secret patterns |
| 25 | Shuffle | Encryption-at-rest for sensitive audit data |
| 29 | Shuffle | Pipeline webhook pattern for CI/CD integration |
| 31 | Nuclei | Cron/interval-based re-scan scheduling |
| 34 | Shuffle | Cloud vs onprem execution environment toggle |

## Attribution

Research repositories:
- **Nuclei** by ProjectDiscovery — template-based vulnerability scanner (MIT License)
- **Shuffle** by Shuffle — SOAR platform (AGPL-3.0 License)  
- **TheHive** by TheHive Project — incident response platform (AGPL-3.0 License)
