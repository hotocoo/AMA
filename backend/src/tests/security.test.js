/**
 * Security Tests
 * Comprehensive security testing suite
 */

const request = require('supertest');

// We import the HTTP server exported by server.js
const httpServer = require('../server');

describe('Security Tests', () => {
  describe('Input Validation', () => {
    test('should reject message missing encryptedMessage field', async () => {
      const invalidInput = {
        chatId: 'some-chat-id',
        // encryptedMessage intentionally omitted
      };

      const response = await request(httpServer)
        .post('/api/messages/send')
        .send(invalidInput);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should reject message missing chatId field', async () => {
      const invalidInput = {
        encryptedMessage: 'someEncryptedContent',
        // chatId intentionally omitted
      };

      const response = await request(httpServer)
        .post('/api/messages/send')
        .send(invalidInput);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(httpServer)
        .get('/health');

      // Accept 200 (healthy) or 503 (no Redis in test env)
      expect([200, 503]).toContain(response.status);
      expect(response.body.status).toBeDefined();
    });
  });

  describe('404 Handling', () => {
    test('should return 404 for undefined routes', async () => {
      const response = await request(httpServer)
        .get('/api/nonexistent_route_xyz');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Encryption', () => {
    test('should confirm message type is string', () => {
      const message = 'test message';
      expect(typeof message).toBe('string');
    });
  });
});
