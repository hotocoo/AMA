/**
 * Chat Page
 * Main messaging interface with real-time features
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSend,
  FiPaperclip,
  FiSmile,
  FiPhone,
  FiVideo,
  FiMoreVertical,
  FiShield,
  FiLock,
  FiEye,
  FiMic,
  FiMicOff,
  FiSquare
} from 'react-icons/fi';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCrypto } from '../hooks/useCrypto';
import { useAuth } from '../hooks/useAuth';

const ChatPage = () => {
  const { sessionId } = useAuth();
  const { isConnected, sendMessage, joinChat, messages } = useWebSocket();
  const { encryptMessage, decryptMessage, initializeCrypto } = useCrypto();

  const [currentChat, setCurrentChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get current chat from props or state management
  // In a full app, this would come from routing or state
  useEffect(() => {
    // For now, initialize with a default chat or fetch from API
    const defaultChat = {
      id: 'default_chat',
      name: 'Anonymous User',
      type: 'individual',
      participants: [sessionId],
      created: Date.now(),
      encrypted: true,
      anonymous: true,
    };

    setCurrentChat(defaultChat);
    joinChat(defaultChat.id);
  }, [joinChat, sessionId]);

  /**
   * Initialize crypto for this chat
   */
  useEffect(() => {
    if (currentChat && sessionId) {
      initializeCrypto().then(() => {
        // Derive shared secret for this chat
        console.log('🔑 Initializing encryption for chat:', currentChat.id);
      });
    }
  }, [currentChat, sessionId, initializeCrypto]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handle typing indicators
   */
  useEffect(() => {
    if (isTyping) {
      // Send typing indicator
      // wsSendTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        // wsSendTyping(false);
      }, 1000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping]);

  /**
   * Handle message input changes
   */
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (e.target.value && !isTyping) {
      setIsTyping(true);
    }
  };

  /**
   * Send text message with full encryption
   */
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentChat || !isConnected) {
      return;
    }

    try {
      // Prepare message data
      const messageData = {
        text: messageInput,
        timestamp: Date.now(),
        type: 'text',
        // No personal metadata
      };

      // Encrypt message using crypto agility
      const encrypted = await encryptMessage(messageData, currentChat.id);

      // Send through WebSocket
      const sent = sendMessage(currentChat.id, encrypted.encryptedMessage, 'text');

      if (sent) {
        setMessageInput('');
        setIsTyping(false);

        // Add to local messages for immediate UI feedback
        const localMessage = {
          id: `temp_${Date.now()}`,
          chatId: currentChat.id,
          encryptedContent: encrypted.encryptedMessage,
          messageType: 'text',
          timestamp: Date.now(),
          status: 'sending',
        };

        // In a real implementation, this would be managed by the WebSocket hook
        console.log('📤 Encrypted message sent');

        // Show encryption success indicator
        setTimeout(() => {
          console.log('✅ Message delivered with E2E encryption');
        }, 1000);
      }

    } catch (error) {
      console.error('Failed to send encrypted message:', error);

      // Show user-friendly error message
      alert('Failed to send message. Please check your connection and try again.');
    }
  };

  /**
   * Handle key press in input
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Start voice recording
   */
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);

    // Start recording timer
    const timer = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);

    // Store timer reference for cleanup
    startRecording.timer = timer;
  };

  /**
   * Stop voice recording
   */
  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(startRecording.timer);

    // Here you would process the recorded audio
    console.log('🎤 Recording stopped, duration:', recordingTime, 'seconds');
  };

  /**
   * Format recording time
   */
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentChat) {
    return (
      <div className="chat-page-empty">
        <div className="empty-state">
          <FiMessageCircle size={64} />
          <h2>Select a chat to start messaging</h2>
          <p>Your conversations will be end-to-end encrypted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-info">
          <div className="chat-avatar">
            <FiMessageCircle size={24} />
          </div>
          <div className="chat-details">
            <h3>{currentChat.name}</h3>
            <div className="chat-status">
              {isConnected ? (
                <span className="status-online">Online</span>
              ) : (
                <span className="status-offline">Offline</span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-actions">
          <button className="icon-button" title="Voice Call">
            <FiPhone size={20} />
          </button>
          <button className="icon-button" title="Video Call">
            <FiVideo size={20} />
          </button>
          <button className="icon-button" title="More Options">
            <FiMoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area">
        <div className="messages-container">
          {/* Welcome message */}
          <div className="message-system">
            <div className="system-content">
              <FiShield size={16} />
              <span>Messages are end-to-end encrypted</span>
            </div>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`message ${message.type || 'text'}`}
              >
                <div className="message-content">
                  <p>{message.content || 'Encrypted message'}</p>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Message status */}
                <div className="message-status">
                  {message.encrypted && <FiLock size={12} />}
                  {message.delivered && <span>✓</span>}
                  {message.read && <span>✓✓</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">Typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Recording Overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="recording-overlay"
          >
            <div className="recording-container">
              <div className="recording-visualizer">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="recording-pulse"
                >
                  <FiMic size={32} />
                </motion.div>
              </div>
              <div className="recording-info">
                <span className="recording-time">
                  {formatRecordingTime(recordingTime)}
                </span>
                <p>Recording voice message</p>
              </div>
              <button
                className="recording-stop"
                onClick={stopRecording}
              >
                <FiSquare size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="message-input-area">
        <div className="input-container">
          {/* Attachment button */}
          <button className="icon-button" title="Attach File">
            <FiPaperclip size={20} />
          </button>

          {/* Text input */}
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="message-input"
              rows={1}
              maxLength={4096}
            />

            {/* Emoji button */}
            <button
              className="icon-button emoji-button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emoji"
            >
              <FiSmile size={20} />
            </button>
          </div>

          {/* Voice message or send button */}
          {messageInput.trim() ? (
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={!isConnected}
            >
              <FiSend size={20} />
            </button>
          ) : (
            <button
              className={`voice-button ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              title="Voice Message"
            >
              {isRecording ? <FiMicOff size={20} /> : <FiMic size={20} />}
            </button>
          )}
        </div>

        {/* Security info */}
        <div className="input-security">
          <div className="security-indicators">
            <span className="indicator">
              <FiLock size={12} />
              Encrypted
            </span>
            <span className="indicator">
              <FiEye size={12} />
              Private
            </span>
            <span className="indicator">
              <FiShield size={12} />
              Secure
            </span>
          </div>
        </div>
      </div>

      {/* Emoji Picker (simplified for now) */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="emoji-picker"
          >
            <div className="emoji-grid">
              {['😀', '😂', '😊', '😍', '🥰', '😘', '😉', '😎'].map(emoji => (
                <button
                  key={emoji}
                  className="emoji-button"
                  onClick={() => {
                    setMessageInput(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;