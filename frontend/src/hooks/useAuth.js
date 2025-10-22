/**
 * Authentication Hook
 * Manages anonymous user sessions with maximum privacy
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const useAuth = () => {
  const [sessionId, setSessionId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Initialize anonymous authentication
   */
  const initializeAuth = useCallback(async () => {
    try {
      // Check for existing session in encrypted local storage
      const storedSession = localStorage.getItem('anon_session');

      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);

          // Verify session is still valid
          if (sessionData.expiresAt > Date.now()) {
            setSessionId(sessionData.sessionId);

            // Refresh session in background
            refreshSessionMutation.mutate(sessionData.sessionId);
            setIsInitialized(true);
            return;
          } else {
            // Session expired, clean up
            localStorage.removeItem('anon_session');
          }
        } catch (error) {
          console.error('Invalid stored session:', error);
          localStorage.removeItem('anon_session');
        }
      }

      // Create new anonymous session
      await createNewSession();

    } catch (error) {
      console.error('Auth initialization failed:', error);
      throw error;
    }
  }, []);

  /**
   * Create new anonymous session
   */
  const createNewSession = async () => {
    try {
      const response = await axios.post('/api/session/create', {
        sessionData: {
          // No personal data sent
          createdFrom: 'web_app',
          securityLevel: 'maximum',
        }
      });

      const { sessionId: newSessionId, expiresIn } = response.data;

      // Store session securely (encrypted)
      const sessionData = {
        sessionId: newSessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + expiresIn,
      };

      // Encrypt session data before storing
      const encryptedSession = await encryptSessionData(sessionData);
      localStorage.setItem('anon_session', encryptedSession);

      setSessionId(newSessionId);
      setIsInitialized(true);

    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  };

  /**
   * Encrypt session data for local storage
   */
  const encryptSessionData = async (sessionData) => {
    try {
      // Use Web Crypto API for encryption
      const dataString = JSON.stringify(sessionData);
      const dataBuffer = new TextEncoder().encode(dataString);

      // Generate a key for encryption (in production, use a more secure method)
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );

      // Export key for storage
      const keyData = await crypto.subtle.exportKey('raw', key);

      // Combine IV, key, and encrypted data
      const combined = new Uint8Array(
        iv.length + keyData.byteLength + encrypted.byteLength
      );

      combined.set(iv, 0);
      combined.set(new Uint8Array(keyData), iv.length);
      combined.set(new Uint8Array(encrypted), iv.length + keyData.byteLength);

      // Return base64 encoded string
      return btoa(String.fromCharCode(...combined));

    } catch (error) {
      console.error('Session encryption failed:', error);
      return JSON.stringify(sessionData); // Fallback to unencrypted
    }
  };

  /**
   * Decrypt session data from local storage
   */
  const decryptSessionData = async (encryptedData) => {
    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const keyData = combined.slice(12, 12 + 64); // 256-bit key = 64 bytes
      const encrypted = combined.slice(12 + 64);

      // Import key
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const dataString = new TextDecoder().decode(decrypted);
      return JSON.parse(dataString);

    } catch (error) {
      console.error('Session decryption failed:', error);
      return null;
    }
  };

  /**
   * Refresh session
   */
  const refreshSessionMutation = useMutation({
    mutationFn: async (currentSessionId) => {
      const response = await axios.get(`/api/session/${currentSessionId}`);
      return response.data;
    },
    onSuccess: (data) => {
      // Update session expiry
      const storedSession = localStorage.getItem('anon_session');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          sessionData.lastSeen = Date.now();
          sessionData.expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          localStorage.setItem('anon_session', JSON.stringify(sessionData));
        } catch (error) {
          console.error('Session refresh failed:', error);
        }
      }
    },
    onError: (error) => {
      console.error('Session refresh error:', error);
    }
  });

  /**
   * Logout (clear session)
   */
  const logout = useCallback(async () => {
    try {
      if (sessionId) {
        // Delete session from server
        await axios.delete(`/api/session/${sessionId}`);
      }

      // Clear local storage
      localStorage.removeItem('anon_session');

      // Clear React Query cache
      queryClient.clear();

      // Reset state
      setSessionId(null);
      setIsInitialized(false);

    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [sessionId, queryClient]);

  /**
   * Get session info
   */
  const getSessionInfo = useCallback(() => {
    if (!sessionId) return null;

    return {
      sessionId,
      isAuthenticated: !!sessionId,
      isInitialized,
      // No personal information exposed
    };
  }, [sessionId, isInitialized]);

  /**
   * Auto-refresh session before expiry
   */
  useEffect(() => {
    if (!sessionId || !isInitialized) return;

    const checkSession = async () => {
      try {
        const storedSession = localStorage.getItem('anon_session');
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);

          // Refresh if expiring soon (within 1 hour)
          const timeUntilExpiry = sessionData.expiresAt - Date.now();
          if (timeUntilExpiry < 60 * 60 * 1000) {
            await refreshSessionMutation.mutateAsync(sessionId);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    // Check every 15 minutes
    const interval = setInterval(checkSession, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sessionId, isInitialized, refreshSessionMutation]);

  return {
    // State
    sessionId,
    isAuthenticated: !!sessionId,
    isLoading: !isInitialized,
    isInitialized,

    // Actions
    initializeAuth,
    logout,
    getSessionInfo,

    // Utilities
    createNewSession,
  };
};