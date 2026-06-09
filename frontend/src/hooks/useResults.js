import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function useResults(studentId, term) {
  const [data, setData] = useState({ results: [], gpa: null, performance_trend: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    const params = term ? `?term=${encodeURIComponent(term)}` : '';
    api.get(`/results/${studentId}${params}`)
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.data?.error || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, [studentId, term]);

  return { ...data, loading, error };
}
