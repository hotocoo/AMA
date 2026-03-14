/**
 * Session Management Controller
 * Anonymous session handling with maximum privacy
 */

const crypto = require('crypto');
const { logAuthEvent, logError } = require('../middleware/logging');

/**
 * Create anonymous session
 */
const createSession = async (req, res) => {
  try {
    const { sessionData = {} } = req.body;

    // Generate anonymous session ID
    const sessionId = `anon_${crypto.randomBytes(16).toString('hex')}`;

    // Create session in database
    const session = await req.app.get('database').sessionManager.createSession({
      id: sessionId,
      created: Date.now(),
      lastSeen: Date.now(),
      messageCount: 0,
      chatCount: 0,
      // No personal data stored
      ...sessionData,
    });

    logAuthEvent('session_created', { id: sessionId });

    // Return session info (without sensitive data)
    res.status(201).json({
      sessionId: session.id,
      created: session.created,
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
      timestamp: Date.now(),
    });

  } catch (error) {
    logError(error, { context: 'session_creation' });
    res.status(500).json({
      error: 'Failed to create session',
      timestamp: Date.now(),
    });
  }
};

/**
 * Get session information
 */
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        timestamp: Date.now(),
      });
    }

    // Get session from database
    const session = await req.app.get('database').sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        timestamp: Date.now(),
      });
    }

    // Update last seen
    await req.app.get('database').sessionManager.updateSession(sessionId, {
      lastSeen: Date.now(),
    });

    logAuthEvent('session_accessed', { id: sessionId });

    // Return sanitized session info
    res.json({
      sessionId: session.id,
      created: session.created,
      lastSeen: session.lastSeen,
      messageCount: session.messageCount || 0,
      chatCount: session.chatCount || 0,
      isActive: true,
      timestamp: Date.now(),
    });

  } catch (error) {
    logError(error, { context: 'session_retrieval' });
    res.status(500).json({
      error: 'Failed to retrieve session',
      timestamp: Date.now(),
    });
  }
};

/**
 * Update session information
 */
const updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        timestamp: Date.now(),
      });
    }

    // Validate updates (only allow specific fields)
    const allowedUpdates = ['lastSeen', 'messageCount', 'chatCount'];
    const sanitizedUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        sanitizedUpdates[key] = updates[key];
      }
    });

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        error: 'No valid updates provided',
        timestamp: Date.now(),
      });
    }

    // Update session in database
    const updatedSession = await req.app.get('database').sessionManager.updateSession(
      sessionId,
      sanitizedUpdates
    );

    logAuthEvent('session_updated', { id: sessionId });

    res.json({
      sessionId: updatedSession.id,
      updated: Object.keys(sanitizedUpdates),
      timestamp: Date.now(),
    });

  } catch (error) {
    logError(error, { context: 'session_update' });

    if (error.message === 'Session not found') {
      res.status(404).json({
        error: 'Session not found',
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        error: 'Failed to update session',
        timestamp: Date.now(),
      });
    }
  }
};

/**
 * Delete session
 */
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        timestamp: Date.now(),
      });
    }

    // Delete session from database
    await req.app.get('database').sessionManager.deleteSession(sessionId);

    logAuthEvent('session_deleted', { id: sessionId });

    res.json({
      message: 'Session deleted successfully',
      sessionId,
      timestamp: Date.now(),
    });

  } catch (error) {
    logError(error, { context: 'session_deletion' });
    res.status(500).json({
      error: 'Failed to delete session',
      timestamp: Date.now(),
    });
  }
};

/**
 * Get session statistics (privacy-preserving)
 */
const getSessionStats = async (req, res) => {
  try {
    const stats = await req.app.get('database').sessionManager.getSessionStats();

    res.json({
      ...stats,
      // No personal session details exposed
    });

  } catch (error) {
    logError(error, { context: 'session_stats' });
    res.status(500).json({
      error: 'Failed to retrieve session statistics',
      timestamp: Date.now(),
    });
  }
};

/**
 * Exchange public keys for end-to-end encryption
 * Temporarily stores the public key for the session
 */
const exchangeKeys = async (req, res) => {
  try {
    const { publicKey, sessionId } = req.body;

    if (!publicKey) {
      return res.status(400).json({
        error: 'Public key required',
        timestamp: Date.now(),
      });
    }

    if (typeof publicKey !== 'string' || publicKey.length > 4096) {
      return res.status(400).json({
        error: 'Invalid public key format',
        timestamp: Date.now(),
      });
    }

    const targetSessionId = sessionId || req.anonymousSession?.id;
    if (!targetSessionId) {
      return res.status(400).json({
        error: 'Session ID required for key exchange',
        timestamp: Date.now(),
      });
    }

    // Store public key temporarily in database
    const databaseServices = req.app.get('database');
    if (databaseServices && databaseServices.keyStore) {
      await databaseServices.keyStore.storePublicKey(targetSessionId, publicKey);
    }

    logAuthEvent('key_exchanged', { id: targetSessionId });

    res.json({
      success: true,
      message: 'Public key stored successfully',
      sessionId: targetSessionId,
      timestamp: Date.now(),
    });

  } catch (error) {
    logError(error, { context: 'key_exchange' });
    res.status(500).json({
      error: 'Failed to exchange keys',
      timestamp: Date.now(),
    });
  }
};

/**
 * Retrieve stored public key for a session
 */
const getPublicKey = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID required',
        timestamp: Date.now(),
      });
    }

    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.keyStore) {
      return res.status(500).json({
        error: 'Database services not available',
        timestamp: Date.now(),
      });
    }

    const publicKey = await databaseServices.keyStore.getPublicKey(sessionId);
    if (!publicKey) {
      return res.status(404).json({
        error: 'Public key not found',
        timestamp: Date.now(),
      });
    }

    logAuthEvent('key_retrieved', { id: sessionId });

    res.json({
      sessionId,
      publicKey,
      timestamp: Date.now(),
    });

  } catch (error) {
    logError(error, { context: 'get_public_key' });
    res.status(500).json({
      error: 'Failed to retrieve public key',
      timestamp: Date.now(),
    });
  }
};

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getSessionStats,
  exchangeKeys,
  getPublicKey,
};