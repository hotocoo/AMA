/**
 * Message Routes
 * Handles anonymous message operations
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-memory storage for demo (use Redis in production)
const messages = new Map();
const chats = new Map();

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex');

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, type = 'text', metadata = {} } = req.body;

    if (!chatId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const messageId = generateId();
    const message = {
      id: messageId,
      chatId,
      content,
      type,
      metadata,
      timestamp: Date.now(),
      sessionId: req.sessionId
    };

    // Store message
    if (!messages.has(chatId)) {
      messages.set(chatId, []);
    }
    messages.get(chatId).push(message);

    // Store chat info
    if (!chats.has(chatId)) {
      chats.set(chatId, { id: chatId, created: Date.now() });
    }

    res.json({
      success: true,
      messageId,
      timestamp: message.timestamp
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!messages.has(chatId)) {
      return res.json({ messages: [], total: 0 });
    }

    const chatMessages = messages.get(chatId);
    const total = chatMessages.length;
    const paginatedMessages = chatMessages
      .slice(-parseInt(limit) - parseInt(offset), -parseInt(offset) || undefined)
      .reverse();

    res.json({
      messages: paginatedMessages,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Get single message
const getMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;

    if (!messages.has(chatId)) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const message = messages.get(chatId).find(m => m.id === messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;

    if (!messages.has(chatId)) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatMessages = messages.get(chatId);
    const index = chatMessages.findIndex(m => m.id === messageId);

    if (index === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    chatMessages.splice(index, 1);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Get chat info
const getChatInfo = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chats.has(chatId)) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ chat: chats.get(chatId) });
  } catch (error) {
    console.error('Get chat info error:', error);
    res.status(500).json({ error: 'Failed to get chat info' });
  }
};

// Get user chats
const getUserChats = async (req, res) => {
  try {
    const userChats = Array.from(chats.values()).map(chat => ({
      id: chat.id,
      created: chat.created,
      messageCount: messages.has(chat.id) ? messages.get(chat.id).length : 0
    }));

    res.json({ chats: userChats });
  } catch (error) {
    console.error('Get user chats error:', error);
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