import { useState, useEffect } from 'react';
import axios from 'axios';

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
    let poll: any;

    const fetchReport = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/report/${reportId}`);
        setReport(data);
        setStatus(data.status);
        if (data.status === 'complete' || data.status === 'error') {
          clearInterval(poll);
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err);
      }
    };

    fetchReport();

    poll = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/report/${reportId}`);
        setReport(data);
        setStatus(data.status);
        if (data.status === 'complete' || data.status === 'error') {
          clearInterval(poll);
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err);
      }
    }, 1500);

    return () => clearInterval(poll);
  }, [reportId]);

  return { report, status, error };
}
