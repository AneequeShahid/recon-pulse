from datetime import datetime
from app.models import ReportData, AttackPathNode, SubdomainInfo, HostingInfo, ShodanInfo, ShodanService


def test_attack_path_empty():
    from app.analysis.attack_path import build_attack_path
    report = ReportData(id="test", url="https://example.com", created_at=datetime.now(), status="complete")
    nodes = build_attack_path(report)
    assert len(nodes) == 1
    assert nodes[0].type == "domain"
    assert nodes[0].id == "root"


def test_attack_path_with_subdomains():
    from app.analysis.attack_path import build_attack_path
    report = ReportData(
        id="test", url="https://example.com", created_at=datetime.now(), status="complete",
        subdomains=SubdomainInfo(subdomains=["www.example.com", "api.example.com", "admin.example.com"]),
    )
    nodes = build_attack_path(report)
    assert len(nodes) == 4  # root + 3 subdomains
    assert nodes[0].id == "root"
    assert len(nodes[0].children) == 3
    sub_types = [n.type for n in nodes]
    assert sub_types.count("subdomain") == 3


def test_attack_path_with_ip():
    from app.analysis.attack_path import build_attack_path
    report = ReportData(
        id="test", url="https://example.com", created_at=datetime.now(), status="complete",
        hosting=HostingInfo(ip="1.2.3.4", isp="Test ISP", country="US"),
    )
    nodes = build_attack_path(report)
    ip_nodes = [n for n in nodes if n.type == "ip"]
    assert len(ip_nodes) == 1
    assert ip_nodes[0].label == "1.2.3.4"


def test_attack_path_with_services():
    from app.analysis.attack_path import build_attack_path
    report = ReportData(
        id="test", url="https://example.com", created_at=datetime.now(), status="complete",
        shodan=ShodanInfo(
            ip="1.2.3.4",
            services=[
                ShodanService(port=80, product="nginx", name="HTTP"),
                ShodanService(port=443, product="nginx", name="HTTPS"),
            ],
            vulns=["CVE-2024-12345"],
        ),
    )
    nodes = build_attack_path(report)
    svc_nodes = [n for n in nodes if n.type == "service"]
    vuln_nodes = [n for n in nodes if n.type == "vuln"]
    assert len(svc_nodes) == 2
    assert len(vuln_nodes) == 1


def test_attack_path_mitre_enrichment():
    from app.analysis.attack_path import build_attack_path
    report = ReportData(
        id="test", url="https://example.com", created_at=datetime.now(), status="complete",
        shodan=ShodanInfo(vulns=["CVE-2024-99999"]),
    )
    nodes = build_attack_path(report)
    vuln_nodes = [n for n in nodes if n.type == "vuln"]
    assert len(vuln_nodes) == 1
    assert vuln_nodes[0].data is not None
    mitre = vuln_nodes[0].data.get("mitre", [])
    assert len(mitre) > 0
    assert mitre[0]["technique_id"] == "T1190"
