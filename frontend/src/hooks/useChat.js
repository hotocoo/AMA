/**
 * Chat Management Hook
 * Comprehensive chat handling with anonymity features
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useChat = () => {
  const { sessionId } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const queryClient = useQueryClient();

  /**
   * Fetch user's chats
   */
  const {
    data: chatsData,
    isLoading: chatsLoading,
    error: chatsError
  } = useQuery({
    queryKey: ['chats', sessionId],
    queryFn: async () => {
      const response = await axios.get(`/api/chats`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    enabled: !!sessionId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  /**
   * Create new individual chat
   */
  const createIndividualChatMutation = useMutation({
    mutationFn: async (recipientInfo) => {
      const response = await axios.post('/api/chats/create', {
        type: 'individual',
        recipientInfo: {
          // No personal information - just anonymous identifiers
          anonymousId: recipientInfo.anonymousId,
        },
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
          forwardSecrecy: true,
        },
        privacy: {
          anonymous: true,
          metadataStripped: true,
          noReadReceipts: recipientInfo.noReadReceipts || false,
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (newChat) => {
      // Add to chats list
      setChats(prev => [newChat, ...prev]);

      // Set as active chat
      setActiveChat(newChat);

      // Invalidate queries
      queryClient.invalidateQueries(['chats', sessionId]);

      console.log('💬 Individual chat created:', newChat.id);
    },
    onError: (error) => {
      console.error('Failed to create individual chat:', error);
    }
  });

  /**
   * Create new group chat
   */
  const createGroupChatMutation = useMutation({
    mutationFn: async (groupData) => {
      const response = await axios.post('/api/chats/create', {
        type: 'group',
        name: groupData.name,
        description: groupData.description,
        participants: groupData.participants.map(p => ({
          anonymousId: p.anonymousId,
        })),
        settings: {
          maxParticipants: groupData.maxParticipants || 100,
          encryption: {
            enabled: true,
            algorithm: 'aes-256-gcm',
            forwardSecrecy: true,
          },
          privacy: {
            anonymous: true,
            metadataStripped: true,
            adminOnly: groupData.adminOnly || false,
          }
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (newChat) => {
      // Add to chats list
      setChats(prev => [newChat, ...prev]);

      // Set as active chat
      setActiveChat(newChat);

      // Invalidate queries
      queryClient.invalidateQueries(['chats', sessionId]);

      console.log('👥 Group chat created:', newChat.id);
    },
    onError: (error) => {
      console.error('Failed to create group chat:', error);
    }
  });

  /**
   * Create anonymous channel
   */
  const createChannelMutation = useMutation({
    mutationFn: async (channelData) => {
      const response = await axios.post('/api/chats/create', {
        type: 'channel',
        name: channelData.name,
        description: channelData.description,
        isPublic: channelData.isPublic || false,
        settings: {
          encryption: {
            enabled: true,
            algorithm: 'aes-256-gcm',
            forwardSecrecy: true,
          },
          privacy: {
            anonymous: true,
            metadataStripped: true,
            maxParticipants: channelData.maxParticipants || 10000,
          }
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (newChat) => {
      // Add to chats list
      setChats(prev => [newChat, ...prev]);

      // Set as active chat
      setActiveChat(newChat);

      // Invalidate queries
      queryClient.invalidateQueries(['chats', sessionId]);

      console.log('📢 Channel created:', newChat.id);
    },
    onError: (error) => {
      console.error('Failed to create channel:', error);
    }
  });

  /**
   * Join existing chat/channel
   */
  const joinChatMutation = useMutation({
    mutationFn: async (chatId) => {
      const response = await axios.post(`/api/chats/${chatId}/join`, {}, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (chatData, chatId) => {
      // Update chat in list
      setChats(prev => prev.map(chat =>
        chat.id === chatId
          ? { ...chat, isMember: true, participantCount: chat.participantCount + 1 }
          : chat
      ));

      // Set as active chat
      setActiveChat({ ...chatData, id: chatId });

      console.log('✅ Joined chat:', chatId);
    },
    onError: (error) => {
      console.error('Failed to join chat:', error);
    }
  });

  /**
   * Leave chat
   */
  const leaveChatMutation = useMutation({
    mutationFn: async (chatId) => {
      const response = await axios.post(`/api/chats/${chatId}/leave`, {}, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, chatId) => {
      // Remove from chats list or update status
      setChats(prev => prev.map(chat =>
        chat.id === chatId
          ? { ...chat, isMember: false, participantCount: Math.max(0, chat.participantCount - 1) }
          : chat
      ));

      // Clear active chat if it's the one we're leaving
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }

      console.log('👋 Left chat:', chatId);
    },
    onError: (error) => {
      console.error('Failed to leave chat:', error);
    }
  });

  /**
   * Update chat settings
   */
  const updateChatSettingsMutation = useMutation({
    mutationFn: async ({ chatId, settings }) => {
      const response = await axios.put(`/api/chats/${chatId}/settings`, settings, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (updatedChat, { chatId }) => {
      // Update chat in list
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, ...updatedChat } : chat
      ));

      // Update active chat if it's the one being updated
      if (activeChat?.id === chatId) {
        setActiveChat(prev => ({ ...prev, ...updatedChat }));
      }

      console.log('⚙️ Chat settings updated:', chatId);
    },
    onError: (error) => {
      console.error('Failed to update chat settings:', error);
    }
  });

  /**
   * Get chat by ID
   */
  const getChatById = useCallback((chatId) => {
    return chats.find(chat => chat.id === chatId);
  }, [chats]);

  /**
   * Set active chat
   */
  const selectChat = useCallback((chat) => {
    setActiveChat(chat);
    console.log('🎯 Active chat set:', chat.id);
  }, []);

  /**
   * Search chats
   */
  const searchChats = useCallback((query) => {
    if (!query.trim()) return chats;

    return chats.filter(chat =>
      chat.name.toLowerCase().includes(query.toLowerCase()) ||
      chat.description?.toLowerCase().includes(query.toLowerCase())
    );
  }, [chats]);

  /**
   * Get chats by type
   */
  const getChatsByType = useCallback((type) => {
    return chats.filter(chat => chat.type === type);
  }, [chats]);

  /**
   * Update local chat data
   */
  const updateLocalChat = useCallback((chatId, updates) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, ...updates } : chat
    ));

    if (activeChat?.id === chatId) {
      setActiveChat(prev => ({ ...prev, ...updates }));
    }
  }, [activeChat]);

  // Update chats when data changes
  useEffect(() => {
    if (chatsData) {
      setChats(chatsData);
    }
  }, [chatsData]);

  return {
    // State
    chats,
    activeChat,
    chatsLoading,
    chatsError,

    // Chat management
    getChatById,
    selectChat,
    searchChats,
    getChatsByType,
    updateLocalChat,

    // Chat creation
    createIndividualChat: createIndividualChatMutation.mutate,
    createGroupChat: createGroupChatMutation.mutate,
    createChannel: createChannelMutation.mutate,
    isCreatingChat: createIndividualChatMutation.isPending ||
                   createGroupChatMutation.isPending ||
                   createChannelMutation.isPending,

    // Chat participation
    joinChat: joinChatMutation.mutate,
    leaveChat: leaveChatMutation.mutate,
    isJoiningChat: joinChatMutation.isPending,
    isLeavingChat: leaveChatMutation.isPending,

    // Chat settings
    updateChatSettings: updateChatSettingsMutation.mutate,
    isUpdatingSettings: updateChatSettingsMutation.isPending,

    // Utilities
    individualChats: getChatsByType('individual'),
    groupChats: getChatsByType('group'),
    channels: getChatsByType('channel'),
  };
};