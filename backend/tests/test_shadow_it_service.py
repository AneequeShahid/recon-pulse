import pytest
from app.models import ShadowSubdomain
from app.services.shadow_it_service import (
    classify_subdomain,
    COMMON_SUBDOMAINS,
)

class TestClassifySubdomain:
    def test_staging(self):
        assert classify_subdomain("staging") == "Staging"
        assert classify_subdomain("stage") == "Staging"
        assert classify_subdomain("preprod") == "Staging"

    def test_development(self):
        assert classify_subdomain("dev") == "Development"
        assert classify_subdomain("test") == "Development"
        assert classify_subdomain("qa") == "Development"

    def test_admin(self):
        assert classify_subdomain("admin") == "Admin"

    def test_mail(self):
        assert classify_subdomain("mail") == "Mail"
        assert classify_subdomain("smtp") == "Mail"
        assert classify_subdomain("webmail") == "Mail"

    def test_api(self):
        assert classify_subdomain("api") == "API"
        assert classify_subdomain("graphql") == "API"

    def test_cdn(self):
        assert classify_subdomain("cdn") == "CDN"
        assert classify_subdomain("static") == "CDN"

    def test_unknown(self):
        assert classify_subdomain("corp") == "Unknown"
        assert classify_subdomain("randomstuff") == "Unknown"

class TestSubdomainWordlist:
    def test_has_common_prefixes(self):
        assert "www" in COMMON_SUBDOMAINS
        assert "mail" in COMMON_SUBDOMAINS
        assert "api" in COMMON_SUBDOMAINS
        assert "admin" in COMMON_SUBDOMAINS
        assert len(COMMON_SUBDOMAINS) >= 150

class TestShadowSubdomainModel:
    def test_defaults(self):
        s = ShadowSubdomain(subdomain="test.example.com")
        assert s.subdomain == "test.example.com"
        assert s.resolved_ip is None
        assert s.source == "dns_bruteforce"
        assert s.classification == "Unknown"

    def test_with_ip(self):
        s = ShadowSubdomain(
            subdomain="mail.example.com",
            resolved_ip="192.168.1.1",
            source="crt_sh",
            classification="Mail",
        )
        assert s.resolved_ip == "192.168.1.1"
        assert s.source == "crt_sh"
        assert s.classification == "Mail"
