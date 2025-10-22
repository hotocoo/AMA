/**
 * Message Reactions Hook
 * Anonymous message reactions and threaded replies
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useMessageReactions = () => {
  const { sessionId } = useAuth();
  const [reactionPicker, setReactionPicker] = useState(null);

  // Available reaction types
  const REACTION_TYPES = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠',
    celebrate: '🎉',
    support: '🤝',
    question: '❓',
    exclamation: '❗',
  };

  /**
   * Add reaction to message
   */
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, reactionType, chatId }) => {
      const response = await axios.post(`/api/messages/${messageId}/reactions`, {
        reactionType,
        chatId,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { messageId }) => {
      console.log('👍 Reaction added to message:', messageId);
    },
    onError: (error) => {
      console.error('Reaction failed:', error);
    }
  });

  /**
   * Remove reaction from message
   */
  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, reactionType, chatId }) => {
      const response = await axios.delete(`/api/messages/${messageId}/reactions/${reactionType}`, {
        headers: {
          'x-anonymous-session': sessionId,
        },
        data: { chatId }
      });
      return response.data;
    },
    onSuccess: (data, { messageId }) => {
      console.log('❌ Reaction removed from message:', messageId);
    },
    onError: (error) => {
      console.error('Reaction removal failed:', error);
    }
  });

  /**
   * Add threaded reply to message
   */
  const addReplyMutation = useMutation({
    mutationFn: async ({ messageId, content, chatId, replyToMessageId }) => {
      const response = await axios.post(`/api/messages/${messageId}/replies`, {
        content,
        chatId,
        replyToMessageId,
        isAnonymous: true,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { messageId }) => {
      console.log('💬 Threaded reply added to message:', messageId);
    },
    onError: (error) => {
      console.error('Reply failed:', error);
    }
  });

  /**
   * Get message reactions
   */
  const getMessageReactions = useCallback(async (messageId, chatId) => {
    try {
      const response = await axios.get(`/api/messages/${messageId}/reactions`, {
        params: { chatId },
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get message reactions:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Get threaded replies for message
   */
  const getMessageReplies = useCallback(async (messageId, chatId) => {
    try {
      const response = await axios.get(`/api/messages/${messageId}/replies`, {
        params: { chatId },
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get message replies:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Toggle reaction on message
   */
  const toggleReaction = useCallback(async (messageId, reactionType, chatId) => {
    try {
      // Check if user already reacted (simplified - in production use proper state management)
      const existingReactions = await getMessageReactions(messageId, chatId);
      const hasReaction = existingReactions.some(r =>
        r.reactionType === reactionType && r.sessionId === sessionId
      );

      if (hasReaction) {
        await removeReactionMutation.mutateAsync({ messageId, reactionType, chatId });
      } else {
        await addReactionMutation.mutateAsync({ messageId, reactionType, chatId });
      }
    } catch (error) {
      console.error('Reaction toggle failed:', error);
    }
  }, [sessionId, getMessageReactions, addReactionMutation, removeReactionMutation]);

  /**
   * Add reply to message
   */
  const addThreadedReply = useCallback(async (messageId, content, chatId) => {
    try {
      await addReplyMutation.mutateAsync({
        messageId,
        content,
        chatId,
        replyToMessageId: messageId,
      });
    } catch (error) {
      console.error('Threaded reply failed:', error);
    }
  }, [addReplyMutation]);

  /**
   * Show reaction picker for message
   */
  const showReactionPicker = useCallback((messageId) => {
    setReactionPicker(messageId);
  }, []);

  /**
   * Hide reaction picker
   */
  const hideReactionPicker = useCallback(() => {
    setReactionPicker(null);
  }, []);

  /**
   * Format reaction count for display
   */
  const formatReactionCount = useCallback((reactions) => {
    if (!reactions || reactions.length === 0) return '';

    const reactionCounts = {};
    reactions.forEach(reaction => {
      reactionCounts[reaction.reactionType] = (reactionCounts[reaction.reactionType] || 0) + 1;
    });

    const topReactions = Object.entries(reactionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return topReactions.map(([type, count]) => `${REACTION_TYPES[type]} ${count}`).join(' ');
  }, []);

  return {
    // State
    reactionPicker,
    REACTION_TYPES,

    // Actions
    toggleReaction,
    addThreadedReply,
    showReactionPicker,
    hideReactionPicker,

    // Utilities
    getMessageReactions,
    getMessageReplies,
    formatReactionCount,

    // Status
    isAddingReaction: addReactionMutation.isPending,
    isRemovingReaction: removeReactionMutation.isPending,
    isAddingReply: addReplyMutation.isPending,
  };
};