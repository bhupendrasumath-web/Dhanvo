import axios from 'axios';

// Use relative path for development (will use Vite proxy)
// Use absolute URL for production if VITE_API_URL is set
const API_URL = import.meta.env.VITE_API_URL || '/api';

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/check-signup-account',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/login-otp',
  '/auth/verify-pan',
  '/auth/init-ekyc',
  '/auth/check-kyc-status',
  '/auth/verify-bank',
  '/auth/login',
  '/auth/send-login-otp',
  '/auth/send-recovery-otp',
  '/auth/reset-credential',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
];

const shouldSkipAuthHeader = (url = '') =>
  PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));

const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json'
  }
});

export const buildOtpPayload = ({ phone, mobile, email, otp }) => {
  const normalizedPhone = (phone ?? mobile ?? '').toString().trim();
  const normalizedEmail = (email ?? '').toString().trim();
  const payload = {};

  if (normalizedPhone) {
    payload.phone = normalizedPhone;
    payload.mobile = normalizedPhone;
  }

  if (normalizedEmail) {
    payload.email = normalizedEmail;
  }

  if (otp !== undefined && otp !== null) {
    payload.otp = otp;
  }

  return payload;
};

export const buildLoginOtpPayload = (identifier, otp) => {
  const value = (identifier ?? '').toString().trim();

  if (!value) {
    return { otp };
  }

  if (value.includes('@')) {
    return {
      email: value,
      otp
    };
  }

  return {
    phone: value,
    mobile: value,
    otp
  };
};

// Request interceptor to add auth token only to protected routes.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dhanwo_token');
    const isPublicAuthRequest = shouldSkipAuthHeader(config.url || '');

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    if (token && !isPublicAuthRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicAuthRequest = shouldSkipAuthHeader(error.config?.url || '');

    if (error.response?.status === 401 && !isPublicAuthRequest) {
      localStorage.removeItem('dhanwo_token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
