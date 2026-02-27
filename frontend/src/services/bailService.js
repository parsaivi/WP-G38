import api from './api';

export const bailService = {
  getBails: (params = {}) => api.get('/bail/bails/', { params }),
  getBail: (id) => api.get(`/bail/bails/${id}/`),
  createBail: (data) => api.post('/bail/bails/', data),
  initiatePayment: (id, { return_url }) =>
    api.post(`/bail/bails/${id}/initiate_payment/`, { return_url }),
  confirmPayment: (id, params = {}) =>
    api.get(`/bail/bails/${id}/confirm_payment/`, { params }),
};

export default bailService;
