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
      }
      
      navigate(`/login?error=${encodeURIComponent(errorMessage)}`);
      return;
    }

    if (token && refreshToken) {
      // Decode token to get basic user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Fetch full user details from the API
        fetch(`/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch user details');
            return res.json();
          })
          .then((userData) => {
            const user = {
              id: userData.id,
              role: userData.role,
              name: userData.name,
              email: userData.email,
            };

            // Log in the user
            login(token, user, refreshToken);

            // Redirect to appropriate dashboard
            navigate(ROLE_REDIRECT[user.role] || '/login', { replace: true });
          })
          .catch((err) => {
            console.error('Failed to fetch user details:', err);
            // Fallback to minimal user object from token
            const user = {
              id: payload.sub,
              role: payload.role,
            };
            login(token, user, refreshToken);
            navigate(ROLE_REDIRECT[user.role] || '/login', { replace: true });
          });
      } catch (err) {
        console.error('Failed to parse token:', err);
        navigate('/login?error=Authentication failed');
      }
    } else {
      navigate('/login?error=Authentication failed');
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
