import api from './api';

export const authService = {
  register: (userData) => api.post('/auth/register/', userData),
  
  login: (credentials) => api.post('/auth/login/', credentials),
  
  refreshToken: (refreshToken) => api.post('/auth/token/refresh/', { refresh: refreshToken }),
  
  getProfile: () => api.get('/auth/profile/'),
  
  updateProfile: (userData) => api.put('/auth/profile/', userData),
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

export default authService;
