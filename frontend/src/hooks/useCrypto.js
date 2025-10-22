/**
 * Cryptography Hook
 * Client-side encryption/decryption with bulletproof security
 */

import { useState, useCallback, useRef } from 'react';
import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

export const useCrypto = () => {
  const [keyPair, setKeyPair] = useState(null);
  const [sharedSecrets, setSharedSecrets] = useState(new Map());
  const cryptoStatus = useRef('uninitialized');

  /**
   * Initialize cryptographic system
   */
  const initializeCrypto = useCallback(async () => {
    try {
      cryptoStatus.current = 'initializing';

      // Generate ephemeral key pair for this session
      const newKeyPair = nacl.box.keyPair();

      // Store keys securely (in production, use secure memory)
      setKeyPair({
        publicKey: encodeBase64(newKeyPair.publicKey),
        secretKey: encodeBase64(newKeyPair.secretKey),
      });

      cryptoStatus.current = 'ready';

      console.log('🔐 Cryptographic system initialized');

      return {
        publicKey: encodeBase64(newKeyPair.publicKey),
        ready: true,
      };

    } catch (error) {
      console.error('Cryptographic initialization failed:', error);
      cryptoStatus.current = 'error';
      throw error;
    }
  }, []);

  /**
   * Derive shared secret for communication with another user
   */
  const deriveSharedSecret = useCallback(async (theirPublicKey, chatId) => {
    try {
      if (!keyPair) {
        throw new Error('Key pair not initialized');
      }

      // Decode keys
      const mySecretKey = decodeBase64(keyPair.secretKey);
      const theirPubKey = decodeBase64(theirPublicKey);

      // Generate shared secret using ECDH
      const sharedSecret = nacl.box.before(theirPubKey, mySecretKey);

      // Store shared secret for this chat
      const secretKey = encodeBase64(sharedSecret);
      setSharedSecrets(prev => new Map(prev).set(chatId, secretKey));

      console.log('🔑 Shared secret derived for chat:', chatId.substring(0, 8) + '...');

      return secretKey;

    } catch (error) {
      console.error('Shared secret derivation failed:', error);
      throw error;
    }
  }, [keyPair]);

  /**
   * Encrypt message for sending
   */
  const encryptMessage = useCallback(async (message, chatId) => {
    try {
      if (!keyPair || !sharedSecrets.has(chatId)) {
        throw new Error('Cryptographic keys not ready');
      }

      // Get shared secret for this chat
      const sharedSecret = decodeBase64(sharedSecrets.get(chatId));

      // Generate ephemeral nonce
      const nonce = nacl.randomBytes(nacl.box.nonceLength);

      // Convert message to bytes
      const messageBytes = encodeUTF8(JSON.stringify(message));

      // Encrypt message
      const encrypted = nacl.box.after(messageBytes, nonce, sharedSecret);

      // Combine nonce and encrypted data
      const combined = new Uint8Array(nonce.length + encrypted.length);
      combined.set(nonce);
      combined.set(encrypted, nonce.length);

      // Return base64 encoded encrypted message
      const encryptedMessage = encodeBase64(combined);

      console.log('🔒 Message encrypted for chat:', chatId.substring(0, 8) + '...');

      return {
        encryptedMessage,
        timestamp: Date.now(),
        messageType: typeof message === 'string' ? 'text' : 'object',
      };

    } catch (error) {
      console.error('Message encryption failed:', error);
      throw error;
    }
  }, [keyPair, sharedSecrets]);

  /**
   * Decrypt received message
   */
  const decryptMessage = useCallback(async (encryptedMessage, chatId) => {
    try {
      if (!keyPair || !sharedSecrets.has(chatId)) {
        throw new Error('Cryptographic keys not ready');
      }

      // Get shared secret for this chat
      const sharedSecret = decodeBase64(sharedSecrets.get(chatId));

      // Decode encrypted message
      const encryptedData = decodeBase64(encryptedMessage);

      // Extract nonce and ciphertext
      const nonce = encryptedData.slice(0, nacl.box.nonceLength);
      const ciphertext = encryptedData.slice(nacl.box.nonceLength);

      // Decrypt message
      const decrypted = nacl.box.open.after(ciphertext, nonce, sharedSecret);

      if (!decrypted) {
        throw new Error('Message decryption failed - possibly corrupted');
      }

      // Convert bytes back to message
      const messageString = decodeUTF8(decrypted);
      const message = JSON.parse(messageString);

      console.log('🔓 Message decrypted for chat:', chatId.substring(0, 8) + '...');

      return {
        message,
        timestamp: Date.now(),
        success: true,
      };

    } catch (error) {
      console.error('Message decryption failed:', error);
      throw error;
    }
  }, [keyPair, sharedSecrets]);

  /**
   * Encrypt file for sharing
   */
  const encryptFile = useCallback(async (fileData, chatId) => {
    try {
      if (!keyPair || !sharedSecrets.has(chatId)) {
        throw new Error('Cryptographic keys not ready');
      }

      const sharedSecret = decodeBase64(sharedSecrets.get(chatId));
      const nonce = nacl.randomBytes(nacl.box.nonceLength);

      // Convert file data to bytes
      const fileBytes = new Uint8Array(fileData);

      // Encrypt file data
      const encrypted = nacl.box.after(fileBytes, nonce, sharedSecret);

      // Combine nonce and encrypted data
      const combined = new Uint8Array(nonce.length + encrypted.length);
      combined.set(nonce);
      combined.set(encrypted, nonce.length);

      return {
        encryptedFile: encodeBase64(combined),
        originalSize: fileBytes.length,
        encryptedSize: combined.length,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('File encryption failed:', error);
      throw error;
    }
  }, [keyPair, sharedSecrets]);

  /**
   * Decrypt received file
   */
  const decryptFile = useCallback(async (encryptedFile, chatId) => {
    try {
      if (!keyPair || !sharedSecrets.has(chatId)) {
        throw new Error('Cryptographic keys not ready');
      }

      const sharedSecret = decodeBase64(sharedSecrets.get(chatId));
      const encryptedData = decodeBase64(encryptedFile);

      // Extract nonce and ciphertext
      const nonce = encryptedData.slice(0, nacl.box.nonceLength);
      const ciphertext = encryptedData.slice(nacl.box.nonceLength);

      // Decrypt file data
      const decrypted = nacl.box.open.after(ciphertext, nonce, sharedSecret);

      if (!decrypted) {
        throw new Error('File decryption failed');
      }

      return {
        fileData: decrypted,
        size: decrypted.length,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('File decryption failed:', error);
      throw error;
    }
  }, [keyPair, sharedSecrets]);

  /**
   * Generate secure chat key
   */
  const generateChatKey = useCallback(async (chatId) => {
    try {
      // Generate chat-specific key for additional encryption layer
      const chatKey = nacl.randomBytes(32);

      // Store chat key (in production, derive from shared secret)
      setSharedSecrets(prev => {
        const newMap = new Map(prev);
        newMap.set(`${chatId}_key`, encodeBase64(chatKey));
        return newMap;
      });

      return encodeBase64(chatKey);

    } catch (error) {
      console.error('Chat key generation failed:', error);
      throw error;
    }
  }, []);

  /**
   * Create digital signature for message integrity
   */
  const signMessage = useCallback(async (message) => {
    try {
      if (!keyPair) {
        throw new Error('Key pair not initialized');
      }

      const messageBytes = encodeUTF8(JSON.stringify(message));
      const secretKey = decodeBase64(keyPair.secretKey);

      // Create signature
      const signature = nacl.sign.detached(messageBytes, secretKey);

      return encodeBase64(signature);

    } catch (error) {
      console.error('Message signing failed:', error);
      throw error;
    }
  }, [keyPair]);

  /**
   * Verify message signature
   */
  const verifyMessage = useCallback(async (message, signature, publicKey) => {
    try {
      const messageBytes = encodeUTF8(JSON.stringify(message));
      const signatureBytes = decodeBase64(signature);
      const pubKeyBytes = decodeBase64(publicKey);

      return nacl.sign.detached.verify(messageBytes, signatureBytes, pubKeyBytes);

    } catch (error) {
      console.error('Message verification failed:', error);
      return false;
    }
  }, []);

  /**
   * Rotate keys for perfect forward secrecy
   */
  const rotateKeys = useCallback(async () => {
    try {
      console.log('🔄 Rotating cryptographic keys...');

      // Generate new key pair
      const newKeyPair = nacl.box.keyPair();

      // Clear old shared secrets (force re-keying)
      setSharedSecrets(new Map());

      // Update key pair
      setKeyPair({
        publicKey: encodeBase64(newKeyPair.publicKey),
        secretKey: encodeBase64(newKeyPair.secretKey),
      });

      console.log('✅ Cryptographic keys rotated');

      return {
        publicKey: encodeBase64(newKeyPair.publicKey),
        rotated: true,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Key rotation failed:', error);
      throw error;
    }
  }, []);

  /**
   * Get cryptographic status
   */
  const getCryptoStatus = useCallback(() => {
    return {
      initialized: !!keyPair,
      status: cryptoStatus.current,
      keyCount: sharedSecrets.size,
      hasKeys: keyPair !== null,
    };
  }, [keyPair, sharedSecrets]);

  /**
   * Clean up cryptographic data (for logout)
   */
  const cleanupCrypto = useCallback(() => {
    try {
      setKeyPair(null);
      setSharedSecrets(new Map());
      cryptoStatus.current = 'uninitialized';

      console.log('🧹 Cryptographic data cleaned up');

    } catch (error) {
      console.error('Crypto cleanup failed:', error);
    }
  }, []);

  return {
    // State
    keyPair,
    cryptoStatus: getCryptoStatus(),

    // Actions
    initializeCrypto,
    deriveSharedSecret,
    encryptMessage,
    decryptMessage,
    encryptFile,
    decryptFile,
    generateChatKey,
    signMessage,
    verifyMessage,
    rotateKeys,
    cleanupCrypto,
  };
};