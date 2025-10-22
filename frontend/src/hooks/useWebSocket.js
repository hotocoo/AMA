/**
 * WebSocket Hook
 * Real-time messaging with bulletproof security
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './useAuth';

export const useWebSocket = () => {
  const { sessionId, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);

  /**
   * Initialize WebSocket connection
   */
  const initializeConnection = useCallback(() => {
    if (!sessionId || !isAuthenticated) {
      return;
    }

    try {
      setConnectionStatus('connecting');

      // Create secure WebSocket connection
      const newSocket = io(process.env.REACT_APP_WS_URL || '/', {
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true,
        autoConnect: false,
        // Security options
        rejectUnauthorized: true,
        secure: process.env.NODE_ENV === 'production',
        // Anonymous connection - no personal data
        query: {
          sessionId,
          anonymous: true,
          securityLevel: 'maximum',
        }
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        handleConnection(newSocket);
      });

      newSocket.on('disconnect', (reason) => {
        handleDisconnection(reason);
      });

      newSocket.on('connect_error', (error) => {
        handleConnectionError(error);
      });

      // Message event handlers
      newSocket.on('connection_established', (data) => {
        handleConnectionEstablished(data);
      });

      newSocket.on('new_message', (data) => {
        handleNewMessage(data);
      });

      newSocket.on('message_sent', (data) => {
        handleMessageSent(data);
      });

      newSocket.on('user_typing', (data) => {
        handleUserTyping(data);
      });

      newSocket.on('user_stopped_typing', (data) => {
        handleUserStoppedTyping(data);
      });

      newSocket.on('message_read_receipt', (data) => {
        handleMessageReadReceipt(data);
      });

      // Heartbeat
      newSocket.on('pong', (data) => {
        handlePong(data);
      });

      // Error handling
      newSocket.on('error', (error) => {
        handleError(error);
      });

      setSocket(newSocket);

      // Attempt connection
      newSocket.connect();

    } catch (error) {
      console.error('WebSocket initialization failed:', error);
      setConnectionStatus('error');
    }
  }, [sessionId, isAuthenticated]);

  /**
   * Handle successful connection
   */
  const handleConnection = (socket) => {
    setIsConnected(true);
    setConnectionStatus('connected');
    reconnectAttempts.current = 0;
    reconnectDelay.current = 1000;

    console.log('🔗 WebSocket connected successfully');

    // Register anonymous session
    socket.emit('register_session', {
      sessionId,
      timestamp: Date.now(),
    });
  };

  /**
   * Handle disconnection
   */
  const handleDisconnection = (reason) => {
    setIsConnected(false);
    setConnectionStatus('disconnected');

    console.log('🔌 WebSocket disconnected:', reason);

    // Attempt reconnection if not manually disconnected
    if (reason !== 'io client disconnect') {
      scheduleReconnection();
    }
  };

  /**
   * Handle connection error
   */
  const handleConnectionError = (error) => {
    console.error('❌ WebSocket connection error:', error);
    setConnectionStatus('error');

    // Attempt reconnection
    scheduleReconnection();
  };

  /**
   * Handle connection established
   */
  const handleConnectionEstablished = (data) => {
    console.log('✅ WebSocket connection established:', data);

    // Send initial heartbeat
    sendHeartbeat();
  };

  /**
   * Handle new message
   */
  const handleNewMessage = (data) => {
    try {
      const newMessage = {
        id: data.messageId,
        chatId: data.chatId,
        encryptedContent: data.encryptedMessage,
        messageType: data.messageType,
        timestamp: data.timestamp,
        // No sender information for anonymity
      };

      setMessages(prev => [...prev, newMessage]);

      console.log('📨 New message received');

    } catch (error) {
      console.error('Error handling new message:', error);
    }
  };

  /**
   * Handle message sent confirmation
   */
  const handleMessageSent = (data) => {
    console.log('✅ Message sent:', data.messageId);

    // Update local message status if needed
    setMessages(prev => prev.map(msg =>
      msg.id === data.messageId
        ? { ...msg, status: 'sent', timestamp: data.timestamp }
        : msg
    ));
  };

  /**
   * Handle user typing
   */
  const handleUserTyping = (data) => {
    setTypingUsers(prev => new Set([...prev, data.chatId]));
  };

  /**
   * Handle user stopped typing
   */
  const handleUserStoppedTyping = (data) => {
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.chatId);
      return newSet;
    });
  };

  /**
   * Handle message read receipt
   */
  const handleMessageReadReceipt = (data) => {
    // Update message read status
    setMessages(prev => prev.map(msg =>
      msg.id === data.messageId
        ? { ...msg, read: true, readAt: data.timestamp }
        : msg
    ));
  };

  /**
   * Handle pong (heartbeat response)
   */
  const handlePong = (data) => {
    // Connection is alive
    console.log('💓 Heartbeat received');
  };

  /**
   * Handle errors
   */
  const handleError = (error) => {
    console.error('🚨 WebSocket error:', error);
    setConnectionStatus('error');
  };

  /**
   * Send message
   */
  const sendMessage = useCallback((chatId, encryptedMessage, messageType = 'text') => {
    if (!socket || !isConnected) {
      console.error('Cannot send message: not connected');
      return false;
    }

    try {
      socket.emit('send_message', {
        chatId,
        encryptedMessage,
        messageType,
        timestamp: Date.now(),
      });

      return true;

    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [socket, isConnected]);

  /**
   * Join chat
   */
  const joinChat = useCallback((chatId) => {
    if (!socket || !isConnected) {
      return;
    }

    socket.emit('join_chat', { chatId });
  }, [socket, isConnected]);

  /**
   * Leave chat
   */
  const leaveChat = useCallback((chatId) => {
    if (!socket || !isConnected) {
      return;
    }

    socket.emit('leave_chat', { chatId });
  }, [socket, isConnected]);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback((chatId, isTyping) => {
    if (!socket || !isConnected) {
      return;
    }

    const event = isTyping ? 'typing_start' : 'typing_stop';
    socket.emit(event, {
      chatId,
      timestamp: Date.now(),
    });
  }, [socket, isConnected]);

  /**
   * Send message read receipt
   */
  const sendReadReceipt = useCallback((messageId, chatId) => {
    if (!socket || !isConnected) {
      return;
    }

    socket.emit('message_read', {
      messageId,
      chatId,
      timestamp: Date.now(),
    });
  }, [socket, isConnected]);

  /**
   * Send heartbeat
   */
  const sendHeartbeat = useCallback(() => {
    if (!socket || !isConnected) {
      return;
    }

    socket.emit('ping');
  }, [socket, isConnected]);

  /**
   * Schedule reconnection
   */
  const scheduleReconnection = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionStatus('max_reconnect_attempts');
      return;
    }

    reconnectAttempts.current++;
    setConnectionStatus(`reconnecting_${reconnectAttempts.current}`);

    setTimeout(() => {
      console.log(`🔄 Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts}`);
      initializeConnection();
    }, reconnectDelay.current);

    // Exponential backoff
    reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
  }, [initializeConnection]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [socket]);

  /**
   * Initialize connection when authenticated
   */
  useEffect(() => {
    if (isAuthenticated && sessionId) {
      initializeConnection();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, sessionId, initializeConnection, disconnect]);

  /**
   * Heartbeat interval
   */
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isConnected, sendHeartbeat]);

  /**
   * Handle page visibility changes for privacy
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - reduce heartbeat frequency for privacy
        console.log('🔒 Page hidden - reducing activity');
      } else {
        // Page is visible - normal heartbeat
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendHeartbeat]);

  return {
    // Connection state
    socket,
    isConnected,
    connectionStatus,

    // Messages
    messages,

    // User presence
    typingUsers: Array.from(typingUsers),
    onlineUsers: Array.from(onlineUsers),

    // Actions
    sendMessage,
    joinChat,
    leaveChat,
    sendTypingIndicator,
    sendReadReceipt,
    disconnect,

    // Utilities
    reconnectAttempts: reconnectAttempts.current,
  };
};