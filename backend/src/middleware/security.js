/**
 * Security Middleware
 * Ultra-paranoid security measures for anonymous messenger
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');

// Anonymous session tracking (no personal data)
const anonymousSessions = new Map();

/**
 * Advanced security middleware setup
 */
const setupSecurity = (app) => {
  // Basic security headers with custom configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "blob:"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  }));

  // Custom security headers
  app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Force HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy for privacy
    res.setHeader('Referrer-Policy', 'no-referrer');

    // Permissions policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
  });
};

/**
 * Anonymous session middleware
 * Tracks sessions without collecting personal data
 */
const anonymousSessionMiddleware = (req, res, next) => {
  // Generate anonymous session ID
  const sessionId = req.headers['x-anonymous-session'] ||
    `anon_${crypto.randomBytes(16).toString('hex')}`;

  // Store anonymous session info (no personal data)
  anonymousSessions.set(sessionId, {
    id: sessionId,
    created: Date.now(),
    lastSeen: Date.now(),
    requestCount: (anonymousSessions.get(sessionId)?.requestCount || 0) + 1,
    // No IP tracking, no user agent storage beyond what's necessary
  });

  // Add session ID to request for downstream use
  req.anonymousSession = {
    id: sessionId,
    // Don't expose internal data
  };

  // Clean up old sessions (older than 24 hours)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, session] of anonymousSessions.entries()) {
    if (session.lastSeen < oneDayAgo) {
      anonymousSessions.delete(id);
    }
  }

  next();
};

/**
 * Advanced rate limiting based on anonymous sessions
 */
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      timestamp: Date.now()
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use anonymous session ID for rate limiting
      return req.anonymousSession?.id || req.ip || 'unknown';
    },
    skip: (req) => {
      // Skip rate limiting for health checks and static files
      return req.path === '/health' || req.path.startsWith('/static');
    },
    handler: (req, res) => {
      // Log rate limit violations (without personal data)
      console.warn(`Rate limit exceeded for session: ${req.anonymousSession?.id}`);

      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: Date.now()
      });
    }
  });
};

/**
 * Input validation and sanitization middleware
 */
const validateInput = (req, res, next) => {
  // Remove potentially dangerous headers
  const dangerousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];

  dangerousHeaders.forEach(header => {
    delete req.headers[header];
  });

  // Validate content length
  if (req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length']);
    const maxSize = 10 * 1024 * 1024; // 10MB limit

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload too large',
        maxSize: maxSize
      });
    }
  }

  // Validate content type for JSON requests
  if (req.headers['content-type'] &&
      req.headers['content-type'].includes('application/json')) {
    // Additional JSON validation will be handled by express.json()
  }

  next();
};

/**
 * Request logging middleware (privacy-preserving)
 */
const secureLogger = (req, res, next) => {
  // Log request without personal information
  const logData = {
    method: req.method,
    path: req.path,
    timestamp: Date.now(),
    sessionId: req.anonymousSession?.id?.substring(0, 8) + '...', // Partial session ID only
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...', // Truncated user agent
    contentLength: req.headers['content-length'] || 0,
    // No IP address logging
  };

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Session: ${logData.sessionId}`);

  next();
};

/**
 * Security validation middleware for WebSocket connections
 */
const validateWebSocketConnection = (req, res, next) => {
  // Validate WebSocket upgrade headers
  const upgradeHeader = req.headers.upgrade;
  const connectionHeader = req.headers.connection;

  if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
    // Additional WebSocket security validation
    if (!connectionHeader || !connectionHeader.toLowerCase().includes('upgrade')) {
      return res.status(400).json({ error: 'Invalid WebSocket connection' });
    }

    // Validate origin for WebSocket connections
    const origin = req.headers.origin;
    if (process.env.NODE_ENV === 'production' && origin) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: 'Origin not allowed' });
      }
    }
  }

  next();
};

/**
 * Anti-replay attack protection
 */
const replayProtection = (req, res, next) => {
  // Simple nonce-based replay protection
  const nonce = req.headers['x-request-nonce'];
  const timestamp = req.headers['x-request-timestamp'];

  if (nonce && timestamp) {
    const now = Date.now();
    const requestTime = parseInt(timestamp);

    // Check if timestamp is within acceptable window (5 minutes)
    if (now - requestTime > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Request timestamp expired' });
    }

    // Check for nonce reuse (simplified - in production use Redis)
    if (req.anonymousSession) {
      const sessionNonces = anonymousSessions.get(req.anonymousSession.id)?.nonces || new Set();
      if (sessionNonces.has(nonce)) {
        return res.status(401).json({ error: 'Nonce already used' });
      }
      sessionNonces.add(nonce);

      // Keep only recent nonces
      if (sessionNonces.size > 100) {
        const recentNonces = Array.from(sessionNonces).slice(-50);
        anonymousSessions.get(req.anonymousSession.id).nonces = new Set(recentNonces);
      }
    }
  }

  next();
};

/**
 * Export security middleware functions
 */
module.exports = {
  setupSecurity,
  anonymousSessionMiddleware,
  createRateLimit,
  validateInput,
  secureLogger,
  validateWebSocketConnection,
  replayProtection,
};