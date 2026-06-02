import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // Normalize folders like /uploads/covers/ and /uploads/avatars/ to /uploads/
  let cleanPath = path;
  cleanPath = cleanPath.replace('/uploads/covers/', '/uploads/');
  cleanPath = cleanPath.replace('/uploads/avatars/', '/uploads/');

  const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseHost = apiURL.replace(/\/api\/?$/, '');
  const host = baseHost.endsWith('/') ? baseHost.slice(0, -1) : baseHost;
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${host}${normalizedPath}`;
};

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle token refresh on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data, // Automatically return response.data to simplify controllers
  async (error) => {
    const originalRequest = error.config;

    // Skip if it's already a refresh request or login request
    if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
      return Promise.reject(error.response?.data || error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const refreshRes: any = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const newAccessToken = refreshRes.data?.data?.tokens?.access_token;
        const newRefreshToken = refreshRes.data?.data?.tokens?.refresh_token;

        if (newAccessToken) {
          Cookies.set('accessToken', newAccessToken, { expires: 1 / 24 }); // 1 hour
          if (newRefreshToken) {
            Cookies.set('refreshToken', newRefreshToken, { expires: 7 }); // 7 days
          }
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default api;
