from typing import List, Dict, Any, Optional
from app.models import ReportData, AttackPathNode
from app.services.mitre_service import map_mitre_for_remediation


def build_attack_path(report: ReportData) -> List[AttackPathNode]:
    """Build a directed attack path graph from scan data.

    Returns nodes with proper edges (children) and MITRE ATT&CK enrichment.
    """
    domain = _extract_domain(report.url)
    nodes: List[AttackPathNode] = []
    node_map: Dict[str, AttackPathNode] = {}

    # Root = domain
    root = AttackPathNode(id="root", label=domain, type="domain", severity="Info")
    nodes.append(root)
    node_map["root"] = root

    # Subdomains -> children of root
    if report.subdomains and report.subdomains.subdomains:
        for s in report.subdomains.subdomains[:10]:
            sid = f"sub:{s}"
            node = AttackPathNode(
                id=sid, label=s, type="subdomain", severity="Low",
                children=[],
                # Use keyword matching to infer MITRE
                data={"mitre": _get_node_mitre(s, "subdomain")},
            )
            nodes.append(node)
            node_map[sid] = node
            root.children.append(sid)

    # Hosting IP -> children of root
    if report.hosting and report.hosting.ip:
        ip_id = f"ip:{report.hosting.ip}"
        ip_node = AttackPathNode(
            id=ip_id, label=report.hosting.ip, type="ip", severity="Info",
            children=[],
            data={"isp": report.hosting.isp or "", "country": report.hosting.country or ""},
        )
        nodes.append(ip_node)
        node_map[ip_id] = ip_node
        root.children.append(ip_id)

    # Shodan services -> children of IP or root
    if report.shodan and report.shodan.services:
        parent_id = f"ip:{report.shodan.ip}" if report.shodan.ip else "root"
        if parent_id not in node_map:
            parent_id = "root"
        for svc in report.shodan.services[:10]:
            sid = f"svc:{svc.port}:{svc.product or 'unknown'}"
            node = AttackPathNode(
                id=sid,
                label=f"{svc.product or svc.name or 'service'} ({svc.port})",
                type="service",
                severity="Medium",
                children=[],
                data={
                    "port": svc.port,
                    "transport": svc.transport or "",
                    "version": svc.version or "",
                },
            )
            nodes.append(node)
            node_map[sid] = node
            if parent_id in node_map:
                node_map[parent_id].children.append(sid)

    # Shodan vulns -> children of their service or root
    if report.shodan and report.shodan.vulns:
        for v in report.shodan.vulns[:10]:
            vid = f"vuln:{v}"
            mitre_info = map_mitre_for_remediation(v, "", [v])
            sev = "Critical"
            if mitre_info:
                sev = mitre_info[0].get("tactic", "Critical")
            node = AttackPathNode(
                id=vid, label=v, type="vuln", severity="Critical",
                children=[],
                data={"mitre": mitre_info},
            )
            nodes.append(node)
            node_map[vid] = node
            # Link vuln under last service or root
            if root.children:
                last_child = root.children[-1]
                if last_child in node_map:
                    node_map[last_child].children.append(vid)
            else:
                root.children.append(vid)

    return nodes


def _extract_domain(url: str) -> str:
    if not url:
        return "unknown"
    for prefix in ("https://", "http://"):
        if url.startswith(prefix):
            return url[len(prefix):].split("/")[0].lstrip("www.")
    return url.split("/")[0].lstrip("www.")


def _get_node_mitre(label: str, node_type: str) -> List[Dict[str, str]]:
    if node_type == "subdomain":
        return [{"technique_id": "T1590", "name": "Gather Victim Network Information", "tactic": "Reconnaissance"}]
    if node_type == "service":
        return [{"technique_id": "T1040", "name": "Network Sniffing", "tactic": "Credential Access"}]
    return []
