/**
 * Message Routes
 * Handles anonymous message operations with database integration
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { logMessageEvent, logError } = require('../middleware/logging');

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex');

// Maximum allowed encrypted message size (base64-encoded ciphertext)
const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId, encryptedMessage, messageType = 'text', metadata = {} } = req.body;

    if (!chatId || !encryptedMessage) {
      return res.status(400).json({ error: 'Missing required fields: chatId and encryptedMessage' });
    }

    if (typeof chatId !== 'string' || chatId.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(chatId)) {
      return res.status(400).json({ error: 'Invalid chatId format' });
    }

    if (typeof encryptedMessage !== 'string' || encryptedMessage.length > MAX_MESSAGE_SIZE) {
      return res.status(400).json({ error: 'Encrypted message exceeds maximum allowed size' });
    }

    const validMessageTypes = ['text', 'image', 'video', 'audio', 'file', 'voice'];
    if (!validMessageTypes.includes(messageType)) {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const messageId = generateId();

    // Store encrypted message in database
    await databaseServices.messageStore.storeMessage(messageId, encryptedMessage, chatId, metadata);

    // Update or create chat metadata
    if (databaseServices.chatStore) {
      const chat = await databaseServices.chatStore.getChat(chatId);
      const messageCount = (chat ? chat.messageCount : 0) + 1;
      await databaseServices.chatStore.updateChat(chatId, { messageCount, lastActivity: Date.now() });
    }

    // Update session message count
    if (req.anonymousSession?.id && databaseServices.sessionManager) {
      await databaseServices.sessionManager.incrementMessageCount(req.anonymousSession.id);
    }

    // Log message event (privacy-preserving)
    logMessageEvent('message_sent', {
      id: messageId.substring(0, 8) + '...',
      chatId: chatId.substring(0, 8) + '...',
      size: Buffer.byteLength(encryptedMessage, 'utf8'),
      type: messageType
    });

    res.json({
      success: true,
      messageId,
      timestamp: Date.now()
    });
  } catch (error) {
    logError(error, { context: 'message_send' });
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    if (!chatId || typeof chatId !== 'string') {
      return res.status(400).json({ error: 'Invalid chatId' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const messages = await databaseServices.messageStore.getChatMessages(chatId, limit, offset);

    res.json({
      messages,
      total: messages.length,
      limit,
      offset
    });
  } catch (error) {
    logError(error, { context: 'get_chat_messages' });
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Get single message
const getMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Invalid messageId' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const message = await databaseServices.messageStore.getMessage(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    logError(error, { context: 'get_message' });
    res.status(500).json({ error: 'Failed to get message' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatId } = req.query;

    if (!messageId || !chatId) {
      return res.status(400).json({ error: 'messageId and chatId are required' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    await databaseServices.messageStore.deleteMessage(messageId, chatId);

    res.json({ success: true });
  } catch (error) {
    logError(error, { context: 'delete_message' });
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Get chat info
const getChatInfo = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId || typeof chatId !== 'string') {
      return res.status(400).json({ error: 'Invalid chatId' });
    }

    const databaseServices = req.app.get('database');
    if (!databaseServices) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    let chatMeta = null;
    if (databaseServices.chatStore) {
      chatMeta = await databaseServices.chatStore.getChat(chatId);
    }

    // Get reaction counts for display
    let reactionData = {};
    if (databaseServices.redis) {
      try {
        const pattern = `reactions:${chatId}:*`;
        const keys = await databaseServices.redis.keys(pattern);
        if (keys.length > 0) {
          const allReactions = await databaseServices.redis.mget(...keys);
          for (const r of allReactions) {
            if (r) {
              const parsed = JSON.parse(r);
              for (const [emoji, count] of Object.entries(parsed)) {
                reactionData[emoji] = (reactionData[emoji] || 0) + count;
              }
            }
          }
        }
      } catch (e) {
        // Non-fatal, ignore
      }
    }

    res.json({
      chat: {
        id: chatId,
        created: chatMeta ? chatMeta.created : null,
        messageCount: chatMeta ? chatMeta.messageCount : 0,
        chatType: chatMeta ? chatMeta.chatType : 'private',
        lastActivity: chatMeta ? chatMeta.lastActivity : null,
        reactions: reactionData,
      }
    });
  } catch (error) {
    logError(error, { context: 'get_chat_info' });
    res.status(500).json({ error: 'Failed to get chat info' });
  }
};

// Create chat
const createChat = async (req, res) => {
  try {
    const { participants = [], chatType = 'private' } = req.body;

    if (!participants || participants.length === 0) {
      return res.status(400).json({ error: 'Participants required' });
    }

    if (!['private', 'group', 'channel'].includes(chatType)) {
      return res.status(400).json({ error: 'Invalid chatType' });
    }

    const databaseServices = req.app.get('database');

    // Generate chat ID
    const chatId = generateId();

    // Persist chat metadata
    if (databaseServices && databaseServices.chatStore) {
      await databaseServices.chatStore.createChat(chatId, {
        chatType,
        participantCount: participants.length,
      });
    }

    logMessageEvent('chat_created', {
      chatId: chatId.substring(0, 8) + '...',
      chatType,
      participantCount: participants.length
    });

    res.json({
      chatId,
      chatType,
      participantCount: participants.length,
      created: Date.now(),
      timestamp: Date.now()
    });
  } catch (error) {
    logError(error, { context: 'create_chat' });
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

// Get user chats
const getUserChats = async (req, res) => {
  try {
    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    let chats = [];
    if (databaseServices.chatStore) {
      chats = await databaseServices.chatStore.listChats();
    }

    res.json({ chats, total: chats.length });
  } catch (error) {
    logError(error, { context: 'get_user_chats' });
    res.status(500).json({ error: 'Failed to get chats' });
  }
};

// Search messages
const searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q: query, limit = 20 } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    // Retrieve all messages for this chat and do client-side search
    // Note: messages are encrypted, so we can only return metadata
    const messages = await databaseServices.messageStore.getChatMessages(chatId, 500, 0);
    const results = messages
      .filter(m => m.id && m.id.includes(query.trim()))
      .slice(0, Math.min(parseInt(limit), 100));

    res.json({ results, total: results.length });
  } catch (error) {
    logError(error, { context: 'search_messages' });
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

module.exports = {
  sendMessage,
  getChatMessages,
  getMessage,
  deleteMessage,
  getChatInfo,
  getUserChats,
  createChat,
  searchMessages,
};
