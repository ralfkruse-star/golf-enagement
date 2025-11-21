/**
 * App Store
 * Manages app-wide state like persona mode, theme, etc.
 */

import { create } from 'zustand';
import { storage } from '../services/storage';
import { STORAGE_KEYS } from '../constants';

export type PersonaType = 'member' | 'beginner';

interface AppState {
  personaMode: PersonaType;
  isPersonaModalVisible: boolean;

  // Actions
  setPersonaMode: (mode: PersonaType) => Promise<void>;
  loadPersonaPreference: () => Promise<void>;
  showPersonaModal: () => void;
  hidePersonaModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  personaMode: 'member',
  isPersonaModalVisible: false,

  setPersonaMode: async (mode) => {
    set({ personaMode: mode });
    await storage.setItem(STORAGE_KEYS.PERSONA_PREFERENCE, mode);
  },

  loadPersonaPreference: async () => {
    const stored = await storage.getItem(STORAGE_KEYS.PERSONA_PREFERENCE);
    if (stored === 'member' || stored === 'beginner') {
      set({ personaMode: stored });
    }
  },

  showPersonaModal: () => set({ isPersonaModalVisible: true }),
  hidePersonaModal: () => set({ isPersonaModalVisible: false }),
}));
