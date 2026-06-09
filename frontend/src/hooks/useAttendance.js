import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function useAttendance(studentId, filters = {}) {
  const [data, setData] = useState({ records: [], attendance_percentage: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.month) params.set('month', filters.month);
    if (filters.subject) params.set('subject', filters.subject);
    api.get(`/attendance/${studentId}?${params}`)
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.data?.error || 'Failed to load attendance'))
      .finally(() => setLoading(false));
  }, [studentId, filters.month, filters.subject]);

  return { ...data, loading, error };
}
