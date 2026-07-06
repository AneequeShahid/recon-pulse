import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getWorkspaceId, getScanHistory, addScanHistory, getIntegrationKeys, type ScanHistoryEntry } from './useStorage';

interface WorkspaceContextValue {
  workspaceId: string;
  scanHistory: ScanHistoryEntry[];
  recordScan: (entry: ScanHistoryEntry) => void;
  exportWorkspace: () => string;
  importWorkspace: (json: string) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function SessionWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId] = useState(() => getWorkspaceId());
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>(() => getScanHistory());

  useEffect(() => {
    if (workspaceId) {
      document.cookie = `rp_workspace=${workspaceId};path=/;max-age=86400`;
    }
  }, [workspaceId]);

  const recordScan = (entry: ScanHistoryEntry) => {
    addScanHistory(entry);
    setScanHistory(getScanHistory());
  };

  const exportWorkspace = (): string => {
    const snapshot = {
      version: 1,
      exported_at: new Date().toISOString(),
      workspace_id: workspaceId,
      scan_history: getScanHistory(),
      integration_keys: getIntegrationKeys(),
      preferences: {
        theme: localStorage.getItem('rp_theme') || 'dark',
      },
      ignored_findings: JSON.parse(localStorage.getItem('rp_ignored_findings') || '[]'),
    };
    return JSON.stringify(snapshot, null, 2);
  };

  const importWorkspace = (json: string): boolean => {
    try {
      const snapshot = JSON.parse(json);
      if (!snapshot.version || !snapshot.workspace_id) {
        return false;
      }
      if (snapshot.scan_history) {
        localStorage.setItem('rp_history', JSON.stringify(snapshot.scan_history));
        setScanHistory(snapshot.scan_history);
      }
      if (snapshot.integration_keys) {
        localStorage.setItem('rp_integration_keys', JSON.stringify(snapshot.integration_keys));
      }
      if (snapshot.preferences?.theme) {
        localStorage.setItem('rp_theme', snapshot.preferences.theme);
      }
      if (snapshot.ignored_findings) {
        localStorage.setItem('rp_ignored_findings', JSON.stringify(snapshot.ignored_findings));
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspaceId, scanHistory, recordScan, exportWorkspace, importWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within SessionWorkspaceProvider');
  return ctx;
}
