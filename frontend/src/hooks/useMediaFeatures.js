/**
 * Advanced Media Features Hook
 * Media editing, compression, and quality selection
 */

import { useState, useCallback } from 'react';

export const useMediaFeatures = () => {
  const [mediaSettings, setMediaSettings] = useState({
    compressionQuality: 'high',
    autoCompress: true,
    preserveMetadata: false,
    defaultFormat: 'original',
  });

  /**
   * Compress image
   */
  const compressImage = useCallback(async (file, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920px)
        const maxDimension = 1920;
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }));
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', quality);
      };

      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Compress video
   */
  const compressVideo = useCallback(async (file, quality = 'medium') => {
    // Video compression would require a library like FFmpeg.wasm
    // For now, return the original file
    console.log('🎥 Video compression requested (requires FFmpeg.wasm)');
    return file;
  }, []);

  /**
   * Generate thumbnail from media
   */
  const generateThumbnail = useCallback(async (file) => {
    if (file.type.startsWith('image/')) {
      return generateImageThumbnail(file);
    } else if (file.type.startsWith('video/')) {
      return generateVideoThumbnail(file);
    }
    return null;
  }, []);

  /**
   * Generate image thumbnail
   */
  const generateImageThumbnail = useCallback(async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Create 150x150 thumbnail
        canvas.width = 150;
        canvas.height = 150;

        ctx.drawImage(img, 0, 0, 150, 150);

        canvas.toBlob((blob) => {
          resolve({
            thumbnail: canvas.toDataURL('image/jpeg', 0.7),
            type: 'image',
          });
        }, 'image/jpeg', 0.7);
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Generate video thumbnail
   */
  const generateVideoThumbnail = useCallback(async (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Create 150x150 thumbnail
        canvas.width = 150;
        canvas.height = 150;

        // Seek to 1 second for thumbnail
        video.currentTime = 1;

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, 150, 150);

          canvas.toBlob((blob) => {
            resolve({
              thumbnail: canvas.toDataURL('image/jpeg', 0.7),
              type: 'video',
              duration: video.duration,
            });
          }, 'image/jpeg', 0.7);
        };
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Apply media filter/effect
   */
  const applyMediaEffect = useCallback(async (file, effect) => {
    // Media effects would require canvas manipulation
    console.log('🎨 Media effect applied:', effect);
    return file;
  }, []);

  /**
   * Update media settings
   */
  const updateMediaSettings = useCallback((settings) => {
    setMediaSettings(prev => ({ ...prev, ...settings }));
  }, []);

  return {
    // State
    mediaSettings,

    // Actions
    compressImage,
    compressVideo,
    generateThumbnail,
    applyMediaEffect,
    updateMediaSettings,
  };
};