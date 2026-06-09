import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function usePortfolio(studentId) {
  const [portfolio, setPortfolio] = useState({ cv_url: null, experiences: [], media: [], skills: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = () => {
    if (!studentId) return;
    setLoading(true);
    api.get(`/portfolio/${studentId}`)
      .then(res => { setPortfolio(res.data); setError(null); })
      .catch(err => setError(err.response?.data?.error || 'Failed to load portfolio'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [studentId]);

  return { ...portfolio, loading, error, refresh };
}
