import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background layers */}
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
      <div className="absolute inset-0 -z-10" style={{ background: 'rgba(3, 10, 35, 0.72)' }} />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-64 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.12) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      <style>{`
        @keyframes bgDrift {
          0%   { transform: scale(1.0) translate(0px, 0px); }
          50%  { transform: scale(1.04) translate(-8px, -4px); }
          100% { transform: scale(1.02) translate(6px, 3px); }
        }
      `}</style>

      <div className="w-full max-w-md relative z-10">
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
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-orange-400 mt-1">CompassionEdu</h1>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden p-8"
          style={{
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          {!success ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
                If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
              </p>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
          )}
        </div>

        {/* Back to login */}
        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Link to="/login" className="hover:text-orange-400 transition-colors">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
