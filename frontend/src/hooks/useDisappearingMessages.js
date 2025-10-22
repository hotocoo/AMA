/**
 * Disappearing Messages Hook
 * Self-destructing messages with customizable timers
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useDisappearingMessages = () => {
  const { sessionId } = useAuth();
  const [disappearingMessages, setDisappearingMessages] = useState(new Map());
  const [messageTimers, setMessageTimers] = useState(new Map());

  // Available timer options (in seconds)
  const TIMER_OPTIONS = [
    { value: 0, label: 'Off', description: 'Messages never disappear' },
    { value: 5, label: '5 seconds', description: 'Messages disappear after 5 seconds' },
    { value: 10, label: '10 seconds', description: 'Messages disappear after 10 seconds' },
    { value: 30, label: '30 seconds', description: 'Messages disappear after 30 seconds' },
    { value: 60, label: '1 minute', description: 'Messages disappear after 1 minute' },
    { value: 300, label: '5 minutes', description: 'Messages disappear after 5 minutes' },
    { value: 900, label: '15 minutes', description: 'Messages disappear after 15 minutes' },
    { value: 3600, label: '1 hour', description: 'Messages disappear after 1 hour' },
    { value: 86400, label: '24 hours', description: 'Messages disappear after 24 hours' },
    { value: 604800, label: '7 days', description: 'Messages disappear after 7 days' },
  ];

  /**
   * Send disappearing message
   */
  const sendDisappearingMessageMutation = useMutation({
    mutationFn: async ({ chatId, content, timer, messageType = 'text' }) => {
      const response = await axios.post('/api/messages/disappearing', {
        chatId,
        content,
        messageType,
        timer,
        expiresAt: Date.now() + (timer * 1000),
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
        },
        privacy: {
          anonymous: true,
          selfDestruct: true,
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { messageId, timer }) => {
      // Start countdown timer for this message
      startMessageTimer(data.messageId, timer);

      console.log('⏰ Disappearing message sent:', data.messageId);
    },
    onError: (error) => {
      console.error('Disappearing message failed:', error);
    }
  });

  /**
   * Set disappearing message timer for chat
   */
  const setChatTimerMutation = useMutation({
    mutationFn: async ({ chatId, timer }) => {
      const response = await axios.put(`/api/chats/${chatId}/timer`, {
        timer,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { chatId, timer }) => {
      console.log('⏰ Chat timer set to', timer, 'seconds for chat:', chatId);
    },
    onError: (error) => {
      console.error('Chat timer setting failed:', error);
    }
  });

  /**
   * Start countdown timer for disappearing message
   */
  const startMessageTimer = useCallback((messageId, timerSeconds) => {
    if (timerSeconds <= 0) return;

    // Clear existing timer
    if (messageTimers.has(messageId)) {
      clearInterval(messageTimers.get(messageId));
    }

    // Add to disappearing messages
    setDisappearingMessages(prev => new Map(prev).set(messageId, {
      id: messageId,
      timer: timerSeconds,
      startTime: Date.now(),
      endTime: Date.now() + (timerSeconds * 1000),
    }));

    // Create countdown interval
    const interval = setInterval(() => {
      const message = disappearingMessages.get(messageId);
      if (!message) {
        clearInterval(interval);
        return;
      }

      const elapsed = Math.floor((Date.now() - message.startTime) / 1000);
      const remaining = Math.max(0, message.timer - elapsed);

      if (remaining <= 0) {
        // Message should disappear
        handleMessageExpiration(messageId);
        clearInterval(interval);
      } else {
        // Update remaining time
        setDisappearingMessages(prev => new Map(prev).set(messageId, {
          ...message,
          remaining,
        }));
      }
    }, 1000);

    // Store interval reference
    setMessageTimers(prev => new Map(prev).set(messageId, interval));
  }, [disappearingMessages, messageTimers]);

  /**
   * Handle message expiration
   */
  const handleMessageExpiration = useCallback(async (messageId) => {
    try {
      // Remove from local state
      setDisappearingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });

      // Clear timer
      const timer = messageTimers.get(messageId);
      if (timer) {
        clearInterval(timer);
        setMessageTimers(prev => {
          const newMap = new Map(prev);
          newMap.delete(messageId);
          return newMap;
        });
      }

      // Notify server about expiration (for cleanup)
      await axios.delete(`/api/messages/${messageId}/disappear`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });

      console.log('💨 Message disappeared:', messageId);

    } catch (error) {
      console.error('Message expiration handling failed:', error);
    }
  }, [sessionId, messageTimers]);

  /**
   * Send disappearing message
   */
  const sendDisappearingMessage = useCallback(async (chatId, content, timer = 60) => {
    try {
      await sendDisappearingMessageMutation.mutateAsync({
        chatId,
        content,
        timer,
        messageId: `dis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    } catch (error) {
      console.error('Failed to send disappearing message:', error);
    }
  }, [sendDisappearingMessageMutation]);

  /**
   * Set default timer for chat
   */
  const setChatTimer = useCallback(async (chatId, timer) => {
    try {
      await setChatTimerMutation.mutateAsync({ chatId, timer });
    } catch (error) {
      console.error('Failed to set chat timer:', error);
    }
  }, [setChatTimerMutation]);

  /**
   * Get remaining time for message
   */
  const getMessageRemainingTime = useCallback((messageId) => {
    const message = disappearingMessages.get(messageId);
    if (!message) return 0;

    const elapsed = Math.floor((Date.now() - message.startTime) / 1000);
    return Math.max(0, message.timer - elapsed);
  }, [disappearingMessages]);

  /**
   * Format time remaining for display
   */
  const formatTimeRemaining = useCallback((seconds) => {
    if (seconds <= 0) return 'Expired';

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}h`;
    }
  }, []);

  /**
   * Check if message is disappearing
   */
  const isMessageDisappearing = useCallback((messageId) => {
    return disappearingMessages.has(messageId);
  }, [disappearingMessages]);

  /**
   * Cancel disappearing message
   */
  const cancelDisappearingMessage = useCallback(async (messageId) => {
    try {
      // Remove from local state
      setDisappearingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });

      // Clear timer
      const timer = messageTimers.get(messageId);
      if (timer) {
        clearInterval(timer);
        setMessageTimers(prev => {
          const newMap = new Map(prev);
          newMap.delete(messageId);
          return newMap;
        });
      }

      // Notify server
      await axios.delete(`/api/messages/${messageId}/cancel-disappear`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });

      console.log('❌ Disappearing message cancelled:', messageId);

    } catch (error) {
      console.error('Message cancellation failed:', error);
    }
  }, [sessionId, messageTimers]);

  /**
   * Get active disappearing messages count
   */
  const getActiveDisappearingCount = useCallback(() => {
    return disappearingMessages.size;
  }, [disappearingMessages]);

  /**
   * Cleanup timers on unmount
   */
  useEffect(() => {
    return () => {
      // Clear all timers
      messageTimers.forEach(timer => {
        clearInterval(timer);
      });
    };
  }, [messageTimers]);

  return {
    // State
    disappearingMessages: Array.from(disappearingMessages.values()),
    TIMER_OPTIONS,

    // Actions
    sendDisappearingMessage,
    setChatTimer,
    cancelDisappearingMessage,

    // Utilities
    getMessageRemainingTime,
    formatTimeRemaining,
    isMessageDisappearing,
    getActiveDisappearingCount,

    // Status
    isSending: sendDisappearingMessageMutation.isPending,
    isSettingTimer: setChatTimerMutation.isPending,
  };
};