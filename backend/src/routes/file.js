/**
 * File Routes
 * Handles anonymous file operations with database integration
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { logMessageEvent, logError } = require('../middleware/logging');

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex');

// Uploads directory path
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

// Upload file
const uploadFile = async (req, res) => {
  try {
    // For this implementation, expect file data in body (base64 or similar)
    // In a real app, use multer for multipart/form-data
    const { originalName, encryptedData, size, type, hash } = req.body;

    if (!originalName || !encryptedData || !type) {
      return res.status(400).json({ error: 'Missing required fields: originalName, encryptedData, type' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const fileId = generateId();
    const fileInfo = {
      originalName,
      encryptedName: `${fileId}_${originalName}`,
      size: size || Buffer.from(encryptedData, 'base64').length,
      type,
      hash: hash || crypto.createHash('sha256').update(encryptedData).digest('hex')
    };

    // Ensure uploads directory exists before writing
    await ensureUploadsDir();

    // Store encrypted file data in uploads directory
    const filePath = path.join(UPLOADS_DIR, fileInfo.encryptedName);
    await fs.writeFile(filePath, encryptedData, 'base64');

    // Store file metadata in database
    await databaseServices.fileStore.storeFile(fileId, fileInfo);

    // Log file upload event
    logMessageEvent('file_uploaded', {
      id: fileId.substring(0, 8) + '...',
      size: fileInfo.size,
      type: fileInfo.type
    });

    res.json({
      success: true,
      fileId,
      filename: originalName,
      size: fileInfo.size
    });
  } catch (error) {
    logError(error, { context: 'file_upload' });
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Get file info
const getFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const fileInfo = await databaseServices.fileStore.getFile(fileId);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file: fileInfo });
  } catch (error) {
    logError(error, { context: 'get_file' });
    res.status(500).json({ error: 'Failed to get file' });
  }
};

// Download file
const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const fileInfo = await databaseServices.fileStore.getFile(fileId);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Serve the actual encrypted file
    const filePath = path.join(UPLOADS_DIR, fileInfo.encryptedName);

    try {
      const fileData = await fs.readFile(filePath, 'base64');
      res.json({
        fileId,
        filename: fileInfo.originalName,
        type: fileInfo.type,
        size: fileInfo.size,
        hash: fileInfo.hash,
        encryptedData: fileData
      });
    } catch (fileError) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
  } catch (error) {
    logError(error, { context: 'download_file' });
    res.status(500).json({ error: 'Failed to download file' });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    // Get file info before deletion to remove from disk
    const fileInfo = await databaseServices.fileStore.getFile(fileId);

    // Delete from database
    await databaseServices.fileStore.deleteFile(fileId);

    // Delete from disk if found
    if (fileInfo?.encryptedName) {
      const filePath = path.join(UPLOADS_DIR, fileInfo.encryptedName);
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        // File may not exist on disk; log but don't fail the request
        logError(unlinkError, { context: 'delete_file_disk', fileId: fileId.substring(0, 8) + '...' });
      }
    }

    res.json({ success: true });
  } catch (error) {
    logError(error, { context: 'delete_file' });
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

module.exports = {
  uploadFile,
  getFile,
  downloadFile,
  deleteFile
};