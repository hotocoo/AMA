/**
 * Database Configuration
 * Privacy-focused database setup with Redis for anonymous sessions
 */

const Redis = require('ioredis');

// Redis client for session management and caching
let redisClient = null;

/**
 * Connect to Redis database
 */
const connectDatabase = async () => {
  try {
    console.log('🔗 Connecting to Redis...');

    // Prepare Redis configuration
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      keyPrefix: 'anon_msg:'
    };

    // Add password only if provided
    if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    // Create Redis client
    redisClient = new Redis(redisConfig);

    // Redis event listeners
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      console.log('🚀 Redis ready for operations');
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();

    // Test connection
    await redisClient.ping();

    console.log('🎯 Redis connection test successful');

    return redisClient;

  } catch (error) {
    console.error('💥 Failed to connect to Redis:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

/**
 * Close database connection
 */
const closeDatabase = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('🔌 Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

/**
 * Anonymous session management in Redis
 */
class AnonymousSessionManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.sessionPrefix = 'session:';
    this.defaultTTL = 24 * 60 * 60; // 24 hours
  }

  /**
   * Create anonymous session
   */
  async createSession(sessionData = {}) {
    const sessionId = `anon_${require('crypto').randomBytes(16).toString('hex')}`;
    const sessionKey = `${this.sessionPrefix}${sessionId}`;

    const session = {
      id: sessionId,
      created: Date.now(),
      lastSeen: Date.now(),
      messageCount: 0,
      chatCount: 0,
      ...sessionData
    };

    // Store session with TTL
    await this.redis.setex(sessionKey, this.defaultTTL, JSON.stringify(session));

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);
    return session;
  }

  /**
   * Update session
   */
  async updateSession(sessionId, updates) {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...session,
      ...updates,
      lastSeen: Date.now()
    };

    // Update with new TTL
    await this.redis.setex(sessionKey, this.defaultTTL, JSON.stringify(updatedSession));

    return updatedSession;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    await this.redis.del(sessionKey);
  }

  /**
   * Increment message count for session
   */
  async incrementMessageCount(sessionId) {
    return await this.updateSession(sessionId, {
      messageCount: (await this.getSession(sessionId)).messageCount + 1
    });
  }

  /**
   * Get session statistics (privacy-preserving)
   */
  async getSessionStats() {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redis.keys(pattern);

    const stats = {
      totalSessions: keys.length,
      activeSessions: 0,
      totalMessages: 0,
      timestamp: Date.now()
    };

    // Count active sessions and messages (without accessing personal data)
    for (const key of keys) {
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        stats.activeSessions++;
        stats.totalMessages += session.messageCount || 0;
      }
    }

    return stats;
  }
}

/**
 * Message storage in Redis (temporary, encrypted)
 */
class MessageStore {
  constructor(redisClient) {
    this.redis = redisClient;
    this.messagePrefix = 'msg:';
    this.chatPrefix = 'chat:';
    this.defaultMessageTTL = 7 * 24 * 60 * 60; // 7 days
    this.defaultChatTTL = 30 * 24 * 60 * 60; // 30 days
  }

  /**
   * Store encrypted message temporarily
   */
  async storeMessage(messageId, encryptedMessage, chatId, metadata = {}) {
    const messageKey = `${this.messagePrefix}${messageId}`;
    const chatKey = `${this.chatPrefix}${chatId}`;

    const messageData = {
      id: messageId,
      chatId,
      encrypted: encryptedMessage,
      timestamp: Date.now(),
      size: Buffer.byteLength(encryptedMessage, 'utf8'),
      // No personal metadata stored
    };

    // Store message with TTL
    await this.redis.setex(messageKey, this.defaultMessageTTL, JSON.stringify(messageData));

    // Add message to chat index
    await this.redis.sadd(`${chatKey}:messages`, messageId);
    await this.redis.expire(`${chatKey}:messages`, this.defaultChatTTL);

    return messageData;
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId) {
    const messageKey = `${this.messagePrefix}${messageId}`;
    const messageData = await this.redis.get(messageKey);

    if (!messageData) {
      return null;
    }

    return JSON.parse(messageData);
  }

  /**
   * Get messages for chat (paginated)
   */
  async getChatMessages(chatId, limit = 50, offset = 0) {
    const chatKey = `${this.chatPrefix}${chatId}`;
    const messageIds = await this.redis.smembers(`${chatKey}:messages`);

    if (messageIds.length === 0) {
      return [];
    }

    // Get messages in reverse chronological order
    const messageKeys = messageIds
      .slice(offset, offset + limit)
      .map(id => `${this.messagePrefix}${id}`);

    if (messageKeys.length === 0) {
      return [];
    }

    const messages = await this.redis.mget(...messageKeys);

    return messages
      .filter(msg => msg !== null)
      .map(msg => JSON.parse(msg))
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId, chatId) {
    const messageKey = `${this.messagePrefix}${messageId}`;
    const chatKey = `${this.chatPrefix}${chatId}`;

    await this.redis.del(messageKey);
    await this.redis.srem(`${chatKey}:messages`, messageId);
  }

