/**
 * Group Chat Management Hook
 * Advanced group chat features with admin controls and anonymity
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useGroupChat = () => {
  const { sessionId } = useAuth();
  const [activeGroup, setActiveGroup] = useState(null);
  const queryClient = useQueryClient();

  /**
   * Create new group
   */
  const createGroupMutation = useMutation({
    mutationFn: async (groupData) => {
      const response = await axios.post('/api/groups/create', {
        name: groupData.name,
        description: groupData.description,
        isPrivate: groupData.isPrivate || false,
        maxMembers: groupData.maxMembers || 100,
        settings: {
          allowMemberInvites: groupData.allowMemberInvites || false,
          requireAdminApproval: groupData.requireAdminApproval || false,
          encryption: {
            enabled: true,
            algorithm: 'aes-256-gcm',
            forwardSecrecy: true,
          },
          privacy: {
            anonymous: true,
            metadataStripped: true,
            hideMemberList: groupData.hideMemberList || false,
          }
        },
        initialMembers: groupData.members || [],
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (newGroup) => {
      setActiveGroup(newGroup);
      console.log('👥 Group created:', newGroup.id);
    },
    onError: (error) => {
      console.error('Group creation failed:', error);
    }
  });

  /**
   * Get group information
   */
  const getGroupInfo = useCallback(async (groupId) => {
    try {
      const response = await axios.get(`/api/groups/${groupId}`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get group info:', error);
      return null;
    }
  }, [sessionId]);

  /**
   * Add member to group
   */
  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberId, role = 'member' }) => {
      const response = await axios.post(`/api/groups/${groupId}/members`, {
        memberId,
        role,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { groupId }) => {
      // Update group in cache
      queryClient.invalidateQueries(['group', groupId]);
      console.log('✅ Member added to group');
    },
    onError: (error) => {
      console.error('Failed to add member:', error);
    }
  });

  /**
   * Remove member from group
   */
  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberId }) => {
      const response = await axios.delete(`/api/groups/${groupId}/members/${memberId}`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { groupId }) => {
      // Update group in cache
      queryClient.invalidateQueries(['group', groupId]);
      console.log('❌ Member removed from group');
    },
    onError: (error) => {
      console.error('Failed to remove member:', error);
    }
  });

  /**
   * Update member role
   */
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ groupId, memberId, newRole }) => {
      const response = await axios.put(`/api/groups/${groupId}/members/${memberId}/role`, {
        role: newRole,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { groupId }) => {
      // Update group in cache
      queryClient.invalidateQueries(['group', groupId]);
      console.log('👑 Member role updated');
    },
    onError: (error) => {
      console.error('Failed to update member role:', error);
    }
  });

  /**
   * Update group settings
   */
  const updateGroupSettingsMutation = useMutation({
    mutationFn: async ({ groupId, settings }) => {
      const response = await axios.put(`/api/groups/${groupId}/settings`, settings, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { groupId }) => {
      // Update group in cache
      queryClient.invalidateQueries(['group', groupId]);
      console.log('⚙️ Group settings updated');
    },
    onError: (error) => {
      console.error('Failed to update group settings:', error);
    }
  });

  /**
   * Leave group
   */
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const response = await axios.post(`/api/groups/${groupId}/leave`, {}, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, groupId) => {
      // Clear active group if it's the one we're leaving
      if (activeGroup?.id === groupId) {
        setActiveGroup(null);
      }

      // Remove from cache
      queryClient.removeQueries(['group', groupId]);
      console.log('👋 Left group');
    },
    onError: (error) => {
      console.error('Failed to leave group:', error);
    }
  });

  /**
   * Delete group (admin only)
   */
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const response = await axios.delete(`/api/groups/${groupId}`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, groupId) => {
      // Clear active group
      if (activeGroup?.id === groupId) {
        setActiveGroup(null);
      }

      // Remove from cache
      queryClient.removeQueries(['group', groupId]);
      console.log('🗑️ Group deleted');
    },
    onError: (error) => {
      console.error('Failed to delete group:', error);
    }
  });

  /**
   * Get group members
   */
  const getGroupMembers = useCallback(async (groupId) => {
    try {
      const response = await axios.get(`/api/groups/${groupId}/members`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get group members:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Search group members
   */
  const searchMembers = useCallback(async (groupId, query) => {
    try {
      const response = await axios.get(`/api/groups/${groupId}/members/search`, {
        params: { q: query },
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search members:', error);
      return [];
    }
  }, [sessionId]);

  /**
   * Ban member from group (admin only)
   */
  const banMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberId, reason }) => {
      const response = await axios.post(`/api/groups/${groupId}/members/${memberId}/ban`, {
        reason,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { groupId }) => {
      // Update group in cache
      queryClient.invalidateQueries(['group', groupId]);
      console.log('🚫 Member banned from group');
    },
    onError: (error) => {
      console.error('Failed to ban member:', error);
    }
  });

  /**
   * Unban member from group (admin only)
   */
  const unbanMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberId }) => {
      const response = await axios.delete(`/api/groups/${groupId}/members/${memberId}/ban`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data, { groupId }) => {
      // Update group in cache
      queryClient.invalidateQueries(['group', groupId]);
      console.log('✅ Member unbanned from group');
    },
    onError: (error) => {
      console.error('Failed to unban member:', error);
    }
  });

  /**
   * Get group statistics (privacy-preserving)
   */
  const getGroupStats = useCallback(async (groupId) => {
    try {
      const response = await axios.get(`/api/groups/${groupId}/stats`, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get group stats:', error);
      return null;
    }
  }, [sessionId]);

  /**
   * Set active group
   */
  const selectGroup = useCallback((group) => {
    setActiveGroup(group);
    console.log('🎯 Active group set:', group.id);
  }, []);

  /**
   * Check if current user is admin of group
   */
  const isGroupAdmin = useCallback((group) => {
    if (!group || !sessionId) return false;

    // Check if current session is in admin list
    return group.admins?.includes(sessionId) || false;
  }, [sessionId]);

  /**
   * Check if current user is moderator of group
   */
  const isGroupModerator = useCallback((group) => {
    if (!group || !sessionId) return false;

    // Check if current session is in moderator list
    return group.moderators?.includes(sessionId) || false;
  }, [sessionId]);

  /**
   * Check if current user can perform admin action
   */
  const canPerformAdminAction = useCallback((group) => {
    return isGroupAdmin(group) || isGroupModerator(group);
  }, [isGroupAdmin, isGroupModerator]);

  return {
    // State
    activeGroup,

    // Group management
    createGroup: createGroupMutation.mutate,
    selectGroup,
    getGroupInfo,

    // Member management
    addMember: addMemberMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    updateMemberRole: updateMemberRoleMutation.mutate,
    banMember: banMemberMutation.mutate,
    unbanMember: unbanMemberMutation.mutate,

    // Group settings
    updateGroupSettings: updateGroupSettingsMutation.mutate,
    leaveGroup: leaveGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,

    // Utilities
    getGroupMembers,
    searchMembers,
    getGroupStats,
    isGroupAdmin,
    isGroupModerator,
    canPerformAdminAction,

    // Status
    isCreating: createGroupMutation.isPending,
    isAddingMember: addMemberMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    isUpdatingRole: updateMemberRoleMutation.isPending,
    isLeaving: leaveGroupMutation.isPending,
    isDeleting: deleteGroupMutation.isPending,
    isBanning: banMemberMutation.isPending,
    isUnbanning: unbanMemberMutation.isPending,
  };
};