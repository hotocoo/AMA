/**
 * Privacy-Preserving Logging Middleware
 * Logs security events without compromising user anonymity
 */

const winston = require('winston');
const expressWinston = require('express-winston');

// Custom log format that preserves privacy
const privacyPreservingFormat = winston.format.printf(({ level, message, timestamp, meta = {} }) => {
  // Remove any potentially identifying information
  const sanitizedMeta = { ...meta };

  // Remove IP addresses, user agents, and other identifying data
  delete sanitizedMeta.ip;
  delete sanitizedMeta.userAgent;
  delete sanitizedMeta.referer;

  // Truncate session IDs for privacy
  if (sanitizedMeta.sessionId) {
    sanitizedMeta.sessionId = sanitizedMeta.sessionId.substring(0, 8) + '...';
  }

  return JSON.stringify({
    timestamp,
    level,
    message,
    ...sanitizedMeta
  });
});

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    privacyPreservingFormat
  ),
  defaultMeta: { service: 'anonymous-messenger' },
  transports: [
    // Write all logs to file (rotated daily)
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write errors to separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Express request logging middleware
 * Logs HTTP requests without personal data
 */
const setupLogging = (app) => {
  // Request logging
  app.use(expressWinston.logger({
    winstonInstance: logger,
    level: 'info',
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: process.env.NODE_ENV === 'development',
    ignoreRoute: (req) => {
      // Don't log health checks and static files
      return req.url === '/health' || req.url.startsWith('/static');
    },
    // Custom request filter to remove personal data
    requestFilter: (req, propName) => {
      if (propName === 'headers') {
        const headers = { ...req.headers };
        // Remove potentially identifying headers
        delete headers['x-forwarded-for'];
        delete headers['x-real-ip'];
        delete headers['x-client-ip'];
        delete headers['user-agent'];
        delete headers['referer'];
        delete headers['cookie'];
        return headers;
      }
      return req[propName];
    }
  }));

  // Error logging
  app.use(expressWinston.errorLogger({
    winstonInstance: logger,
    level: 'error',
    meta: true,
    msg: 'HTTP Error {{err.status}} {{req.method}} {{req.url}}',
    // Custom error filter to remove personal data
    requestFilter: (req, propName) => {
      if (propName === 'headers') {
        const headers = { ...req.headers };
        delete headers['x-forwarded-for'];
        delete headers['x-real-ip'];
        delete headers['x-client-ip'];
        delete headers['user-agent'];
        delete headers['referer'];
        delete headers['cookie'];
        return headers;
      }
      return req[propName];
    }
  }));
};

/**
 * Security event logging
 * Logs security-related events for monitoring
 */
const logSecurityEvent = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Authentication event logging
 */
const logAuthEvent = (event, sessionInfo = {}) => {
  logger.info('Auth Event', {
    event,
    sessionId: sessionInfo.id?.substring(0, 8) + '...' || 'unknown',
    timestamp: new Date().toISOString()
  });
};

/**
 * Message event logging (heavily sanitized)
 */
const logMessageEvent = (event, messageInfo = {}) => {
  logger.info('Message Event', {
    event,
    messageId: messageInfo.id?.substring(0, 8) + '...' || 'unknown',
    chatId: messageInfo.chatId?.substring(0, 8) + '...' || 'unknown',
    messageSize: messageInfo.size || 0,
    timestamp: new Date().toISOString()
  });
};

/**
 * File operation logging
 */
const logFileEvent = (event, fileInfo = {}) => {
  logger.info('File Event', {
    event,
    fileId: fileInfo.id?.substring(0, 8) + '...' || 'unknown',
    fileSize: fileInfo.size || 0,
    fileType: fileInfo.type || 'unknown',
    timestamp: new Date().toISOString()
  });
};

/**
 * WebSocket event logging
 */
const logWebSocketEvent = (event, connectionInfo = {}) => {
  logger.info('WebSocket Event', {
    event,
    connectionId: connectionInfo.id?.substring(0, 8) + '...' || 'unknown',
    timestamp: new Date().toISOString()
  });
};

/**
 * System health monitoring logging
 */
const logHealthCheck = (status, details = {}) => {
  logger.info('Health Check', {
    status,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error logging with context
 */
const logError = (error, context = {}) => {
  logger.error('Application Error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

/**
 * Performance monitoring logging
 */
const logPerformance = (operation, duration, details = {}) => {
  logger.info('Performance', {
    operation,
    duration: `${duration}ms`,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Rate limiting violation logging
 */
const logRateLimitViolation = (sessionInfo, endpoint) => {
  logger.warn('Rate Limit Violation', {
    sessionId: sessionInfo?.id?.substring(0, 8) + '...' || 'unknown',
    endpoint,
    timestamp: new Date().toISOString()
  });
};

/**
 * Suspicious activity logging
 */
const logSuspiciousActivity = (activity, details = {}) => {
  logger.warn('Suspicious Activity', {
    activity,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Audit logging for compliance
 */
const logAuditEvent = (action, userInfo, details = {}) => {
  logger.info('Audit Event', {
    action,
    userId: userInfo?.id?.substring(0, 8) + '...' || 'anonymous',
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  setupLogging,
  logSecurityEvent,
  logAuthEvent,
  logMessageEvent,
  logFileEvent,
  logWebSocketEvent,
  logHealthCheck,
  logError,
  logPerformance,
  logRateLimitViolation,
  logSuspiciousActivity,
  logAuditEvent,
};