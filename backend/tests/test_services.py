import pytest
from app.services import (
    rdap_service, ip_service, dns_service, ssl_service,
    wappalyzer_service, http_version_service, robots_service,
    bgp_service, subdomain_service, reputation_service, observatory_service
)

@pytest.mark.asyncio
async def test_rdap_service():
    info = await rdap_service.fetch_domain_info("google.com")
    assert info is not None
    # Verify returning structure conforms
    assert hasattr(info, "registrar")
    assert hasattr(info, "age_days")

@pytest.mark.asyncio
async def test_ip_service():
    info = await ip_service.fetch_hosting_info("google.com")
    assert info is not None
    assert hasattr(info, "ip")
    assert hasattr(info, "isp")

@pytest.mark.asyncio
async def test_dns_service():
    info = await dns_service.fetch_dns_records("google.com")
    assert info is not None
    assert "A" in info
    assert "MX" in info

@pytest.mark.asyncio
async def test_ssl_service():
    info = await ssl_service.fetch_ssl_grade("google.com")
    assert info is not None
    assert hasattr(info, "ssl_grade")
    assert hasattr(info, "https")

@pytest.mark.asyncio
async def test_wappalyzer_service():
    info = await wappalyzer_service.fetch_tech_stack("https://google.com")
    assert info is not None
    assert hasattr(info, "technologies")
    assert hasattr(info, "categories")

@pytest.mark.asyncio
async def test_http_version_service():
    info = await http_version_service.check_http_version("google.com")
    assert info is not None
    assert hasattr(info, "http2")
    assert hasattr(info, "http3")

@pytest.mark.asyncio
async def test_robots_service():
    info = await robots_service.fetch_robots_and_sitemap("google.com")
    assert info is not None
    assert hasattr(info, "robots_txt")
    assert hasattr(info, "sitemap_url")

@pytest.mark.asyncio
async def test_bgp_service():
    info = await bgp_service.fetch_bgp_info("AS13335")
    assert info is not None
    assert hasattr(info, "asn")
    assert hasattr(info, "prefixes_ipv4")

@pytest.mark.asyncio
async def test_subdomain_service():
    info = await subdomain_service.fetch_subdomains("google.com")
    assert info is not None
    assert hasattr(info, "subdomains")
    assert hasattr(info, "total_count")

@pytest.mark.asyncio
async def test_reputation_service():
    info = await reputation_service.fetch_domain_reputation("google.com")
    assert info is not None
    assert hasattr(info, "malicious_count")
    assert hasattr(info, "status")

@pytest.mark.asyncio
async def test_observatory_service():
    info = await observatory_service.fetch_observatory_grade("google.com")
    assert info is not None
    assert hasattr(info, "grade")
    assert hasattr(info, "score")
