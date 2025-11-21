/**
 * App Constants
 */

import { UserPersona } from '../types';

export const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
export const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

export const COLORS = {
  primary: '#2563eb', // Blue
  secondary: '#10b981', // Green
  accent: '#f59e0b', // Amber
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  background: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',

  text: {
    primary: '#111827',
    secondary: '#6b7280',
    disabled: '#9ca3af',
    inverse: '#ffffff',
  },

  // Golf-specific colors
  fairway: '#10b981',
  rough: '#84cc16',
  bunker: '#fbbf24',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const USER_PERSONAS: Record<string, UserPersona> = {
  member: {
    type: 'member',
    label: 'Vollmitglied',
    description: 'Vollständiger Zugriff auf alle Club-Features',
    features: [
      'Alle Events',
      'Turniere',
      'Handicap-Tracking',
      'Community Features',
      'Tee-Time Buchung',
    ],
  },
  beginner: {
    type: 'beginner',
    label: 'Beginner',
    description: 'Vereinfachte Erfahrung für Einsteiger',
    features: [
      'Beginner-Events',
      'Golf-Tipps',
      'Buddy-System',
      'Lern-Ressourcen',
      'Vereinfachte UI',
    ],
  },
};

export const EVENT_TYPES = {
  TOURNAMENT: { label: 'Turnier', icon: 'trophy', color: COLORS.primary },
  TRAINING: { label: 'Training', icon: 'school', color: COLORS.secondary },
  SOCIAL: { label: 'Social', icon: 'people', color: COLORS.accent },
  MEETING: { label: 'Meeting', icon: 'business', color: COLORS.info },
  OTHER: { label: 'Sonstiges', icon: 'event', color: COLORS.text.secondary },
};

export const MEMBERSHIP_TYPES = {
  FULL: 'Vollmitglied',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
  GUEST: 'Gast',
  HONORARY: 'Ehrenmitglied',
  TRIAL: 'Schnupper',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth/access_token',
  REFRESH_TOKEN: '@auth/refresh_token',
  USER_DATA: '@auth/user_data',
  PERSONA_PREFERENCE: '@app/persona_preference',
  FCM_TOKEN: '@notifications/fcm_token',
};
