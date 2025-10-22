/**
 * Health Check Controller
 * System health monitoring without exposing sensitive data
 */

const { healthCheck } = require('../config/database');
const { logger } = require('../middleware/logging');

/**
 * Get system health status
 */
const getHealth = async (req, res) => {
  try {
    const startTime = Date.now();

    // Database health check
    const dbHealth = await healthCheck();

    // System information (sanitized)
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      // No sensitive environment information
    };

    // WebSocket connection count (privacy-preserving)
    const wsConnections = req.app.get('websocket')?.getStats() || { totalConnections: 0 };

    // Response time calculation
    const responseTime = Date.now() - startTime;

    const healthData = {
      status: 'healthy',
      timestamp: Date.now(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        websocket: {
          status: wsConnections.totalConnections > 0 ? 'connected' : 'disconnected',
          activeConnections: wsConnections.totalConnections,
        },
      },
      system: {
        uptime: `${Math.floor(systemInfo.uptime / 60)}m ${Math.floor(systemInfo.uptime % 60)}s`,
        memoryUsage: `${Math.round(systemInfo.memory.heapUsed / 1024 / 1024)}MB`,
        nodeVersion: systemInfo.nodeVersion,
        platform: systemInfo.platform,
      },
      // No version or detailed service information for security
    };

    // Log health check (privacy-preserving)
    logger.info('Health check requested', {
      responseTime: `${responseTime}ms`,
      dbStatus: dbHealth.status,
      wsConnections: wsConnections.totalConnections,
    });

    res.json(healthData);

  } catch (error) {
    logger.error('Health check failed', { error: error.message });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: 'Service temporarily unavailable',
    });
  }
};

/**
 * Get detailed system statistics (admin only - in production)
 */
const getDetailedStats = async (req, res) => {
  try {
    // In production, this would require admin authentication
    // For now, return privacy-preserving statistics only

    const stats = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      // No detailed user statistics for privacy
      features: {
        encryption: 'enabled',
        anonymity: 'maximum',
        messageRouting: 'active',
        fileSharing: 'available',
      },
    };

    res.json(stats);

  } catch (error) {
    logger.error('Stats retrieval failed', { error: error.message });

    res.status(500).json({
      error: 'Failed to retrieve statistics',
      timestamp: Date.now(),
    });
  }
};

module.exports = {
  getHealth,
  getDetailedStats,
};