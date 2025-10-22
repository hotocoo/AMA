/**
 * Anonymous Messenger Main Application Component
 * Ultra-secure messaging platform with comprehensive privacy features
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ToastContainer, toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// Import core components and utilities
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import { useTheme } from './hooks/useTheme';
import { SecurityProvider } from './contexts/SecurityContext';

// Import pages
import WelcomePage from './pages/WelcomePage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

// Import components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import LoadingScreen from './components/common/LoadingScreen';
import SecurityStatus from './components/security/SecurityStatus';

// Import styles
import 'react-toastify/dist/ReactToastify.css';
import './styles/App.css';

const App = () => {
  const { isAuthenticated, isLoading: authLoading, initializeAuth } = useAuth();
  const { theme, themeLoading } = useTheme();
  const { isConnected, connectionStatus } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [securityInitialized, setSecurityInitialized] = useState(false);

  // Initialize security and authentication
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize cryptographic systems
        await initializeAuth();

        // Mark security as initialized
        setSecurityInitialized(true);

        console.log('🔒 Anonymous Messenger initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        toast.error('Failed to initialize application security');
      }
    };

    initializeApp();
  }, [initializeAuth]);

  // Show loading screen during initialization
  if (authLoading || themeLoading || !securityInitialized) {
    return <LoadingScreen message="Initializing secure connection..." />;
  }

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle online/offline status for anonymity
  useEffect(() => {
    const handleOnline = () => {
      toast.info('Connection restored', { autoClose: 2000 });
    };

    const handleOffline = () => {
      toast.warning('Connection lost - Messages are queued locally', {
        autoClose: false,
        closeOnClick: false
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <SecurityProvider>
      <div className={`app ${theme} ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}>
        {/* Security Status Indicator */}
        <SecurityStatus
          isConnected={isConnected}
          connectionStatus={connectionStatus}
          isAuthenticated={isAuthenticated}
        />

        {/* Main Layout */}
        <AnimatePresence mode="wait">
          {isAuthenticated ? (
            // Authenticated Layout
            <motion.div
              key="authenticated"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="app-layout"
            >
              {/* Sidebar for larger screens */}
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />

              {/* Main Content */}
              <div className="main-content">
                <Header
                  onMenuClick={() => setSidebarOpen(true)}
                  isConnected={isConnected}
                />

                <main className="app-main">
                  <Routes>
                    <Route path="/chat/:chatId?" element={<ChatPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/" element={<Navigate to="/chat" replace />} />
                  </Routes>
                </main>
              </div>

              {/* Mobile Overlay */}
              {sidebarOpen && (
                <div
                  className="mobile-overlay"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
            </motion.div>
          ) : (
            // Welcome/Unauthenticated Layout
            <motion.div
              key="unauthenticated"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="welcome-layout"
            >
              <WelcomePage />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Toast Notifications */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          theme={theme}
          limit={3}
        />

        {/* Global Loading Overlay */}
        <div id="global-loader" className="global-loader" style={{ display: 'none' }}>
          <div className="loader-spinner" />
        </div>
      </div>
    </SecurityProvider>
  );
};

export default App;