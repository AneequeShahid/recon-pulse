import os
import sqlite3
from typing import Optional
import asyncio
from datetime import datetime
from supabase import create_client, Client
from app.models import ReportData, InvestigationCase

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
DB_PATH = "recon_pulse.db"

# Initialize Supabase client (with local mock fallback to avoid crash on import)
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase: {e}")
        supabase = None

def _init_sqlite_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            status TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

if not supabase:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY missing. Falling back to local SQLite database.")
    _init_sqlite_db()

def _report_to_row(report: ReportData) -> dict:
    return {
        "id": report.id,
        "url": report.url,
        "screenshot_url": report.screenshot_url,
        "og_title": report.og_title,
        "og_description": report.og_description,
        "favicon": report.favicon,
        "tech_stack": report.tech_stack.model_dump(mode="json") if report.tech_stack else None,
        "security": report.security.model_dump(mode="json") if report.security else None,
        "performance": report.performance.model_dump(mode="json") if report.performance else None,
        "hosting": report.hosting.model_dump(mode="json") if report.hosting else None,
        "domain": report.domain.model_dump(mode="json") if report.domain else None,
        "news": [item.model_dump(mode="json") for item in report.news] if report.news else None,
        "github": report.github.model_dump(mode="json") if report.github else None,
        "colors": report.colors.model_dump(mode="json") if report.colors else None,
        "carbon": report.carbon.model_dump(mode="json") if report.carbon else None,
        "traffic": report.traffic.model_dump(mode="json") if report.traffic else None,
        "dns_records": report.dns_records,
        "redirect_chain": report.redirect_chain.model_dump(mode="json") if report.redirect_chain else None,
        "email_security": report.email_security.model_dump(mode="json") if report.email_security else None,
        "social": report.social.model_dump(mode="json") if report.social else None,
        "wayback": report.wayback.model_dump(mode="json") if report.wayback else None,
        "http_version": report.http_version.model_dump(mode="json") if report.http_version else None,
        "robots": report.robots.model_dump(mode="json") if report.robots else None,
        "bgp": report.bgp.model_dump(mode="json") if report.bgp else None,
        "subdomains": report.subdomains.model_dump(mode="json") if report.subdomains else None,
        "shadow_subdomains": [s.model_dump(mode="json") for s in report.shadow_subdomains] if report.shadow_subdomains else None,
        "cloud_assets": report.cloud_assets,
        "exposed_secrets": [s.model_dump(mode="json") for s in report.exposed_secrets] if report.exposed_secrets else None,
        "dns_drift": report.dns_drift,
        "reputation": report.reputation.model_dump(mode="json") if report.reputation else None,
        "observatory": report.observatory.model_dump(mode="json") if report.observatory else None,
        "summary_score": report.summary_score,
        "threat_level": report.threat_level,
        "remediation_steps": report.remediation_steps,
        "shodan": report.shodan.model_dump(mode="json") if report.shodan else None,
        "securitytrails": report.securitytrails.model_dump(mode="json") if report.securitytrails else None,
        "alienvault": report.alienvault.model_dump(mode="json") if report.alienvault else None,
        "ssllabs": report.ssllabs.model_dump(mode="json") if report.ssllabs else None,
        "compliance_soc2": report.compliance_soc2.model_dump(mode="json") if report.compliance_soc2 else None,
        "compliance_nist": report.compliance_nist.model_dump(mode="json") if report.compliance_nist else None,
        "darkweb": report.darkweb.model_dump(mode="json") if report.darkweb else None,
        "sbom": report.sbom.model_dump(mode="json") if report.sbom else None,
        "attack_path": [n.model_dump(mode="json") for n in report.attack_path] if report.attack_path else None,
        "findings": [f.model_dump(mode="json") for f in report.findings] if report.findings else None,
        "threat_intel": report.threat_intel.model_dump(mode="json") if report.threat_intel else None,
        "created_at": report.created_at.isoformat(),
        "status": report.status,
    }

def _row_to_report(row: dict) -> ReportData:
    return ReportData.model_validate(row)

