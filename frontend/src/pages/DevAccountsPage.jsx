import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

const ROLE_REDIRECT = {
  admin:   '/admin',
  staff:   '/staff',
  teacher: '/teacher',
  student: '/student',
  parent:  '/parent',
};

const ROLE_COLOURS = {
  admin:   { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', text: '#fb923c' },
  staff:   { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#60a5fa' },
  student: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)',  text: '#4ade80' },
  teacher: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', text: '#c084fc' },
  parent:  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)', text: '#f472b6' },
};

// Only render in development
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.REACT_APP_SHOW_DEV_ACCOUNTS === 'true';

export default function DevAccountsPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!IS_DEV) return;
    api.get('/dev/accounts')
      .then(r => setAccounts(r.data.accounts || []))
      .catch(() => setError('Could not load demo accounts. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(account) {
    setLoggingIn(account.email);
    try {
      const { data } = await api.post('/auth/login', {
        email: account.email,
        password: account.password,
      });
      login(data.token, data.user);
      navigate(ROLE_REDIRECT[data.user.role] || '/login', { replace: true });
    } catch (err) {
      setError(`Login failed for ${account.email}: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoggingIn(null);
    }
  }

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (!IS_DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0f23' }}>
        <p className="text-white/50 text-sm">This page is only available in development.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}>
            🛠️ Development Only
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Demo Accounts</h1>
          <p className="text-sm text-white/40">Click "Login" to instantly sign in as any demo user.</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-white/40 py-12">Loading accounts…</div>
        ) : (
          <div className="grid gap-3">
            {accounts.map((account, i) => {
              const colours = ROLE_COLOURS[account.role] || ROLE_COLOURS.student;
              const isLoading = loggingIn === account.email;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-4 flex items-center gap-4"
                  style={{
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Role badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: colours.bg, border: `1px solid ${colours.border}` }}
                  >
                    {account.role === 'admin' ? '👑' : account.role === 'staff' ? '🏫' : '🎒'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white">{account.name}</span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: colours.bg, border: `1px solid ${colours.border}`, color: colours.text }}
                      >
                        {account.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Email */}
                      <button
                        onClick={() => copyToClipboard(account.email, `email-${i}`)}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
                        title="Click to copy"
                      >
                        <span className="font-mono">{account.email}</span>
                        <span className="text-[10px]">{copied === `email-${i}` ? '✅' : '📋'}</span>
                      </button>

                      <span className="text-white/20">·</span>

                      {/* Password */}
                      <button
                        onClick={() => copyToClipboard(account.password, `pw-${i}`)}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
                        title="Click to copy"
                      >
                        <span className="font-mono">{account.password}</span>
                        <span className="text-[10px]">{copied === `pw-${i}` ? '✅' : '📋'}</span>
                      </button>
                    </div>

                    {/* Permissions */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {account.permissions?.slice(0, 3).map(p => (
                        <span key={p} className="text-[10px] text-white/30 px-1.5 py-0.5 rounded-md"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>
                          {p}
                        </span>
                      ))}
                      {account.permissions?.length > 3 && (
                        <span className="text-[10px] text-white/30">+{account.permissions.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  {/* Login button */}
                  <button
                    onClick={() => handleLogin(account)}
                    disabled={!!loggingIn}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: isLoading ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.9)',
                      color: '#fff',
                      boxShadow: isLoading ? 'none' : '0 2px 12px rgba(249,115,22,0.3)',
                    }}
                  >
                    {isLoading ? '…' : 'Login →'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Back to login */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
