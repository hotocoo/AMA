/**
 * Loading Screen Component
 * Shows loading state during app initialization
 */

import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <div className="loading-text">{message}</div>
      </div>
    </div>
  );
};

export default LoadingScreen;