/**
 * Welcome Page
 * Anonymous entry point with privacy-focused onboarding
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiZap, FiEye, FiLock, FiUsers, FiMessageCircle } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const WelcomePage = () => {
  const { initializeAuth, isAuthenticated, isLoading } = useAuth();
  const { currentTheme, setTheme, toggleTheme } = useTheme();
  const [showFeatures, setShowFeatures] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: <FiShield size={32} />,
      title: 'Military-Grade Security',
      description: 'End-to-end encryption with perfect forward secrecy. Your messages are protected by the most advanced cryptographic systems.',
    },
    {
      icon: <FiEye size={32} />,
      title: 'Complete Anonymity',
      description: 'No personal data collection, no registration required. Communicate freely without compromising your identity.',
    },
    {
      icon: <FiZap size={32} />,
      title: 'Real-Time Messaging',
      description: 'Instant message delivery with WebSocket technology. Experience seamless communication like never before.',
    },
    {
      icon: <FiLock size={32} />,
      title: 'Zero-Knowledge Architecture',
      description: 'Our servers never see your messages in plaintext. Privacy is built into every layer of our system.',
    },
    {
      icon: <FiUsers size={32} />,
      title: 'Advanced Group Features',
      description: 'Create anonymous groups, share files, and collaborate securely with enhanced privacy controls.',
    },
    {
      icon: <FiMessageCircle size={32} />,
      title: 'Rich Communication',
      description: 'Voice messages, file sharing, reactions, and more - all with bulletproof security and anonymity.',
    },
  ];

  /**
   * Initialize authentication on mount
   */
  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Welcome page initialization failed:', error);
      }
    };

    init();
  }, [initializeAuth]);

  /**
   * Show features animation
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFeatures(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Feature rotation
   */
  useEffect(() => {
    if (!showFeatures) return;

    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [showFeatures, features.length]);

  /**
   * Handle theme change
   */
  const handleThemeChange = (themeId) => {
    setTheme(themeId);
  };

  if (isLoading) {
    return (
      <div className="welcome-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="loading-spinner"
        >
          <FiShield size={48} />
        </motion.div>
        <p>Initializing secure connection...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will be handled by App.js routing
  }

  return (
    <div className="welcome-page">
      {/* Header */}
      <header className="welcome-header">
        <div className="welcome-brand">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="brand-icon"
          >
            <FiShield size={40} />
          </motion.div>
          <h1>Anonymous Messenger</h1>
          <p className="brand-tagline">Ultra-Secure Communication</p>
        </div>

        {/* Theme Selector */}
        <div className="theme-selector">
          <select
            value={currentTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            className="theme-dropdown"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="ultraDark">Ultra Dark</option>
            <option value="hacker">Hacker</option>
            <option value="privacy">Privacy</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="welcome-main">
        <div className="welcome-hero">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-content"
          >
            <h2>The Most Advanced Anonymous Messenger Ever Built</h2>
            <p className="hero-description">
              Experience communication like never before with military-grade security,
              complete anonymity, and features that surpass any other messaging platform.
            </p>

            {/* Feature Showcase */}
            <AnimatePresence mode="wait">
              {showFeatures && (
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="feature-showcase"
                >
                  <div className="feature-icon">
                    {features[currentFeature].icon}
                  </div>
                  <h3>{features[currentFeature].title}</h3>
                  <p>{features[currentFeature].description}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Security Indicators */}
            <div className="security-indicators">
              <div className="security-badge">
                <FiLock size={16} />
                <span>End-to-End Encrypted</span>
              </div>
              <div className="security-badge">
                <FiShield size={16} />
                <span>Zero-Knowledge</span>
              </div>
              <div className="security-badge">
                <FiEye size={16} />
                <span>Anonymous</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="features-grid"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + (index * 0.1) }}
              className="feature-card"
            >
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h4>{feature.title}</h4>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="welcome-cta"
        >
          <button
            onClick={initializeAuth}
            className="cta-button primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="button-spinner"
                >
                  <FiShield size={20} />
                </motion.div>
                Initializing...
              </>
            ) : (
              <>
                <FiMessageCircle size={20} />
                Start Secure Chat
              </>
            )}
          </button>

          <p className="cta-disclaimer">
            By continuing, you agree to our commitment to privacy and security.
            No personal information is collected or stored.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="footer-links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#security">Security Overview</a>
          <a href="#features">Features</a>
        </div>
        <p className="footer-text">
          Built with ❤️ for privacy and security
        </p>
      </footer>
    </div>
  );
};

export default WelcomePage;