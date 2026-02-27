import api from './api';

export const rewardsService = {
  // Tips
  getTips: (params = {}) => api.get('/rewards/tips/', { params }),
  getTip: (id) => api.get(`/rewards/tips/${id}/`),
  createTip: (data) => api.post('/rewards/tips/', data),
  updateTip: (id, data) => api.put(`/rewards/tips/${id}/`, data),
  partialUpdateTip: (id, data) => api.patch(`/rewards/tips/${id}/`, data),
  deleteTip: (id) => api.delete(`/rewards/tips/${id}/`),
  
  // Reviews - matching your API endpoints
  officerReview: (tipId, { approved, notes = '' }) =>
    api.post(`/rewards/tips/${tipId}/officer_review/`, { 
      approved, 
      notes: notes || ''  // Ensure notes is always a string
    }),
  
  detectiveReview: (tipId, { approved, notes = '' }) =>
    api.post(`/rewards/tips/${tipId}/detective_review/`, { 
      approved, 
      notes: notes || ''  // Ensure notes is always a string
    }),

  // Reward Codes
  getMyRewardCodes: () => api.get('/rewards/codes/'),
  getRewardCode: (id) => api.get(`/rewards/codes/${id}/`),
  
  // Lookup and Claim - matching your exact endpoints
  lookupReward: (nationalId, rewardCode) =>
    api.post('/rewards/codes/lookup/', { 
      national_id: nationalId, 
      reward_code: rewardCode 
    }),
  
  claimReward: (nationalId, rewardCode) =>
    api.post('/rewards/codes/claim/', { 
      national_id: nationalId, 
      reward_code: rewardCode 
    }),

  // Optional: Convenience methods for common operations
  lookupAndClaimReward: (nationalId, rewardCode) => 
    api.post('/rewards/codes/claim/', { 
      national_id: nationalId, 
      reward_code: rewardCode 
    }), // This combines lookup and claim if your backend supports it
};

// Also export as default for flexibility
export default rewardsService;
