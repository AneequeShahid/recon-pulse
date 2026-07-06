import sqlite3
import json
import socket
from typing import Any, Dict, List, Optional

DB_PATH = "recon_pulse.db"


def _init_drift_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dns_baselines (
            domain TEXT PRIMARY KEY,
            records TEXT NOT NULL,
            first_seen TEXT NOT NULL,
            last_checked TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


_init_drift_table()


def _resolve_dns_records(domain: str) -> Dict[str, List[str]]:
    records: Dict[str, List[str]] = {"A": [], "AAAA": [], "CNAME": []}
    try:
        info = socket.getaddrinfo(domain, 80)
        for family, _, _, _, addr in info:
            ip = addr[0]
            if family == socket.AF_INET:
                records["A"].append(ip)
            elif family == socket.AF_INET6:
                records["AAAA"].append(ip)
    except socket.gaierror:
        pass

    try:
        from dns import resolver
        try:
            answers = resolver.resolve(domain, "CNAME")
            records["CNAME"] = [str(r) for r in answers]
        except Exception:
            pass
    except ImportError:
        pass

    return {k: sorted(set(v)) for k, v in records.items()}


async def check_dns_drift(domain: str) -> Optional[Dict[str, Any]]:
    if not domain:
        return None

    from datetime import datetime
    now = datetime.now().isoformat()

    current = _resolve_dns_records(domain)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT records, first_seen FROM dns_baselines WHERE domain = ?", (domain,))
    row = cursor.fetchone()

    if not row:
        cursor.execute(
            "INSERT OR REPLACE INTO dns_baselines (domain, records, first_seen, last_checked) VALUES (?, ?, ?, ?)",
            (domain, json.dumps(current), now, now),
        )
        conn.commit()
        conn.close()
        return None

    baseline = json.loads(row[0])
    first_seen = row[1]

    drift_types: List[str] = []
    for rtype in ["A", "AAAA", "CNAME"]:
        old_set = set(baseline.get(rtype, []))
        new_set = set(current.get(rtype, []))
        if old_set != new_set:
            drift_types.append(rtype)

    if drift_types:
        cursor.execute(
            "UPDATE dns_baselines SET records = ?, last_checked = ? WHERE domain = ?",
            (json.dumps(current), now, domain),
        )
        conn.commit()
        conn.close()

        return {
            "drift_detected": True,
            "drift_types": drift_types,
            "baseline": baseline,
            "current": current,
            "first_seen": first_seen,
            "last_checked": now,
        }

    cursor.execute(
        "UPDATE dns_baselines SET last_checked = ? WHERE domain = ?",
        (now, domain),
    )
    conn.commit()
    conn.close()

    return {
        "drift_detected": False,
        "drift_types": [],
        "baseline": baseline,
        "current": current,
        "first_seen": first_seen,
        "last_checked": now,
    }
