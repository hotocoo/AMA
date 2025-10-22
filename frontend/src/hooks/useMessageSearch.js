/**
 * Message Search Hook
 * Advanced search and filtering across all chats
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useMessageSearch = () => {
  const { sessionId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    chatId: null,
    messageType: 'all',
    dateRange: null,
    hasMedia: false,
    fromMe: false,
  });
  const [isSearching, setIsSearching] = useState(false);

  /**
   * Search messages
   */
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['messageSearch', sessionId, searchQuery, searchFilters],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      setIsSearching(true);

      const response = await axios.get('/api/messages/search', {
        params: {
          q: searchQuery,
          chatId: searchFilters.chatId,
          messageType: searchFilters.messageType,
          hasMedia: searchFilters.hasMedia,
          fromMe: searchFilters.fromMe,
          limit: 100,
        },
        headers: {
          'x-anonymous-session': sessionId,
        }
      });

      setIsSearching(false);
      return response.data;
    },
    enabled: false, // Only search when explicitly triggered
    staleTime: 30000, // Cache for 30 seconds
  });

  /**
   * Global message search across all chats
   */
  const searchAllMessages = useCallback(async (query, filters = {}) => {
    setSearchQuery(query);
    setSearchFilters(prev => ({ ...prev, ...filters }));

    // Trigger search
    await refetchSearch();
  }, [refetchSearch]);

  /**
   * Search messages in specific chat
   */
  const searchChatMessages = useCallback(async (chatId, query) => {
    setSearchFilters(prev => ({ ...prev, chatId }));

    const response = await axios.get(`/api/chats/${chatId}/messages/search`, {
      params: { q: query, limit: 50 },
      headers: {
        'x-anonymous-session': sessionId,
      }
    });

    return response.data;
  }, [sessionId]);

  /**
   * Advanced search with filters
   */
  const advancedSearch = useCallback(async (query, options = {}) => {
    const searchParams = {
      q: query,
      messageType: options.messageType || 'all',
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      hasMedia: options.hasMedia,
      fromMe: options.fromMe,
      chatId: options.chatId,
      limit: options.limit || 100,
    };

    const response = await axios.get('/api/messages/search/advanced', {
      params: searchParams,
      headers: {
        'x-anonymous-session': sessionId,
      }
    });

    return response.data;
  }, [sessionId]);

  /**
   * Get search suggestions
   */
  const getSearchSuggestions = useCallback(async (partialQuery) => {
    if (partialQuery.length < 2) return [];

    try {
      const response = await axios.get('/api/messages/search/suggestions', {
        params: { q: partialQuery, limit: 10 },
        headers: {
          'x-anonymous-session': sessionId,
        }
      });

      return response.data;
    } catch (error) {
      console.error('Search suggestions failed:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Filter search results
   */
  const filteredResults = useMemo(() => {
    if (!searchResults) return [];

    let filtered = [...searchResults];

    // Apply local filters
    if (searchFilters.messageType !== 'all') {
      filtered = filtered.filter(msg => msg.messageType === searchFilters.messageType);
    }

    if (searchFilters.hasMedia) {
      filtered = filtered.filter(msg => msg.hasMedia);
    }

    if (searchFilters.fromMe) {
      filtered = filtered.filter(msg => msg.fromMe);
    }

    return filtered;
  }, [searchResults, searchFilters]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchFilters({
      chatId: null,
      messageType: 'all',
      dateRange: null,
      hasMedia: false,
      fromMe: false,
    });
    setIsSearching(false);
  }, []);

  /**
   * Get search statistics
   */
  const getSearchStats = useCallback(() => {
    if (!searchResults) return null;

    const stats = {
      total: searchResults.length,
      filtered: filteredResults.length,
      chats: new Set(searchResults.map(msg => msg.chatId)).size,
      withMedia: searchResults.filter(msg => msg.hasMedia).length,
      messageTypes: {},
    };

    // Count message types
    searchResults.forEach(msg => {
      stats.messageTypes[msg.messageType] = (stats.messageTypes[msg.messageType] || 0) + 1;
    });

    return stats;
  }, [searchResults, filteredResults]);

  return {
    // State
    searchQuery,
    searchFilters,
    searchResults: filteredResults,
    isSearching,
    searchLoading,
    searchError,

    // Actions
    searchAllMessages,
    searchChatMessages,
    advancedSearch,
    getSearchSuggestions,
    clearSearch,
    setSearchFilters,

    // Utilities
    getSearchStats,
  };
};