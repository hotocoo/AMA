/**
 * Encrypted Backup Hook
 * Secure chat backup and restore functionality
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';
import { useCrypto } from './useCrypto';

export const useBackup = () => {
  const { sessionId } = useAuth();
  const { encryptMessage, decryptMessage } = useCrypto();
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);

  /**
   * Create encrypted backup
   */
  const createBackupMutation = useMutation({
    mutationFn: async (options = {}) => {
      const backupData = {
        chats: options.includeChats !== false,
        messages: options.includeMessages !== false,
        files: options.includeFiles !== false,
        settings: options.includeSettings !== false,
        timestamp: Date.now(),
        version: '1.0',
      };

      const response = await axios.post('/api/backup/create', backupData, {
        headers: {
          'x-anonymous-session': sessionId,
        },
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setBackupProgress(progress);
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      setBackupProgress(0);
      console.log('💾 Encrypted backup created');
    },
    onError: (error) => {
      setBackupProgress(0);
      console.error('Backup creation failed:', error);
    }
  });

  /**
   * Restore from encrypted backup
   */
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupFile) => {
      const formData = new FormData();
      formData.append('backup', backupFile);

      const response = await axios.post('/api/backup/restore', formData, {
        headers: {
          'x-anonymous-session': sessionId,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setRestoreProgress(progress);
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      setRestoreProgress(0);
      console.log('🔄 Backup restored successfully');
    },
    onError: (error) => {
      setRestoreProgress(0);
      console.error('Backup restore failed:', error);
    }
  });

  /**
   * Create backup
   */
  const createBackup = useCallback(async (options = {}) => {
    try {
      await createBackupMutation.mutateAsync(options);
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }, [createBackupMutation]);

  /**
   * Restore backup
   */
  const restoreBackup = useCallback(async (backupFile) => {
    try {
      await restoreBackupMutation.mutateAsync(backupFile);
    } catch (error) {
      console.error('Backup restore failed:', error);
      throw error;
    }
  }, [restoreBackupMutation]);

  /**
   * Export chat data
   */
  const exportChatData = useCallback(async (chatId, format = 'json') => {
    try {
      const response = await axios.get(`/api/chats/${chatId}/export`, {
        params: { format },
        headers: {
          'x-anonymous-session': sessionId,
        }
      });

      // Download exported data
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${chatId}-export.${format}`;
      a.click();

      URL.revokeObjectURL(url);

      console.log('📤 Chat data exported');

    } catch (error) {
      console.error('Chat export failed:', error);
    }
  }, [sessionId]);

  return {
    // State
    backupProgress,
    restoreProgress,

    // Actions
    createBackup,
    restoreBackup,
    exportChatData,

    // Status
    isCreatingBackup: createBackupMutation.isPending,
    isRestoringBackup: restoreBackupMutation.isPending,
  };
};