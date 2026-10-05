import { createContext, useContext, useState, useEffect } from 'react';
import api, { buildLoginOtpPayload } from '../services/api';

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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('dhanwo_token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        localStorage.removeItem('dhanwo_token');
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

  const completeLogin = (data) => {
    const token = data?.data?.token ?? data?.data?.accessToken ?? data?.token ?? data?.accessToken ?? data?.jwt ?? data?.auth?.token;
    const userData = data?.data?.user ?? data?.user ?? data?.data ?? data;

    if (data?.success && token) {
      localStorage.setItem('dhanwo_token', token);
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
      setUser(response.data.data);
      setIsAuthenticated(true);
      return response.data;
    }
    throw new Error(response.data.message);
  };

  const logout = () => {
    localStorage.removeItem('dhanwo_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    loginWithOtp,
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
