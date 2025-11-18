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

export const teeTimeApi = {
  getSlots: (params: { date: string; course?: string }) =>
    api.get('/tee-times', { params }),
  bookSlot: (slotId: string, data: { players: number; playerIds?: string[]; notes?: string }) =>
    api.post(`/tee-times/${slotId}/book`, data),
  getMyBookings: (params?: { upcoming?: boolean }) =>
    api.get('/tee-times/bookings/me', { params }),
  cancelBooking: (bookingId: string) =>
    api.delete(`/tee-times/bookings/${bookingId}`),
  generateSlots: (data: { startDate: string; endDate: string; course?: string }) =>
    api.post('/tee-times/admin/generate', data),
  blockSlot: (slotId: string, reason: string) =>
    api.post(`/tee-times/admin/${slotId}/block`, { reason }),
  unblockSlot: (slotId: string) =>
    api.delete(`/tee-times/admin/${slotId}/block`),
  getStatistics: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/tee-times/statistics', { params }),
};

export const paymentsApi = {
  getSubscriptionPlans: () => api.get('/payments/subscription-plans'),
  createEventCheckout: (eventId: string, amount: number) =>
    api.post('/payments/event/checkout', { eventId, amount }),
  createSubscription: (planId: string) =>
    api.post('/payments/subscriptions', { planId }),
  cancelSubscription: (subscriptionId: string, cancelAtPeriodEnd?: boolean) =>
    api.delete(`/payments/subscriptions/${subscriptionId}`, {
      data: { cancelAtPeriodEnd },
    }),
  getMyPayments: (params?: { limit?: number; offset?: number }) =>
    api.get('/payments/me', { params }),
  getMySubscriptions: () => api.get('/payments/subscriptions/me'),
  processRefund: (paymentId: string, data?: { amount?: number; reason?: string }) =>
    api.post(`/payments/${paymentId}/refund`, data),
};

export const handicapApi = {
  submitRound: (data: {
    courseId?: string;
    date: string;
    strokes: number;
    coursePar?: number;
    courseRating?: number;
    slopeRating?: number;
  }) => api.post('/handicap/rounds', data),
  getMyRounds: (params?: { limit?: number; verified?: boolean }) =>
    api.get('/handicap/rounds/me', { params }),
  getMyHistory: (params?: { limit?: number }) =>
    api.get('/handicap/history/me', { params }),
  getPlayingHandicap: (data: {
    courseRating: number;
    slopeRating: number;
    coursePar: number;
  }) => api.post('/handicap/playing-handicap', data),
  deleteRound: (roundId: string) => api.delete(`/handicap/rounds/${roundId}`),
  verifyRound: (roundId: string) =>
    api.post(`/handicap/admin/rounds/${roundId}/verify`),
  getStats: () => api.get('/handicap/admin/stats'),
  getMemberRounds: (memberId: string, params?: { limit?: number; verified?: boolean }) =>
    api.get(`/handicap/members/${memberId}/rounds`, { params }),
};

export const qrApi = {
  generateEventQR: (eventId: string) => api.post('/qr/event', { eventId }),
  generateTeeTimeQR: (bookingId: string) => api.post('/qr/teetime', { bookingId }),
  getNextEventQR: () => api.get('/qr/next-event'),
  getNextTeeTimeQR: () => api.get('/qr/next-teetime'),
  processCheckIn: (qrData: string) => api.post('/qr/checkin', { qrData }),
};

export const tournamentApi = {
  createTournament: (data: {
    eventId: string;
    format: 'STROKE_PLAY' | 'STABLEFORD' | 'MATCH_PLAY';
    startTime: string;
    holes: number;
  }) => api.post('/tournaments', data),
  startTournament: (id: string) => api.post(`/tournaments/${id}/start`),
  endTournament: (id: string) => api.post(`/tournaments/${id}/end`),
  submitScore: (id: string, data: { hole: number; strokes: number }) =>
    api.post(`/tournaments/${id}/score`, data),
  getLeaderboard: (id: string) => api.get(`/tournaments/${id}/leaderboard`),
  getMyScore: (id: string) => api.get(`/tournaments/${id}/my-score`),
  getActiveTournaments: () => api.get('/tournaments/active'),
};
