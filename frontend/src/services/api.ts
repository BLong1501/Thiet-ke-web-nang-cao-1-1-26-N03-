import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Auth APIs ---
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// --- Campaign APIs ---
export const campaignApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/campaigns', { params }),
  getById: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: FormData) =>
    api.post('/campaigns', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: FormData) =>
    api.put(`/campaigns/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  getUpdates: (id: string) => api.get(`/campaigns/${id}/updates`),
  postUpdate: (id: string, data: { title: string; content: string }) =>
    api.post(`/campaigns/${id}/updates`, data),
};

// --- Donation APIs ---
export const donationApi = {
  create: (data: { campaignId: string; amount: number; message?: string; isAnonymous: boolean }) =>
    api.post('/donations', data),
  getMyDonations: (params?: Record<string, unknown>) =>
    api.get('/donations/my', { params }),
  getCampaignDonations: (campaignId: string, params?: Record<string, unknown>) =>
    api.get(`/donations/campaign/${campaignId}`, { params }),
};

// --- User APIs ---
export const userApi = {
  getProfile: (id: string) => api.get(`/users/${id}`),
  updateProfile: (data: FormData) =>
    api.put('/users/me', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/me/password', data),
};

// --- Verification APIs ---
export const verificationApi = {
  submit: (data: FormData) =>
    api.post('/verifications', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getStatus: () => api.get('/verifications/my'),
  getAll: (params?: Record<string, unknown>) => api.get('/verifications', { params }),
  review: (id: string, data: { status: string; note?: string }) =>
    api.put(`/verifications/${id}/review`, data),
};

// --- Community APIs ---
export const communityApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/communities', { params }),
  getById: (id: string) => api.get(`/communities/${id}`),
  join: (id: string) => api.post(`/communities/${id}/join`),
  leave: (id: string) => api.post(`/communities/${id}/leave`),
  getPosts: (id: string) => api.get(`/communities/${id}/posts`),
};

// --- Helper ---
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
};

export const getDaysLeft = (deadline: string): number => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const getProgress = (raised: number, target: number): number => {
  return Math.min(100, Math.round((raised / target) * 100));
};
