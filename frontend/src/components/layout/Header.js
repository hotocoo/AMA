/**
 * Header Component
 * Top navigation bar with security indicators
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FiMenu,
  FiSearch,
  FiMoreVertical,
  FiShield,
  FiWifi,
  FiWifiOff,
  FiSettings,
  FiUser
} from 'react-icons/fi';

const Header = ({ onMenuClick, isConnected }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        {/* Mobile menu button */}
        <button
          className="icon-button mobile-menu-button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <FiMenu size={24} />
        </button>

        {/* Brand */}
        <div className="header-brand">
          <motion.div
            animate={{
              rotate: isConnected ? 0 : [0, -10, 10, 0],
              scale: isConnected ? 1 : [1, 1.1, 1]
            }}
            transition={{ duration: 0.5 }}
            className="brand-icon"
          >
            <FiShield size={28} />
          </motion.div>
          <h1>Anonymous Messenger</h1>
        </div>
      </div>

      <div className="header-center">
        {/* Connection status */}
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <motion.div
            animate={{
              opacity: isConnected ? [0.5, 1, 0.5] : 1,
              scale: isConnected ? [1, 1.1, 1] : 1
            }}
            transition={{
              duration: 2,
              repeat: isConnected ? Infinity : 0,
              ease: "easeInOut"
            }}
            className="status-icon"
          >
            {isConnected ? <FiWifi size={18} /> : <FiWifiOff size={18} />}
          </motion.div>
          <span className="status-text">
            {isConnected ? 'Secure' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="header-right">
        {/* Search button */}
        <button className="icon-button" aria-label="Search">
          <FiSearch size={20} />
        </button>

        {/* Security indicator */}
        <div className="security-indicator">
          <FiShield size={18} />
          <span className="security-text">E2E</span>
        </div>

        {/* User menu */}
        <div className="user-menu">
          <button className="icon-button" aria-label="User menu">
            <FiUser size={20} />
          </button>

          <button className="icon-button" aria-label="More options">
            <FiMoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Security status bar */}
      <div className="security-status-bar">
        <div className="security-metrics">
          <div className="metric">
            <span className="metric-label">Encryption</span>
            <span className="metric-value active">AES-256</span>
          </div>
          <div className="metric">
            <span className="metric-label">PFS</span>
            <span className="metric-value active">Active</span>
          </div>
          <div className="metric">
            <span className="metric-label">Anonymity</span>
            <span className="metric-value active">Maximum</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;