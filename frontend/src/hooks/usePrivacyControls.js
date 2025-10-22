/**
 * Advanced Privacy Controls Hook
 * Last seen control, read receipts toggle, and privacy management
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const usePrivacyControls = () => {
  const { sessionId } = useAuth();
  const [privacySettings, setPrivacySettings] = useState({
    lastSeen: 'nobody',
    readReceipts: false,
    typingIndicators: true,
    profilePhoto: 'nobody',
    status: 'nobody',
    onlineStatus: 'nobody',
    messagePreview: false,
    groups: 'contacts',
    calls: 'nobody',
  });

  /**
   * Update privacy settings
   */
  const updatePrivacySettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await axios.put('/api/privacy/settings', settings, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      setPrivacySettings(prev => ({ ...prev, ...data.settings }));
      console.log('🔒 Privacy settings updated');
    },
    onError: (error) => {
      console.error('Privacy settings update failed:', error);
    }
  });

  /**
   * Set last seen visibility
   */
  const setLastSeenVisibility = useCallback(async (visibility) => {
    const validOptions = ['everybody', 'contacts', 'nobody'];
    if (!validOptions.includes(visibility)) {
      throw new Error('Invalid visibility option');
    }

    await updatePrivacySettingsMutation.mutateAsync({
      lastSeen: visibility,
    });
  }, [updatePrivacySettingsMutation]);

  /**
   * Toggle read receipts
   */
  const toggleReadReceipts = useCallback(async () => {
    await updatePrivacySettingsMutation.mutateAsync({
      readReceipts: !privacySettings.readReceipts,
    });
  }, [privacySettings.readReceipts, updatePrivacySettingsMutation]);

  /**
   * Toggle typing indicators
   */
  const toggleTypingIndicators = useCallback(async () => {
    await updatePrivacySettingsMutation.mutateAsync({
      typingIndicators: !privacySettings.typingIndicators,
    });
  }, [privacySettings.typingIndicators, updatePrivacySettingsMutation]);

  /**
   * Set profile photo visibility
   */
  const setProfilePhotoVisibility = useCallback(async (visibility) => {
    const validOptions = ['everybody', 'contacts', 'nobody'];
    if (!validOptions.includes(visibility)) {
      throw new Error('Invalid visibility option');
    }

    await updatePrivacySettingsMutation.mutateAsync({
      profilePhoto: visibility,
    });
  }, [updatePrivacySettingsMutation]);

  /**
   * Set status visibility
   */
  const setStatusVisibility = useCallback(async (visibility) => {
    const validOptions = ['everybody', 'contacts', 'nobody'];
    if (!validOptions.includes(visibility)) {
      throw new Error('Invalid visibility option');
    }

    await updatePrivacySettingsMutation.mutateAsync({
      status: visibility,
    });
  }, [updatePrivacySettingsMutation]);

  /**
   * Set online status visibility
   */
  const setOnlineStatusVisibility = useCallback(async (visibility) => {
    const validOptions = ['everybody', 'contacts', 'nobody'];
    if (!validOptions.includes(visibility)) {
      throw new Error('Invalid visibility option');
    }

    await updatePrivacySettingsMutation.mutateAsync({
      onlineStatus: visibility,
    });
  }, [updatePrivacySettingsMutation]);

  /**
   * Toggle message preview in notifications
   */
  const toggleMessagePreview = useCallback(async () => {
    await updatePrivacySettingsMutation.mutateAsync({
      messagePreview: !privacySettings.messagePreview,
    });
  }, [privacySettings.messagePreview, updatePrivacySettingsMutation]);

  /**
   * Set group privacy settings
   */
  const setGroupPrivacy = useCallback(async (setting) => {
    const validOptions = ['everybody', 'contacts', 'nobody'];
    if (!validOptions.includes(setting)) {
      throw new Error('Invalid group privacy setting');
    }

    await updatePrivacySettingsMutation.mutateAsync({
      groups: setting,
    });
  }, [updatePrivacySettingsMutation]);

  /**
   * Set call privacy settings
   */
  const setCallPrivacy = useCallback(async (setting) => {
    const validOptions = ['everybody', 'contacts', 'nobody'];
    if (!validOptions.includes(setting)) {
      throw new Error('Invalid call privacy setting');
    }

    await updatePrivacySettingsMutation.mutateAsync({
      calls: setting,
    });
  }, [updatePrivacySettingsMutation]);

  /**
   * Get current privacy settings
   */
  const getPrivacySettings = useCallback(async () => {
    try {
      const response = await axios.get('/api/privacy/settings', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      setPrivacySettings(response.data.settings);
      return response.data.settings;
    } catch (error) {
      console.error('Failed to get privacy settings:', error);
      return privacySettings;
    }
  }, [sessionId, privacySettings]);

  /**
   * Export privacy settings
   */
  const exportPrivacySettings = useCallback(async () => {
    try {
      const response = await axios.get('/api/privacy/export', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });

      // Download as JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'privacy-settings.json';
      a.click();

      URL.revokeObjectURL(url);

      console.log('📤 Privacy settings exported');

    } catch (error) {
      console.error('Privacy settings export failed:', error);
    }
  }, [sessionId]);

  /**
   * Import privacy settings
   */
  const importPrivacySettings = useCallback(async (settingsFile) => {
    try {
      const text = await settingsFile.text();
      const settings = JSON.parse(text);

      await updatePrivacySettingsMutation.mutateAsync(settings);

      console.log('📥 Privacy settings imported');

    } catch (error) {
      console.error('Privacy settings import failed:', error);
      throw error;
    }
  }, [updatePrivacySettingsMutation]);

  return {
    // State
    privacySettings,

    // Actions
    setLastSeenVisibility,
    toggleReadReceipts,
    toggleTypingIndicators,
    setProfilePhotoVisibility,
    setStatusVisibility,
    setOnlineStatusVisibility,
    toggleMessagePreview,
    setGroupPrivacy,
    setCallPrivacy,
    exportPrivacySettings,
    importPrivacySettings,
    getPrivacySettings,

    // Status
    isUpdating: updatePrivacySettingsMutation.isPending,
  };
};