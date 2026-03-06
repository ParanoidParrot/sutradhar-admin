import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({ baseURL: API_URL });

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sutradhar_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sutradhar_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
};

export const documentsAPI = {
  list:      (scripture) => api.get('/documents', { params: scripture ? { scripture } : {} }),
  upload:    (formData)  => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  ingestURL: (data)      => api.post('/documents/ingest-url', data),
  delete:    (id)        => api.delete(`/documents/${id}`),
};

export const adminAPI = {
  stats:  () => api.get('/admin/stats'),
  health: () => api.get('/health'),
};

export const metaAPI = {
  scriptures: () => api.get('/scriptures'),
};

export default api;