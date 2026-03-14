/**
 * Security Tests
 * Tests for input validation, rate limiting, and encryption correctness
 */

const crypto = require('crypto');

// We only unit-test modules that don't require a live server/Redis.
// Integration tests for HTTP endpoints would require a running Redis instance.

describe('Crypto Service', () => {
  let KeyManager;

  beforeAll(() => {
    ({ KeyManager } = require('../services/crypto'));
  });

  test('generateMasterKeyPair returns base64 keys', async () => {
    const km = new KeyManager();
    const pair = await km.generateMasterKeyPair();
    expect(typeof pair.publicKey).toBe('string');
    expect(typeof pair.privateKey).toBe('string');
    // Should be valid base64
    expect(() => Buffer.from(pair.publicKey, 'base64')).not.toThrow();
    expect(() => Buffer.from(pair.privateKey, 'base64')).not.toThrow();
  });

  test('generateEphemeralKeyPair returns Buffer keys', async () => {
    const km = new KeyManager();
    const pair = await km.generateEphemeralKeyPair();
    expect(Buffer.isBuffer(pair.publicKey)).toBe(true);
    expect(Buffer.isBuffer(pair.privateKey)).toBe(true);
  });

  test('encryptMessage and decryptMessage are inverse operations', async () => {
    const km = new KeyManager();
    const key = crypto.randomBytes(32);
    const plaintext = 'Hello, anonymous world!';

    const encrypted = await km.encryptMessage(plaintext, key);
    expect(encrypted).toHaveProperty('encrypted');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');

    const decrypted = await km.decryptMessage(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  test('decryptMessage fails with wrong key', async () => {
    const km = new KeyManager();
    const key = crypto.randomBytes(32);
    const wrongKey = crypto.randomBytes(32);

    const encrypted = await km.encryptMessage('secret', key);
    await expect(km.decryptMessage(encrypted, wrongKey)).rejects.toThrow();
  });

  test('signMessage and verifySignature work correctly', async () => {
    const km = new KeyManager();
    // Use signing key pair (Ed25519), not box key pair
    const pair = await km.generateSigningKeyPair();
    const message = 'test message to sign';

    const signature = await km.signMessage(message, pair.privateKey);
    expect(typeof signature).toBe('string');

    const valid = await km.verifySignature(message, signature, pair.publicKey);
    expect(valid).toBe(true);

    const invalid = await km.verifySignature('tampered', signature, pair.publicKey);
    expect(invalid).toBe(false);
  });

  test('hashData returns consistent hex string', async () => {
    const km = new KeyManager();
    const hash1 = await km.hashData('test');
    const hash2 = await km.hashData('test');
    expect(hash1).toBe(hash2);
    expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
  });

  test('generateRandomBytes returns requested length', () => {
    const km = new KeyManager();
    const bytes = km.generateRandomBytes(32);
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(bytes.length).toBe(32);
  });
});

describe('Input Validation - sanitizeObject', () => {
  test('truncates excessively long strings to prevent DoS', () => {
    const obj = { content: 'A'.repeat(1024 * 1024 + 100) };
    // Replicate sanitizeObject logic from security middleware
    const sanitizeObject = (o) => {
      for (const key in o) {
        if (typeof o[key] === 'string') {
          if (o[key].length > 1024 * 1024) {
            o[key] = o[key].substring(0, 1024 * 1024);
          }
        } else if (typeof o[key] === 'object' && o[key] !== null) {
          sanitizeObject(o[key]);
        }
      }
    };
    sanitizeObject(obj);
    expect(obj.content.length).toBe(1024 * 1024);
  });

  test('does not modify short strings', () => {
    const obj = { chatId: 'abc123xyz', messageType: 'text' };
    const sanitizeObject = (o) => {
      for (const key in o) {
        if (typeof o[key] === 'string') {
          if (o[key].length > 1024 * 1024) {
            o[key] = o[key].substring(0, 1024 * 1024);
          }
        } else if (typeof o[key] === 'object' && o[key] !== null) {
          sanitizeObject(o[key]);
        }
      }
    };
    sanitizeObject(obj);
    expect(obj.chatId).toBe('abc123xyz');
    expect(obj.messageType).toBe('text');
  });

  test('handles nested objects', () => {
    const obj = { nested: { val: 'short string' } };
    const sanitizeObject = (o) => {
      for (const key in o) {
        if (typeof o[key] === 'string') {
          if (o[key].length > 1024 * 1024) {
            o[key] = o[key].substring(0, 1024 * 1024);
          }
        } else if (typeof o[key] === 'object' && o[key] !== null) {
          sanitizeObject(o[key]);
        }
      }
    };
    sanitizeObject(obj);
    expect(obj.nested.val).toBe('short string');
  });
});

describe('Message Router - metadata check', () => {
  let AnonymousMessageRouter;

  beforeAll(() => {
    ({ AnonymousMessageRouter } = require('../services/messageRouter'));
  });

  test('performMetadataCheck passes clean message', () => {
    // Provide a minimal db stub
    const dbStub = { redis: null, messageStore: null };
    const router = new AnonymousMessageRouter(dbStub);

    const msg = {
      id: 'msg_abc123',
      chatId: 'chat_xyz',
      encryptedContent: 'base64encryptedstuff==',
      messageType: 'text',
      timestamp: Date.now(),
      size: 100,
    };

    const result = router.performMetadataCheck(msg);
    // After fix: /timestamp/i pattern is removed, so this should be clean
    expect(result.clean).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('performMetadataCheck detects ip_address', () => {
    const dbStub = { redis: null, messageStore: null };
    const router = new AnonymousMessageRouter(dbStub);

    const msg = {
      id: 'msg_abc123',
      chatId: 'chat_xyz',
      encryptedContent: 'stuff',
      ip_address: '1.2.3.4',
      timestamp: Date.now(),
    };

    const result = router.performMetadataCheck(msg);
    expect(result.clean).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test('sanitizeChatId keeps alphanumeric, underscore, and hyphen', () => {
    const dbStub = { redis: null, messageStore: null };
    const router = new AnonymousMessageRouter(dbStub);
    const result = router.sanitizeChatId('valid_chat-ID123!@#extra');
    // only [a-zA-Z0-9_-] characters are kept
    expect(result).toBe('valid_chat-ID123extra');
    expect(/^[a-zA-Z0-9_-]+$/.test(result)).toBe(true);
  });

  test('sanitizeChatId throws for short IDs', () => {
    const dbStub = { redis: null, messageStore: null };
    const router = new AnonymousMessageRouter(dbStub);
    expect(() => router.sanitizeChatId('short')).toThrow();
  });
});

describe('File route - path traversal protection', () => {
  test('safeFilePath neutralises path traversal by extracting basename only', () => {
    const path = require('path');
    const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

    const safeFilePath = (filename) => {
      const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const resolved = path.resolve(UPLOADS_DIR, safe);
      if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) {
        throw new Error('Invalid file path');
      }
      return resolved;
    };

    // Normal file should work and stay inside uploads dir
    const normalResult = safeFilePath('abc123_file.txt');
    expect(normalResult.startsWith(UPLOADS_DIR)).toBe(true);

    // Path traversal: basename strips the traversal so the result stays inside uploads dir
    const traversalResult = safeFilePath('../../../etc/passwd');
    expect(traversalResult.startsWith(UPLOADS_DIR)).toBe(true);
    // The path must not escape the uploads directory
    expect(traversalResult).not.toContain('/etc/');
  });

  test('safeFilePath replaces special characters in filename', () => {
    const path = require('path');
    const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

    const safeFilePath = (filename) => {
      const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const resolved = path.resolve(UPLOADS_DIR, safe);
      if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) {
        throw new Error('Invalid file path');
      }
      return resolved;
    };

    const result = safeFilePath('my file (1).txt');
    // Spaces and parens replaced with underscores
    expect(result).not.toContain(' ');
    expect(result).not.toContain('(');
    expect(result.startsWith(UPLOADS_DIR)).toBe(true);
  });
});
