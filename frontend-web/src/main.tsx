import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { registerServiceWorker, setupInstallPrompt } from './utils/pwa';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Register Service Worker for PWA support
if (import.meta.env.PROD) {
  registerServiceWorker()
    .then(() => {
      console.log('✅ PWA Service Worker registered');
    })
    .catch((error) => {
      console.error('❌ Service Worker registration failed:', error);
    });

  // Setup install prompt
  setupInstallPrompt();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
