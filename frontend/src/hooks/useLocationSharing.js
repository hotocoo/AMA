/**
 * Location Sharing Hook
 * Privacy-preserving location sharing
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useLocationSharing = () => {
  const { sessionId } = useAuth();
  const [locationSettings, setLocationSettings] = useState({
    precision: 'approximate', // exact, approximate, city
    shareWith: 'nobody',
    temporary: true,
  });

  /**
   * Get current location with privacy controls
   */
  const getCurrentLocation = useCallback(async (options = {}) => {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: options.highAccuracy || false,
          timeout: options.timeout || 10000,
          maximumAge: options.maximumAge || 300000, // 5 minutes
        });
      });

      // Apply privacy transformation based on settings
      const location = transformLocation(position.coords, locationSettings.precision);

      return {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: Date.now(),
        privacyLevel: locationSettings.precision,
      };
    } catch (error) {
      console.error('Location access failed:', error);
      throw error;
    }
  }, [locationSettings.precision]);

  /**
   * Transform location for privacy
   */
  const transformLocation = useCallback((coords, precision) => {
    let { latitude, longitude, accuracy } = coords;

    switch (precision) {
      case 'exact':
        // Return exact location
        break;

      case 'approximate':
        // Add random offset (up to 100 meters)
        const latOffset = (Math.random() - 0.5) * 0.001; // ~100 meters
        const lngOffset = (Math.random() - 0.5) * 0.001;
        latitude += latOffset;
        longitude += lngOffset;
        accuracy = Math.max(accuracy, 100);
        break;

      case 'city':
        // Round to city level (reduce precision significantly)
        latitude = Math.round(latitude * 100) / 100; // 2 decimal places
        longitude = Math.round(longitude * 100) / 100;
        accuracy = 10000; // ~10km
        break;

      default:
        // Maximum privacy - no location sharing
        latitude = 0;
        longitude = 0;
        accuracy = 0;
    }

    return { latitude, longitude, accuracy };
  }, []);

  /**
   * Share location in chat
   */
  const shareLocationMutation = useMutation({
    mutationFn: async ({ chatId, location, duration = 3600 }) => {
      const response = await axios.post('/api/location/share', {
        chatId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        },
        duration, // seconds until expiration
        temporary: locationSettings.temporary,
      }, {
        headers: {
          'x-anonymous-session': sessionId,
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('📍 Location shared');
    },
    onError: (error) => {
      console.error('Location sharing failed:', error);
    }
  });

  /**
   * Share location
   */
  const shareLocation = useCallback(async (chatId, duration = 3600) => {
    try {
      const location = await getCurrentLocation();
      await shareLocationMutation.mutateAsync({ chatId, location, duration });
    } catch (error) {
      console.error('Location sharing failed:', error);
      throw error;
    }
  }, [getCurrentLocation, shareLocationMutation]);

  /**
   * Update location settings
   */
  const updateLocationSettings = useCallback(async (settings) => {
    setLocationSettings(prev => ({ ...prev, ...settings }));
  }, []);

  return {
    // State
    locationSettings,

    // Actions
    getCurrentLocation,
    shareLocation,
    updateLocationSettings,

    // Status
    isSharingLocation: shareLocationMutation.isPending,
  };
};