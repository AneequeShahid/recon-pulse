from typing import Tuple
from app.models import ReportData

def calculate_pulse_score(report: ReportData) -> Tuple[int, str]:
    """
    Calculates a composite summary score (0 to 100) and returns a (score, threat_level) tuple.
    Employs a "Default-Safe" logic where missing/failed API scans default to neutral,
    healthy scores to avoid unfairly penalizing domains for timeouts.
    
    1. Reputation (25%): Default 25. Deduct 15 per malicious detection.
    2. Security (35%): SSL Grade (up to 15), Mozilla Observatory Grade (up to 15), HTTPS enforcement (5).
    3. Performance (15%): Pagespeed score * 0.15.
    4. Subdomain Exposure (10%): Default 10. Deduct 1 per subdomain discovered above 5 (min 0).
    5. Protocol Audits (15%): SPF/DMARC (10), HTTP/2/3 Support (5).
    """
    score = 0
    
    # 1. Reputation (25%) - Default Safe: 25 points
    reputation_score = 25
    if report.threat_intel:
        malicious = report.threat_intel.virustotal_malicious
        reputation_score = max(0, 25 - (malicious * 15))
    score += reputation_score
    
    # 2. Security (35%)
    # Default Safe for SSL: 13 points (equiv to A grade)
    ssl_points = 13
    if report.security and report.security.ssl_grade:
        grade = report.security.ssl_grade.upper()
        if "A+" in grade:
            ssl_points = 15
        elif "A" in grade:
            ssl_points = 13
        elif "B" in grade:
            ssl_points = 10
        elif "C" in grade:
            ssl_points = 7
        elif "D" in grade:
            ssl_points = 4
        elif "F" in grade:
            ssl_points = 0
    score += ssl_points
    
    # Default Safe for Observatory Headers: 12 points (equiv to B grade)
    obs_points = 12
    if report.observatory and report.observatory.grade:
        grade = report.observatory.grade.upper()
        if grade in ["A+", "A", "A-"]:
            obs_points = 15
        elif grade in ["B+", "B", "B-"]:
            obs_points = 12
        elif grade in ["C+", "C", "C-"]:
            obs_points = 9
        elif grade in ["D+", "D", "D-"]:
            obs_points = 6
        elif grade in ["F+", "F", "F-"]:
            obs_points = 0
    score += obs_points
    
    # Default Safe for HTTPS: 5 points
    https_points = 5
    if report.security:
        https_points = 5 if report.security.https else 0
    score += https_points
    
    # 3. Performance (15%) - Default Safe: 10 points (equiv to 70 performance score)
    perf_points = 10
    if report.performance and report.performance.performance_score is not None:
        perf_points = int(report.performance.performance_score * 0.15)
    score += perf_points
    
    # 4. Subdomain Exposure (10%) - Default Safe: 10 points
    subdomain_points = 10
    if report.subdomains and report.subdomains.subdomains:
        count = len(report.subdomains.subdomains)
        if count > 5:
            subdomain_points = max(0, 10 - (count - 5))
    score += subdomain_points
    
    # 5. Protocol Audits (15%)
    # Default Safe for Email Protocols: 10 points
    email_points = 10
    if report.email_security:
        email_points = 0
        if report.email_security.spf:
            email_points += 5
        if report.email_security.dmarc:
            email_points += 5
    score += email_points
    
    # Default Safe for HTTP/2/3 Protocols: 5 points
    protocol_points = 5
    if report.http_version:
        protocol_points = 0
        if report.http_version.http2:
            protocol_points += 3
        if report.http_version.http3:
            protocol_points += 2
    score += protocol_points
    
    # 6. Business Criticality Multiplier (Phase 7)
    # If any subdomain is tagged "Production", apply 1.5x risk multiplier
    has_production = False
    if report.subdomains and report.subdomains.tags:
        for tag in report.subdomains.tags:
            if tag.business_criticality == "Production":
                has_production = True
                break

    # Cap score boundaries
    final_score = max(0, min(100, score))

    # Apply Production risk multiplier (1.5x risk => reduce score by up to 15 points)
    if has_production and final_score < 85:
        penalty = int((85 - final_score) * 0.5)  # Higher penalty for worse scores
        final_score = max(0, final_score - min(penalty, 15))

    # Map score to Threat Level
    if final_score >= 85:
        threat_level = "Low"
    elif final_score >= 70:
        threat_level = "Medium"
    elif final_score >= 50:
        threat_level = "High"
    else:
        threat_level = "Critical"
        
    return final_score, threat_level
