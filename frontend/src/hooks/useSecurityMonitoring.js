/**
 * Security Monitoring Hook
 * Real-time security monitoring and intrusion detection
 */

import { useState, useCallback, useEffect } from 'react';

export const useSecurityMonitoring = () => {
  const [securityEvents, setSecurityEvents] = useState([]);
  const [threatLevel, setThreatLevel] = useState('low');
  const [isMonitoring, setIsMonitoring] = useState(true);

  /**
   * Start security monitoring
   */
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);

    // Monitor for suspicious activities
    monitorSuspiciousActivities();

    console.log('🛡️ Security monitoring started');
  }, []);

  /**
   * Stop security monitoring
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log('🛡️ Security monitoring stopped');
  }, []);

  /**
   * Monitor for suspicious activities
   */
  const monitorSuspiciousActivities = useCallback(() => {
    // Monitor rapid message sending
    monitorRapidMessaging();

    // Monitor unusual access patterns
    monitorAccessPatterns();

    // Monitor for bot-like behavior
    monitorBotBehavior();

    // Monitor for data exfiltration attempts
    monitorDataExfiltration();
  }, []);

  /**
   * Monitor rapid message sending
   */
  const monitorRapidMessaging = useCallback(() => {
    const messageTimestamps = [];

    const checkRapidMessaging = () => {
      const now = Date.now();
      const recentMessages = messageTimestamps.filter(time => now - time < 60000); // Last minute

      if (recentMessages.length > 50) {
        recordSecurityEvent('rapid_messaging_detected', {
          messageCount: recentMessages.length,
          severity: 'high',
        });
        setThreatLevel('high');
      } else if (recentMessages.length > 20) {
        recordSecurityEvent('elevated_messaging_detected', {
          messageCount: recentMessages.length,
          severity: 'medium',
        });
        setThreatLevel('medium');
      }

      // Keep only recent timestamps
      messageTimestamps.push(now);
      if (messageTimestamps.length > 100) {
        messageTimestamps.splice(0, messageTimestamps.length - 100);
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkRapidMessaging, 10000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Monitor access patterns
   */
  const monitorAccessPatterns = useCallback(() => {
    const accessTimes = [];

    const checkAccessPatterns = () => {
      const now = Date.now();
      accessTimes.push(now);

      // Keep only last 24 hours
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const recentAccess = accessTimes.filter(time => time > dayAgo);

      // Check for unusual patterns
      if (recentAccess.length > 1000) {
        recordSecurityEvent('unusual_access_pattern', {
          accessCount: recentAccess.length,
          severity: 'medium',
        });
      }
    };

    // Track page access
    const trackAccess = () => {
      checkAccessPatterns();
    };

    document.addEventListener('click', trackAccess);
    document.addEventListener('keydown', trackAccess);

    return () => {
      document.removeEventListener('click', trackAccess);
      document.removeEventListener('keydown', trackAccess);
    };
  }, []);

  /**
   * Monitor for bot-like behavior
   */
  const monitorBotBehavior = useCallback(() => {
    const keystrokeTimestamps = [];

    const checkBotBehavior = (e) => {
      const now = Date.now();
      keystrokeTimestamps.push(now);

      // Keep only last 30 seconds
      const thirtySecondsAgo = now - 30000;
      const recentKeystrokes = keystrokeTimestamps.filter(time => time > thirtySecondsAgo);

      // Check for perfectly timed keystrokes (bot-like)
      if (recentKeystrokes.length > 100) {
        const intervals = [];
        for (let i = 1; i < recentKeystrokes.length; i++) {
          intervals.push(recentKeystrokes[i] - recentKeystrokes[i - 1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const consistentTiming = intervals.every(interval =>
          Math.abs(interval - avgInterval) < 5
        );

        if (consistentTiming) {
          recordSecurityEvent('bot_behavior_detected', {
            keystrokeCount: recentKeystrokes.length,
            consistentTiming: true,
            severity: 'high',
          });
        }
      }
    };

    document.addEventListener('keydown', checkBotBehavior);

    return () => {
      document.removeEventListener('keydown', checkBotBehavior);
    };
  }, []);

  /**
   * Monitor for data exfiltration attempts
   */
  const monitorDataExfiltration = useCallback(() => {
    // Monitor clipboard operations
    const checkClipboardAccess = () => {
      if (navigator.clipboard) {
        // Monitor for unusual clipboard access patterns
        recordSecurityEvent('clipboard_access_monitored');
      }
    };

    document.addEventListener('copy', checkClipboardAccess);
    document.addEventListener('paste', checkClipboardAccess);

    return () => {
      document.removeEventListener('copy', checkClipboardAccess);
      document.removeEventListener('paste', checkClipboardAccess);
    };
  }, []);

  /**
   * Record security event
   */
  const recordSecurityEvent = useCallback((eventType, details = {}) => {
    const event = {
      id: `security_${Date.now()}`,
      type: eventType,
      timestamp: Date.now(),
      details,
      threatLevel: details.severity || 'low',
    };

    setSecurityEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100 events

    console.warn('🚨 Security event detected:', eventType, details);

    // Update threat level if needed
    if (details.severity === 'high') {
      setThreatLevel('high');
    } else if (details.severity === 'medium' && threatLevel === 'low') {
      setThreatLevel('medium');
    }
  }, [threatLevel]);

  /**
   * Get security status
   */
  const getSecurityStatus = useCallback(() => {
    const recentEvents = securityEvents.filter(event =>
      Date.now() - event.timestamp < 300000 // Last 5 minutes
    );

    const highThreatEvents = recentEvents.filter(event => event.threatLevel === 'high');
    const mediumThreatEvents = recentEvents.filter(event => event.threatLevel === 'medium');

    return {
      threatLevel,
      isMonitoring,
      recentEvents: recentEvents.length,
      highThreatEvents: highThreatEvents.length,
      mediumThreatEvents: mediumThreatEvents.length,
      lastEvent: securityEvents[0]?.timestamp || null,
    };
  }, [threatLevel, isMonitoring, securityEvents]);

  /**
   * Initialize monitoring on mount
   */
  useEffect(() => {
    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  return {
    // State
    securityEvents,
    threatLevel,
    isMonitoring,

    // Actions
    startMonitoring,
    stopMonitoring,
    recordSecurityEvent,

    // Utilities
    getSecurityStatus,
  };
};