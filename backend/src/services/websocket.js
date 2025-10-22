/**
 * WebSocket Service
 * Real-time communication with bulletproof security
 */

const { v4: uuidv4 } = require('uuid');
const { logWebSocketEvent, logError, logMessageEvent } = require('../middleware/logging');

/**
 * WebSocket connection manager
 */
class WebSocketManager {
  constructor(io, databaseServices) {
    this.io = io;
    this.db = databaseServices;
    this.connections = new Map(); // In-memory connection tracking
    this.anonymousConnections = new Map(); // Anonymous session connections

    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(socket) {
    try {
      const connectionId = uuidv4();
      const clientInfo = {
        id: connectionId,
        connectedAt: Date.now(),
        socketId: socket.id,
        // No IP address or personal data stored
      };

      // Store connection info
      this.connections.set(socket.id, clientInfo);

      logWebSocketEvent('connection_established', { id: connectionId });

      // Setup socket event handlers
      this.setupSocketHandlers(socket, connectionId);

      // Send welcome message with security info
      socket.emit('connection_established', {
        connectionId,
        timestamp: Date.now(),
        securityLevel: 'maximum',
        encryption: 'enabled'
      });

    } catch (error) {
      logError(error, { context: 'websocket_connection' });
      socket.disconnect();
    }
  }

  /**
   * Setup individual socket event handlers
   */
  setupSocketHandlers(socket, connectionId) {
    // Anonymous session registration
    socket.on('register_session', async (data) => {
      await this.handleSessionRegistration(socket, connectionId, data);
    });

    // Message sending
    socket.on('send_message', async (data) => {
      await this.handleMessage(socket, connectionId, data);
    });

    // Typing indicators
    socket.on('typing_start', (data) => {
      this.handleTypingStart(socket, connectionId, data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(socket, connectionId, data);
    });

    // Message read receipts
    socket.on('message_read', (data) => {
      this.handleMessageRead(socket, connectionId, data);
    });

    // Message reactions
    socket.on('add_reaction', (data) => {
      this.handleAddReaction(socket, connectionId, data);
    });

    socket.on('remove_reaction', (data) => {
      this.handleRemoveReaction(socket, connectionId, data);
    });

    // File sharing
    socket.on('share_file', async (data) => {
      await this.handleFileShare(socket, connectionId, data);
    });

    // WebRTC signaling for calls
    socket.on('webrtc_offer', (data) => {
      this.handleWebRTCOffer(socket, connectionId, data);
    });

    socket.on('webrtc_answer', (data) => {
      this.handleWebRTCAnswer(socket, connectionId, data);
    });

    socket.on('webrtc_ice_candidate', (data) => {
      this.handleWebRTCIceCandidate(socket, connectionId, data);
    });

    // Heartbeat/ping
    socket.on('ping', () => {
      this.handlePing(socket, connectionId);
    });

    // Disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket, connectionId);
    });

    // Error handling
    socket.on('error', (error) => {
      logError(error, { context: 'websocket_error', connectionId });
    });
  }

  /**
   * Handle anonymous session registration
   */
  async handleSessionRegistration(socket, connectionId, data) {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('error', { message: 'Session ID required' });
        return;
      }

      // Register connection in database
      await this.db.webSocketManager.registerConnection(connectionId, sessionId);

      // Track anonymous session connections
      if (!this.anonymousConnections.has(sessionId)) {
        this.anonymousConnections.set(sessionId, new Set());
      }
      this.anonymousConnections.get(sessionId).add(connectionId);

      // Update connection info
      this.connections.get(socket.id).sessionId = sessionId;

      logWebSocketEvent('session_registered', { connectionId, sessionId: sessionId.substring(0, 8) + '...' });

