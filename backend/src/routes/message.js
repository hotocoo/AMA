/**
 * Message Routes
 * Handles anonymous message operations with database integration
 */

const crypto = require('crypto');
const { logMessageEvent, logError } = require('../middleware/logging');

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex');

/**
 * Helper to get database services
 */
const getDb = (req, res) => {
  const db = req.app.get('database');
  if (!db) {
    res.status(500).json({ error: 'Database services not available' });
    return null;
  }
  return db;
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId, encryptedMessage, messageType = 'text', metadata = {} } = req.body;

    if (!chatId || !encryptedMessage) {
      return res.status(400).json({ error: 'Missing required fields: chatId and encryptedMessage' });
    }

    const db = getDb(req, res);
    if (!db) return;

    const messageId = generateId();

    // Store encrypted message in database
    await db.messageStore.storeMessage(messageId, encryptedMessage, chatId, metadata);

    // Update session message count
    if (req.anonymousSession?.id && db.sessionManager) {
      await db.sessionManager.incrementMessageCount(req.anonymousSession.id);
    }

    // Update chat message count
    if (db.chatStore) {
      await db.chatStore.incrementMessageCount(chatId).catch(() => {});
    }

    logMessageEvent('message_sent', {
      id: messageId.substring(0, 8) + '...',
      chatId: chatId.substring(0, 8) + '...',
      size: Buffer.byteLength(encryptedMessage, 'utf8'),
      type: messageType
    });

    res.json({ success: true, messageId, timestamp: Date.now() });
  } catch (error) {
    logError(error, { context: 'message_send' });
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const db = getDb(req, res);
    if (!db) return;

    const parsedLimit = Math.min(parseInt(limit) || 50, 200);
    const parsedOffset = parseInt(offset) || 0;

    const messages = await db.messageStore.getChatMessages(chatId, parsedLimit, parsedOffset);
    const total = await db.messageStore.getChatMessageCount(chatId);

    res.json({
      messages,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < total
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

    const db = getDb(req, res);
    if (!db) return;

    const message = await db.messageStore.getMessage(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    logError(error, { context: 'get_message' });
    res.status(500).json({ error: 'Failed to get message' });
  }
};

// Delete message — chatId comes from route params
const deleteMessage = async (req, res) => {
  try {
    const { messageId, chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const db = getDb(req, res);
    if (!db) return;

    await db.messageStore.deleteMessage(messageId, chatId);

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

    const db = getDb(req, res);
    if (!db) return;

    let chat = db.chatStore ? await db.chatStore.getChat(chatId) : null;

    if (!chat) {
      const messageCount = await db.messageStore.getChatMessageCount(chatId);
      chat = { id: chatId, messageCount };
    }

    res.json({ chat });
  } catch (error) {
    logError(error, { context: 'get_chat_info' });
    res.status(500).json({ error: 'Failed to get chat info' });
  }
};

// Create chat
const createChat = async (req, res) => {
  try {
    const { participants = [], chatType = 'private', name } = req.body;

    if (!participants || participants.length === 0) {
      return res.status(400).json({ error: 'Participants required' });
    }

    const db = getDb(req, res);
    if (!db) return;

    const chatId = generateId();

    let chat = { id: chatId, type: chatType, participants, created: Date.now() };
    if (db.chatStore) {
      chat = await db.chatStore.createChat(chatId, {
        type: chatType,
        name: name || null,
        participants,
      });
    }

    res.json({
      chatId,
      chatType,
      name: chat.name || null,
      participants,
      created: chat.created,
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
    // Clients should track their own chat IDs client-side.
    res.json({ chats: [] });
  } catch (error) {
    logError(error, { context: 'get_user_chats' });
    res.status(500).json({ error: 'Failed to get chats' });
  }
};

// Delete chat and all its messages
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const db = getDb(req, res);
    if (!db) return;

    await db.messageStore.deleteChatMessages(chatId);

    if (db.chatStore) {
      await db.chatStore.deleteChat(chatId);
    }

    res.json({ success: true });
  } catch (error) {
    logError(error, { context: 'delete_chat' });
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};

// Generate invite code for a chat
const generateInviteCode = async (req, res) => {
  try {
    const { chatId } = req.params;

    const db = getDb(req, res);
    if (!db) return;

    if (!db.chatStore) {
      return res.status(500).json({ error: 'Chat store not available' });
    }

    const chat = await db.chatStore.getChat(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const inviteCode = await db.chatStore.generateInviteCode(chatId);

    res.json({ inviteCode, chatId, expiresIn: 7 * 24 * 60 * 60 });
  } catch (error) {
    logError(error, { context: 'generate_invite_code' });
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
};

// Join chat via invite code
const joinChatByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const sessionId = req.anonymousSession?.id;

    const db = getDb(req, res);
    if (!db) return;

    if (!db.chatStore) {
      return res.status(500).json({ error: 'Chat store not available' });
    }

    const result = await db.chatStore.getChatByInviteCode(inviteCode);
    if (!result) {
      return res.status(404).json({ error: 'Invalid or expired invite code' });
    }

    const { chatId, chat } = result;

    if (sessionId) {
      await db.chatStore.addParticipant(chatId, sessionId);
    }

    res.json({ chatId, chat });
  } catch (error) {
    logError(error, { context: 'join_chat_by_invite' });
    res.status(500).json({ error: 'Failed to join chat' });
  }
};

// Search messages in a chat by time range
const searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { from, to, limit = 50 } = req.query;

    const db = getDb(req, res);
    if (!db) return;

    const fromTs = from ? parseInt(from) : 0;
    const toTs = to ? parseInt(to) : Date.now();
    const parsedLimit = Math.min(parseInt(limit) || 50, 200);

    const messages = await db.messageStore.getChatMessagesByTimeRange(
      chatId, fromTs, toTs, parsedLimit
    );

    res.json({ messages, total: messages.length });
  } catch (error) {
    logError(error, { context: 'search_messages' });
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

// Set disappearing messages TTL for a chat
const setDisappearingMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { ttlSeconds } = req.body;

    if (ttlSeconds === undefined || ttlSeconds < 0) {
      return res.status(400).json({ error: 'Valid ttlSeconds required (0 to disable)' });
    }

    const db = getDb(req, res);
    if (!db) return;

    if (!db.chatStore) {
      return res.status(500).json({ error: 'Chat store not available' });
    }

    const ttl = ttlSeconds === 0 ? null : ttlSeconds;
    await db.chatStore.updateChat(chatId, { disappearingMessageTTL: ttl });

    res.json({ success: true, chatId, disappearingMessageTTL: ttl });
  } catch (error) {
    logError(error, { context: 'set_disappearing_messages' });
    res.status(500).json({ error: 'Failed to set disappearing messages' });
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
  deleteChat,
  generateInviteCode,
  joinChatByInvite,
  searchMessages,
  setDisappearingMessages,
};
