/**
 * Database Configuration
 * Privacy-focused database setup with Redis for anonymous sessions
 */

const Redis = require('ioredis');
const crypto = require('crypto');

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
      redisClient = null;
      console.log('🔌 Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

/**
 * Scan all keys matching a pattern using SCAN (non-blocking, O(N) spread across calls)
 */
const scanKeys = async (redis, pattern) => {
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
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
    const sessionId = sessionData.id || `anon_${crypto.randomBytes(16).toString('hex')}`;
    const sessionKey = `${this.sessionPrefix}${sessionId}`;

    const session = {
      id: sessionId,
      created: Date.now(),
      lastSeen: Date.now(),
      messageCount: 0,
      chatCount: 0,
      ...sessionData,
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

    return JSON.parse(sessionData);
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
   * Increment message count for session (single read-write)
   */
  async incrementMessageCount(sessionId) {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);
    session.messageCount = (session.messageCount || 0) + 1;
    session.lastSeen = Date.now();

    await this.redis.setex(sessionKey, this.defaultTTL, JSON.stringify(session));
    return session;
  }

  /**
   * Get session statistics (privacy-preserving) — uses SCAN to avoid blocking Redis
   */
  async getSessionStats() {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await scanKeys(this.redis, pattern);

    const stats = {
      totalSessions: keys.length,
      activeSessions: 0,
      totalMessages: 0,
      timestamp: Date.now()
    };

    // Batch-fetch all session data for efficiency
    if (keys.length > 0) {
      const sessionDataList = await this.redis.mget(...keys);
      for (const data of sessionDataList) {
        if (data) {
          const session = JSON.parse(data);
          stats.activeSessions++;
          stats.totalMessages += session.messageCount || 0;
        }
      }
    }

    return stats;
  }
}

/**
 * Message storage in Redis (temporary, encrypted)
 * Uses sorted sets for proper time-ordered pagination.
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
    const chatMessagesKey = `${this.chatPrefix}${chatId}:messages`;
    const timestamp = Date.now();

    const messageData = {
      id: messageId,
      chatId,
      encrypted: encryptedMessage,
      timestamp,
      size: Buffer.byteLength(encryptedMessage, 'utf8'),
      disappearAt: metadata.disappearAt || null,
      // No personal metadata stored
    };

    // Pipeline: store message and add to sorted set atomically
    const pipeline = this.redis.pipeline();
    pipeline.setex(messageKey, this.defaultMessageTTL, JSON.stringify(messageData));
    // Use sorted set with timestamp score for ordered pagination
    pipeline.zadd(chatMessagesKey, timestamp, messageId);
    pipeline.expire(chatMessagesKey, this.defaultChatTTL);
    // Set disappearing message TTL if requested
    if (metadata.disappearAt) {
      const ttlSeconds = Math.max(1, Math.floor((metadata.disappearAt - timestamp) / 1000));
      pipeline.expire(messageKey, ttlSeconds);
    }
    await pipeline.exec();

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
   * Get messages for chat (paginated, newest first)
   * Uses sorted set for proper time-ordered pagination.
   */
  async getChatMessages(chatId, limit = 50, offset = 0) {
    const chatMessagesKey = `${this.chatPrefix}${chatId}:messages`;

    // ZREVRANGE returns members in descending score (newest first)
    const messageIds = await this.redis.zrevrange(
      chatMessagesKey,
      offset,
      offset + limit - 1
    );

    if (messageIds.length === 0) {
      return [];
    }

    const messageKeys = messageIds.map(id => `${this.messagePrefix}${id}`);
    const messages = await this.redis.mget(...messageKeys);

    return messages
      .filter(msg => msg !== null)
      .map(msg => JSON.parse(msg));
  }

  /**
   * Get messages in a time range
   */
  async getChatMessagesByTimeRange(chatId, fromTs, toTs, limit = 100) {
    const chatMessagesKey = `${this.chatPrefix}${chatId}:messages`;

    const messageIds = await this.redis.zrangebyscore(
      chatMessagesKey,
      fromTs,
      toTs,
      'LIMIT',
      0,
      limit
    );

    if (messageIds.length === 0) {
      return [];
    }

    const messageKeys = messageIds.map(id => `${this.messagePrefix}${id}`);
    const messages = await this.redis.mget(...messageKeys);

    return messages
      .filter(msg => msg !== null)
      .map(msg => JSON.parse(msg));
  }

  /**
   * Get total message count for a chat
   */
  async getChatMessageCount(chatId) {
    const chatMessagesKey = `${this.chatPrefix}${chatId}:messages`;
    return await this.redis.zcard(chatMessagesKey);
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId, chatId) {
    const messageKey = `${this.messagePrefix}${messageId}`;
    const chatMessagesKey = `${this.chatPrefix}${chatId}:messages`;

    const pipeline = this.redis.pipeline();
    pipeline.del(messageKey);
    pipeline.zrem(chatMessagesKey, messageId);
    await pipeline.exec();
  }

  /**
   * Delete all messages in a chat
   */
  async deleteChatMessages(chatId) {
    const chatMessagesKey = `${this.chatPrefix}${chatId}:messages`;
    const messageIds = await this.redis.zrange(chatMessagesKey, 0, -1);

    if (messageIds.length > 0) {
      const messageKeys = messageIds.map(id => `${this.messagePrefix}${id}`);
      const pipeline = this.redis.pipeline();
      pipeline.del(...messageKeys);
      pipeline.del(chatMessagesKey);
      await pipeline.exec();
    }
  }

  /**
   * Clean up expired messages — uses SCAN to avoid blocking Redis
   */
  async cleanupExpired() {
    const pattern = `${this.messagePrefix}*`;
    const keys = await scanKeys(this.redis, pattern);

    let cleanedCount = 0;
    const now = Date.now();

    for (const key of keys) {
      const messageData = await this.redis.get(key);
      if (messageData) {
        const message = JSON.parse(messageData);
        const age = now - message.timestamp;

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
 * Chat metadata storage
 */
class ChatStore {
  constructor(redisClient) {
    this.redis = redisClient;
    this.chatPrefix = 'chatinfo:';
    this.invitePrefix = 'invite:';
    this.defaultChatTTL = 30 * 24 * 60 * 60; // 30 days
    this.inviteTTL = 7 * 24 * 60 * 60; // 7 days
  }

  /**
   * Create a new chat
   */
  async createChat(chatId, chatData = {}) {
    const chatKey = `${this.chatPrefix}${chatId}`;

    const chat = {
      id: chatId,
      type: chatData.type || 'private',
      name: chatData.name || null,
      created: Date.now(),
      participants: chatData.participants || [],
      messageCount: 0,
      inviteCode: null,
    };

    await this.redis.setex(chatKey, this.defaultChatTTL, JSON.stringify(chat));
    return chat;
  }

  /**
   * Get chat metadata
   */
  async getChat(chatId) {
    const chatKey = `${this.chatPrefix}${chatId}`;
    const chatData = await this.redis.get(chatKey);

    if (!chatData) {
      return null;
    }

    return JSON.parse(chatData);
  }

  /**
   * Update chat metadata
   */
  async updateChat(chatId, updates) {
    const chat = await this.getChat(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    const updatedChat = { ...chat, ...updates };
    const chatKey = `${this.chatPrefix}${chatId}`;
    await this.redis.setex(chatKey, this.defaultChatTTL, JSON.stringify(updatedChat));
    return updatedChat;
  }

  /**
   * Add participant to chat
   */
  async addParticipant(chatId, sessionId) {
    const chat = await this.getChat(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    if (!chat.participants.includes(sessionId)) {
      chat.participants.push(sessionId);
      await this.updateChat(chatId, { participants: chat.participants });
    }

    return chat;
  }

  /**
   * Remove participant from chat
   */
  async removeParticipant(chatId, sessionId) {
    const chat = await this.getChat(chatId);
    if (!chat) {
      return null;
    }

    chat.participants = chat.participants.filter(p => p !== sessionId);
    return await this.updateChat(chatId, { participants: chat.participants });
  }

  /**
   * Generate an invite code for a chat
   */
  async generateInviteCode(chatId) {
    const inviteCode = crypto.randomBytes(8).toString('hex');
    const inviteKey = `${this.invitePrefix}${inviteCode}`;
    await this.redis.setex(inviteKey, this.inviteTTL, chatId);

    // Store invite code reference in chat
    await this.updateChat(chatId, { inviteCode });

    return inviteCode;
  }

  /**
   * Get chat by invite code
   */
  async getChatByInviteCode(inviteCode) {
    const inviteKey = `${this.invitePrefix}${inviteCode}`;
    const chatId = await this.redis.get(inviteKey);

    if (!chatId) {
      return null;
    }

    return { chatId, chat: await this.getChat(chatId) };
  }

  /**
   * Revoke an invite code
   */
  async revokeInviteCode(inviteCode) {
    const inviteKey = `${this.invitePrefix}${inviteCode}`;
    await this.redis.del(inviteKey);
  }

  /**
   * Delete a chat and all its data
   */
  async deleteChat(chatId) {
    const chatKey = `${this.chatPrefix}${chatId}`;
    await this.redis.del(chatKey);
  }

  /**
   * Increment message count for a chat
   */
  async incrementMessageCount(chatId) {
    const chat = await this.getChat(chatId);
    if (chat) {
      await this.updateChat(chatId, { messageCount: (chat.messageCount || 0) + 1 });
    }
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
   * Get active connections for session — uses SCAN to avoid blocking Redis
   */
  async getSessionConnections(sessionId) {
    const pattern = `${this.connectionPrefix}*`;
    const keys = await scanKeys(this.redis, pattern);

    const connections = [];
    if (keys.length === 0) return connections;

    const dataList = await this.redis.mget(...keys);
    for (const data of dataList) {
      if (data) {
        const connection = JSON.parse(data);
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
    chatStore: new ChatStore(redisClient),
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
      memory: memory ? memory[1].trim() : 'unknown',
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
  ChatStore,
  WebSocketManager,
};
