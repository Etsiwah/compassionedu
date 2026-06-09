import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * AuthContext stores the JWT access token, refresh token, and user info.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ce_token'));
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ce_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((accessToken, userData, refreshToken) => {
    localStorage.setItem('ce_token', accessToken);
    localStorage.setItem('ce_user', JSON.stringify(userData));
    if (refreshToken) {
      localStorage.setItem('ce_refresh_token', refreshToken);
    }
    setToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ce_token');
    localStorage.removeItem('ce_refresh_token');
    localStorage.removeItem('ce_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
