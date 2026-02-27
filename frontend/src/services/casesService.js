import api from './api';

export const casesService = {
  // List all cases
  getCases: (params = {}) => api.get('/cases/', { params }),
  
  // Get single case
  getCase: (id) => api.get(`/cases/${id}/`),
  
  // Create new case
  createCase: (caseData) => api.post('/cases/', caseData),
  
  // Create case from crime scene
  createFromCrimeScene: (caseData) => api.post('/cases/from_crime_scene/', caseData),
  
  // Update case
  updateCase: (id, caseData) => api.put(`/cases/${id}/`, caseData),
  
  // Get detective board
  getDetectiveBoard: (id) => api.get(`/cases/${id}/detective_board/`),

  // Detective board: list accessible investigation cases assigned to current detective
  getDetectiveBoardCases: () => api.get('/cases/detective-board-cases/'),
  
  // Update detective board
  updateDetectiveBoard: (id, boardData) => api.put(`/cases/${id}/detective_board/`, boardData),
  
  // Approve pending case (Sergeant/Captain/Chief)
  approveCase: (id) => api.post(`/cases/${id}/approve/`),

  // Start investigation
  startInvestigation: (id) => api.post(`/cases/${id}/start_investigation/`),
  
  // Identify suspects
  identifySuspect: (id, suspectData) => api.post(`/cases/${id}/identify_suspect/`, suspectData),
  
  // Start interrogation
  startInterrogation: (id) => api.post(`/cases/${id}/start_interrogation/`),
  
  // Submit to captain
  submitToCaptain: (id) => api.post(`/cases/${id}/submit_to_captain/`),
  
  // Captain approves case (non-critical → trial, critical → chief)
  captainApprove: (id) => api.post(`/cases/${id}/captain_approve/`),

  // Chief approves critical case → trial
  chiefApprove: (id) => api.post(`/cases/${id}/chief_approve/`),

  // Escalate to chief
  escalateToChief: (id) => api.post(`/cases/${id}/escalate_to_chief/`),

  // Send to trial
  sendToTrial: (id, trialData) => api.post(`/cases/${id}/send_to_trial/`, trialData),
  
  // Close as solved
  closeSolved: (id) => api.post(`/cases/${id}/close_solved/`),
  
  // Close as unsolved
  closeUnsolved: (id) => api.post(`/cases/${id}/close_unsolved/`),

  // Sergeant approves suspects
  approveSuspects: (id) => api.post(`/cases/${id}/approve_suspects/`),

  // Sergeant rejects suspects
  rejectSuspects: (id, data) => api.post(`/cases/${id}/reject_suspects/`, data),

  // Assign detective
  assignDetective: (id, data) => api.post(`/cases/${id}/assign_detective/`, data),

  // Add suspect to case
  addSuspect: (caseId, data) => api.post(`/cases/${caseId}/add_suspect/`, data),

  // Get case suspects
  getCaseSuspects: (caseId) => api.get(`/cases/${caseId}/suspects/`),

  // Identify suspects (detective sends to sergeant)
  identifySuspects: (id) => api.post(`/cases/${id}/identify_suspect/`),
};

export default casesService;
