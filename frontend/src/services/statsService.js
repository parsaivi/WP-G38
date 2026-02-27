import api from './api';

export const statsService = {
  getDashboardStats: () => api.get('/stats/dashboard/'),
  
  getCaseStats: () => api.get('/stats/cases/'),
  
  getSuspectStats: () => api.get('/stats/suspects/'),
  
  getComplaintStats: () => api.get('/stats/complaints/'),
};

export default statsService;
