import pytest
from app.services.drift_service import _resolve_dns_records


class TestResolveDNS:
    def test_resolve_known_domain(self):
        records = _resolve_dns_records("google.com")
        assert isinstance(records, dict)
        assert "A" in records
        assert len(records["A"]) > 0

    def test_resolve_nonexistent_domain(self):
        records = _resolve_dns_records("this-domain-does-not-exist-12345.com")
        assert isinstance(records, dict)
        assert records["A"] == []

    def test_resolve_empty_domain_returns_dict(self):
        records = _resolve_dns_records("")
        assert isinstance(records, dict)
        assert "A" in records
        assert "AAAA" in records
        assert "CNAME" in records
