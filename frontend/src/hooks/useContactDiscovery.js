/**
 * Contact Discovery Hook
 * Anonymous contact discovery and suggestions
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useContactDiscovery = () => {
  const { sessionId } = useAuth();
  const [discoverySettings, setDiscoverySettings] = useState({
    allowDiscovery: false,
    suggestBasedOnActivity: true,
    mutualConnectionsOnly: true,
  });

  /**
   * Get contact suggestions
   */
  const {
    data: suggestions,
    isLoading: suggestionsLoading,
    refetch: refetchSuggestions
  } = useQuery({
    queryKey: ['contactSuggestions', sessionId],
    queryFn: async () => {
      const response = await axios.get('/api/contacts/suggestions', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    enabled: discoverySettings.allowDiscovery,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  /**
   * Search for contacts
   */
  const searchContacts = useCallback(async (query) => {
    try {
      const response = await axios.get('/api/contacts/search', {
        params: { q: query },
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Contact search failed:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Send contact request
   */
  const sendContactRequest = useCallback(async (contactId) => {
    try {
      const response = await axios.post(`/api/contacts/${contactId}/request`, {}, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Contact request failed:', error);
      throw error;
    }
  }, [sessionId]);

  /**
   * Accept contact request
   */
  const acceptContactRequest = useCallback(async (requestId) => {
    try {
      const response = await axios.post(`/api/contacts/requests/${requestId}/accept`, {}, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Contact request acceptance failed:', error);
      throw error;
    }
  }, [sessionId]);

  /**
   * Update discovery settings
   */
  const updateDiscoverySettings = useCallback(async (settings) => {
    try {
      setDiscoverySettings(prev => ({ ...prev, ...settings }));

      await axios.put('/api/contacts/discovery-settings', settings, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });

      console.log('⚙️ Discovery settings updated');
    } catch (error) {
      console.error('Discovery settings update failed:', error);
    }
  }, [sessionId]);

  return {
    // State
    suggestions: suggestions || [],
    discoverySettings,
    suggestionsLoading,

    // Actions
    searchContacts,
    sendContactRequest,
    acceptContactRequest,
    updateDiscoverySettings,
    refetchSuggestions,
  };
};