import axios from 'axios';

// Determine API base URL dynamically
const getApiBaseUrl = () => {
  // Check if environment variable is set and matches the current context
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  
  // If in browser, dynamically construct URL based on current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Map frontend port to backend port
    // Frontend 3001 -> Backend 8001, Frontend 3001 -> Backend 8001
    const backendPort = port === '3001' ? '8001' : port === '3001' ? '8001' : '8001';
    
    return `http://${hostname}:${backendPort}/api/v1`;
  }
  
  return envUrl || 'http://localhost:8001/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem('access_token', response.data.access);
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
