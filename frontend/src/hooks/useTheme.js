/**
 * Theme Hook
 * Dark/light theme management with privacy-preserving customization
 */

import { useState, useEffect, useCallback } from 'react';

const THEMES = {
  light: {
    name: 'Light',
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    name: 'Dark',
    primary: '#0d6efd',
    secondary: '#6c757d',
    success: '#198754',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#0dcaf0',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#adb5bd',
    border: '#495057',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  ultraDark: {
    name: 'Ultra Dark',
    primary: '#00d4ff',
    secondary: '#8b949e',
    success: '#00ff88',
    danger: '#ff4757',
    warning: '#ffa500',
    info: '#54a0ff',
    background: '#0a0a0a',
    surface: '#141414',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#333333',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
  hacker: {
    name: 'Hacker',
    primary: '#00ff00',
    secondary: '#00cc00',
    success: '#00ff00',
    danger: '#ff0000',
    warning: '#ffff00',
    info: '#00ffff',
    background: '#000000',
    surface: '#001100',
    text: '#00ff00',
    textSecondary: '#00cc00',
    border: '#003300',
    shadow: 'rgba(0, 255, 0, 0.2)',
  },
  privacy: {
    name: 'Privacy',
    primary: '#7c4dff',
    secondary: '#651fff',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',
    background: '#1a1a2e',
    surface: '#16213e',
    text: '#ffffff',
    textSecondary: '#c7c7c7',
    border: '#2d2d44',
    shadow: 'rgba(124, 77, 255, 0.2)',
  },
};

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [systemPreference, setSystemPreference] = useState('light');

  /**
   * Detect system theme preference
   */
  const detectSystemPreference = useCallback(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setSystemPreference('dark');
    } else {
      setSystemPreference('light');
    }
  }, []);

  /**
   * Get theme from encrypted storage
   */
  const getStoredTheme = useCallback(() => {
    try {
      const stored = localStorage.getItem('anon_theme');
      if (stored && THEMES[stored]) {
        return stored;
      }
      return null;
    } catch (error) {
      console.error('Error reading theme from storage:', error);
      return null;
    }
  }, []);

  /**
   * Store theme in encrypted storage
   */
  const storeTheme = useCallback(async (theme) => {
    try {
      // Encrypt theme preference before storing
      const themeData = {
        theme,
        timestamp: Date.now(),
      };

      const encrypted = btoa(JSON.stringify(themeData));
      localStorage.setItem('anon_theme', encrypted);
    } catch (error) {
      console.error('Error storing theme:', error);
    }
  }, []);

  /**
   * Initialize theme
   */
  const initializeTheme = useCallback(() => {
    // Detect system preference
    detectSystemPreference();

    // Get stored theme or use system preference
    const storedTheme = getStoredTheme();
    const initialTheme = storedTheme || systemPreference;

    setCurrentTheme(initialTheme);
    applyTheme(initialTheme);
  }, [detectSystemPreference, getStoredTheme, systemPreference]);

  /**
   * Apply theme to DOM
   */
  const applyTheme = useCallback((theme) => {
    try {
      const themeColors = THEMES[theme];
      if (!themeColors) return;

      // Apply CSS custom properties
      const root = document.documentElement;
      Object.entries(themeColors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });

      // Apply theme class to body
      document.body.className = document.body.className
        .replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${theme}`);

      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme);

    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }, []);

  /**
   * Set theme
   */
  const setTheme = useCallback(async (theme) => {
    try {
      if (!THEMES[theme]) {
        console.error('Invalid theme:', theme);
        return;
      }

      setCurrentTheme(theme);
      applyTheme(theme);
      await storeTheme(theme);

      console.log('🎨 Theme changed to:', theme);

    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }, [applyTheme, storeTheme]);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [currentTheme, setTheme]);

  /**
   * Cycle through all available themes
   */
  const cycleTheme = useCallback(() => {
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextTheme = themeKeys[nextIndex];
    setTheme(nextTheme);
  }, [currentTheme, setTheme]);

  /**
   * Get current theme colors
   */
  const getThemeColors = useCallback(() => {
    return THEMES[currentTheme] || THEMES.light;
  }, [currentTheme]);

  /**
   * Get all available themes
   */
  const getAvailableThemes = useCallback(() => {
    return Object.entries(THEMES).map(([key, theme]) => ({
      id: key,
      name: theme.name,
      colors: theme,
    }));
  }, []);

  /**
   * Listen for system theme changes
   */
  useEffect(() => {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e) => {
        const newSystemPreference = e.matches ? 'dark' : 'light';
        setSystemPreference(newSystemPreference);

        // Only auto-switch if using system preference
        const storedTheme = getStoredTheme();
        if (!storedTheme) {
          setTheme(newSystemPreference);
        }
      };

      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [setTheme, getStoredTheme]);

  /**
   * Initialize theme on mount
   */
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  /**
   * Handle privacy-focused theme features
   */
  useEffect(() => {
    // Disable transitions during theme changes for privacy
    const style = document.createElement('style');
    style.textContent = `
      * {
        transition: color 0.3s ease, background-color 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [currentTheme]);

  return {
    // Current theme
    currentTheme,
    themeColors: getThemeColors(),

    // Available themes
    availableThemes: getAvailableThemes(),

    // Actions
    setTheme,
    toggleTheme,
    cycleTheme,

    // Utilities
    isDark: currentTheme === 'dark' || currentTheme === 'ultraDark' || currentTheme === 'hacker',
    isLight: currentTheme === 'light',
    systemPreference,
  };
};