import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../utils/api';

const ROLE_REDIRECT = {
  student: '/student',
  admin:   '/admin',
  staff:   '/staff',
  teacher: '/teacher',
  parent:  '/parent',
};

function PasswordEyeIcon({ visible }) {
  if (visible) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
        <path d="M9.9 4.2A9.7 9.7 0 0 1 12 4c5 0 9 5 10 8a14.3 14.3 0 0 1-3.1 4.6" />
        <path d="M6.6 6.6A14.3 14.3 0 0 0 2 12c1 3 5 8 10 8a9.7 9.7 0 0 0 4.1-.9" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'

  // Sign-in state
  const [siEmail,    setSiEmail]    = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError,    setSiError]    = useState('');
  const [siLoading,  setSiLoading]  = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign-up state
  const [suFirstName,  setSuFirstName]  = useState('');
  const [suMiddleName, setSuMiddleName] = useState('');
  const [suLastName,   setSuLastName]   = useState('');
  const [suEmail,      setSuEmail]      = useState('');
  const [suPassword,   setSuPassword]   = useState('');
  const [suConfirm,    setSuConfirm]    = useState('');
  const [suRole,       setSuRole]       = useState('student');
  const [suError,      setSuError]      = useState('');
  const [suLoading,    setSuLoading]    = useState(false);
  const [suSuccess,    setSuSuccess]    = useState('');

  async function doLogin(email, password) {
    setSiError('');
    setSiLoading(true);
    setTab('signin');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user, data.refreshToken);
      navigate(ROLE_REDIRECT[data.user.role] || '/login', { replace: true });
    } catch (err) {
      if (!err.response) {
        setSiError('Cannot reach the server. Make sure the backend is running.');
      } else {
        setSiError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      }
    } finally {
      setSiLoading(false);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    await doLogin(siEmail, siPassword);
  }

  async function handleDemoLogin(email, password) {
    setSiEmail(email);
    setSiPassword(password);
    await doLogin(email, password);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setSuError('');
    setSuSuccess('');

    // Combine names
    const fullName = [suFirstName, suMiddleName, suLastName]
      .filter(n => n.trim())
      .join(' ');

    if (!fullName.trim()) {
      setSuError('Please enter at least a first name.');
      return;
    }

    if (suPassword !== suConfirm) {
      setSuError('Passwords do not match.');
      return;
    }
    if (suPassword.length < 8) {
      setSuError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(suPassword)) {
      setSuError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(suPassword)) {
      setSuError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[0-9]/.test(suPassword)) {
      setSuError('Password must contain at least one number.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(suPassword)) {
      setSuError('Password must contain at least one special character.');
      return;
    }

    setSuLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: fullName,
        email: suEmail,
        password: suPassword,
        role: suRole,
      });
      
      // Registration now returns tokens - log user in immediately
      login(data.token, data.user, data.refreshToken);
      navigate(ROLE_REDIRECT[data.user.role] || '/login', { replace: true });
    } catch (err) {
      if (!err.response) {
        setSuError('Cannot reach the server. Make sure the backend is running.');
      } else {
        const data = err.response?.data;
        if (data?.details && Array.isArray(data.details)) {
          setSuError(data.details[0]);
        } else {
          setSuError(data?.error || 'Registration failed. Please try again.');
        }
      }
    } finally {
      setSuLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* ── BACKGROUND LAYER 1: blue world image ── */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: 'url(/login-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          animation: 'bgDrift 30s ease-in-out infinite alternate',
        }}
      />

      {/* ── BACKGROUND LAYER 2: dark overlay to deepen the image ── */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'rgba(3, 10, 35, 0.72)',
        }}
      />

      {/* ── BACKGROUND LAYER 3: soft blue ambient glow at bottom ── */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-64 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.12) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* ── ANIMATION KEYFRAMES ── */}
      <style>{`
        @keyframes bgDrift {
          0%   { transform: scale(1.0) translate(0px, 0px); }
          50%  { transform: scale(1.04) translate(-8px, -4px); }
          100% { transform: scale(1.02) translate(6px, 3px); }
        }
      `}</style>

      {/* ── CONTENT (unchanged) ── */}
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <img
              src="/compassion-heart.png"
              alt="Compassion"
              style={{
                height: '80px',
                width: 'auto',
                objectFit: 'contain',
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 2px 12px rgba(255,100,0,0.4)) brightness(1.1) contrast(1.1)',
                background: 'transparent',
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-orange-400 mt-1">CompassionEdu</h1>
        </div>

        {/* Card — glass surface */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          {/* Tabs */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <button
              onClick={() => { setTab('signin'); setSiError(''); }}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={tab === 'signin'
                ? { color: '#fb923c', borderBottom: '2px solid #fb923c', background: 'rgba(251,146,60,0.08)' }
                : { color: 'rgba(255,255,255,0.5)' }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('signup'); setSuError(''); setSuSuccess(''); }}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={tab === 'signup'
                ? { color: '#fb923c', borderBottom: '2px solid #fb923c', background: 'rgba(251,146,60,0.08)' }
                : { color: 'rgba(255,255,255,0.5)' }}
            >
              Sign Up
            </button>
          </div>

          <div className="p-6">
            {/* ── SIGN IN ── */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="si-email" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Email
                  </label>
                  <input
                    id="si-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={siEmail}
                    onChange={e => setSiEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label htmlFor="si-password" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="si-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={siPassword}
                      onChange={e => setSiPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      title={showPassword ? "Hide password" : "Show password"}
                      tabIndex="-1"
                    >
                      <PasswordEyeIcon visible={showPassword} />
                    </button>
                  </div>
                </div>
                {siError && (
                  <p role="alert" className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {siError}
                  </p>
                )}
                
                {/* Forgot Password Link */}
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-orange-400 hover:text-orange-300 hover:underline font-medium transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                
                <button
                  type="submit"
                  disabled={siLoading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
                >
                  {siLoading ? 'Signing in…' : 'Sign In'}
                </button>
                
                {/* Divider */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                      Or continue with
                    </span>
                  </div>
                </div>
                
                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/auth/google`}
                  className="w-full flex items-center justify-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all hover:opacity-90"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: '#374151',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
                
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setTab('signup')} className="text-orange-400 hover:underline font-medium">
                    Sign up
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGN UP ── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="su-firstname" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      First Name
                    </label>
                    <input
                      id="su-firstname"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={suFirstName}
                      onChange={e => setSuFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="su-middlename" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Middle Name
                    </label>
                    <input
                      id="su-middlename"
                      type="text"
                      autoComplete="additional-name"
                      value={suMiddleName}
                      onChange={e => setSuMiddleName(e.target.value)}
                      placeholder="(Optional)"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="su-lastname" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Last Name
                    </label>
                    <input
                      id="su-lastname"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={suLastName}
                      onChange={e => setSuLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="su-email" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Email
                  </label>
                  <input
                    id="su-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={suEmail}
                    onChange={e => setSuEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label htmlFor="su-role" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    I am a…
                  </label>
                  <select
                    id="su-role"
                    value={suRole}
                    onChange={e => setSuRole(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  >
                    <option value="student">Student 🎒</option>
                    <option value="staff">Staff 🏫</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="su-password" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Password
                  </label>
                  <input
                    id="su-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={suPassword}
                    onChange={e => setSuPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label htmlFor="su-confirm" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Confirm Password
                  </label>
                  <input
                    id="su-confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={suConfirm}
                    onChange={e => setSuConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  />
                </div>
                {suError && (
                  <p role="alert" className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {suError}
                  </p>
                )}
                {suSuccess && (
                  <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    {suSuccess}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={suLoading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
                >
                  {suLoading ? 'Creating account…' : 'Create Account'}
                </button>
                
                {/* Divider */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                      Or sign up with
                    </span>
                  </div>
                </div>
                
                {/* Google Sign Up Button */}
                <button
                  type="button"
                  onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/auth/google`}
                  className="w-full flex items-center justify-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all hover:opacity-90"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: '#374151',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
                
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setTab('signin')} className="text-orange-400 hover:underline font-medium">
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Back to home */}
        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Link to="/" className="hover:text-orange-400 transition-colors">← Back to home</Link>
        </p>

      </div>
    </div>
  );
}
