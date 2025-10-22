/**
 * File Routes
 * Handles anonymous file operations
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// In-memory storage for demo (use database in production)
const files = new Map();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex');

// Upload file
const uploadFile = async (req, res) => {
  try {
    // In a real implementation, you'd use multer or similar for file handling
    // For this demo, we'll simulate file upload
    const { filename, content, type, size } = req.body;

    if (!filename || !content || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fileId = generateId();
    const fileInfo = {
      id: fileId,
      filename,
      type,
      size: size || content.length,
      uploaded: Date.now(),
      sessionId: req.sessionId
    };

    // Store file info
    files.set(fileId, fileInfo);

    res.json({
      success: true,
      fileId,
      filename,
      size: fileInfo.size
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Get file info
const getFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!files.has(fileId)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileInfo = files.get(fileId);
    res.json({ file: fileInfo });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
};

// Download file
const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!files.has(fileId)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileInfo = files.get(fileId);

    // In a real implementation, you'd serve the actual file
    // For this demo, we'll return file info
    res.json({
      fileId,
      filename: fileInfo.filename,
      type: fileInfo.type,
      size: fileInfo.size,
      note: 'File download simulation - in production this would serve the actual file'
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!files.has(fileId)) {
      return res.status(404).json({ error: 'File not found' });
    }

    files.delete(fileId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

module.exports = {
  uploadFile,
  getFile,
  downloadFile,
  deleteFile
};