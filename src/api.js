import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('sutradhar_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
  login: (username, password) => api.post('/auth/login', { username, password }),
};

export const documentsAPI = {
  list:      (scripture, search, page = 1, pageSize = 10) =>
    api.get('/documents', { params: { ...(scripture ? { scripture } : {}), ...(search ? { search } : {}), page, page_size: pageSize } }),
  export:    (scripture) => api.get('/documents/export', { params: scripture ? { scripture } : {} }),
  upload:    (formData)  => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  ingestURL: (data)      => api.post('/documents/ingest-url', data),
  delete:    (id)        => api.delete(`/documents/${id}`),
  update:    (id, data)  => api.patch(`/documents/${id}`, data),
  getJob:    (jobId)     => api.get(`/documents/jobs/${jobId}`),
};

export const adminAPI = {
  stats:              ()        => api.get('/admin/stats'),
  health:             ()        => api.get('/health'),
  activity:           (limit)   => api.get('/admin/activity', { params: { limit } }),
  users:              ()        => api.get('/admin/users'),
  createUser:         (data)    => api.post('/admin/users', data),
  updateUser:         (id, d)   => api.patch(`/admin/users/${id}`, d),
  deleteUser:         (id)      => api.delete(`/admin/users/${id}`),
  adminScriptures:    ()        => api.get('/admin/scriptures'),
  createScripture:    (data)    => api.post('/admin/scriptures', data),
  updateScripture:    (id, d)   => api.patch(`/admin/scriptures/${id}`, d),
  adminStorytellers:  ()        => api.get('/admin/storytellers'),
  createStoryteller:  (data)    => api.post('/admin/storytellers', data),
  updateStoryteller:  (id, d)   => api.patch(`/admin/storytellers/${id}`, d),
  deleteStoryteller:  (id)      => api.delete(`/admin/storytellers/${id}`),
  clearNamespace:     (ns)      => api.delete(`/namespaces/${ns}`),
};

export const metaAPI = {
  scriptures: () => api.get('/scriptures'),
};

export default api;