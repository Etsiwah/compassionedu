import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function useFees(studentId) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api.get(`/fees/${studentId}`)
      .then(res => { setFees(res.data); setError(null); })
      .catch(err => setError(err.response?.data?.error || 'Failed to load fees'))
      .finally(() => setLoading(false));
  }, [studentId]);

  return { fees, loading, error };
}
