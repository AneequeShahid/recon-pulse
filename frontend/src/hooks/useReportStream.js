import { useState, useEffect } from 'react';
import axios from 'axios';

export function useReportStream(reportId) {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setStatus('pending');
      setError(null);
      return;
    }

    // Immediately fetch once
    const fetchReport = async () => {
      try {
        const { data } = await axios.get(`http://localhost:8000/api/report/${reportId}`);
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

    const poll = setInterval(async () => {
      try {
        const { data } = await axios.get(`http://localhost:8000/api/report/${reportId}`);
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
