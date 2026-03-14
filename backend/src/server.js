/**
 * Anonymous Messenger Backend Server
 * Ultra-secure messaging platform with end-to-end encryption
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import security and core modules
const { setupSecurity, setRedisClient } = require('./middleware/security');
const { setupLogging } = require('./middleware/logging');
const { setupRoutes } = require('./routes');
const { setupWebSocket } = require('./services/websocket');
const { initializeCrypto } = require('./services/crypto');
const { connectDatabase, initializeDatabaseServices } = require('./config/database');

class AnonymousMessengerServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? false
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.port = process.env.PORT || 3001;
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Anonymous Messenger Server...');

      // Ensure uploads directory exists
      const fs = require('fs');
      const uploadsDir = require('path').join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory');
      }

      // Initialize cryptographic systems
      await initializeCrypto();

      // Connect to database
      const redisClient = await connectDatabase();

      // Set Redis client for security middleware
      setRedisClient(redisClient);

      // Initialize database services
      const databaseServices = initializeDatabaseServices(redisClient);
      this.database = databaseServices;

      // Setup security middleware
      this.setupSecurity();

      // Setup core middleware
      this.setupMiddleware();

      // Setup API routes
      setupRoutes(this.app);

      // Setup WebSocket handlers
      setupWebSocket(this.io, databaseServices);

      // Make database services available to routes
      this.app.set('database', databaseServices);

      // Setup logging
      setupLogging(this.app);

      // Start server
      this.startServer();

    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      process.exit(1);
    }
  }

  setupSecurity() {
    // Helmet for security headers
    this.app.use(helmet({
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
        },
      },
      hsts: {
        maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // Custom security middleware
    setupSecurity(this.app);
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? false
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
      optionsSuccessStatus: 200
    }));

    // Compression middleware
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for WebSocket connections
        return req.path.startsWith('/socket.io/') || req.headers['x-real-ip'] === '127.0.0.1';
      }
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Request logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('combined'));
    }
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🚀 ANONYMOUS MESSENGER                     ║
║                    Ultra-Secure Communication                 ║
╚══════════════════════════════════════════════════════════════╝
      `);

      console.log(`✅ Server running on port ${this.port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Security: Enhanced encryption enabled`);
      console.log(`🔐 WebSocket: Real-time messaging active`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);

      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔧 Development mode - Debug enabled`);
        console.log(`📝 API Documentation: http://localhost:${this.port}/api-docs`);
      }

      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Server Started Successfully                ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  async gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    this.server.close(async () => {
      console.log('✅ HTTP server closed.');

      // Close WebSocket connections
      this.io.close(() => {
        console.log('✅ WebSocket server closed.');
      });

      // Close database connections
      // await closeDatabase();

      console.log('✅ Graceful shutdown completed.');
      process.exit(0);
    });

    // Force close server after 10 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
const server = new AnonymousMessengerServer();

module.exports = server;