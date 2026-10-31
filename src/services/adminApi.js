import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const adminApi = axios.create({
  baseURL: API_URL,
  headers: { Accept: 'application/json' },
});

const authConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const loginAdmin = async (email, password) => {
  const response = await adminApi.post('/admin/login', { email, password });
  return response.data;
};

export const getAdminDashboard = async (token) => {
  const response = await adminApi.get('/admin/dashboard', authConfig(token));
  return response.data;
};

export const getAdminMfOverview = async (token, refresh = false) => {
  const response = await adminApi.get('/admin/mutual-funds/overview', {
    ...authConfig(token),
    params: refresh ? { refresh: '1' } : undefined,
  });
  return response.data;
};

export const getAdminMfCategorySettings = async (token, refresh = false) => {
  const response = await adminApi.get('/admin/mutual-funds/categories/settings', {
    ...authConfig(token),
    params: refresh ? { refresh: '1' } : undefined,
  });
  return response.data;
};

export const updateAdminMfCategorySetting = async (token, setting) => {
  const response = await adminApi.patch(
    '/admin/mutual-funds/categories/settings',
    setting,
    authConfig(token),
  );
  return response.data;
};

export const getAdminRedemptionsLifetime = async (token, refresh = false) => {
  const response = await adminApi.get('/admin/redemptions/lifetime', {
    ...authConfig(token),
    params: refresh ? { refresh: '1' } : undefined,
  });
  return response.data;
};

export const getAdminUser = async (token, userId) => {
  const response = await adminApi.get(
    `/admin/users/${encodeURIComponent(userId)}`,
    authConfig(token),
  );
  return response.data;
};

export const getAdminUserActivity = async (token, userId, params) => {
  const response = await adminApi.get(
    `/admin/users/${encodeURIComponent(userId)}/activity`,
    { ...authConfig(token), params },
  );
  return response.data;
};

export const getAdminUsers = async (token, params) => {
  const response = await adminApi.get('/admin/users', {
    ...authConfig(token),
    params,
  });
  return response.data;
};

export const refreshAdminUserNseStatus = async (token, userId) => {
  const response = await adminApi.post(
    `/admin/users/${encodeURIComponent(userId)}/refresh-account-opening-status`,
    {},
    authConfig(token),
  );
  return response.data;
};

export const getAdminPanChecks = async (token, params = {}) => {
  const response = await adminApi.get('/admin/pan-checks', {
    ...authConfig(token),
    params,
  });
  return response.data;
};

export const getAdminLeads = async (token, params = {}) => {
  const response = await adminApi.get('/admin/leads', {
    ...authConfig(token),
    params,
  });
  return response.data;
};

export default adminApi;
