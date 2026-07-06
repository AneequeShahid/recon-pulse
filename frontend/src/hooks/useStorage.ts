const SCAN_HISTORY_KEY = 'rp_scan_history';
const WORKSPACE_KEY = 'rp_workspace_id';
const INTEGRATIONS_KEY = 'rp_integrations';
const PREFERENCES_KEY = 'rp_preferences';
const IGNORED_FINDINGS_KEY = 'rp_ignored_findings';

export function getWorkspaceId(): string {
  let id = localStorage.getItem(WORKSPACE_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(WORKSPACE_KEY, id);
  }
  return id;
}

export interface ScanHistoryEntry {
  reportId: string;
  url: string;
  score: number;
  threat: string;
  timestamp: string;
}

export function getScanHistory(): ScanHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addScanHistory(entry: ScanHistoryEntry): void {
  const history = getScanHistory();
  history.unshift(entry);
  localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

export function clearScanHistory(): void {
  localStorage.removeItem(SCAN_HISTORY_KEY);
}

export interface IntegrationKeys {
  jira_url: string;
  jira_email: string;
  jira_api_token: string;
  jira_project_key: string;
  github_token: string;
  github_repo: string;
}

export function getIntegrationKeys(): IntegrationKeys {
  try {
    const raw = localStorage.getItem(INTEGRATIONS_KEY);
    return raw ? JSON.parse(raw) : {
      jira_url: '', jira_email: '', jira_api_token: '',
      jira_project_key: '', github_token: '', github_repo: ''
    };
  } catch {
    return { jira_url: '', jira_email: '', jira_api_token: '', jira_project_key: '', github_token: '', github_repo: '' };
  }
}

export function setIntegrationKeys(keys: IntegrationKeys): void {
  localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(keys));
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  autoScan: boolean;
}

export function getPreferences(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{"theme":"dark","autoScan":false}');
  } catch {
    return { theme: 'dark', autoScan: false };
  }
}

export function setPreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...current, ...prefs }));
}

// ─── Ignored (False-Positive) Findings ─────────────────────────────

export interface IgnoredFinding {
  reportUrl: string;
  stepTitle: string;
  timestamp: string;
}

export function getIgnoredFindings(): IgnoredFinding[] {
  try {
    return JSON.parse(localStorage.getItem(IGNORED_FINDINGS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addIgnoredFinding(url: string, stepTitle: string): void {
  const list = getIgnoredFindings();
  // Don't add duplicates
  if (list.some(f => f.reportUrl === url && f.stepTitle === stepTitle)) return;
  list.push({ reportUrl: url, stepTitle, timestamp: new Date().toISOString() });
  localStorage.setItem(IGNORED_FINDINGS_KEY, JSON.stringify(list));
}

export function removeIgnoredFinding(url: string, stepTitle: string): void {
  const list = getIgnoredFindings().filter(f => !(f.reportUrl === url && f.stepTitle === stepTitle));
  localStorage.setItem(IGNORED_FINDINGS_KEY, JSON.stringify(list));
}

export function clearIgnoredFindings(): void {
  localStorage.removeItem(IGNORED_FINDINGS_KEY);
}

export function isFindingIgnored(url: string, stepTitle: string): boolean {
  return getIgnoredFindings().some(f => f.reportUrl === url && f.stepTitle === stepTitle);
}
