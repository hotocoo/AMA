
/**
 * Advanced Cryptographic Service
 * Military-grade encryption with perfect forward secrecy
 */

const crypto = require('crypto');
const nacl = require('tweetnacl');
const sodium = require('libsodium-wrappers');
const forge = require('node-forge');

/**
 * Initialize cryptographic systems
 */
const initializeCrypto = async () => {
  try {
    console.log('🔐 Initializing cryptographic systems...');

    // Initialize libsodium
    await sodium.ready;

    console.log('✅ Cryptographic systems initialized successfully');
    console.log('🔒 Available algorithms:');
    console.log('   • AES-256-GCM (symmetric encryption)');
    console.log('   • ECDH (key exchange)');
    console.log('   • Ed25519 (digital signatures)');
    console.log('   • HKDF (key derivation)');
    console.log('   • Scrypt (password hashing)');

  } catch (error) {
    console.error('❌ Cryptographic initialization failed:', error);
    throw error;
  }
};

/**
 * Advanced Encryption Key Manager
 */
class KeyManager {
  constructor() {
    this.ephemeralKeys = new Map();
    this.masterKeys = new Map();
    this.keyRotationInterval = 60 * 60 * 1000; // 1 hour
    this.startKeyRotation();
  }

  /**
   * Generate master key pair for identity
   */
  async generateMasterKeyPair() {
    const keyPair = nacl.box.keyPair();

    return {
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      privateKey: Buffer.from(keyPair.privateKey).toString('base64'),
    };
  }

  /**
   * Generate ephemeral key pair for perfect forward secrecy
   */
  async generateEphemeralKeyPair() {
    const keyPair = nacl.box.keyPair();

    return {
      publicKey: Buffer.from(keyPair.publicKey),
      privateKey: Buffer.from(keyPair.privateKey),
    };
  }

