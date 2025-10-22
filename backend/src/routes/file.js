/**
 * File Routes
 * Handles anonymous file operations with database integration
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { logMessageEvent, logError } = require('../middleware/logging');

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex');

// Upload file
const uploadFile = async (req, res) => {
  try {
    // In a real implementation, you'd use multer or similar for file handling
    // For this demo, we'll simulate file upload
    const { originalName, encryptedName, size, type, hash } = req.body;

    if (!originalName || !encryptedName || !type) {
      return res.status(400).json({ error: 'Missing required fields: originalName, encryptedName, type' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const fileId = generateId();
    const fileInfo = {
      originalName,
      encryptedName,
      size: size || 0,
      type,
      hash: hash || crypto.createHash('sha256').update(encryptedName).digest('hex')
    };

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

    // In a real implementation, you'd serve the actual encrypted file
    // For this demo, we'll return file info
    res.json({
      fileId,
      filename: fileInfo.originalName,
      type: fileInfo.type,
      size: fileInfo.size,
      hash: fileInfo.hash,
      note: 'File download simulation - in production this would serve the actual encrypted file'
    });
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

    await databaseServices.fileStore.deleteFile(fileId);

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