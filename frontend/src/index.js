/**
 * Anonymous Messenger Frontend Entry Point
 * Ultra-secure messaging platform with advanced privacy features
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import global styles
import './styles/index.css';

// Initialize the application
const initializeApp = async () => {
  try {
    // Create root element
    const root = ReactDOM.createRoot(document.getElementById('root'));

    // Render the application
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log('🚀 Anonymous Messenger frontend initialized successfully');

  } catch (error) {
    console.error('Failed to initialize application:', error);

    // Fallback rendering
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: '#0f172a',
        color: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <h2 style={{ color: '#ef4444' }}>Initialization Error</h2>
        <p>Failed to start the application. Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }
};

// Start the application
initializeApp();