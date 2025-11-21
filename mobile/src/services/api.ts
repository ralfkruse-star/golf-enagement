/**
 * API Service
 * Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL, STORAGE_KEYS } from '../constants';
import { storage } from './storage';
import {
  ApiResponse,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  Member,
  Event,
  EventRegistration,
  FeedPost,
  FeedComment,
  Notification,
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for the current refresh to complete
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => this.client(originalRequest))
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const { data } = await axios.post<ApiResponse<AuthTokens>>(
              `${API_URL}/auth/refresh`,
              { refreshToken }
            );

            const { accessToken, refreshToken: newRefreshToken } = data.data;

            await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

            // Retry all queued requests
            this.failedQueue.forEach((prom) => prom.resolve());
            this.failedQueue = [];

            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear auth and redirect to login
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];

            await this.clearAuth();
            // You can emit an event here to trigger navigation to login
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async clearAuth() {
    await storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // ============================================================================
  // AUTH ENDPOINTS
  // ============================================================================

  async login(credentials: LoginCredentials): Promise<{ member: Member; tokens: AuthTokens }> {
    const { data } = await this.client.post<
      ApiResponse<{ member: Member; tokens: AuthTokens }>
    >('/auth/login', credentials);
    return data.data;
  }

  async register(registerData: RegisterData): Promise<{ member: Member; tokens: AuthTokens }> {
    const { data } = await this.client.post<
      ApiResponse<{ member: Member; tokens: AuthTokens }>
    >('/auth/register', registerData);
    return data.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      await this.clearAuth();
    }
  }

  async getProfile(): Promise<Member> {
    const { data } = await this.client.get<ApiResponse<Member>>('/members/me');
    return data.data;
  }

  async updateProfile(updates: Partial<Member>): Promise<Member> {
    const { data } = await this.client.patch<ApiResponse<Member>>('/members/me', updates);
    return data.data;
  }

  // ============================================================================
  // EVENTS ENDPOINTS
  // ============================================================================

  async getEvents(params?: { upcoming?: boolean; type?: string }): Promise<Event[]> {
    const { data } = await this.client.get<ApiResponse<Event[]>>('/events', { params });
    return data.data;
  }

  async getEvent(id: string): Promise<Event> {
    const { data } = await this.client.get<ApiResponse<Event>>(`/events/${id}`);
    return data.data;
  }

  async registerForEvent(eventId: string): Promise<EventRegistration> {
    const { data } = await this.client.post<ApiResponse<EventRegistration>>(
      `/events/${eventId}/register`
    );
    return data.data;
  }

  async cancelEventRegistration(eventId: string): Promise<void> {
    await this.client.delete(`/events/${eventId}/register`);
  }

  async getMyEventRegistrations(): Promise<EventRegistration[]> {
    const { data } = await this.client.get<ApiResponse<EventRegistration[]>>(
      '/events/registrations/me'
    );
    return data.data;
  }

  // ============================================================================
  // FEED ENDPOINTS
  // ============================================================================

  async getFeedPosts(params?: { page?: number; limit?: number }): Promise<{
    posts: FeedPost[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data } = await this.client.get<
      ApiResponse<{
        posts: FeedPost[];
        total: number;
        page: number;
        totalPages: number;
      }>
    >('/feed', { params });
    return data.data;
  }

  async getFeedPost(id: string): Promise<FeedPost> {
    const { data } = await this.client.get<ApiResponse<FeedPost>>(`/feed/${id}`);
    return data.data;
  }

  async createPost(content: string, type?: string): Promise<FeedPost> {
    const { data } = await this.client.post<ApiResponse<FeedPost>>('/feed', {
      content,
      type: type || 'GENERAL',
    });
    return data.data;
  }

  async likePost(postId: string): Promise<void> {
    await this.client.post(`/feed/${postId}/like`);
  }

  async unlikePost(postId: string): Promise<void> {
    await this.client.delete(`/feed/${postId}/like`);
  }

  async addComment(postId: string, content: string): Promise<FeedComment> {
    const { data } = await this.client.post<ApiResponse<FeedComment>>(
      `/feed/${postId}/comments`,
      { content }
    );
    return data.data;
  }

  async getComments(postId: string): Promise<FeedComment[]> {
    const { data } = await this.client.get<ApiResponse<FeedComment[]>>(
      `/feed/${postId}/comments`
    );
    return data.data;
  }

  // ============================================================================
  // NOTIFICATIONS ENDPOINTS
  // ============================================================================

  async getNotifications(): Promise<Notification[]> {
    const { data } = await this.client.get<ApiResponse<Notification[]>>('/notifications/me');
    return data.data;
  }

  async registerPushToken(token: string): Promise<void> {
    await this.client.post('/notifications/tokens/register', {
      token,
      platform: 'expo',
    });
  }

  async unregisterPushToken(token: string): Promise<void> {
    await this.client.post('/notifications/tokens/unregister', { token });
  }

  // ============================================================================
  // GAMIFICATION ENDPOINTS
  // ============================================================================

  async getMyStats(): Promise<any> {
    const { data } = await this.client.get<ApiResponse<any>>('/gamification/stats/me');
    return data.data;
  }

  async getLeaderboard(type: 'points' | 'events' | 'posts' = 'points'): Promise<any> {
    const { data } = await this.client.get<ApiResponse<any>>('/gamification/leaderboard', {
      params: { type },
    });
    return data.data;
  }
}

export const api = new ApiService();
