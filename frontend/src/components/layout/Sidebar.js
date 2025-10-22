/**
 * Sidebar Component
 * WhatsApp-style chat list with privacy features
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiPlus,
  FiSettings,
  FiUsers,
  FiMessageCircle,
  FiArchive,
  FiStar,
  FiTrash2,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useWebSocket } from '../../hooks/useWebSocket';

const Sidebar = ({ isOpen, onClose }) => {
  const { messages, joinChat, leaveChat } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [chats, setChats] = useState([]);

  // Mock chat data (in production, this would come from API)
  const mockChats = [
    {
      id: 'chat_001',
      type: 'individual',
      name: 'Anonymous User',
      lastMessage: 'Hey, how are you?',
      lastMessageTime: Date.now() - 300000, // 5 minutes ago
      unreadCount: 2,
      encrypted: true,
      anonymous: true,
    },
    {
      id: 'chat_002',
      type: 'group',
      name: 'Privacy Enthusiasts',
      lastMessage: 'Check out this new encryption method!',
      lastMessageTime: Date.now() - 3600000, // 1 hour ago
      unreadCount: 0,
      encrypted: true,
      anonymous: true,
      participantCount: 8,
    },
    {
      id: 'chat_003',
      type: 'individual',
      name: 'Security Expert',
      lastMessage: 'The new protocol looks solid',
      lastMessageTime: Date.now() - 7200000, // 2 hours ago
      unreadCount: 1,
      encrypted: true,
      anonymous: true,
    },
  ];

  useEffect(() => {
    setChats(mockChats);
  }, []);

  /**
   * Filter chats based on search query
   */
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Format time for display
   */
  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  /**
   * Handle chat selection
   */
  const handleChatSelect = (chatId) => {
    joinChat(chatId);
    // In a real app, this would navigate to the chat
  };

  const sidebarVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    },
    open: {
      x: '0%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    }
  };

  const overlayVariants = {
    closed: { opacity: 0, display: 'none' },
    open: { opacity: 1, display: 'block' }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            className="sidebar-overlay"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className={`sidebar ${isOpen ? 'open' : ''}`}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <FiMessageCircle size={24} />
            <h2>Chats</h2>
          </div>

          <div className="sidebar-actions">
            <button className="icon-button" title="New Chat">
              <FiPlus size={20} />
            </button>
            <button className="icon-button" title="Settings">
              <FiSettings size={20} />
            </button>
            <button className="icon-button mobile-only" onClick={onClose}>
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="sidebar-search">
          <div className="search-input-container">
            <FiSearch size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs">
          <button
            className={`tab-button ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <FiMessageCircle size={16} />
            <span>Chats</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            <FiUsers size={16} />
            <span>Groups</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            <FiArchive size={16} />
            <span>Archived</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="sidebar-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="chat-list"
            >
              {filteredChats.map((chat) => (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`chat-item ${chat.unreadCount > 0 ? 'unread' : ''}`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  {/* Avatar */}
                  <div className="chat-avatar">
                    {chat.type === 'group' ? (
                      <FiUsers size={20} />
                    ) : (
                      <FiMessageCircle size={20} />
                    )}

                    {/* Online indicator */}
                    <div className="online-indicator" />
                  </div>

                  {/* Chat Info */}
                  <div className="chat-info">
                    <div className="chat-header">
                      <span className="chat-name">{chat.name}</span>
                      <span className="chat-time">
                        {formatTime(chat.lastMessageTime)}
                      </span>
                    </div>

                    <div className="chat-preview">
                      <span className="last-message">
                        {chat.lastMessage.length > 50
                          ? `${chat.lastMessage.substring(0, 50)}...`
                          : chat.lastMessage
                        }
                      </span>

                      {/* Security indicators */}
                      <div className="chat-indicators">
                        {chat.encrypted && (
                          <span className="security-indicator encrypted" title="Encrypted">
                            🔒
                          </span>
                        )}
                        {chat.anonymous && (
                          <span className="security-indicator anonymous" title="Anonymous">
                            👤
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread badge */}
                    {chat.unreadCount > 0 && (
                      <div className="unread-badge">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {filteredChats.length === 0 && (
                <div className="empty-state">
                  <FiMessageCircle size={48} />
                  <h3>No chats found</h3>
                  <p>
                    {searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Start a new conversation to get started'
                    }
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="security-status">
            <div className="status-indicator connected">
              <div className="status-dot" />
              <span>Secure Connection</span>
            </div>
            <div className="encryption-info">
              <FiMessageCircle size={14} />
              <span>E2E Encrypted</span>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;