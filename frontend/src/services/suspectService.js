import api from './api';

export const suspectService = {
  // List all suspects
  getSuspects: (params = {}) => api.get('/suspects/', { params }),
  
  // Get single suspect
  getSuspect: (id) => api.get(`/suspects/${id}/`),
  
  // Get most wanted list (public)
  getMostWanted: (params = {}) => api.get('/suspects/most_wanted/', { params }),
  
  // Create suspect
  createSuspect: (suspectData) => api.post('/suspects/', suspectData),
  
  // Update suspect
  updateSuspect: (id, suspectData) => api.put(`/suspects/${id}/`, suspectData),
  
  // Start investigation
  startInvestigation: (id) => api.post(`/suspects/${id}/start_investigation/`),
  
  // Mark as wanted
  markWanted: (id) => api.post(`/suspects/${id}/mark_wanted/`),
  
  // Mark as most wanted
  markMostWanted: (id) => api.post(`/suspects/${id}/mark_most_wanted/`),
  
  // Record arrest
  arrest: (id) => api.post(`/suspects/${id}/arrest/`),
  
  // Clear of suspicion
  clear: (id) => api.post(`/suspects/${id}/clear/`),
  
  // Submit detective guilt score
  submitDetectiveScore: (id, scoreData) => api.post(`/suspects/${id}/detective_score/`, scoreData),
  
  // Submit sergeant guilt score
  submitSergeantScore: (id, scoreData) => api.post(`/suspects/${id}/sergeant_score/`, scoreData),

  // Captain decision on suspect
  captainDecision: (id, data) => api.post(`/suspects/${id}/captain_decision/`, data),

  // Chief decision on suspect (critical cases)
  chiefDecision: (id, data) => api.post(`/suspects/${id}/chief_decision/`, data),

  // Link suspect to case
  linkToCase: (id, data) => api.post(`/suspects/${id}/link_to_case/`, data),

  deleteSuspect: (suspectId) => api.delete(`/suspects/${suspectId}/`),
};

export default suspectService;
