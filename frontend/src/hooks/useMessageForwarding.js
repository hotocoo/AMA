/**
 * Message Forwarding Hook
 * Advanced message forwarding with privacy controls
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useMessageForwarding = () => {
  const { sessionId } = useAuth();
  const [forwardingHistory, setForwardingHistory] = useState([]);

  /**
   * Forward message to chats
   */
  const forwardMessageMutation = useMutation({
    mutationFn: async ({ messageId, targetChatIds, options = {} }) => {
      const response = await axios.post(`/api/messages/${messageId}/forward`, {
        targetChatIds,
        options: {
          preserveEncryption: options.preserveEncryption !== false,
          addForwardIndicator: options.addForwardIndicator !== false,
          anonymous: options.anonymous !== false,
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { messageId, targetChatIds }) => {
      // Add to forwarding history
      const historyEntry = {
        id: `forward_${Date.now()}`,
        messageId,
        targetChatIds,
        timestamp: Date.now(),
        success: true,
      };

      setForwardingHistory(prev => [historyEntry, ...prev.slice(0, 99)]);

      console.log('📨 Message forwarded to', targetChatIds.length, 'chats');
    },
    onError: (error) => {
      console.error('Message forwarding failed:', error);
    }
  });

  /**
   * Forward message
   */
  const forwardMessage = useCallback(async (messageId, targetChatIds, options = {}) => {
    try {
      await forwardMessageMutation.mutateAsync({
        messageId,
        targetChatIds,
        options,
      });
    } catch (error) {
      console.error('Message forwarding failed:', error);
      throw error;
    }
  }, [forwardMessageMutation]);

  /**
   * Forward multiple messages
   */
  const forwardMultipleMessages = useCallback(async (messageIds, targetChatIds, options = {}) => {
    try {
      // Forward each message individually
      const promises = messageIds.map(messageId =>
        forwardMessage(messageId, targetChatIds, options)
      );

      await Promise.all(promises);

      console.log('📨 Multiple messages forwarded');
    } catch (error) {
      console.error('Multiple message forwarding failed:', error);
      throw error;
    }
  }, [forwardMessage]);

  /**
   * Get forwarding suggestions
   */
  const getForwardingSuggestions = useCallback(async (messageId) => {
    try {
      const response = await axios.get(`/api/messages/${messageId}/forward-suggestions`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Forwarding suggestions failed:', error);
      return [];
    }
  }, [sessionId]);

  return {
    // State
    forwardingHistory,

    // Actions
    forwardMessage,
    forwardMultipleMessages,
    getForwardingSuggestions,

    // Status
    isForwarding: forwardMessageMutation.isPending,
  };
};