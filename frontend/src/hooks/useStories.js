/**
 * Stories Hook
 * Anonymous status/stories with privacy protection
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useStories = () => {
  const { sessionId } = useAuth();
  const [activeStory, setActiveStory] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const queryClient = useQueryClient();

  /**
   * Get stories feed
   */
  const {
    data: storiesFeed,
    isLoading: storiesLoading,
    error: storiesError
  } = useQuery({
    queryKey: ['stories', sessionId],
    queryFn: async () => {
      const response = await axios.get('/api/stories/feed', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    enabled: !!sessionId,
    refetchInterval: 60000, // Refetch every minute
  });

  /**
   * Create new story
   */
  const createStoryMutation = useMutation({
    mutationFn: async (storyData) => {
      // Validate story data
      if (!storyData.content && !storyData.media) {
        throw new Error('Story must contain content or media');
      }

      const response = await axios.post('/api/stories/create', {
        content: storyData.content,
        media: storyData.media, // Base64 encoded media
        mediaType: storyData.mediaType,
        duration: storyData.duration || 24, // Hours until expiration
        visibility: storyData.visibility || 'friends', // friends, public, private
        allowReactions: storyData.allowReactions !== false,
        allowReplies: storyData.allowReplies !== false,
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
        },
        privacy: {
          anonymous: true,
          metadataStripped: true,
          noViewTracking: true,
        }
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (newStory) => {
      // Add to stories feed
      queryClient.setQueryData(['stories', sessionId], (old = []) => [
        newStory,
        ...old
      ]);

      console.log('📱 Story created:', newStory.id);
    },
    onError: (error) => {
      console.error('Story creation failed:', error);
    }
  });

  /**
   * Delete story
   */
  const deleteStoryMutation = useMutation({
    mutationFn: async (storyId) => {
      const response = await axios.delete(`/api/stories/${storyId}`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, storyId) => {
      // Remove from stories feed
      queryClient.setQueryData(['stories', sessionId], (old = []) =>
        old.filter(story => story.id !== storyId)
      );

      console.log('🗑️ Story deleted:', storyId);
    },
    onError: (error) => {
      console.error('Story deletion failed:', error);
    }
  });

  /**
   * Add reaction to story
   */
  const addReactionMutation = useMutation({
    mutationFn: async ({ storyId, reactionType }) => {
      const response = await axios.post(`/api/stories/${storyId}/reactions`, {
        reactionType,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { storyId }) => {
      // Update story in feed
      queryClient.setQueryData(['stories', sessionId], (old = []) =>
        old.map(story =>
          story.id === storyId
            ? { ...story, reactions: data.reactions }
            : story
        )
      );

      console.log('👍 Reaction added to story');
    },
    onError: (error) => {
      console.error('Reaction failed:', error);
    }
  });

  /**
   * Add reply to story
   */
  const addReplyMutation = useMutation({
    mutationFn: async ({ storyId, content, isAnonymous = true }) => {
      const response = await axios.post(`/api/stories/${storyId}/replies`, {
        content,
        isAnonymous,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { storyId }) => {
      // Update story in feed
      queryClient.setQueryData(['stories', sessionId], (old = []) =>
        old.map(story =>
          story.id === storyId
            ? { ...story, replies: [...(story.replies || []), data.reply] }
            : story
        )
      );

      console.log('💬 Reply added to story');
    },
    onError: (error) => {
      console.error('Reply failed:', error);
    }
  });

  /**
   * View story (mark as viewed)
   */
  const viewStoryMutation = useMutation({
    mutationFn: async (storyId) => {
      const response = await axios.post(`/api/stories/${storyId}/view`, {}, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, storyId) => {
      // Update story view status (privacy-preserving)
      queryClient.setQueryData(['stories', sessionId], (old = []) =>
        old.map(story =>
          story.id === storyId
            ? { ...story, viewed: true, viewedAt: Date.now() }
            : story
        )
      );

      console.log('👁️ Story viewed');
    },
    onError: (error) => {
      console.error('Story view failed:', error);
    }
  });

  /**
   * Get story by ID
   */
  const getStoryById = useCallback((storyId) => {
    return storiesFeed?.find(story => story.id === storyId) || null;
  }, [storiesFeed]);

  /**
   * Set active story for viewing
   */
  const setActiveStoryById = useCallback((storyId) => {
    const story = getStoryById(storyId);
    if (story) {
      setActiveStory(story);

      // Mark as viewed
      if (!story.viewed) {
        viewStoryMutation.mutate(storyId);
      }

      // Start progress tracking
      startStoryProgress(story);
    }
  }, [getStoryById, viewStoryMutation]);

  /**
   * Start story progress tracking
   */
  const startStoryProgress = useCallback((story) => {
    setStoryProgress(0);

    const duration = (story.duration || 24) * 60 * 60 * 1000; // Convert hours to ms
    const interval = 100; // Update every 100ms

    const progressInterval = setInterval(() => {
      setStoryProgress(prev => {
        const newProgress = prev + (interval / duration) * 100;

        if (newProgress >= 100) {
          clearInterval(progressInterval);

          // Auto-advance to next story or close
          setTimeout(() => {
            setActiveStory(null);
          }, 500);

          return 100;
        }

        return newProgress;
      });
    }, interval);

    // Store interval for cleanup
    startStoryProgress.interval = progressInterval;
  }, []);

  /**
   * Stop story progress tracking
   */
  const stopStoryProgress = useCallback(() => {
    if (startStoryProgress.interval) {
      clearInterval(startStoryProgress.interval);
      startStoryProgress.interval = null;
    }
    setStoryProgress(0);
  }, []);

  /**
   * Close active story
   */
  const closeActiveStory = useCallback(() => {
    setActiveStory(null);
    stopStoryProgress();
  }, [stopStoryProgress]);

  /**
   * Create story from media file
   */
  const createStoryFromFile = useCallback(async (file, options = {}) => {
    try {
      // Validate file
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File size too large (max 50MB)');
      }

      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Determine media type
      const mediaType = file.type.startsWith('image/') ? 'image' :
                       file.type.startsWith('video/') ? 'video' : 'unknown';

      if (mediaType === 'unknown') {
        throw new Error('Unsupported file type');
      }

      // Create story
      await createStoryMutation.mutateAsync({
        media: base64,
        mediaType,
        content: options.caption || '',
        duration: options.duration || 24,
        visibility: options.visibility || 'friends',
      });

    } catch (error) {
      console.error('Story creation from file failed:', error);
      throw error;
    }
  }, [createStoryMutation]);

  /**
   * Convert file to base64
   */
  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  });

  /**
   * Get user's own stories
   */
  const getMyStories = useCallback(async () => {
    try {
      const response = await axios.get('/api/stories/my', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get my stories:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Get stories statistics (privacy-preserving)
   */
  const getStoriesStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/stories/stats', {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get stories stats:', error);
      return null;
    }
  }, [sessionId]);

  /**
   * Search stories
   */
  const searchStories = useCallback((query) => {
    if (!storiesFeed || !query.trim()) return storiesFeed;

    return storiesFeed.filter(story =>
      story.content?.toLowerCase().includes(query.toLowerCase())
    );
  }, [storiesFeed]);

  /**
   * Filter stories by type
   */
  const filterStoriesByType = useCallback((type) => {
    if (!storiesFeed) return [];

    return storiesFeed.filter(story => story.mediaType === type);
  }, [storiesFeed]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopStoryProgress();
    };
  }, [stopStoryProgress]);

  return {
    // State
    storiesFeed: storiesFeed || [],
    activeStory,
    storyProgress,
    storiesLoading,
    storiesError,

    // Story management
    createStory: createStoryMutation.mutate,
    deleteStory: deleteStoryMutation.mutate,
    setActiveStoryById,
    closeActiveStory,

    // Story interactions
    addReaction: addReactionMutation.mutate,
    addReply: addReplyMutation.mutate,

    // Story creation from media
    createStoryFromFile,

    // Utilities
    getStoryById,
    getMyStories,
    getStoriesStats,
    searchStories,
    filterStoriesByType,

    // Status
    isCreating: createStoryMutation.isPending,
    isDeleting: deleteStoryMutation.isPending,
    isAddingReaction: addReactionMutation.isPending,
    isAddingReply: addReplyMutation.isPending,
  };
};