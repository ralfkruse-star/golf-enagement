import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

export const membersApi = {
  getAll: (params?: any) => api.get('/members', { params }),
  getMe: () => api.get('/members/me'),
  getById: (id: string) => api.get(`/members/${id}`),
  update: (id: string, data: any) => api.patch(`/members/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/members/${id}/status`, { status }),
  getStatistics: () => api.get('/members/statistics'),
};

export const eventsApi = {
  getAll: (params?: any) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: any) => api.post('/events', data),
  update: (id: string, data: any) => api.patch(`/events/${id}`, data),
  publish: (id: string) => api.post(`/events/${id}/publish`),
  delete: (id: string) => api.delete(`/events/${id}`),
  getStatistics: () => api.get('/events/statistics/overview'),
};

export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  getById: (id: string) => api.get(`/notifications/${id}`),
  create: (data: any) => api.post('/notifications', data),
  send: (id: string) => api.post(`/notifications/${id}/send`),
  cancel: (id: string) => api.delete(`/notifications/${id}`),
  getStatistics: () => api.get('/notifications/statistics'),
};

export const feedApi = {
  getAll: (params?: any) => api.get('/feed', { params }),
  getById: (id: string) => api.get(`/feed/${id}`),
  create: (data: any) => api.post('/feed', data),
  update: (id: string, data: any) => api.patch(`/feed/${id}`, data),
  delete: (id: string) => api.delete(`/feed/${id}`),
  getStatistics: () => api.get('/feed/statistics/overview'),
};

export const segmentsApi = {
  getAll: () => api.get('/segments'),
  getById: (id: string) => api.get(`/segments/${id}`),
  create: (data: any) => api.post('/segments', data),
  update: (id: string, data: any) => api.patch(`/segments/${id}`, data),
  delete: (id: string) => api.delete(`/segments/${id}`),
  recalculate: (id: string) => api.post(`/segments/${id}/recalculate`),
};
