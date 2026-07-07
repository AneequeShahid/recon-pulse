import { useEffect, useState } from "react";

interface ScanTickerProps {
  report: any;
  submitting: boolean;
}

export function ScanTicker({ report, submitting }: ScanTickerProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!submitting) {
      setLogs([]);
      return;
    }
    if (!report) return;
    
    const list = [];
    if (report.screenshot_url) list.push("Screenshot");
    if (report.tech_stack?.technologies?.length) list.push("Tech Stack");
    if (report.domain?.registrar) list.push("Domain Info");
    if (report.hosting?.ip) list.push("Hosting Info");
    if (report.dns_records && Object.keys(report.dns_records).length) list.push("DNS Records");
    if (report.security?.ssl_grade) list.push("Security Grade");
    if (report.performance?.performance_score !== undefined) list.push("Performance Score");
    if (report.news?.length) list.push("News Mentions");
    if (report.github?.username) list.push("GitHub Profile");
    if (report.carbon?.co2_grams !== undefined) list.push("Carbon Footprint");
    if (report.traffic?.tranco_rank) list.push("Traffic Authority");
    if (report.redirect_chain?.hops?.length) list.push("Redirect Chain");
    if (report.email_security?.spf !== undefined) list.push("Email Security");
    if (report.social && Object.values(report.social).some(v => v)) list.push("Social Presence");
    if (report.wayback?.first_seen) list.push("Wayback History");
    if (report.http_version?.http2 !== undefined) list.push("HTTP Version");
    if (report.robots?.robots_txt) list.push("Robots.txt");
    if (report.threat_intel?.threat_score !== undefined) list.push("Threat Intelligence");

    const newLogs = list.map(service => `✓ ${service} completed`);
    setLogs(newLogs);
  }, [report, submitting]);

  if (!submitting || logs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 w-64 shadow-lg space-y-1.5 max-h-48 overflow-y-auto">
      <div className="text-[10px] uppercase font-bold text-[var(--accent-blue)] tracking-wider border-b border-[var(--border)] pb-1 mb-1 text-left">
        Live Scan Logs
      </div>
      <div className="space-y-1 font-mono text-[9px] text-[var(--text-secondary)] text-left">
        {logs.map((log, idx) => (
          <div key={idx} className="truncate text-emerald-400">
            {log}
          </div>
        ))}
        <div className="text-[var(--text-muted)] animate-pulse">⚡ Scanning services...</div>
      </div>
    </div>
  );
}
