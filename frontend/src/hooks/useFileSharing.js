/**
 * File Sharing Hook
 * Secure file sharing with encryption and size limits
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './useAuth';
import { useCrypto } from './useCrypto';

export const useFileSharing = () => {
  const { sessionId } = useAuth();
  const { encryptFile, decryptFile } = useCrypto();
  const [uploadProgress, setUploadProgress] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});

  // File size limits (in bytes)
  const FILE_LIMITS = {
    image: 10 * 1024 * 1024,      // 10MB
    video: 100 * 1024 * 1024,     // 100MB
    audio: 50 * 1024 * 1024,      // 50MB
    document: 25 * 1024 * 1024,   // 25MB
    other: 10 * 1024 * 1024,      // 10MB
  };

  // Allowed file types
  const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
    document: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv',
    ],
  };

  /**
   * Get file category based on MIME type
   */
  const getFileCategory = useCallback((mimeType) => {
    for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
      if (types.includes(mimeType)) {
        return category;
      }
    }
    return 'other';
  }, []);

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file) => {
    const errors = [];

    // Check file size
    const category = getFileCategory(file.type);
    const maxSize = FILE_LIMITS[category];

    if (file.size > maxSize) {
      errors.push(`File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit for ${category} files`);
    }

    // Check file type
    if (!Object.values(ALLOWED_TYPES).flat().includes(file.type)) {
      errors.push('File type not allowed');
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name too long');
    }

    // Check for malicious patterns
    if (/[\x00-\x1f\x7f-\x9f]/.test(file.name)) {
      errors.push('Invalid characters in file name');
    }

    return {
      valid: errors.length === 0,
      errors,
      category,
    };
  }, [getFileCategory]);

  /**
   * Upload and share file
   */
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, chatId, onProgress }) => {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Read file as array buffer
      const fileBuffer = await file.arrayBuffer();

      // Encrypt file
      const encryptedFile = await encryptFile(fileBuffer, chatId);

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', new Blob([encryptedFile.encryptedFile]), {
        type: 'application/octet-stream',
      });
      formData.append('originalName', file.name);
      formData.append('fileType', file.type);
      formData.append('fileSize', file.size.toString());
      formData.append('chatId', chatId);
      formData.append('encrypted', 'true');

      // Upload with progress tracking
      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'x-anonymous-session': sessionId,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            onProgress(progress);
          }
        },
      });

      return response.data;
    },
    onSuccess: (data, { file }) => {
      // Clear progress
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });

      console.log('📁 File uploaded and shared:', data.fileId);
    },
    onError: (error, { file }) => {
      // Clear progress
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });

      console.error('File upload failed:', error);
    }
  });

  /**
   * Download and decrypt file
   */
  const downloadFileMutation = useMutation({
    mutationFn: async ({ fileId, chatId, onProgress }) => {
      // Download encrypted file
      const response = await axios.get(`/api/files/${fileId}/download`, {
        headers: {
          'x-anonymous-session': sessionId,
        },
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent) => {
          if (onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(prev => ({ ...prev, [fileId]: progress }));
            onProgress(progress);
          }
        },
      });

      // Decrypt file
      const decryptedFile = await decryptFile(response.data, chatId);

      return {
        fileData: decryptedFile.fileData,
        fileId,
        size: decryptedFile.size,
      };
    },
    onSuccess: (data, { fileId }) => {
      // Clear progress
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });

      console.log('📥 File downloaded and decrypted:', fileId);
    },
    onError: (error, { fileId }) => {
      // Clear progress
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });

      console.error('File download failed:', error);
    }
  });

  /**
   * Share file in chat
   */
  const shareFile = useCallback(async (file, chatId) => {
    try {
      await uploadFileMutation.mutateAsync({
        file,
        chatId,
        onProgress: (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      });

      return true;
    } catch (error) {
      console.error('File sharing failed:', error);
      return false;
    }
  }, [uploadFileMutation]);

  /**
   * Download file from chat
   */
  const downloadSharedFile = useCallback(async (fileId, chatId) => {
    try {
      const result = await downloadFileMutation.mutateAsync({
        fileId,
        chatId,
        onProgress: (progress) => {
          console.log(`Download progress: ${progress}%`);
        }
      });

      return result;
    } catch (error) {
      console.error('File download failed:', error);
      return null;
    }
  }, [downloadFileMutation]);

  /**
   * Compress image before upload
   */
  const compressImage = useCallback(async (file, quality = 0.8) => {
    return new Promise((resolve) => {
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
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        }, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Generate thumbnail for file
   */
  const generateThumbnail = useCallback(async (file) => {
    const category = getFileCategory(file.type);

    if (category === 'image') {
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
    }

    if (category === 'video') {
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
    }

    // Default thumbnail for other file types
    return {
      thumbnail: null,
      type: category,
    };
  }, [getFileCategory]);

  /**
   * Format file size for display
   */
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Get file icon based on type
   */
  const getFileIcon = useCallback((mimeType) => {
    const category = getFileCategory(mimeType);

    switch (category) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  }, [getFileCategory]);

  return {
    // File operations
    shareFile,
    downloadSharedFile,
    compressImage,
    generateThumbnail,

    // Validation
    validateFile,
    getFileCategory,
    formatFileSize,
    getFileIcon,

    // Progress tracking
    uploadProgress,
    downloadProgress,

    // Status
    isUploading: uploadFileMutation.isPending,
    isDownloading: downloadFileMutation.isPending,

    // Constants
    FILE_LIMITS,
    ALLOWED_TYPES,
  };
};