def _save_report_sync(report: ReportData) -> None:
    if supabase:
        supabase.table("reports").insert(_report_to_row(report)).execute()
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        data_str = report.model_dump_json()
        cursor.execute(
            "INSERT INTO reports (id, url, status, data, created_at) VALUES (?, ?, ?, ?, ?)",
            (report.id, report.url, report.status, data_str, report.created_at.isoformat())
        )
        conn.commit()
        conn.close()

def _get_report_sync(report_id: str) -> Optional[ReportData]:
    if supabase:
        response = supabase.table("reports").select("*").eq("id", report_id).execute()
        if not response.data:
            return None
        return _row_to_report(response.data[0])
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return ReportData.model_validate_json(row[0])

def _update_report_sync(report: ReportData) -> None:
    if supabase:
        supabase.table("reports").update(_report_to_row(report)).eq("id", report.id).execute()
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        data_str = report.model_dump_json()
        cursor.execute(
            "UPDATE reports SET status = ?, data = ? WHERE id = ?",
            (report.status, data_str, report.id)
        )
        conn.commit()
        conn.close()

def _get_cached_sync(url: str) -> Optional[str]:
    try:
        if supabase:
            response = supabase.table("reports") \
                .select("id, created_at") \
                .eq("url", url) \
                .eq("status", "complete") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
                
            if not response.data:
                return None
                
            row = response.data[0]
            report_id = row.get("id")
            created_at_str = row.get("created_at")
        else:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, created_at FROM reports WHERE url = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1",
                (url,)
            )
            row = cursor.fetchone()
            conn.close()
            if not row:
                return None
            report_id, created_at_str = row
        
        from datetime import datetime, timedelta, timezone
        created_at = datetime.fromisoformat(created_at_str)
        now = datetime.now(timezone.utc) if created_at.tzinfo else datetime.now()
        if now - created_at < timedelta(hours=24):
            return report_id
    except Exception as e:
        print(f"Error checking cache: {e}")
        pass
    return None

async def save_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _save_report_sync, report)

async def get_report(report_id: str) -> Optional[ReportData]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_report_sync, report_id)

async def update_report(report: ReportData) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _update_report_sync, report)

async def get_cached(url: str) -> Optional[str]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_cached_sync, url)

def _get_history_sync(url: str) -> list:
    if supabase:
        try:
            response = supabase.table("reports") \
                .select("summary_score, created_at") \
                .eq("url", url) \
                .eq("status", "complete") \
                .order("created_at", desc=True) \
                .limit(15) \
                .execute()
            return response.data or []
        except Exception as e:
            print(f"Supabase history query error: {e}")
            return []
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT data, created_at FROM reports WHERE url = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 15",
            (url,)
        )
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            try:
                import json
                data = json.loads(row[0])
                history.append({
                    "summary_score": data.get("summary_score"),
                    "created_at": row[1]
                })
            except Exception:
                pass
        return history

async def get_history(url: str) -> list:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_history_sync, url)


# ─── Investigation Cases (TheHive-style) ───────────────────────────────

