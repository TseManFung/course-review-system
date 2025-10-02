import axios from 'axios';

// Prefer VITE_API_URL from .env. Fallback to relative /api (for dev proxy) then public domain.
const env = (import.meta as any).env || {};
const baseURL: string = env.VITE_API_URL || '/api' || 'http://atlweb.freedynamicdns.net/api';

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Clear token and optionally refresh UI
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
