import sqlite3
import json
import hashlib
from datetime import datetime
from typing import Any, Dict, Optional

from app.models import ReportData

DB_PATH = "recon_pulse.db"


def _init_community_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS community_intel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            finding_hash TEXT UNIQUE NOT NULL,
            finding_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            tech_tags TEXT NOT NULL,
            first_seen TEXT NOT NULL,
            report_count INTEGER DEFAULT 1
        )
    """)
    conn.commit()
    conn.close()


_init_community_table()


def _anonymize_report(report: ReportData) -> Optional[Dict[str, Any]]:
    if not report.findings:
        return None

    tech_tags = []
    if report.tech_stack and report.tech_stack.technologies:
        tech_tags = report.tech_stack.technologies[:5]

    first_finding = report.findings[0]
    raw = f"{first_finding.title}|{first_finding.severity}|{','.join(tech_tags)}"
    finding_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]

    return {
        "finding_hash": finding_hash,
        "finding_type": first_finding.title,
        "severity": first_finding.severity,
        "tech_tags": json.dumps(tech_tags),
    }


async def submit_community_intel(report: ReportData) -> bool:
    anonymized = _anonymize_report(report)
    if not anonymized:
        return False

    now = datetime.now().isoformat()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO community_intel (finding_hash, finding_type, severity, tech_tags, first_seen) VALUES (?, ?, ?, ?, ?)",
            (anonymized["finding_hash"], anonymized["finding_type"], anonymized["severity"], anonymized["tech_tags"], now),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        cursor.execute(
            "UPDATE community_intel SET report_count = report_count + 1 WHERE finding_hash = ?",
            (anonymized["finding_hash"],),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def get_community_intel(limit: int = 50) -> list:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT finding_hash, finding_type, severity, tech_tags, report_count, first_seen FROM community_intel ORDER BY report_count DESC, first_seen DESC LIMIT ?",
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "finding_hash": r[0],
            "finding_type": r[1],
            "severity": r[2],
            "tech_tags": json.loads(r[3]) if r[3] else [],
            "report_count": r[4],
            "first_seen": r[5],
        }
        for r in rows
    ]
