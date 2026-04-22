/**
 * File Routes
 * Handles anonymous file operations with database integration
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { logMessageEvent, logError } = require('../middleware/logging');

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex');

// Allowed MIME types for uploaded files
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf',
  'text/plain',
  'application/zip',
]);

// 50 MB limit for encrypted file data (base64 increases size ~33%)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Uploads directory relative to this file
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Helper to get database services
 */
const getDb = (req, res) => {
  const db = req.app.get('database');
  if (!db) {
    res.status(500).json({ error: 'Database services not available' });
    return null;
  }
  return db;
};

// Upload file
const uploadFile = async (req, res) => {
  try {
    const { originalName, encryptedData, size, type, hash } = req.body;

    if (!originalName || !encryptedData || !type) {
      return res.status(400).json({ error: 'Missing required fields: originalName, encryptedData, type' });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(type)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Validate file size (base64 encoded)
    if (encryptedData.length > MAX_FILE_SIZE * 1.4) {
      return res.status(413).json({ error: 'File too large' });
    }

    const db = getDb(req, res);
    if (!db) return;

    const fileId = generateId();
    // Use only the fileId as the stored filename to avoid path traversal
    const storedFilename = fileId;
    const filePath = path.join(UPLOADS_DIR, storedFilename);

    const fileInfo = {
      originalName: path.basename(originalName), // strip any path components
      encryptedName: storedFilename,
      size: size || Buffer.byteLength(encryptedData, 'base64'),
      type,
      hash: hash || crypto.createHash('sha256').update(encryptedData).digest('hex')
    };

    // Ensure uploads directory exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    // Store encrypted file data on disk (decoded from base64)
    await fs.writeFile(filePath, encryptedData, 'base64');

    // Store file metadata in database
    await db.fileStore.storeFile(fileId, fileInfo);

    logMessageEvent('file_uploaded', {
      id: fileId.substring(0, 8) + '...',
      size: fileInfo.size,
      type: fileInfo.type
    });

    res.json({
      success: true,
      fileId,
      filename: fileInfo.originalName,
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

    const db = getDb(req, res);
    if (!db) return;

    const fileInfo = await db.fileStore.getFile(fileId);
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

    const db = getDb(req, res);
    if (!db) return;

    const fileInfo = await db.fileStore.getFile(fileId);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Use only the stored filename (which is the fileId) — no user-controlled path
    const filePath = path.join(UPLOADS_DIR, fileInfo.encryptedName);

    try {
      // Read raw binary and convert to base64 for the client
      const rawData = await fs.readFile(filePath);
      const encryptedData = rawData.toString('base64');

      res.json({
        fileId,
        filename: fileInfo.originalName,
        type: fileInfo.type,
        size: fileInfo.size,
        hash: fileInfo.hash,
        encryptedData
      });
    } catch (fileError) {
      return res.status(404).json({ error: 'File data not found on disk' });
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

    const db = getDb(req, res);
    if (!db) return;

    const fileInfo = await db.fileStore.getFile(fileId);

    // Remove from database first
    await db.fileStore.deleteFile(fileId);

    // Remove from disk if metadata was found
    if (fileInfo) {
      const filePath = path.join(UPLOADS_DIR, fileInfo.encryptedName);
      await fs.unlink(filePath).catch(() => {}); // ignore if file already gone
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
