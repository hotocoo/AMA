/**
 * API Routes
 * Secure, anonymous API endpoints
 */

const express = require('express');
const router = express.Router();

// Import middleware
const {
  anonymousSessionMiddleware,
  createRateLimit,
  validateInput,
  secureLogger
} = require('../middleware/security');

// Import controllers
const healthController = require('./health');
const sessionController = require('./session');
const messageController = require('./message');
const fileController = require('./file');

/**
 * Setup API routes
 */
const setupRoutes = (app) => {
  // Apply global middleware
  app.use(anonymousSessionMiddleware);
  app.use(validateInput);
  app.use(secureLogger);

  // Health check (no rate limiting)
  app.get('/health', healthController.getHealth);

  // API routes with rate limiting
  app.use('/api', createRateLimit(900000, 1000, 'API rate limit exceeded'));

  // Session management routes
  app.post('/api/session/create', sessionController.createSession);
  app.get('/api/session/:sessionId', sessionController.getSession);
  app.put('/api/session/:sessionId', sessionController.updateSession);
  app.delete('/api/session/:sessionId', sessionController.deleteSession);

  // Message routes
  app.post('/api/messages/send', messageController.sendMessage);
  app.get('/api/messages/:chatId', messageController.getChatMessages);
  app.get('/api/messages/:chatId/:messageId', messageController.getMessage);
  app.delete('/api/messages/:chatId/:messageId', messageController.deleteMessage);

  // File routes
  app.post('/api/files/upload', fileController.uploadFile);
  app.get('/api/files/:fileId', fileController.getFile);
  app.get('/api/files/:fileId/download', fileController.downloadFile);
  app.delete('/api/files/:fileId', fileController.deleteFile);

  // Chat routes
  app.post('/api/chats/create', createRateLimit(3600000, 10, 'Chat creation rate limit exceeded'));
  app.get('/api/chats/:chatId', messageController.getChatInfo);
  app.get('/api/chats', messageController.getUserChats);

  // WebRTC signaling routes (for fallback)
  app.post('/api/webrtc/signal', createRateLimit(60000, 100, 'WebRTC signaling rate limit exceeded'));

  // Statistics (privacy-preserving)
  app.get('/api/stats', createRateLimit(3600000, 10, 'Statistics rate limit exceeded'));

  // Error handling middleware
  app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);

    // Don't expose internal error details
    res.status(500).json({
      error: 'Internal server error',
      timestamp: Date.now()
    });
  });

  // 404 handler for undefined routes
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      timestamp: Date.now()
    });
  });
};

module.exports = {
  setupRoutes,
};