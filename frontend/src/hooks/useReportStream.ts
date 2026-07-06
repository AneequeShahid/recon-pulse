import { useState, useEffect } from 'react';

export function useReportStream(reportId: string | null) {
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState<string>('pending');
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setStatus('pending');
      setError(null);
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const es = new EventSource(`${API_BASE_URL}/api/report/${reportId}/stream`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status === 'timeout') {
          es.close();
          setStatus('timeout');
          return;
        }
        setReport(data);
        setStatus(data.status);
        if (data.status === 'complete' || data.status === 'error') {
          es.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE Error:', err);
      es.close();
      setStatus('error');
      setError(err);
    };

    return () => {
      es.close();
    };
  }, [reportId]);

  return { report, status, error };
}