def _init_cases_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS investigation_cases (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            workspace_id TEXT,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            finding_ids TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


_init_cases_table()


def _save_case_sync(case: InvestigationCase) -> None:
    import json
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """INSERT OR REPLACE INTO investigation_cases
           (id, report_id, workspace_id, title, status, finding_ids, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            case.id,
            case.report_id,
            case.workspace_id,
            case.title,
            case.status,
            json.dumps(case.finding_ids),
            case.notes,
            case.created_at.isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def _get_case_sync(case_id: str) -> Optional[InvestigationCase]:
    import json
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, report_id, workspace_id, title, status, finding_ids, notes, created_at "
        "FROM investigation_cases WHERE id = ?",
        (case_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return InvestigationCase(
        id=row[0],
        report_id=row[1],
        workspace_id=row[2],
        title=row[3],
        status=row[4],
        finding_ids=json.loads(row[5]),
        notes=row[6],
        created_at=datetime.fromisoformat(row[7]),
    )


def _list_cases_for_report_sync(report_id: str) -> list[InvestigationCase]:
    import json
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, report_id, workspace_id, title, status, finding_ids, notes, created_at "
        "FROM investigation_cases WHERE report_id = ? ORDER BY created_at DESC",
        (report_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        InvestigationCase(
            id=r[0], report_id=r[1], workspace_id=r[2], title=r[3],
            status=r[4], finding_ids=json.loads(r[5]), notes=r[6],
            created_at=datetime.fromisoformat(r[7]),
        )
        for r in rows
    ]


async def save_case(case: InvestigationCase) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _save_case_sync, case)


async def get_case(case_id: str) -> Optional[InvestigationCase]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_case_sync, case_id)


async def list_cases_for_report(report_id: str) -> list[InvestigationCase]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _list_cases_for_report_sync, report_id)


# ─── Workspace / Audit Tables ──────────────────────────────────────────

import hashlib
import hmac as hmac_lib

AUDIT_SIGNING_KEY = os.environ.get("AUDIT_SIGNING_KEY", "recon-pulse-default-audit-key-change-in-prod")

def _init_workspace_tables():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL DEFAULT 'anonymous',
            action TEXT NOT NULL,
            resource TEXT,
            details TEXT,
            ip_address TEXT,
            previous_hash TEXT,
            hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_chain (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latest_hash TEXT NOT NULL,
            signature TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

if not supabase:
    _init_workspace_tables()


def _compute_entry_hash(entry: dict) -> str:
    raw = f"{entry['id']}|{entry['workspace_id']}|{entry['action']}|{entry.get('resource','')}|{entry.get('details','')}|{entry.get('ip_address','')}|{entry.get('previous_hash','')}|{entry['created_at']}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _sign_hash(h: str) -> str:
    return hmac_lib.new(AUDIT_SIGNING_KEY.encode(), h.encode(), hashlib.sha256).hexdigest()


def _get_latest_hash_sync() -> str | None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT hash FROM audit_logs ORDER BY rowid DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def _create_audit_log_sync(workspace_id: str, action: str, resource: str | None = None, details: str | None = None, ip_address: str | None = None) -> None:
    import uuid
    log_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    prev_hash = _get_latest_hash_sync() or ""
    entry = {
        "id": log_id, "workspace_id": workspace_id, "action": action,
        "resource": resource or "", "details": details or "",
        "ip_address": ip_address or "", "previous_hash": prev_hash,
        "created_at": now,
    }
    entry_hash = _compute_entry_hash(entry)

    if supabase:
        supabase.table("audit_logs").insert({
            **entry, "hash": entry_hash
        }).execute()
        sig = _sign_hash(entry_hash)
        supabase.table("audit_chain").insert({
            "latest_hash": entry_hash, "signature": sig, "created_at": now
        }).execute()
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (id, workspace_id, action, resource, details, ip_address, previous_hash, hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (log_id, workspace_id, action, resource or "", details or "", ip_address or "", prev_hash, entry_hash, now)
        )
        sig = _sign_hash(entry_hash)
        cursor.execute(
            "INSERT INTO audit_chain (latest_hash, signature, created_at) VALUES (?, ?, ?)",
            (entry_hash, sig, now)
        )
        conn.commit()
        conn.close()


def _verify_chain_sync() -> dict:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, workspace_id, action, resource, details, ip_address, previous_hash, hash, created_at FROM audit_logs ORDER BY rowid ASC")
    rows = cursor.fetchall()
    cursor.execute("SELECT latest_hash, signature FROM audit_chain ORDER BY id DESC LIMIT 1")
    latest = cursor.fetchone()
    conn.close()

    errors = []
    prev_hash = ""
    for row in rows:
        entry = {
            "id": row[0], "workspace_id": row[1], "action": row[2],
            "resource": row[3] or "", "details": row[4] or "",
            "ip_address": row[5] or "", "previous_hash": row[6] or "",
            "created_at": row[8],
        }
        expected_hash = _compute_entry_hash(entry)
        if expected_hash != row[7]:
            errors.append(f"Hash mismatch at entry {row[0]}: expected {expected_hash}, got {row[7]}")
        if entry["previous_hash"] != prev_hash:
            errors.append(f"Chain break at entry {row[0]}: prev_hash {entry['previous_hash']} != {prev_hash}")
        prev_hash = expected_hash

    chain_valid = len(errors) == 0
    signature_valid = False
    if latest:
        expected_sig = _sign_hash(latest[0])
        signature_valid = expected_sig == latest[1]

    return {
        "chain_valid": chain_valid,
        "signature_valid": signature_valid,
        "total_entries": len(rows),
        "errors": errors,
    }
