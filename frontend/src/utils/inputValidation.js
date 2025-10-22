/**
 * Input Validation Utilities
 * Comprehensive input validation and sanitization
 */

export const inputValidation = {
  /**
   * Validate message content
   */
  validateMessage: (content) => {
    const errors = [];

    if (!content || typeof content !== 'string') {
      errors.push('Message content is required');
    } else {
      // Check length
      if (content.length > 4096) {
        errors.push('Message too long (max 4096 characters)');
      }

      // Check for suspicious patterns
      if (/javascript:|data:|vbscript:/i.test(content)) {
        errors.push('Invalid content detected');
      }

      // Check for excessive repetition
      if (/(.)\1{100,}/.test(content)) {
        errors.push('Message contains excessive repetition');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate file for upload
   */
  validateFile: (file) => {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File too large (max 100MB)');
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav',
      'application/pdf', 'text/plain', 'application/msword',
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name too long');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate chat name
   */
  validateChatName: (name) => {
    const errors = [];

    if (!name || typeof name !== 'string') {
      errors.push('Chat name is required');
    } else {
      if (name.length < 3) {
        errors.push('Chat name too short (min 3 characters)');
      }

      if (name.length > 50) {
        errors.push('Chat name too long (max 50 characters)');
      }

      // Check for invalid characters
      if (!/^[a-zA-Z0-9\s\-_()]+$/.test(name)) {
        errors.push('Chat name contains invalid characters');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Sanitize input
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  },

  /**
   * Validate email (for contact purposes)
   */
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return {
      valid: emailRegex.test(email),
      errors: emailRegex.test(email) ? [] : ['Invalid email format'],
    };
  },

  /**
   * Validate phone number
   */
  validatePhone: (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;

    return {
      valid: phoneRegex.test(phone),
      errors: phoneRegex.test(phone) ? [] : ['Invalid phone number format'],
    };
  },

  /**
   * Validate URL
   */
  validateUrl: (url) => {
    try {
      new URL(url);
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ['Invalid URL format'] };
    }
  },
};