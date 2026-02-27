import api from './api';

const BASE = 'judiciary/trials';

export const judiciaryService = {
  getTrials: (params = {}) => api.get(`${BASE}/`, { params }),

  getTrial: (id) => api.get(`${BASE}/${id}/`),

  createTrial: (data) =>
    api.post(`${BASE}/`, {
      case_id: data.case_id,
      judge_id: data.judge_id,
      scheduled_date: data.scheduled_date,
      court_name: data.court_name || '',
      court_room: data.court_room || '',
    }),

  getFullReport: (trialId) => api.get(`${BASE}/${trialId}/full_report/`),

  issueVerdict: (trialId, data) =>
    api.post(`${BASE}/${trialId}/issue_verdict/`, {
      verdict: data.verdict,
      notes: data.notes || '',
    }),

  addSentence: (trialId, data) =>
    api.post(`${BASE}/${trialId}/add_sentence/`, {
      suspect_id: data.suspect_id,
      title: data.title,
      description: data.description,
      duration_days: data.duration_days ?? null,
      fine_amount: data.fine_amount ?? null,
    }),
};

export default judiciaryService;
