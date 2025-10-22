/**
 * Message Scheduling Hook
 * Schedule messages and automated responses
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useMessageScheduling = () => {
  const { sessionId } = useAuth();
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [autoResponses, setAutoResponses] = useState([]);

  /**
   * Schedule message for later sending
   */
  const scheduleMessageMutation = useMutation({
    mutationFn: async ({ chatId, content, scheduledTime, options = {} }) => {
      const response = await axios.post('/api/messages/schedule', {
        chatId,
        content,
        scheduledTime,
        options: {
          messageType: options.messageType || 'text',
          priority: options.priority || 'normal',
          encrypt: options.encrypt !== false,
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Add to scheduled messages
      setScheduledMessages(prev => [...prev, data.scheduledMessage]);
      console.log('⏰ Message scheduled');
    },
    onError: (error) => {
      console.error('Message scheduling failed:', error);
    }
  });

  /**
   * Cancel scheduled message
   */
  const cancelScheduledMessageMutation = useMutation({
    mutationFn: async (scheduleId) => {
      const response = await axios.delete(`/api/messages/schedule/${scheduleId}`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, scheduleId) => {
      // Remove from scheduled messages
      setScheduledMessages(prev => prev.filter(msg => msg.id !== scheduleId));
      console.log('❌ Scheduled message cancelled');
    },
    onError: (error) => {
      console.error('Scheduled message cancellation failed:', error);
    }
  });

  /**
   * Set up auto-response
   */
  const setAutoResponseMutation = useMutation({
    mutationFn: async ({ trigger, response, conditions = {} }) => {
      const responseData = await axios.post('/api/auto-responses', {
        trigger,
        response,
        conditions: {
          chatTypes: conditions.chatTypes || ['individual'],
          keywords: conditions.keywords || [],
          timeRange: conditions.timeRange || null,
          enabled: true,
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return responseData.data;
    },
    onSuccess: (data) => {
      // Add to auto-responses
      setAutoResponses(prev => [...prev, data.autoResponse]);
      console.log('🤖 Auto-response set up');
    },
    onError: (error) => {
      console.error('Auto-response setup failed:', error);
    }
  });

  /**
   * Schedule message
   */
  const scheduleMessage = useCallback(async (chatId, content, scheduledTime, options = {}) => {
    try {
      await scheduleMessageMutation.mutateAsync({
        chatId,
        content,
        scheduledTime,
        options,
      });
    } catch (error) {
      console.error('Message scheduling failed:', error);
      throw error;
    }
  }, [scheduleMessageMutation]);

  /**
   * Cancel scheduled message
   */
  const cancelScheduledMessage = useCallback(async (scheduleId) => {
    try {
      await cancelScheduledMessageMutation.mutateAsync(scheduleId);
    } catch (error) {
      console.error('Scheduled message cancellation failed:', error);
      throw error;
    }
  }, [cancelScheduledMessageMutation]);

  /**
   * Set up auto-response
   */
  const setAutoResponse = useCallback(async (trigger, response, conditions = {}) => {
    try {
      await setAutoResponseMutation.mutateAsync({ trigger, response, conditions });
    } catch (error) {
      console.error('Auto-response setup failed:', error);
      throw error;
    }
  }, [setAutoResponseMutation]);

  /**
   * Get scheduled messages
   */
  const getScheduledMessages = useCallback(async () => {
    try {
      const response = await axios.get('/api/messages/scheduled', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      setScheduledMessages(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get scheduled messages:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Get auto-responses
   */
  const getAutoResponses = useCallback(async () => {
    try {
      const response = await axios.get('/api/auto-responses', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      setAutoResponses(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get auto-responses:', error);
      return [];
    }
  }, [sessionId]);

  return {
    // State
    scheduledMessages,
    autoResponses,

    // Actions
    scheduleMessage,
    cancelScheduledMessage,
    setAutoResponse,
    getScheduledMessages,
    getAutoResponses,

    // Status
    isScheduling: scheduleMessageMutation.isPending,
    isCancelling: cancelScheduledMessageMutation.isPending,
    isSettingAutoResponse: setAutoResponseMutation.isPending,
  };
};