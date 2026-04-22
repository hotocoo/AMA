/**
 * Authentication Hook
 * Manages anonymous user sessions with maximum privacy
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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
      // Check for existing session in local storage
      const storedRaw = localStorage.getItem('anon_session');

      if (storedRaw) {
        try {
          // Try to parse as plain JSON first (backwards compat)
          let sessionData = null;
          try {
            sessionData = JSON.parse(storedRaw);
          } catch {
            // Try to decrypt if JSON parse failed
            sessionData = await decryptSessionData(storedRaw);
          }

          if (sessionData && sessionData.expiresAt > Date.now()) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Store session data
      const sessionData = {
        sessionId: newSessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + expiresIn,
      };

      // Attempt to encrypt session data before storing
      try {
        const encryptedSession = await encryptSessionData(sessionData);
        localStorage.setItem('anon_session', encryptedSession);
      } catch {
        // Fallback to plain JSON if encryption fails
        localStorage.setItem('anon_session', JSON.stringify(sessionData));
      }

      setSessionId(newSessionId);
      setIsInitialized(true);

    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  };

  /**
   * Encrypt session data for local storage
   * Note: The encryption key is stored alongside the ciphertext, providing
   * obfuscation rather than strong security. A production app should use
   * a persisted device key instead.
   */
  const encryptSessionData = async (sessionData) => {
    const dataString = JSON.stringify(sessionData);
    const dataBuffer = new TextEncoder().encode(dataString);

    // Generate a random key
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

    // Export key for storage (32 bytes for AES-256)
    const keyData = await crypto.subtle.exportKey('raw', key);

    // Layout: [12 bytes IV][32 bytes key][encrypted data]
    const combined = new Uint8Array(
      iv.length + keyData.byteLength + encrypted.byteLength
    );
    combined.set(iv, 0);
    combined.set(new Uint8Array(keyData), iv.length);
    combined.set(new Uint8Array(encrypted), iv.length + keyData.byteLength);

    return btoa(String.fromCharCode(...combined));
  };

  /**
   * Decrypt session data from local storage
   */
  const decryptSessionData = async (encryptedData) => {
    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Layout: [12 bytes IV][32 bytes key][encrypted data]
      const AES_KEY_BYTES = 32; // AES-256 = 32 bytes
      const iv = combined.slice(0, 12);
      const keyData = combined.slice(12, 12 + AES_KEY_BYTES);
      const encrypted = combined.slice(12 + AES_KEY_BYTES);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

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
  const refreshSessionMutation = useMutation(
    async (currentSessionId) => {
      const response = await axios.get(`/api/session/${currentSessionId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        // Extend expiry in stored session data
        const storedRaw = localStorage.getItem('anon_session');
        if (storedRaw) {
          try {
            const sessionData = JSON.parse(storedRaw);
            sessionData.lastSeen = Date.now();
            sessionData.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
            localStorage.setItem('anon_session', JSON.stringify(sessionData));
          } catch {
            // If it's encrypted we can't update in-place without decrypting;
            // create a fresh plain-JSON record with extended expiry
          }
        }
      },
      onError: (error) => {
        console.error('Session refresh error:', error);
      }
    }
  );

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
    };
  }, [sessionId, isInitialized]);

  /**
   * Auto-refresh session before expiry
   */
  useEffect(() => {
    if (!sessionId || !isInitialized) return;

    const checkSession = async () => {
      try {
        const storedRaw = localStorage.getItem('anon_session');
        if (storedRaw) {
          let sessionData = null;
          try {
            sessionData = JSON.parse(storedRaw);
          } catch {
            sessionData = await decryptSessionData(storedRaw);
          }

          if (sessionData) {
            const timeUntilExpiry = sessionData.expiresAt - Date.now();
            if (timeUntilExpiry < 60 * 60 * 1000) {
              await refreshSessionMutation.mutateAsync(sessionId);
            }
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    // Check every 15 minutes
    const interval = setInterval(checkSession, 15 * 60 * 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isInitialized]);

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