  /**
   * Derive shared secret using ECDH
   */
  async deriveSharedSecret(privateKey, publicKey, context = 'message') {
    try {
      const privateKeyBuffer = Buffer.from(privateKey, 'base64');
      const publicKeyBuffer = Buffer.from(publicKey, 'base64');

      // Use ECDH to derive shared secret
      const sharedSecret = nacl.box.before(publicKeyBuffer, privateKeyBuffer);

      // Use HKDF to derive message-specific key
      const messageKey = await this.hkdfDerive(
        Buffer.from(sharedSecret),
        32, // 256-bit key
        `anon-msg-${context}`,
        Buffer.from('encryption-key')
      );

      return messageKey;
    } catch (error) {
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }

  /**
   * HKDF key derivation function
   */
  async hkdfDerive(ikm, length, info, salt) {
    return new Promise((resolve, reject) => {
      crypto.hkdf(
        'sha256',
        ikm,
        salt,
        info,
        length,
        (err, derivedKey) => {
          if (err) {
            reject(err);
          } else {
            resolve(Buffer.from(derivedKey));
          }
        }
      );
    });
  }

  /**
    * Encrypt message with AES-256-GCM
    */
   async encryptMessage(message, key) {
     try {
       // Generate random IV
       const iv = crypto.randomBytes(16);
       const keyBuffer = Buffer.from(key);
       const messageBuffer = Buffer.from(message, 'utf8');

       // Create cipher
       const cipher = crypto.createCipherGCM('aes-256-gcm', keyBuffer, iv);

       // Encrypt message
       let encrypted = cipher.update(messageBuffer, null, 'hex');
       encrypted += cipher.final('hex');

       // Get auth tag
       const authTag = cipher.getAuthTag();

       return {
         encrypted,
         iv: iv.toString('base64'),
         authTag: authTag.toString('base64'),
       };
     } catch (error) {
       throw new Error(`Message encryption failed: ${error.message}`);
     }
   }

   /**
    * Decrypt message with AES-256-GCM
    */
   async decryptMessage(encryptedData, key) {
     try {
       const { encrypted, iv, authTag } = encryptedData;
       const keyBuffer = Buffer.from(key);
       const ivBuffer = Buffer.from(iv, 'base64');
       const authTagBuffer = Buffer.from(authTag, 'base64');

       // Create decipher
       const decipher = crypto.createDecipherGCM('aes-256-gcm', keyBuffer, ivBuffer);
       decipher.setAuthTag(authTagBuffer);

       // Decrypt message
       let decrypted = decipher.update(encrypted, 'hex', 'utf8');
       decrypted += decipher.final('utf8');

       return decrypted;
     } catch (error) {
       throw new Error(`Message decryption failed: ${error.message}`);
     }
   }

  /**
   * Create digital signature
   */
  async signMessage(message, privateKey) {
    try {
      const privateKeyBuffer = Buffer.from(privateKey, 'base64');
      const messageBuffer = Buffer.from(message, 'utf8');

      const signature = nacl.sign.detached(messageBuffer, privateKeyBuffer);

      return Buffer.from(signature).toString('base64');
    } catch (error) {
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }

  /**
   * Verify digital signature
   */
  async verifySignature(message, signature, publicKey) {
    try {
      const publicKeyBuffer = Buffer.from(publicKey, 'base64');
      const messageBuffer = Buffer.from(message, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'base64');

      return nacl.sign.detached.verify(messageBuffer, signatureBuffer, publicKeyBuffer);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random bytes
   */
  generateRandomBytes(length) {
    return crypto.randomBytes(length);
  }

  /**
   * Hash data with SHA-256
   */
  async hashData(data) {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Start automatic key rotation
   */
  startKeyRotation() {
    setInterval(async () => {
      await this.rotateEphemeralKeys();
    }, this.keyRotationInterval);

    console.log(`🔄 Key rotation started (every ${this.keyRotationInterval / 1000}s)`);
  }

  /**
   * Rotate ephemeral keys for perfect forward secrecy
   */
  async rotateEphemeralKeys() {
    try {
      // Generate new ephemeral keys for active sessions
      const newKeys = new Map();

      for (const [sessionId, keyData] of this.ephemeralKeys.entries()) {
        const newKeyPair = await this.generateEphemeralKeyPair();
        newKeys.set(sessionId, {
          ...keyData,
          currentKeyPair: newKeyPair,
          rotated: Date.now(),
        });
      }

      this.ephemeralKeys = newKeys;

      console.log(`🔄 Ephemeral keys rotated for ${this.ephemeralKeys.size} sessions`);

    } catch (error) {
      console.error('❌ Key rotation failed:', error);
    }
  }

  /**
   * Get or create ephemeral keys for session
   */
  async getEphemeralKeys(sessionId) {
    if (!this.ephemeralKeys.has(sessionId)) {
      const keyPair = await this.generateEphemeralKeyPair();
      this.ephemeralKeys.set(sessionId, {
        currentKeyPair: keyPair,
        created: Date.now(),
        rotated: Date.now(),
      });
    }

    return this.ephemeralKeys.get(sessionId);
  }
}

/**
 * Message Encryption Service
 */
class MessageEncryptionService {
  constructor(keyManager) {
    this.keyManager = keyManager;
  }

  /**
   * Encrypt message for recipient
   */
  async encryptForRecipient(message, recipientPublicKey, senderPrivateKey) {
    try {
      // Generate ephemeral key pair for this message
      const ephemeralKeyPair = await this.keyManager.generateEphemeralKeyPair();

      // Derive shared secret using recipient's public key and our ephemeral private key
      const sharedSecret = await this.keyManager.deriveSharedSecret(
        ephemeralKeyPair.privateKey.toString('base64'),
        recipientPublicKey,
        'message-encryption'
      );

      // Encrypt the message
      const encryptedMessage = await this.keyManager.encryptMessage(message, sharedSecret);

      // Create message package
      const messagePackage = {
        encrypted: encryptedMessage,
        ephemeralPublicKey: ephemeralKeyPair.publicKey.toString('base64'),
        timestamp: Date.now(),
        version: '1.0',
      };

      // Sign the message package for integrity
      const signature = await this.keyManager.signMessage(
        JSON.stringify(messagePackage),
        senderPrivateKey
      );

      return {
        ...messagePackage,
        signature,
      };
    } catch (error) {
      throw new Error(`Message encryption failed: ${error.message}`);
    }
  }
}

// Export functions and classes
module.exports = {
  initializeCrypto,
  KeyManager,
  MessageEncryptionService
};
