/**
 * Golf Engagement Mobile App
 * Main Entry Point
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import { useAppStore } from './src/store/appStore';
import Navigation from './src/navigation';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  const loadStoredAuth = useAuthStore((state) => state.loadStoredAuth);
  const loadPersonaPreference = useAppStore((state) => state.loadPersonaPreference);

  useEffect(() => {
    // Load stored authentication and preferences on app start
    const initialize = async () => {
      await loadStoredAuth();
      await loadPersonaPreference();
    };

    initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Navigation />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
