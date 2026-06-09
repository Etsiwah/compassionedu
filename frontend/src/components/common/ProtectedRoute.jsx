import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const ROLE_HOME = {
  admin:   '/admin',
  staff:   '/staff',
  teacher: '/teacher',
  student: '/student',
  parent:  '/parent',
};

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * If the user is authenticated but their role is not in allowedRoles,
 * redirects them to their own role's home instead of /login.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const auth = useAuth();
  const user = auth?.user;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Send them to their own dashboard rather than the login page
    const home = ROLE_HOME[user.role] || '/login';
    return <Navigate to={home} replace />;
  }

  return children;
}
