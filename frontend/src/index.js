/**
 * Anonymous Messenger Frontend Entry Point
 * Ultra-secure messaging platform with advanced privacy features
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

// Import global styles and security utilities
import './styles/index.css';
import './utils/security';
import './utils/crypto';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on authentication or authorization errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Disable for privacy
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Error boundary fallback component
const ErrorFallback = ({ error, resetError }) => {
  return (
    <div className="error-boundary">
      <div className="error-content">
        <h2>Something went wrong</h2>
        <p>The application encountered an unexpected error.</p>
        <button onClick={resetError} className="error-retry-btn">
          Try again
        </button>
      </div>
    </div>
  );
};

// Initialize security measures
const initializeSecurity = () => {
  // Disable context menu for privacy
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable text selection for privacy
  document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable drag and drop
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  // Prevent screenshot (experimental)
  document.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen') {
      navigator.clipboard.writeText('');
    }
  });

  // Clear clipboard on focus loss
  window.addEventListener('blur', () => {
    navigator.clipboard.writeText('');
  });
};

// Performance monitoring
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// Initialize the application
const initializeApp = async () => {
  try {
    // Initialize security measures
    initializeSecurity();

    // Create root element
    const root = ReactDOM.createRoot(document.getElementById('root'));

    // Render the application
    root.render(
      <React.StrictMode>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <HelmetProvider>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </QueryClientProvider>
          </HelmetProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    // Report web vitals in development
    if (process.env.NODE_ENV === 'development') {
      reportWebVitals(console.log);
    }

  } catch (error) {
    console.error('Failed to initialize application:', error);

    // Fallback rendering
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <div className="app-initialization-error">
        <h2>Initialization Error</h2>
        <p>Failed to start the application. Please refresh the page.</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }
};

// Start the application
initializeApp();