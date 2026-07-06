import os
import hashlib
import hmac as hmac_lib
from app.database import _compute_entry_hash, _sign_hash, AUDIT_SIGNING_KEY


class TestAuditChain:
    def test_compute_entry_hash_consistency(self):
        entry = {
            "id": "abc123",
            "workspace_id": "ws1",
            "action": "scan_started",
            "resource": "https://example.com",
            "details": "",
            "ip_address": "127.0.0.1",
            "previous_hash": "",
            "created_at": "2026-07-06T12:00:00",
        }
        h1 = _compute_entry_hash(entry)
        h2 = _compute_entry_hash(entry)
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex

    def test_entry_hash_changes_with_content(self):
        entry_a = {
            "id": "abc", "workspace_id": "ws1", "action": "read",
            "resource": "", "details": "", "ip_address": "",
            "previous_hash": "", "created_at": "now",
        }
        entry_b = {
            "id": "abc", "workspace_id": "ws1", "action": "delete",
            "resource": "", "details": "", "ip_address": "",
            "previous_hash": "", "created_at": "now",
        }
        assert _compute_entry_hash(entry_a) != _compute_entry_hash(entry_b)

    def test_entry_hash_chains(self):
        entry1 = {
            "id": "1", "workspace_id": "ws1", "action": "create",
            "resource": "", "details": "", "ip_address": "",
            "previous_hash": "", "created_at": "t1",
        }
        h1 = _compute_entry_hash(entry1)
        entry2 = {
            "id": "2", "workspace_id": "ws1", "action": "update",
            "resource": "", "details": "", "ip_address": "",
            "previous_hash": h1, "created_at": "t2",
        }
        h2 = _compute_entry_hash(entry2)
        assert h2 != h1
        assert h2 != _compute_entry_hash({
            "id": "2", "workspace_id": "ws1", "action": "update",
            "resource": "", "details": "", "ip_address": "",
            "previous_hash": "wrong", "created_at": "t2",
        })

    def test_sign_hash_consistency(self):
        h = "a" * 64
        s1 = _sign_hash(h)
        s2 = _sign_hash(h)
        assert s1 == s2
        assert len(s1) == 64

    def test_sign_hash_different_key_changes(self):
        original_key = AUDIT_SIGNING_KEY
        try:
            h = "b" * 64
            sig_default = _sign_hash(h)
            # Override key for test
            import app.database as db
            db.AUDIT_SIGNING_KEY = "different-key"
            sig_diff = _sign_hash(h)
            assert sig_default != sig_diff
        finally:
            import app.database as db
            db.AUDIT_SIGNING_KEY = original_key
