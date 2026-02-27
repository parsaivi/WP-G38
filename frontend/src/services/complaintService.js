import api from './api';

export const complaintService = {
  // List all complaints
  getComplaints: (params = {}) => api.get('/complaints/', { params }),
  
  // Get single complaint
  getComplaint: (id) => api.get(`/complaints/${id}/`),
  
  // Create complaint
  createComplaint: (complaintData) => api.post('/complaints/', complaintData),
  
  // Update complaint
  updateComplaint: (id, complaintData) => api.put(`/complaints/${id}/`, complaintData),
  
  // Submit complaint
  submitComplaint: (id) => api.post(`/complaints/${id}/submit/`),
  
  // Resubmit after rejection
  resubmitComplaint: (id) => api.post(`/complaints/${id}/resubmit/`),
  
  // Assign to cadet
  assignToCadet: (id, cadetData) => api.post(`/complaints/${id}/assign_cadet/`, cadetData),
  
  // Return to complainant
  returnToComplainant: (id, errorData) => api.post(`/complaints/${id}/return_to_complainant/`, errorData),
  
  // Escalate to officer
  escalateToOfficer: (id) => api.post(`/complaints/${id}/escalate/`, {}),
  
  // Return to cadet
  returnToCadet: (id, errorData) => api.post(`/complaints/${id}/return_to_cadet/`, errorData),
  
  // Approve complaint
  approveComplaint: (id) => api.post(`/complaints/${id}/approve/`),
  
  // Reject complaint
  rejectComplaint: (id) => api.post(`/complaints/${id}/reject/`),
  
  // Add additional complainant
  addComplainant: (id, complainantData) => api.post(`/complaints/${id}/add_complainant/`, complainantData),
};

export default complaintService;
