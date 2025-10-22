/**
 * Advanced Message Routing System
 * Complete metadata stripping and anonymous message routing
 */

const crypto = require('crypto');
const { logMessageEvent, logError, logSecurityEvent } = require('../middleware/logging');

/**
 * Ultra-Anonymous Message Router
 */
class AnonymousMessageRouter {
  constructor(databaseServices) {
    this.db = databaseServices;
    this.redis = databaseServices.redis; // Direct access for convenience
    this.routingTable = new Map(); // In-memory routing for performance
    this.anonymousChannels = new Map(); // Anonymous communication channels
  }

  /**
   * Route message with complete metadata stripping
   */
  async routeMessage(messageData, senderSessionId) {
    try {
      const {
        chatId,
        encryptedMessage,
        messageType = 'text',
        replyTo = null,
        metadata = {}
      } = messageData;

      // Generate anonymous message ID
      const messageId = `msg_${crypto.randomBytes(16).toString('hex')}`;

      // Create sanitized message object (no personal data)
      const sanitizedMessage = {
        id: messageId,
        chatId: this.sanitizeChatId(chatId),
        encryptedContent: encryptedMessage,
        messageType,
        timestamp: Date.now(),
        size: Buffer.byteLength(encryptedMessage, 'utf8'),
        // No sender information, no device info, no location data
        routingMetadata: {
          hops: 1,
          anonymous: true,
          metadataStripped: true,
        }
      };

      // Strip all metadata from the message
      const strippedMessage = await this.stripMessageMetadata(sanitizedMessage);

      // Store message in database
      await this.db.messageStore.storeMessage(messageId, strippedMessage.encryptedContent, chatId);

      // Update routing table
      await this.updateRoutingTable(chatId, messageId, senderSessionId);

      // Log message routing (privacy-preserving)
      logMessageEvent('message_routed', {
        id: messageId.substring(0, 8) + '...',
        chatId: chatId.substring(0, 8) + '...',
        size: strippedMessage.size,
        type: messageType
      });

      return {
        messageId,
        routed: true,
        timestamp: strippedMessage.timestamp,
        anonymous: true
      };

    } catch (error) {
      logError(error, { context: 'message_routing' });
      throw new Error('Message routing failed');
    }
  }

  /**
   * Strip all metadata from message
   */
  async stripMessageMetadata(message) {
    try {
      // Create new message object with only essential data
      const strippedMessage = {
        id: message.id,
        chatId: message.chatId,
        encryptedContent: message.encryptedContent,
        messageType: message.messageType,
        timestamp: message.timestamp,
        size: message.size,
        // Remove all potentially identifying metadata
      };

      // Verify no metadata leakage
      const metadataCheck = this.performMetadataCheck(strippedMessage);
      if (!metadataCheck.clean) {
        logSecurityEvent('metadata_leakage_detected', {
          messageId: message.id.substring(0, 8) + '...',
          issues: metadataCheck.issues
        });

        throw new Error('Metadata leakage detected');
      }

      return strippedMessage;

    } catch (error) {
      logError(error, { context: 'metadata_stripping' });
      throw error;
    }
  }

  /**
   * Perform comprehensive metadata check
   */
  performMetadataCheck(message) {
    const issues = [];
    let clean = true;

    // Check message object for any identifying information
    const messageString = JSON.stringify(message);

    // Check for potential metadata patterns
    const metadataPatterns = [
      /ip[_\-]?address/i,
      /user[_\-]?agent/i,
      /device[_\-]?id/i,
      /location/i,
      /coordinate/i,
      /fingerprint/i,
      /session[_\-]?id/i,
      /user[_\-]?id/i,
      /email/i,
      /phone/i,
      /name/i,
      /timestamp/i, // Actual timestamps might be identifying
    ];

    metadataPatterns.forEach(pattern => {
      if (pattern.test(messageString)) {
        issues.push(pattern.source);
        clean = false;
      }
    });

    return { clean, issues };
  }

  /**
   * Sanitize chat ID to prevent information leakage
   */
  sanitizeChatId(chatId) {
    // Ensure chat ID is in safe format
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Invalid chat ID format');
    }

