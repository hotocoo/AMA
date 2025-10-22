/**
 * Security Status Component
 * Shows current security and connection status
 */

import React from 'react';
import './SecurityStatus.css';

const SecurityStatus = ({ isConnected, connectionStatus, isAuthenticated }) => {
  return (
    <div className="security-status">
      <div className="status-indicators">
        {/* Connection Status */}
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          <span className="status-text">
            {isConnected ? 'Secure Connection' : 'Offline Mode'}
          </span>
        </div>

        {/* Authentication Status */}
        <div className={`status-indicator ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}>
          <div className="status-dot"></div>
          <span className="status-text">
            {isAuthenticated ? 'Authenticated' : 'Anonymous'}
          </span>
        </div>

        {/* Encryption Status */}
        <div className="status-indicator encrypted">
          <div className="status-dot"></div>
          <span className="status-text">E2E Encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default SecurityStatus;