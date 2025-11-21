/**
 * Auth Store
 * Manages authentication state and user profile
 */

import { create } from 'zustand';
import { Member, AuthTokens, LoginCredentials, RegisterData } from '../types';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { websocket } from '../services/websocket';
import { STORAGE_KEYS } from '../constants';

interface AuthState {
  user: Member | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateProfile: (updates: Partial<Member>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { member, tokens } = await api.login(credentials);

      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      await storage.setJSON(STORAGE_KEYS.USER_DATA, member);

      set({ user: member, isAuthenticated: true, isLoading: false });

      // Connect WebSocket after successful login
      await websocket.connect();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true, error: null });
    try {
      const { member, tokens } = await api.register(registerData);

      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      await storage.setJSON(STORAGE_KEYS.USER_DATA, member);

      set({ user: member, isAuthenticated: true, isLoading: false });

      // Connect WebSocket after successful registration
      await websocket.connect();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
      websocket.disconnect();

      await storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER_DATA);

      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = await storage.getJSON<Member>(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        set({ user: userData, isAuthenticated: true, isLoading: false });

        // Try to fetch fresh user data
        try {
          const freshUser = await api.getProfile();
          set({ user: freshUser });
          await storage.setJSON(STORAGE_KEYS.USER_DATA, freshUser);
        } catch (error) {
          console.error('Failed to fetch fresh user data:', error);
        }

        // Connect WebSocket
        await websocket.connect();
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Load stored auth error:', error);
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await api.updateProfile(updates);
      await storage.setJSON(STORAGE_KEYS.USER_DATA, updatedUser);
      set({ user: updatedUser, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Update failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
