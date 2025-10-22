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

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId, encryptedMessage, messageType = 'text', metadata = {} } = req.body;

    if (!chatId || !encryptedMessage) {
      return res.status(400).json({ error: 'Missing required fields: chatId and encryptedMessage' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const messageId = generateId();

    // Store encrypted message in database
    await databaseServices.messageStore.storeMessage(messageId, encryptedMessage, chatId, metadata);

    // Update session message count
    if (req.sessionId && databaseServices.sessionManager) {
      await databaseServices.sessionManager.incrementMessageCount(req.sessionId);
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
    const { limit = 50, offset = 0 } = req.query;

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const messages = await databaseServices.messageStore.getChatMessages(chatId, parseInt(limit), parseInt(offset));

    res.json({
      messages,
      total: messages.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
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
    const { chatId } = req.query; // Assuming chatId is passed as query param

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

    // For now, return basic chat info; in a full implementation, track chat metadata
    res.json({
      chat: {
        id: chatId,
        created: Date.now(), // Placeholder; ideally from database
        messageCount: 0 // Would need to query database
      }
    });
  } catch (error) {
    logError(error, { context: 'get_chat_info' });
    res.status(500).json({ error: 'Failed to get chat info' });
  }
};

// Get user chats
const getUserChats = async (req, res) => {
  try {
    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.messageStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    // In a full implementation, list all unique chatIds from messageStore
    // For now, return empty array as placeholder
    const chats = [];

    res.json({ chats });
  } catch (error) {
    logError(error, { context: 'get_user_chats' });
    res.status(500).json({ error: 'Failed to get chats' });
  }
};

module.exports = {
  sendMessage,
  getChatMessages,
  getMessage,
  deleteMessage,
  getChatInfo,
  getUserChats
};