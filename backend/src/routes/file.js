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

// Allowed MIME type prefixes for uploaded files
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf',
  'text/plain',
  'application/zip', 'application/x-zip-compressed',
]);

// Maximum file size: 50MB (base64 encoded, so actual binary ~37MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Resolved uploads directory (prevent path traversal)
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/**
 * Ensure uploads directory exists
 */
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    // Directory likely already exists
  }
};

/**
 * Safely resolve a file path inside the uploads directory
 */
const safeFilePath = (filename) => {
  // Strip any path separators from filename
  const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const resolved = path.resolve(UPLOADS_DIR, safe);
  // Ensure the resolved path is still inside uploads dir (files must be direct children)
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid file path');
  }
  return resolved;
};

// Upload file
const uploadFile = async (req, res) => {
  try {
    const { originalName, encryptedData, size, type, hash } = req.body;

    if (!originalName || !encryptedData || !type) {
      return res.status(400).json({ error: 'Missing required fields: originalName, encryptedData, type' });
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Validate file name length
    if (typeof originalName !== 'string' || originalName.length > 255) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    // Validate file size
    if (typeof encryptedData !== 'string' || encryptedData.length > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File too large' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    await ensureUploadsDir();

    const fileId = generateId();
    // Sanitize the original name for the encrypted filename
    const sanitizedName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const encryptedName = `${fileId}_${sanitizedName}`;

    const fileInfo = {
      originalName: sanitizedName,
      encryptedName,
      size: size || Buffer.from(encryptedData, 'base64').length,
      type,
      hash: hash || crypto.createHash('sha256').update(encryptedData).digest('hex')
    };

    // Write file to disk safely
    const filePath = safeFilePath(encryptedName);
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
      filename: sanitizedName,
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

    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({ error: 'Invalid fileId' });
    }

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

    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({ error: 'Invalid fileId' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    const fileInfo = await databaseServices.fileStore.getFile(fileId);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Safely resolve file path
    let filePath;
    try {
      filePath = safeFilePath(fileInfo.encryptedName);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

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

    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({ error: 'Invalid fileId' });
    }

    // Get database services from app
    const databaseServices = req.app.get('database');
    if (!databaseServices || !databaseServices.fileStore) {
      return res.status(500).json({ error: 'Database services not available' });
    }

    // Get file metadata first so we can delete from disk
    const fileInfo = await databaseServices.fileStore.getFile(fileId);

    // Delete from disk if it exists
    if (fileInfo && fileInfo.encryptedName) {
      try {
        const filePath = safeFilePath(fileInfo.encryptedName);
        await fs.unlink(filePath);
      } catch (diskError) {
        // Log but don't fail if file is already gone from disk
        logError(diskError, { context: 'file_disk_delete' });
      }
    }

    // Delete from database
    await databaseServices.fileStore.deleteFile(fileId);

    logMessageEvent('file_deleted', { id: fileId.substring(0, 8) + '...' });

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