      socket.emit('session_registered', {
        success: true,
        connectionId,
        timestamp: Date.now()
      });

    } catch (error) {
      logError(error, { context: 'session_registration', connectionId });
      socket.emit('error', { message: 'Session registration failed' });
    }
  }

  /**
   * Handle incoming message
   */
  async handleMessage(socket, connectionId, data) {
    try {
      const { chatId, encryptedMessage, messageType = 'text' } = data;

      if (!chatId || !encryptedMessage) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      const connection = this.connections.get(socket.id);
      if (!connection?.sessionId) {
        socket.emit('error', { message: 'Session not registered' });
        return;
      }

      const messageId = uuidv4();

      // Store message in database (encrypted)
      await this.db.messageStore.storeMessage(messageId, encryptedMessage, chatId);

      // Update session message count
      await this.db.sessionManager.incrementMessageCount(connection.sessionId);

      // Log message event (privacy-preserving)
      logMessageEvent('message_sent', {
        id: messageId.substring(0, 8) + '...',
        chatId: chatId.substring(0, 8) + '...',
        size: Buffer.byteLength(encryptedMessage, 'utf8')
      });

      // Broadcast message to chat participants
      socket.to(`chat:${chatId}`).emit('new_message', {
        messageId,
        chatId,
        encryptedMessage,
        messageType,
        timestamp: Date.now(),
        // No sender information for anonymity
      });

      // Confirm message sent
      socket.emit('message_sent', {
        messageId,
        timestamp: Date.now()
      });

    } catch (error) {
      logError(error, { context: 'message_handling', connectionId });
      socket.emit('error', { message: 'Message sending failed' });
    }
  }

  /**
   * Handle typing indicators
   */
  handleTypingStart(socket, connectionId, data) {
    const { chatId } = data;

    if (chatId) {
      socket.to(`chat:${chatId}`).emit('user_typing', {
        chatId,
        timestamp: Date.now(),
        // No user identification for anonymity
      });
    }
  }

  handleTypingStop(socket, connectionId, data) {
    const { chatId } = data;

    if (chatId) {
      socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
        chatId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle message read receipts
   */
  handleMessageRead(socket, connectionId, data) {
    const { messageId, chatId } = data;

    if (messageId && chatId) {
      socket.to(`chat:${chatId}`).emit('message_read_receipt', {
        messageId,
        chatId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle file sharing
   */
  async handleFileShare(socket, connectionId, data) {
    try {
      const { chatId, fileInfo, encryptedFile } = data;

      if (!chatId || !fileInfo || !encryptedFile) {
        socket.emit('error', { message: 'Invalid file data' });
        return;
      }

      const fileId = uuidv4();

      // Store file metadata
      await this.db.fileStore.storeFile(fileId, fileInfo);

      // Broadcast file to chat
      socket.to(`chat:${chatId}`).emit('file_shared', {
        fileId,
        chatId,
        fileInfo: {
          name: fileInfo.originalName,
          size: fileInfo.size,
          type: fileInfo.type,
          // No path or location information
        },
        encryptedFile,
        timestamp: Date.now(),
      });

      socket.emit('file_shared', {
        fileId,
        timestamp: Date.now()
      });

    } catch (error) {
      logError(error, { context: 'file_sharing', connectionId });
      socket.emit('error', { message: 'File sharing failed' });
    }
  }

  /**
   * Handle WebRTC signaling for voice/video calls
   */
  handleWebRTCOffer(socket, connectionId, data) {
    const { chatId, offer } = data;

    if (chatId && offer) {
      socket.to(`chat:${chatId}`).emit('webrtc_offer', {
        chatId,
        offer,
        timestamp: Date.now(),
      });
    }
  }

  handleWebRTCAnswer(socket, connectionId, data) {
    const { chatId, answer } = data;

    if (chatId && answer) {
      socket.to(`chat:${chatId}`).emit('webrtc_answer', {
        chatId,
        answer,
        timestamp: Date.now(),
      });
    }
  }

  handleWebRTCIceCandidate(socket, connectionId, data) {
    const { chatId, candidate } = data;

    if (chatId && candidate) {
      socket.to(`chat:${chatId}`).emit('webrtc_ice_candidate', {
        chatId,
        candidate,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle ping/heartbeat
   */
  handlePing(socket, connectionId) {
    // Update connection ping in database
    this.db.webSocketManager.updateConnectionPing(connectionId);

    socket.emit('pong', {
      timestamp: Date.now(),
      connectionId
    });
  }

  /**
   * Handle disconnection
   */
  async handleDisconnection(socket, connectionId) {
    try {
      // Remove from in-memory tracking
      this.connections.delete(socket.id);

      // Get connection info for cleanup
      const connection = await this.db.webSocketManager.updateConnectionPing(connectionId);

      if (connection?.sessionId) {
        // Remove from anonymous session tracking
        const sessionConnections = this.anonymousConnections.get(connection.sessionId);
        if (sessionConnections) {
          sessionConnections.delete(connectionId);
          if (sessionConnections.size === 0) {
            this.anonymousConnections.delete(connection.sessionId);
          }
        }
      }

      // Clean up database connection
      await this.db.webSocketManager.unregisterConnection(connectionId);

      logWebSocketEvent('connection_closed', { connectionId });

    } catch (error) {
      logError(error, { context: 'websocket_disconnection', connectionId });
    }
  }

  /**
   * Join chat room
   */
  joinChat(socket, chatId) {
    socket.join(`chat:${chatId}`);

    logWebSocketEvent('joined_chat', {
      connectionId: this.connections.get(socket.id)?.id,
      chatId: chatId.substring(0, 8) + '...'
    });
  }

  /**
   * Leave chat room
   */
  leaveChat(socket, chatId) {
    socket.leave(`chat:${chatId}`);

    logWebSocketEvent('left_chat', {
      connectionId: this.connections.get(socket.id)?.id,
      chatId: chatId.substring(0, 8) + '...'
    });
  }

  /**
   * Send message to specific chat
   */
  sendToChat(chatId, event, data) {
    this.io.to(`chat:${chatId}`).emit(event, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Send message to specific user/session
   */
  sendToSession(sessionId, event, data) {
    const sessionConnections = this.anonymousConnections.get(sessionId);

    if (sessionConnections) {
      sessionConnections.forEach(connectionId => {
        const socket = this.getSocketByConnectionId(connectionId);
        if (socket) {
          socket.emit(event, data);
        }
      });
    }
  }

  /**
   * Get socket by connection ID
   */
  getSocketByConnectionId(connectionId) {
    for (const [socketId, connection] of this.connections.entries()) {
      if (connection.id === connectionId) {
        return this.io.sockets.sockets.get(socketId);
      }
    }
    return null;
  }

  /**
   * Start cleanup interval for stale connections
   */
  startCleanupInterval() {
    setInterval(async () => {
      await this.cleanupStaleConnections();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Clean up stale connections
   */
  async cleanupStaleConnections() {
    try {
      const now = Date.now();
      const staleThreshold = 10 * 60 * 1000; // 10 minutes

      // Clean up in-memory connections
      for (const [socketId, connection] of this.connections.entries()) {
        const age = now - connection.connectedAt;

        if (age > staleThreshold) {
          this.connections.delete(socketId);

          // Also clean up database
          await this.db.webSocketManager.unregisterConnection(connection.id);

          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect();
          }

          logWebSocketEvent('stale_connection_cleaned', {
            connectionId: connection.id
          });
        }
      }

    } catch (error) {
      logError(error, { context: 'connection_cleanup' });
    }
  }

  /**
   * Handle add reaction
   */
  handleAddReaction(socket, connectionId, data) {
    const { messageId, chatId, reaction } = data;

    if (messageId && chatId && reaction) {
      socket.to(`chat:${chatId}`).emit('reaction_added', {
        messageId,
        chatId,
        reaction,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle remove reaction
   */
  handleRemoveReaction(socket, connectionId, data) {
    const { messageId, chatId, reaction } = data;

    if (messageId && chatId && reaction) {
      socket.to(`chat:${chatId}`).emit('reaction_removed', {
        messageId,
        chatId,
        reaction,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get connection statistics (privacy-preserving)
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      anonymousSessions: this.anonymousConnections.size,
      timestamp: Date.now()
    };
  }
}

/**
 * Setup WebSocket service
 */
const setupWebSocket = (io, databaseServices) => {
  return new WebSocketManager(io, databaseServices);
};

module.exports = {
  setupWebSocket,
  WebSocketManager,
};