    // Remove any potentially identifying patterns
    const sanitized = chatId.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitized.length < 8) {
      throw new Error('Chat ID too short after sanitization');
    }

    return sanitized;
  }

  /**
   * Update routing table for the chat
   */
  async updateRoutingTable(chatId, messageId, senderSessionId) {
    try {
      const routingKey = `routing:${chatId}`;

      // Create anonymous routing entry
      const routingEntry = {
        messageId,
        routedAt: Date.now(),
        // No sender information stored
        hops: 1,
        anonymous: true,
      };

      // Store in Redis for persistence
      await this.db.redis.setex(
        `${routingKey}:${messageId}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(routingEntry)
      );

      // Update in-memory routing table
      if (!this.routingTable.has(chatId)) {
        this.routingTable.set(chatId, new Set());
      }
      this.routingTable.get(chatId).add(messageId);

    } catch (error) {
      logError(error, { context: 'routing_table_update' });
    }
  }

  /**
   * Get messages for chat with metadata verification
   */
  async getChatMessages(chatId, limit = 50, offset = 0) {
    try {
      // Get message IDs from database
      const messageIds = await this.db.messageStore.getChatMessages(chatId, limit, offset);

      if (messageIds.length === 0) {
        return [];
      }

      // Retrieve and verify each message
      const messages = [];

      for (const message of messageIds) {
        // Verify message hasn't been tampered with
        const verification = await this.verifyMessageIntegrity(message);
        if (verification.valid) {
          messages.push({
            id: message.id,
            chatId: message.chatId,
            messageType: message.messageType,
            timestamp: message.timestamp,
            size: message.size,
            // No decrypted content - frontend handles decryption
          });
        } else {
          logSecurityEvent('message_integrity_violation', {
            messageId: message.id.substring(0, 8) + '...',
            issues: verification.issues
          });
        }
      }

      return messages;

    } catch (error) {
      logError(error, { context: 'chat_message_retrieval' });
      throw error;
    }
  }

  /**
   * Verify message integrity and anonymity
   */
  async verifyMessageIntegrity(message) {
    try {
      const issues = [];
      let valid = true;

      // Check message structure
      if (!message.id || !message.chatId || !message.encryptedContent) {
        issues.push('Invalid message structure');
        valid = false;
      }

      // Verify no metadata leakage
      const metadataCheck = this.performMetadataCheck(message);
      if (!metadataCheck.clean) {
        issues.push('Metadata detected');
        valid = false;
      }

      // Check message age (not too old)
      const age = Date.now() - message.timestamp;
      if (age > 30 * 24 * 60 * 60 * 1000) { // 30 days
        issues.push('Message too old');
        valid = false;
      }

      return { valid, issues };

    } catch (error) {
      logError(error, { context: 'message_integrity_verification' });
      return { valid: false, issues: ['Verification failed'] };
    }
  }

  /**
   * Create anonymous communication channel
   */
  async createAnonymousChannel(participantIds) {
    try {
      // Generate anonymous channel ID
      const channelId = `channel_${crypto.randomBytes(16).toString('hex')}`;

      // Create channel metadata (no personal information)
      const channelData = {
        id: channelId,
        created: Date.now(),
        participantCount: participantIds.length,
        // No participant information stored
        anonymous: true,
        encrypted: true,
        metadataStripped: true,
      };

      // Store channel information
      await this.db.redis.setex(
        `channel:${channelId}`,
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify(channelData)
      );

      // Register channel in anonymous channels map
      this.anonymousChannels.set(channelId, {
        participants: new Set(participantIds),
        created: Date.now(),
      });

      logMessageEvent('anonymous_channel_created', {
        channelId: channelId.substring(0, 8) + '...',
        participantCount: participantIds.length
      });

      return {
        channelId,
        created: channelData.created,
        anonymous: true,
        participantCount: participantIds.length,
      };

    } catch (error) {
      logError(error, { context: 'anonymous_channel_creation' });
      throw error;
    }
  }

  /**
   * Route message through anonymous channel
   */
  async routeThroughAnonymousChannel(channelId, messageData, senderSessionId) {
    try {
      // Get channel participants
      const channel = this.anonymousChannels.get(channelId);
      if (!channel) {
        throw new Error('Anonymous channel not found');
      }

      // Route to all participants except sender
      const recipientSessions = Array.from(channel.participants)
        .filter(sessionId => sessionId !== senderSessionId);

      if (recipientSessions.length === 0) {
        throw new Error('No recipients in channel');
      }

      // Create anonymous routing
      const routingPromises = recipientSessions.map(async (recipientId) => {
        // Create temporary anonymous chat for this routing
        const tempChatId = `temp_${crypto.randomBytes(8).toString('hex')}`;

        return await this.routeMessage({
          ...messageData,
          chatId: tempChatId,
        }, senderSessionId);
      });

      const routingResults = await Promise.all(routingPromises);

      logMessageEvent('anonymous_channel_routing', {
        channelId: channelId.substring(0, 8) + '...',
        recipientCount: recipientSessions.length,
        messageCount: routingResults.length
      });

      return {
        routed: true,
        recipientCount: recipientSessions.length,
        anonymous: true,
        timestamp: Date.now(),
      };

    } catch (error) {
      logError(error, { context: 'anonymous_channel_routing' });
      throw error;
    }
  }

  /**
   * Clean up old routing data
   */
  async cleanupRoutingData() {
    try {
      const pattern = 'routing:*';
      const keys = await this.db.redis.keys(pattern);

      let cleanedCount = 0;
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const key of keys) {
        const routingData = await this.db.redis.get(key);
        if (routingData) {
          const routing = JSON.parse(routingData);
          if (routing.routedAt < cutoffTime) {
            await this.db.redis.del(key);
            cleanedCount++;
          }
        }
      }

      // Clean up empty routing table entries
      for (const [chatId, messageIds] of this.routingTable.entries()) {
        if (messageIds.size === 0) {
          this.routingTable.delete(chatId);
        }
      }

      if (cleanedCount > 0) {
        logMessageEvent('routing_data_cleaned', { count: cleanedCount });
      }

      return cleanedCount;

    } catch (error) {
      logError(error, { context: 'routing_cleanup' });
      throw error;
    }
  }

  /**
   * Get routing statistics (privacy-preserving)
   */
  async getRoutingStats() {
    try {
      const stats = {
        totalRoutedMessages: 0,
        activeChats: this.routingTable.size,
        anonymousChannels: this.anonymousChannels.size,
        timestamp: Date.now(),
      };

      // Count total routed messages
      for (const messageIds of this.routingTable.values()) {
        stats.totalRoutedMessages += messageIds.size;
      }

      return stats;

    } catch (error) {
      logError(error, { context: 'routing_stats' });
      throw error;
    }
  }
}

module.exports = {
  AnonymousMessageRouter,
};