import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ROLE_REDIRECT = {
  student: '/student',
  admin:   '/admin',
  staff:   '/staff',
  teacher: '/teacher',
  parent:  '/parent',
};

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      let errorMessage = 'Authentication failed';
      
      switch (error) {
        case 'google_auth_failed':
          errorMessage = 'Google authentication failed. Please try again.';
          break;
        case 'account_pending':
          errorMessage = 'Your account is pending admin approval.';
          break;
        case 'account_inactive':
          errorMessage = 'Your account has been deactivated.';
          break;
        default:
          errorMessage = error;
      }
      
      navigate(`/login?error=${encodeURIComponent(errorMessage)}`, { replace: true });
      return;
    }

    if (token && refreshToken) {
      try {
        // Decode JWT token to get user info (now includes name and email in payload)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        const user = {
          id: payload.sub,
          role: payload.role,
          name: payload.name || 'User',
          email: payload.email || '',
        };

        // Log in the user with tokens and user info
        login(token, user, refreshToken);

        // Redirect to appropriate dashboard
        navigate(ROLE_REDIRECT[user.role] || '/login', { replace: true });
      } catch (err) {
        console.error('Failed to parse token:', err);
        navigate('/login?error=' + encodeURIComponent('Authentication failed'), { replace: true });
      }
    } else {
      navigate('/login?error=' + encodeURIComponent('Authentication failed'), { replace: true });
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ 
        background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)'
      }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-white/70">Completing sign in...</p>
      </div>
    </div>
  );
}
