/**
 * Settings Page
 * Privacy-focused settings and configuration
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiShield,
  FiLock,
  FiEye,
  FiMoon,
  FiSun,
  FiSmartphone,
  FiDownload,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

const SettingsPage = () => {
  const { currentTheme, setTheme, toggleTheme, availableThemes } = useTheme();
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState('privacy');

  const settingsSections = [
    { id: 'privacy', name: 'Privacy & Security', icon: <FiShield size={20} /> },
    { id: 'appearance', name: 'Appearance', icon: <FiSun size={20} /> },
    { id: 'notifications', name: 'Notifications', icon: <FiSmartphone size={20} /> },
    { id: 'data', name: 'Data & Storage', icon: <FiDownload size={20} /> },
    { id: 'account', name: 'Account', icon: <FiLock size={20} /> },
  ];

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your privacy and security preferences</p>
      </div>

      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {settingsSections.map(section => (
            <button
              key={section.id}
              className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span>{section.name}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content">
          <AnimatePresence mode="wait">
            {activeSection === 'privacy' && <PrivacySettings />}
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'notifications' && <NotificationSettings />}
            {activeSection === 'data' && <DataSettings />}
            {activeSection === 'account' && <AccountSettings />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/**
 * Privacy & Security Settings
 */
const PrivacySettings = () => {
  const [settings, setSettings] = useState({
    readReceipts: false,
    typingIndicators: true,
    lastSeen: false,
    profilePhotos: false,
    status: false,
    disappearingMessages: true,
    screenshotProtection: true,
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="settings-section"
    >
      <h2>Privacy & Security</h2>

      <div className="settings-group">
        <h3>Message Privacy</h3>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">Read Receipts</span>
            <span className="setting-description">
              Let others know when you've read their messages
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.readReceipts}
              onChange={(e) => handleSettingChange('readReceipts', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">Typing Indicators</span>
            <span className="setting-description">
              Show when you're typing a message
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.typingIndicators}
              onChange={(e) => handleSettingChange('typingIndicators', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">Last Seen</span>
            <span className="setting-description">
              Show when you were last active
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.lastSeen}
              onChange={(e) => handleSettingChange('lastSeen', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h3>Advanced Privacy</h3>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">Disappearing Messages</span>
            <span className="setting-description">
              Automatically delete messages after a set time
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.disappearingMessages}
              onChange={(e) => handleSettingChange('disappearingMessages', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">Screenshot Protection</span>
            <span className="setting-description">
              Block screenshots in this app
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.screenshotProtection}
              onChange={(e) => handleSettingChange('screenshotProtection', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="security-status">
          <FiCheckCircle size={20} className="status-icon success" />
          <div className="status-info">
            <span className="status-title">Encryption Active</span>
            <span className="status-description">
              All messages are end-to-end encrypted
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Appearance Settings
 */
const AppearanceSettings = () => {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="settings-section"
    >
      <h2>Appearance</h2>

      <div className="settings-group">
        <h3>Theme</h3>
        <p className="setting-description">
          Choose your preferred color scheme
        </p>

        <div className="theme-grid">
          {availableThemes.map(theme => (
            <button
              key={theme.id}
              className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
              onClick={() => setTheme(theme.id)}
            >
              <div className="theme-preview" style={{
                background: theme.colors.background,
                border: `2px solid ${theme.colors.primary}`
              }}>
                <div className="theme-colors">
                  <div style={{ backgroundColor: theme.colors.primary }}></div>
                  <div style={{ backgroundColor: theme.colors.secondary }}></div>
                  <div style={{ backgroundColor: theme.colors.success }}></div>
                </div>
              </div>
              <span className="theme-name">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Notification Settings
 */
const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    messageNotifications: true,
    callNotifications: true,
    soundEnabled: false,
    vibrationEnabled: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="settings-section"
    >
      <h2>Notifications</h2>

      <div className="settings-group">
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">Message Notifications</span>
            <span className="setting-description">
              Receive notifications for new messages
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.messageNotifications}
              onChange={(e) => setSettings(prev => ({ ...prev, messageNotifications: e.target.checked }))}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">Call Notifications</span>
            <span className="setting-description">
              Receive notifications for incoming calls
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.callNotifications}
              onChange={(e) => setSettings(prev => ({ ...prev, callNotifications: e.target.checked }))}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Data & Storage Settings
 */
const DataSettings = () => {
  const [storageInfo, setStorageInfo] = useState({
    used: '2.4 MB',
    available: '50 MB',
    chats: 12,
    media: 45,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="settings-section"
    >
      <h2>Data & Storage</h2>

      <div className="settings-group">
        <div className="storage-info">
          <div className="storage-usage">
            <span className="usage-amount">{storageInfo.used}</span>
            <span className="usage-label">Used</span>
          </div>
          <div className="storage-bar">
            <div
              className="storage-fill"
              style={{ width: `${(parseFloat(storageInfo.used) / parseFloat(storageInfo.available)) * 100}%` }}
            ></div>
          </div>
          <span className="available-storage">{storageInfo.available} available</span>
        </div>

        <div className="data-stats">
          <div className="stat-item">
            <span className="stat-number">{storageInfo.chats}</span>
            <span className="stat-label">Chats</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{storageInfo.media}</span>
            <span className="stat-label">Media Files</span>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <button className="action-button danger">
          <FiTrash2 size={16} />
          Clear All Data
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Account Settings
 */
const AccountSettings = () => {
  const { logout } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="settings-section"
    >
      <h2>Account</h2>

      <div className="settings-group">
        <div className="account-info">
          <div className="account-avatar">
            <FiShield size={32} />
          </div>
          <div className="account-details">
            <span className="account-name">Anonymous User</span>
            <span className="account-description">
              Maximum privacy • No personal data stored
            </span>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="security-features">
          <div className="feature-item">
            <FiCheckCircle size={16} className="feature-icon" />
            <span>End-to-End Encryption</span>
          </div>
          <div className="feature-item">
            <FiCheckCircle size={16} className="feature-icon" />
            <span>Perfect Forward Secrecy</span>
          </div>
          <div className="feature-item">
            <FiCheckCircle size={16} className="feature-icon" />
            <span>Zero-Knowledge Architecture</span>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <button className="action-button danger" onClick={logout}>
          <FiXCircle size={16} />
          End Session
        </button>
      </div>
    </motion.div>
  );
};

export default SettingsPage;