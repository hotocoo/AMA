/**
 * Settings Modal Component
 * Privacy settings and app configuration
 */

import React, { useState } from 'react';

const SettingsModal = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
    encryption: true,
    anonymous: true,
    readReceipts: false,
    typingIndicators: false,
    darkMode: true,
    autoDelete: false,
    deleteAfter: 7
  });

  if (!isOpen) return null;

  const handleSave = () => {
    // Save settings logic here
    console.log('Settings saved:', settings);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '1.5rem' }}>⚙️ Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Privacy Settings */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(96, 165, 250, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#60a5fa', fontSize: '1.1rem' }}>
              🔒 Privacy & Security
            </h3>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.encryption}
                  onChange={(e) => setSettings({...settings, encryption: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>End-to-end encryption</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.anonymous}
                  onChange={(e) => setSettings({...settings, anonymous: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>Anonymous messaging</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.readReceipts}
                  onChange={(e) => setSettings({...settings, readReceipts: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>Read receipts</span>
              </label>
            </div>
          </div>

          {/* Notification Settings */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(74, 222, 128, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#4ade80', fontSize: '1.1rem' }}>
              🔔 Notifications
            </h3>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>Push notifications</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.sound}
                  onChange={(e) => setSettings({...settings, sound: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>Sound notifications</span>
              </label>
            </div>
          </div>

          {/* Appearance Settings */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(168, 85, 247, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#a855f7', fontSize: '1.1rem' }}>
              🎨 Appearance
            </h3>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => setSettings({...settings, darkMode: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>Dark mode</span>
              </label>
            </div>
          </div>

          {/* Message Settings */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f59e0b', fontSize: '1.1rem' }}>
              💬 Messages
            </h3>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.typingIndicators}
                  onChange={(e) => setSettings({...settings, typingIndicators: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>Typing indicators</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={settings.autoDelete}
                  onChange={(e) => setSettings({...settings, autoDelete: e.target.checked})}
                  style={{ margin: 0 }}
                />
                <span style={{ color: '#e2e8f0' }}>Auto-delete messages</span>
              </label>

              {settings.autoDelete && (
                <div style={{ padding: '0.5rem' }}>
                  <label style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
                    Delete after (days):
                    <input
                      type="number"
                      value={settings.deleteAfter}
                      onChange={(e) => setSettings({...settings, deleteAfter: parseInt(e.target.value)})}
                      min="1"
                      max="30"
                      style={{
                        marginLeft: '0.5rem',
                        padding: '0.25rem',
                        borderRadius: '0.25rem',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#e2e8f0',
                        width: '60px'
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
          marginTop: '2rem'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(107, 114, 128, 0.2)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              color: '#9ca3af',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #4ade80, #22c55e)',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              color: '#1f2937',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;