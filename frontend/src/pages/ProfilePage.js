/**
 * Profile Page
 * Anonymous user profile with privacy controls
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FiShield,
  FiLock,
  FiEye,
  FiClock,
  FiKey,
  FiRefreshCw,
  FiDownload,
  FiUpload
} from 'react-icons/fi';

const ProfilePage = () => {
  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile</h1>
        <p>Your anonymous identity and security settings</p>
      </div>

      <div className="profile-container">
        {/* Anonymous Identity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="profile-section"
        >
          <h2>Anonymous Identity</h2>

          <div className="identity-card">
            <div className="identity-avatar">
              <FiShield size={48} />
            </div>

            <div className="identity-info">
              <h3>Anonymous User</h3>
              <p className="identity-description">
                Maximum privacy • No personal data stored
              </p>

              <div className="identity-features">
                <div className="feature-badge">
                  <FiLock size={14} />
                  <span>Encrypted</span>
                </div>
                <div className="feature-badge">
                  <FiEye size={14} />
                  <span>Private</span>
                </div>
                <div className="feature-badge">
                  <FiShield size={14} />
                  <span>Secure</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="profile-section"
        >
          <h2>Security Status</h2>

          <div className="security-grid">
            <div className="security-item">
              <div className="security-icon">
                <FiKey size={24} />
              </div>
              <div className="security-info">
                <span className="security-title">Encryption Keys</span>
                <span className="security-status active">Active</span>
              </div>
            </div>

            <div className="security-item">
              <div className="security-icon">
                <FiRefreshCw size={24} />
              </div>
              <div className="security-info">
                <span className="security-title">Forward Secrecy</span>
                <span className="security-status active">Enabled</span>
              </div>
            </div>

            <div className="security-item">
              <div className="security-icon">
                <FiClock size={24} />
              </div>
              <div className="security-info">
                <span className="security-title">Session Age</span>
                <span className="security-status">24h remaining</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Privacy Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="profile-section"
        >
          <h2>Privacy Features</h2>

          <div className="features-list">
            <div className="feature-item">
              <FiShield size={20} />
              <div className="feature-info">
                <span className="feature-name">End-to-End Encryption</span>
                <span className="feature-description">
                  All messages are encrypted before leaving your device
                </span>
              </div>
            </div>

            <div className="feature-item">
              <FiEye size={20} />
              <div className="feature-info">
                <span className="feature-name">Zero Metadata</span>
                <span className="feature-description">
                  No personal information, IP addresses, or device data stored
                </span>
              </div>
            </div>

            <div className="feature-item">
              <FiLock size={20} />
              <div className="feature-info">
                <span className="feature-name">Perfect Forward Secrecy</span>
                <span className="feature-description">
                  Past messages remain secure even if keys are compromised
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="profile-section"
        >
          <h2>Actions</h2>

          <div className="action-buttons">
            <button className="action-button secondary">
              <FiRefreshCw size={16} />
              Rotate Keys
            </button>

            <button className="action-button secondary">
              <FiDownload size={16} />
              Export Data
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;