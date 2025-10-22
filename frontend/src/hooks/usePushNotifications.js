/**
 * Push Notifications Hook
 * Anonymous push notifications with privacy protection
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';

export const usePushNotifications = () => {
  const { sessionId } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');

  /**
   * Initialize push notifications
   */
  const initializeNotifications = useCallback(async () => {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('Push notifications not supported');
        return false;
      }

      setIsSupported(true);
      setPermission(Notification.permission);

      if (Notification.permission === 'granted') {
        setIsEnabled(true);
        await registerServiceWorker();
      }

      return true;
    } catch (error) {
      console.error('Notification initialization failed:', error);
      return false;
    }
  }, []);

  /**
   * Register service worker for push notifications
   */
  const registerServiceWorker = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY
        ),
      });

      // Send subscription to server
      await sendSubscriptionToServer(subscription);

      console.log('🔔 Push notifications registered');

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }, []);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        setIsEnabled(true);
        await registerServiceWorker();
      }

      return permission;
    } catch (error) {
      console.error('Permission request failed:', error);
      return 'denied';
    }
  }, [registerServiceWorker]);

  /**
   * Send subscription to server
   */
  const sendSubscriptionToServer = useCallback(async (subscription) => {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anonymous-session': sessionId,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          anonymous: true,
        }),
      });

      console.log('📡 Subscription sent to server');
    } catch (error) {
      console.error('Subscription send failed:', error);
    }
  }, [sessionId]);

  /**
   * Enable notifications
   */
  const enableNotifications = useCallback(async () => {
    if (permission === 'granted') {
      setIsEnabled(true);
      await registerServiceWorker();
    } else {
      await requestPermission();
    }
  }, [permission, requestPermission, registerServiceWorker]);

  /**
   * Disable notifications
   */
  const disableNotifications = useCallback(async () => {
    try {
      setIsEnabled(false);

      // Unsubscribe from push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'x-anonymous-session': sessionId,
          },
        });
      }

      console.log('🔕 Notifications disabled');
    } catch (error) {
      console.error('Notification disable failed:', error);
    }
  }, [sessionId]);

  /**
   * Show local notification
   */
  const showLocalNotification = useCallback((title, options = {}) => {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          silent: options.silent || false,
          requireInteraction: options.requireInteraction || false,
          ...options,
        });

        // Auto-close after 5 seconds if not requiring interaction
        if (!options.requireInteraction) {
          setTimeout(() => {
            notification.close();
          }, 5000);
        }

        return notification;
      }
    } catch (error) {
      console.error('Local notification failed:', error);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeNotifications();
  }, [initializeNotifications]);

  return {
    // State
    isSupported,
    isEnabled,
    permission,

    // Actions
    requestPermission,
    enableNotifications,
    disableNotifications,
    showLocalNotification,

    // Utilities
    initializeNotifications,
  };
};

/**
 * Convert VAPID key
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}