import api from './api';

export const evidenceService = {
  // List all evidence
  getEvidence: (params = {}) => api.get('/evidence/', { params }),

  // Get single evidence
  getEvidenceById: (id) => api.get(`/evidence/${id}/`),

  // Create new evidence
  createEvidence: (data) => api.post('/evidence/', data),

  // Create testimony evidence with details
  createTestimony: (data) => api.post('/evidence/create_testimony/', data),

  // Upload attachment to evidence
  uploadAttachment: (id, file, attachmentType = 'document', description = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attachment_type', attachmentType);
    formData.append('description', description);
    return api.post(`/evidence/${id}/upload_attachment/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Verify or reject evidence
  verifyEvidence: (id, data) => api.post(`/evidence/${id}/verify/`, data),

  // Add lab result to biological evidence
  addLabResult: (id, data) => api.post(`/evidence/${id}/add_lab_result/`, data),

  // List attachments for evidence
  getAttachments: (id) => api.get(`/evidence/${id}/attachments/`),

// Delete attachment (you'll need to add this endpoint in Django)
  deleteAttachment: (attachmentId) => {
  	return api.delete(`/attachments/${attachmentId}/`);
  },
};

export default evidenceService;