  /**
   * Clean up expired messages
   */
  async cleanupExpired() {
    // Redis handles TTL automatically, but we can force cleanup if needed
    const pattern = `${this.messagePrefix}*`;
    const keys = await this.redis.keys(pattern);

    let cleanedCount = 0;
    for (const key of keys) {
      const messageData = await this.redis.get(key);
      if (messageData) {
        const message = JSON.parse(messageData);
        const age = Date.now() - message.timestamp;

        // Force delete very old messages (older than 30 days)
        if (age > 30 * 24 * 60 * 60 * 1000) {
          await this.redis.del(key);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }
}

/**
 * File metadata storage (encrypted file info only)
 */
class FileStore {
  constructor(redisClient) {
    this.redis = redisClient;
    this.filePrefix = 'file:';
    this.defaultFileTTL = 30 * 24 * 60 * 60; // 30 days
  }

  /**
   * Store file metadata
   */
  async storeFile(fileId, fileInfo) {
    const fileKey = `${this.filePrefix}${fileId}`;

    const fileData = {
      id: fileId,
      originalName: fileInfo.originalName,
      encryptedName: fileInfo.encryptedName,
      size: fileInfo.size,
      type: fileInfo.type,
      hash: fileInfo.hash,
      uploaded: Date.now(),
      // No location or path information stored for privacy
    };

    await this.redis.setex(fileKey, this.defaultFileTTL, JSON.stringify(fileData));
    return fileData;
  }

  /**
   * Get file metadata
   */
  async getFile(fileId) {
    const fileKey = `${this.filePrefix}${fileId}`;
    const fileData = await this.redis.get(fileKey);

    if (!fileData) {
      return null;
    }

    return JSON.parse(fileData);
  }

  /**
   * Delete file metadata
   */
  async deleteFile(fileId) {
    const fileKey = `${this.filePrefix}${fileId}`;
    await this.redis.del(fileKey);
  }
}

/**
 * WebSocket connection management
 */
class WebSocketManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.connectionPrefix = 'ws_conn:';
    this.defaultConnectionTTL = 60 * 60; // 1 hour
  }

  /**
   * Register WebSocket connection
   */
  async registerConnection(connectionId, sessionId) {
    const connectionKey = `${this.connectionPrefix}${connectionId}`;

    const connectionData = {
      id: connectionId,
      sessionId,
      connected: Date.now(),
      lastPing: Date.now(),
    };

    await this.redis.setex(connectionKey, this.defaultConnectionTTL, JSON.stringify(connectionData));
    return connectionData;
  }

  /**
   * Update connection ping
   */
  async updateConnectionPing(connectionId) {
    const connectionKey = `${this.connectionPrefix}${connectionId}`;
    const connectionData = await this.redis.get(connectionKey);

    if (connectionData) {
      const connection = JSON.parse(connectionData);
      connection.lastPing = Date.now();
      await this.redis.setex(connectionKey, this.defaultConnectionTTL, JSON.stringify(connection));
      return connection;
    }

    return null;
  }

  /**
   * Unregister connection
   */
  async unregisterConnection(connectionId) {
    const connectionKey = `${this.connectionPrefix}${connectionId}`;
    await this.redis.del(connectionKey);
  }

  /**
   * Get active connections for session
   */
  async getSessionConnections(sessionId) {
    const pattern = `${this.connectionPrefix}*`;
    const keys = await this.redis.keys(pattern);

    const connections = [];
    for (const key of keys) {
      const connectionData = await this.redis.get(key);
      if (connectionData) {
        const connection = JSON.parse(connectionData);
        if (connection.sessionId === sessionId) {
          connections.push(connection);
        }
      }
    }

    return connections;
  }
}

/**
 * Initialize database services
 */
const initializeDatabaseServices = (redisClient) => {
  return {
    sessionManager: new AnonymousSessionManager(redisClient),
    messageStore: new MessageStore(redisClient),
    fileStore: new FileStore(redisClient),
    webSocketManager: new WebSocketManager(redisClient),
  };
};

/**
 * Health check for database
 */
const healthCheck = async () => {
  try {
    if (!redisClient) {
      return { status: 'disconnected', timestamp: Date.now() };
    }

    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    const info = await redisClient.info('memory');
    const memory = info.match(/used_memory_human:(.*?)\r\n/);

    return {
      status: 'connected',
      latency: `${latency}ms`,
      memory: memory ? memory[1] : 'unknown',
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: Date.now()
    };
  }
};

module.exports = {
  connectDatabase,
  closeDatabase,
  initializeDatabaseServices,
  healthCheck,
  AnonymousSessionManager,
  MessageStore,
  FileStore,
  WebSocketManager,
};