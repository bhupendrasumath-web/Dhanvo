import { createContext, useContext, useState, useEffect } from 'react';
import api, { buildLoginOtpPayload } from '../services/api';

const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

const getTokenSession = (token) => {
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=')));
    const sessionStartedAt = Number(payload.sessionStartedAt || payload.iat * 1000);
    const sessionExpiresAt = Number(payload.sessionExpiresAt || sessionStartedAt + SESSION_DURATION_MS);
    if (!Number.isFinite(sessionStartedAt) || !Number.isFinite(sessionExpiresAt)) return null;
    return { sessionStartedAt, sessionExpiresAt, issuedAt: Number(payload.iat || 0) * 1000 };
  } catch {
    return null;
  }
};

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('dhanwo_token'));

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const syncSession = (event) => {
      if (event.key !== 'dhanwo_token') return;
      if (!event.newValue) {
        setSessionToken(null);
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/login';
        return;
      }
      setSessionToken(event.newValue);
    };

    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !sessionToken) return undefined;

    const session = getTokenSession(sessionToken);
    if (!session || Date.now() >= session.sessionExpiresAt) {
      localStorage.removeItem('dhanwo_token');
      setSessionToken(null);
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
      return undefined;
    }

    const expireSession = () => {
      localStorage.removeItem('dhanwo_token');
      setSessionToken(null);
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
    };
    const refreshSession = async () => {
      try {
        const response = await api.post('/auth/refresh-session');
        const refreshedToken = response.data?.data?.token;
        const refreshedSession = refreshedToken ? getTokenSession(refreshedToken) : null;
        if (
          !response.data?.success ||
          !refreshedToken ||
          !refreshedSession ||
          refreshedSession.sessionExpiresAt !== session.sessionExpiresAt
        ) {
          throw new Error('The server returned an invalid refreshed session.');
        }

        localStorage.setItem('dhanwo_token', refreshedToken);
        setSessionToken(refreshedToken);
      } catch (error) {
        console.error('Session refresh failed:', error);
        expireSession();
      }
    };

    const nextRefreshAt = Math.min(
      session.issuedAt + SESSION_REFRESH_INTERVAL_MS,
      session.sessionExpiresAt
    );
    const refreshTimer = window.setTimeout(
      refreshSession,
      Math.max(0, nextRefreshAt - Date.now())
    );
    const expiryTimer = window.setTimeout(
      expireSession,
      Math.max(0, session.sessionExpiresAt - Date.now())
    );

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(expiryTimer);
    };
  }, [isAuthenticated, sessionToken]);

  const checkAuth = async () => {
    const token = localStorage.getItem('dhanwo_token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.data);
          setIsAuthenticated(true);
          setSessionToken(token);
        }
      } catch (error) {
        localStorage.removeItem('dhanwo_token');
        setSessionToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return completeLogin(response.data);
  };

  const loginWithOtp = async (identifier, otp) => {
    const response = await api.post('/auth/login-otp', buildLoginOtpPayload(identifier, otp));
    return completeLogin(response.data);
  };

  const loginWithCredential = async (identifier, credential, loginType) => {
    const response = await api.post('/auth/login', {
      identifier,
      loginType,
      ...(loginType === 'pin' ? { pin: credential } : { password: credential }),
    });
    return completeLogin(response.data);
  };

  const completeLogin = (data) => {
    const token = data?.data?.token ?? data?.data?.accessToken ?? data?.token ?? data?.accessToken ?? data?.jwt ?? data?.auth?.token;
    const userData = data?.data?.user ?? data?.user ?? data?.data ?? data;

    if (data?.success && token) {
      localStorage.setItem('dhanwo_token', token);
      setSessionToken(token);
      setUser(userData);
      setIsAuthenticated(true);
      return data;
    }

    throw new Error(data?.message || 'Unable to sign in.');
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      localStorage.setItem('dhanwo_token', response.data.data.token);
      setSessionToken(response.data.data.token);
      setUser(response.data.data);
      setIsAuthenticated(true);
      return response.data;
    }
    throw new Error(response.data.message);
  };

  const logout = () => {
    localStorage.removeItem('dhanwo_token');
    setSessionToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    loginWithOtp,
    loginWithCredential,
    completeLogin,
    register,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
