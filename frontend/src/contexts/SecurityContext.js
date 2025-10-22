/**
 * Security Context Provider
 * Manages global security state and encryption keys
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Security Context
const SecurityContext = createContext();

// Security Provider Component
export const SecurityProvider = ({ children }) => {
  const [isSecure, setIsSecure] = useState(false);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [sessionKey, setSessionKey] = useState(null);

  // Initialize security on mount
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        // Simulate security initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSecure(true);
        setEncryptionReady(true);
        console.log('🔒 Security context initialized');
      } catch (error) {
        console.error('Failed to initialize security:', error);
      }
    };

    initializeSecurity();
  }, []);

  // Security context value
  const value = {
    isSecure,
    encryptionReady,
    sessionKey,
    setSessionKey
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

// Custom hook to use Security Context
export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export default SecurityContext;