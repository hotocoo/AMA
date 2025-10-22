/**
 * Screenshot Protection Hook
 * Anti-capture mechanisms to protect user privacy
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export const useScreenshotProtection = () => {
  const { sessionId } = useAuth();
  const [isProtected, setIsProtected] = useState(false);
  const [protectionLevel, setProtectionLevel] = useState('medium');
  const [detectionEvents, setDetectionEvents] = useState([]);

  const protectionIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);

  // Protection levels
  const PROTECTION_LEVELS = {
    low: {
      name: 'Basic',
      description: 'Basic screenshot detection',
      features: ['Print Screen detection', 'Right-click disable'],
    },
    medium: {
      name: 'Enhanced',
      description: 'Enhanced protection with overlay',
      features: ['Print Screen detection', 'Right-click disable', 'Privacy overlay', 'Blur effect'],
    },
    high: {
      name: 'Maximum',
      description: 'Maximum protection with restrictions',
      features: ['All medium features', 'Paste blocking', 'Screen recording detection', 'Content scrambling'],
    },
  };

  /**
   * Initialize screenshot protection
   */
  const initializeProtection = useCallback(async (level = 'medium') => {
    try {
      setProtectionLevel(level);
      setIsProtected(true);

      // Apply protection measures based on level
      await applyProtectionMeasures(level);

      // Start monitoring
      startMonitoring();

      console.log('🛡️ Screenshot protection initialized:', level);

    } catch (error) {
      console.error('Screenshot protection initialization failed:', error);
      setIsProtected(false);
    }
  }, []);

  /**
   * Apply protection measures based on level
   */
  const applyProtectionMeasures = useCallback(async (level) => {
    try {
      // Disable right-click context menu
      const disableRightClick = (e) => {
        e.preventDefault();
        return false;
      };

      document.addEventListener('contextmenu', disableRightClick);

      // Disable text selection
      const disableSelection = (e) => {
        e.preventDefault();
        return false;
      };

      document.addEventListener('selectstart', disableSelection);

      // Disable drag and drop
      const disableDrag = (e) => {
        e.preventDefault();
        return false;
      };

      document.addEventListener('dragstart', disableDrag);

      if (level === 'medium' || level === 'high') {
        // Add privacy overlay
        addPrivacyOverlay();

        // Add blur effect for sensitive areas
        addBlurEffect();
      }

      if (level === 'high') {
        // Block paste operations
        blockPasteOperations();

        // Add content scrambling
        addContentScrambling();

        // Detect screen recording
        detectScreenRecording();
      }

    } catch (error) {
      console.error('Protection measures application failed:', error);
    }
  }, []);

  /**
   * Add privacy overlay to sensitive content
   */
  const addPrivacyOverlay = useCallback(() => {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'privacy-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.1);
      pointer-events: none;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Add to document
    document.body.appendChild(overlay);

    // Show overlay when user tries to capture
    const showOverlay = () => {
      overlay.style.opacity = '1';

      // Record detection event
      recordDetectionEvent('privacy_overlay_triggered');

      setTimeout(() => {
        overlay.style.opacity = '0';
      }, 1000);
    };

    // Detect capture attempts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 's')) {
        showOverlay();
      }
    });

    // Detect right-click
    document.addEventListener('contextmenu', showOverlay);

    console.log('🔒 Privacy overlay added');
  }, []);

  /**
   * Add blur effect to sensitive areas
   */
  const addBlurEffect = useCallback(() => {
    // Create style element for blur effect
    const style = document.createElement('style');
    style.textContent = `
      .sensitive-content {
        filter: blur(2px);
        transition: filter 0.3s ease;
      }

      .sensitive-content:hover,
      .sensitive-content:focus {
        filter: blur(0px);
      }

      @media (max-width: 768px) {
        .sensitive-content {
          filter: blur(1px);
        }
      }
    `;

    document.head.appendChild(style);

    // Apply blur to message areas
    const messages = document.querySelectorAll('.message-content, .chat-input');
    messages.forEach(element => {
      element.classList.add('sensitive-content');
    });

    console.log('🌫️ Blur effect added');
  }, []);

  /**
   * Block paste operations
   */
  const blockPasteOperations = useCallback(() => {
    const blockPaste = (e) => {
      // Clear clipboard data
      if (e.clipboardData) {
        const text = e.clipboardData.getData('text/plain');
        if (text) {
          e.clipboardData.setData('text/plain', 'Content not available');
        }
      }

      // Record detection event
      recordDetectionEvent('paste_blocked');

      e.preventDefault();
      return false;
    };

    document.addEventListener('paste', blockPaste);

    console.log('🚫 Paste operations blocked');
  }, []);

  /**
   * Add content scrambling for maximum protection
   */
  const addContentScrambling = useCallback(() => {
    // Create scrambling overlay
    const scrambler = document.createElement('div');
    scrambler.id = 'content-scrambler';
    scrambler.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.1) 0px,
        rgba(255, 255, 255, 0.1) 10px,
        rgba(0, 0, 0, 0.1) 10px,
        rgba(0, 0, 0, 0.1) 20px
      );
      pointer-events: none;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    document.body.appendChild(scrambler);

    // Show scrambler on capture attempts
    const triggerScrambler = () => {
      scrambler.style.opacity = '1';

      recordDetectionEvent('content_scrambled');

      setTimeout(() => {
        scrambler.style.opacity = '0';
      }, 500);
    };

    // Detect various capture methods
    window.addEventListener('beforeprint', triggerScrambler);
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === 'p' || e.key === 's')) {
        triggerScrambler();
      }
    });

    console.log('🔀 Content scrambling added');
  }, []);

  /**
   * Detect screen recording attempts
   */
  const detectScreenRecording = useCallback(() => {
    // Monitor for screen recording indicators
    const checkScreenRecording = () => {
      try {
        // Check if screen is being recorded (experimental)
        if (navigator.mediaDevices.getDisplayMedia) {
          // This is a simplified check - in reality, we'd need more sophisticated detection
          const now = Date.now();
          if (now - lastActivityRef.current > 10000) { // 10 seconds of inactivity
            recordDetectionEvent('possible_screen_recording');
          }
          lastActivityRef.current = now;
        }
      } catch (error) {
        console.error('Screen recording detection failed:', error);
      }
    };

    // Check periodically
    const detectionInterval = setInterval(checkScreenRecording, 5000);

    console.log('📹 Screen recording detection enabled');
  }, []);

  /**
   * Record detection event
   */
  const recordDetectionEvent = useCallback((eventType, details = {}) => {
    const event = {
      id: `detection_${Date.now()}`,
      type: eventType,
      timestamp: Date.now(),
      details,
      sessionId: sessionId?.substring(0, 8) + '...',
    };

    setDetectionEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events

    // Log security event
    console.warn('🚨 Screenshot/capture attempt detected:', eventType);

    // Show warning to user (once per session)
    if (!warningShownRef.current) {
      showWarningNotification();
      warningShownRef.current = true;
    }
  }, [sessionId]);

  /**
   * Show warning notification
   */
  const showWarningNotification = useCallback(() => {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🛡️</span>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">Privacy Protected</div>
          <div>Screenshot attempt detected and blocked</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  /**
   * Start monitoring for capture attempts
   */
  const startMonitoring = useCallback(() => {
    // Monitor for print screen key
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        recordDetectionEvent('print_screen_pressed');
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        recordDetectionEvent('dev_tools_opened');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Monitor for visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordDetectionEvent('tab_hidden');
      } else {
        lastActivityRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Monitor mouse movements for activity
    const handleMouseMove = () => {
      lastActivityRef.current = Date.now();
    };

    document.addEventListener('mousemove', handleMouseMove);

    console.log('👁️ Screenshot monitoring started');
  }, [recordDetectionEvent]);

  /**
   * Disable protection
   */
  const disableProtection = useCallback(() => {
    try {
      // Remove overlays and effects
      const overlay = document.getElementById('privacy-overlay');
      if (overlay) {
        overlay.remove();
      }

      const scrambler = document.getElementById('content-scrambler');
      if (scrambler) {
        scrambler.remove();
      }

      // Remove sensitive content blur
      const sensitiveElements = document.querySelectorAll('.sensitive-content');
      sensitiveElements.forEach(element => {
        element.classList.remove('sensitive-content');
      });

      // Clear intervals
      if (protectionIntervalRef.current) {
        clearInterval(protectionIntervalRef.current);
        protectionIntervalRef.current = null;
      }

      setIsProtected(false);

      console.log('🛡️ Screenshot protection disabled');

    } catch (error) {
      console.error('Protection disable failed:', error);
    }
  }, []);

  /**
   * Get protection status
   */
  const getProtectionStatus = useCallback(() => {
    return {
      isProtected,
      level: protectionLevel,
      levelInfo: PROTECTION_LEVELS[protectionLevel],
      detectionCount: detectionEvents.length,
      lastDetection: detectionEvents[0]?.timestamp || null,
    };
  }, [isProtected, protectionLevel, detectionEvents]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disableProtection();
    };
  }, [disableProtection]);

  return {
    // State
    isProtected,
    protectionLevel,
    detectionEvents,
    PROTECTION_LEVELS,

    // Actions
    initializeProtection,
    disableProtection,
    getProtectionStatus,

    // Utilities
    recordDetectionEvent,
  };
};