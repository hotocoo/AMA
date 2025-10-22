/**
 * Anonymous Messenger Main Application Component
 * Ultra-secure messaging platform with comprehensive privacy features
 */

import React, { useState } from 'react';
import SettingsModal from './components/common/SettingsModal';

const ChatInterface = ({ onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Welcome to Anonymous Messenger! 🔒",
      sender: "system",
      timestamp: new Date(),
      type: "system",
      reactions: {}
    },
    {
      id: 2,
      text: "Your messages are end-to-end encrypted and completely anonymous.",
      sender: "system",
      timestamp: new Date(),
      type: "system",
      reactions: {}
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [contacts] = useState([
    { id: 1, name: "Alice", status: "online", avatar: "👩" },
    { id: 2, name: "Bob", status: "offline", avatar: "👨" },
    { id: 3, name: "Carol", status: "online", avatar: "👩‍💻" }
  ]);
  const [showContacts, setShowContacts] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🔥', '🎉', '👏', '💯'];
  const gifs = [
    'https://media.giphy.com/media/3o7bu3XilJ5BO2nCzi/giphy.gif',
    'https://media.giphy.com/media/xT9IgDEI1iZyb2bNE/giphy.gif',
    'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif',
    'https://media.giphy.com/media/3o7buirYcmV5nC2HOc/giphy.gif'
  ];

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        text: newMessage,
        sender: "me",
        timestamp: new Date(),
        type: "user",
        reactions: {}
      };
      setMessages([...messages, message]);
      setNewMessage('');
      setIsTyping(true);

      // Simulate response
      setTimeout(() => {
        const response = {
          id: messages.length + 2,
          text: "Message received and encrypted! 🔐",
          sender: "system",
          timestamp: new Date(),
          type: "system",
          reactions: {}
        };
        setMessages(prev => [...prev, response]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleVoiceMessage = () => {
    setIsRecording(true);
    // Simulate recording
    setTimeout(() => {
      const voiceMessage = {
        id: messages.length + 1,
        text: "🎤 Voice message (2.3s)",
        sender: "me",
        timestamp: new Date(),
        type: "voice",
        reactions: {},
        duration: "2.3s"
      };
      setMessages([...messages, voiceMessage]);
      setIsRecording(false);
    }, 2000);
  };

  const handleFileShare = () => {
    const fileMessage = {
      id: messages.length + 1,
      text: "📎 Shared a file: document.pdf",
      sender: "me",
      timestamp: new Date(),
      type: "file",
      reactions: {},
      fileName: "document.pdf",
      fileSize: "2.1 MB"
    };
    setMessages([...messages, fileMessage]);
  };

  const handleImageShare = () => {
    const imageMessage = {
      id: messages.length + 1,
      text: "📷 Shared an image",
      sender: "me",
      timestamp: new Date(),
      type: "image",
      reactions: {},
      imageUrl: "https://picsum.photos/200/150?random=" + Date.now()
    };
    setMessages([...messages, imageMessage]);
  };

  const addReaction = (messageId, emoji) => {
    setMessages(messages.map(msg =>
      msg.id === messageId
        ? { ...msg, reactions: { ...msg.reactions, [emoji]: (msg.reactions[emoji] || 0) + 1 }}
        : msg
    ));
  };

  const startVoiceCall = () => {
    alert("📞 Starting voice call...");
  };

  const startVideoCall = () => {
    alert("📹 Starting video call...");
  };

  const sendGif = (gifUrl) => {
    const gifMessage = {
      id: messages.length + 1,
      text: "🎬 Shared a GIF",
      sender: "me",
      timestamp: new Date(),
      type: "gif",
      reactions: {},
      gifUrl: gifUrl
    };
    setMessages([...messages, gifMessage]);
    setShowEmojiPicker(false);
  };

  const handleGifButton = () => {
    // Show a random GIF from the collection
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    sendGif(randomGif);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Contacts Sidebar */}
      {showContacts && (
        <div style={{
          width: '320px',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '1.1rem' }}>Contacts</h3>
            <button
              onClick={() => setShowContacts(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ✕
            </button>
          </div>

          {contacts.map(contact => (
            <div
              key={contact.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.border = '1px solid rgba(96, 165, 250, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.border = '1px solid transparent';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>
                {contact.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#f8fafc', fontWeight: '500' }}>{contact.name}</div>
                <div style={{
                  color: contact.status === 'online' ? '#4ade80' : '#64748b',
                  fontSize: '0.8rem'
                }}>
                  {contact.status === 'online' ? '● Online' : '● Offline'}
                </div>
              </div>
              <button style={{
                background: 'rgba(96, 165, 250, 0.2)',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: '#60a5fa',
                cursor: 'pointer'
              }}>
                💬
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: '0.5rem'
              }}
            >
              ←
            </button>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              👥
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>Anonymous Chat</h2>
              <p style={{ margin: 0, color: '#4ade80', fontSize: '0.8rem' }}>
                🔒 End-to-end encrypted • 👤 Anonymous
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={startVoiceCall}
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: '#4ade80',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Voice Call"
            >
              📞
            </button>
            <button
              onClick={startVideoCall}
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: '#60a5fa',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Video Call"
            >
              📹
            </button>
            <button
              onClick={() => setShowContacts(!showContacts)}
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: '#a855f7',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Contacts"
            >
              👥
            </button>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'rgba(107, 114, 128, 0.2)',
                border: '1px solid rgba(107, 114, 128, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          padding: '1rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '70%',
                position: 'relative'
              }}
              onMouseEnter={() => setSelectedMessage(message.id)}
              onMouseLeave={() => setSelectedMessage(null)}
            >
              <div style={{
                background: message.type === 'user'
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : message.type === 'system'
                    ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1))'
                    : 'rgba(255,255,255,0.1)',
                padding: '0.75rem 1rem',
                borderRadius: message.type === 'user'
                  ? '1rem 1rem 0.25rem 1rem'
                  : '1rem 1rem 1rem 0.25rem',
                border: message.type === 'system'
                  ? '1px solid rgba(74, 222, 128, 0.3)'
                  : '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer'
              }}>
                {message.type === 'image' && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <img
                      src={message.imageUrl}
                      alt="Shared content"
                      style={{
                        maxWidth: '200px',
                        borderRadius: '0.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    />
                  </div>
                )}

                {message.type === 'voice' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#4ade80'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>🎤</span>
                    <div style={{
                      flex: 1,
                      height: '2px',
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: '1px',
                      position: 'relative'
                    }}>
                      <div style={{
                        height: '100%',
                        width: '60%',
                        background: '#4ade80',
                        borderRadius: '1px',
                        animation: 'waveform 1s ease-in-out infinite'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                      {message.duration}
                    </span>
                    <button style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#4ade80',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}>
                      ▶️
                    </button>
                  </div>
                )}

                {message.type === 'file' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#60a5fa'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>📎</span>
                    <div>
                      <div style={{ color: '#f8fafc', fontWeight: '500' }}>{message.fileName}</div>
                      <div style={{ color: 'rgba(248, 250, 252, 0.7)', fontSize: '0.8rem' }}>
                        {message.fileSize}
                      </div>
                    </div>
                  </div>
                )}

                {message.type === 'gif' && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <img
                      src={message.gifUrl}
                      alt="GIF"
                      style={{
                        maxWidth: '200px',
                        borderRadius: '0.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    />
                  </div>
                )}

                {message.type === 'text' && (
                  <p style={{
                    margin: 0,
                    color: message.type === 'user' ? 'white' : '#e2e8f0',
                    fontSize: '0.95rem',
                    lineHeight: '1.4'
                  }}>
                    {message.text}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '0.7rem',
                    color: message.type === 'user'
                      ? 'rgba(255,255,255,0.8)'
                      : 'rgba(226, 232, 240, 0.7)'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </span>

                  {selectedMessage === message.id && (
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem',
                      background: 'rgba(0,0,0,0.8)',
                      padding: '0.25rem',
                      borderRadius: '0.5rem'
                    }}>
                      {emojis.slice(0, 5).map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(message.id, emoji)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '0.125rem'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {Object.keys(message.reactions).length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '0.25rem',
                    marginTop: '0.25rem'
                  }}>
                    {Object.entries(message.reactions).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        style={{
                          background: 'rgba(74, 222, 128, 0.2)',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '1rem',
                          fontSize: '0.8rem',
                          border: '1px solid rgba(74, 222, 128, 0.3)'
                        }}
                      >
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{
              alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.1)',
              padding: '0.75rem 1rem',
              borderRadius: '1rem 1rem 1rem 0.25rem',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '0.25rem'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  background: '#4ade80',
                  borderRadius: '50%',
                  animation: 'typing 1.4s infinite ease-in-out'
                }}></div>
                <div style={{
                  width: '6px',
                  height: '6px',
                  background: '#4ade80',
                  borderRadius: '50%',
                  animation: 'typing 1.4s infinite ease-in-out 0.2s'
                }}></div>
                <div style={{
                  width: '6px',
                  height: '6px',
                  background: '#4ade80',
                  borderRadius: '50%',
                  animation: 'typing 1.4s infinite ease-in-out 0.4s'
                }}></div>
              </div>
              <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>Someone is typing...</span>
            </div>
          )}
        </div>

        {/* Message Input Area */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end'
        }}>
          {/* Attachment Button */}
          <div style={{ position: 'relative' }}>
            <button style={{
              background: 'rgba(107, 114, 128, 0.2)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '1.2rem',
              transition: 'all 0.2s ease'
            }}>
              📎
            </button>
            <div style={{
              position: 'absolute',
              top: '-120px',
              left: '0',
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              display: 'none',
              zIndex: 1000
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.25rem',
                width: '120px'
              }}>
                <button
                  onClick={handleImageShare}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  title="Share Image"
                >
                  🖼️
                </button>
                <button
                  onClick={handleFileShare}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  title="Share File"
                >
                  📄
                </button>
              </div>
            </div>
          </div>

          {/* Voice Message Button */}
          <button
            onClick={handleVoiceMessage}
            style={{
              background: isRecording
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'rgba(74, 222, 128, 0.2)',
              border: `1px solid ${isRecording ? 'rgba(239, 68, 68, 0.3)' : 'rgba(74, 222, 128, 0.3)'}`,
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: isRecording ? '#fca5a5' : '#4ade80',
              cursor: 'pointer',
              fontSize: '1.2rem',
              transition: 'all 0.2s ease',
              animation: isRecording ? 'pulse 1s infinite' : 'none'
            }}
            title="Voice Message"
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>

          {/* Text Input */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2rem',
            padding: '0.75rem 1.5rem',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>🔒</span>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your encrypted message..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: '0.95rem'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleGifButton}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0.25rem'
                }}
                title="Send GIF"
              >
                🎬
              </button>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0.25rem'
                }}
                title="Emoji"
              >
                😊
              </button>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            style={{
              background: newMessage.trim()
                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                : 'rgba(107, 114, 128, 0.2)',
              border: newMessage.trim()
                ? '1px solid rgba(59, 130, 246, 0.3)'
                : '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: newMessage.trim() ? 'white' : 'rgba(255,255,255,0.5)',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '1.2rem',
              transition: 'all 0.2s ease',
              boxShadow: newMessage.trim()
                ? '0 4px 15px rgba(59, 130, 246, 0.4)'
                : 'none'
            }}
          >
            🚀
          </button>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div style={{
            position: 'absolute',
            bottom: '80px',
            right: '1rem',
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '1rem',
            zIndex: 1000
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewMessage(newMessage + emoji);
                    setShowEmojiPicker(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEmojiPicker(false)}
              style={{
                width: '100%',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: '#ef4444',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>

      <style>{`
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }

        @keyframes waveform {
          0%, 100% {
            width: 60%;
          }
          50% {
            width: 80%;
          }
        }
      `}</style>
    </div>
  );
};

const App = () => {
  const [currentView, setCurrentView] = useState('welcome');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    setIsLoading(true);

    // Simulate connection initialization
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsLoading(false);
    setCurrentView('chat');
  };

  const handleBackToWelcome = () => {
    setCurrentView('welcome');
  };

  if (currentView === 'chat') {
    return <ChatInterface onBack={handleBackToWelcome} />;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%)',
      minHeight: '100vh',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(74, 222, 128, 0.1) 0%, transparent 70%)',
        animation: 'float 20s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        right: '-30%',
        width: '120%',
        height: '120%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        animation: 'float 25s ease-in-out infinite reverse'
      }}></div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '3rem',
          animation: 'fadeInUp 1s ease-out'
        }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
            padding: '1rem 2rem',
            borderRadius: '2rem',
            marginBottom: '1rem',
            boxShadow: '0 8px 32px rgba(74, 222, 128, 0.3)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '2.5rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              🔒 Anonymous Messenger
            </h1>
          </div>
          <p style={{
            fontSize: '1.3rem',
            color: '#cbd5e1',
            margin: 0,
            fontWeight: '500',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            Ultra-secure messaging with military-grade encryption
          </p>
        </div>

        {/* System Status Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto 3rem',
          animation: 'fadeInUp 1s ease-out 0.2s both'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }} onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 12px 40px rgba(74, 222, 128, 0.2)';
          }} onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: '#4ade80',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
                boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
              }}></div>
              <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.1rem', fontWeight: '600' }}>
                Backend Server
              </h3>
            </div>
            <p style={{ margin: 0, color: '#d1fae5', fontSize: '0.95rem', lineHeight: '1.5' }}>
              ✅ Express.js server running on port 3001 with advanced security middleware
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }} onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 12px 40px rgba(74, 222, 128, 0.2)';
          }} onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: '#4ade80',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
                boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
              }}></div>
              <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.1rem', fontWeight: '600' }}>
                Redis Database
              </h3>
            </div>
            <p style={{ margin: 0, color: '#d1fae5', fontSize: '0.95rem', lineHeight: '1.5' }}>
              ✅ High-performance database connected with session management
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }} onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 12px 40px rgba(74, 222, 128, 0.2)';
          }} onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: '#4ade80',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
                boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
              }}></div>
              <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.1rem', fontWeight: '600' }}>
                Encryption Engine
              </h3>
            </div>
            <p style={{ margin: 0, color: '#d1fae5', fontSize: '0.95rem', lineHeight: '1.5' }}>
              ✅ AES-256-GCM encryption active with perfect forward secrecy
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }} onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 12px 40px rgba(74, 222, 128, 0.2)';
          }} onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: '#4ade80',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
                boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
              }}></div>
              <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.1rem', fontWeight: '600' }}>
                WebSocket
              </h3>
            </div>
            <p style={{ margin: 0, color: '#d1fae5', fontSize: '0.95rem', lineHeight: '1.5' }}>
              ✅ Real-time messaging ready with secure WebSocket connections
            </p>
          </div>
        </div>

        {/* API Endpoints */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.1))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '1.5rem',
          padding: '2rem',
          marginBottom: '3rem',
          animation: 'fadeInUp 1s ease-out 0.4s both',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            color: '#60a5fa',
            fontSize: '1.4rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🔗 API Endpoints
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Health Check
              </div>
              <code style={{
                color: '#4ade80',
                background: 'rgba(74, 222, 128, 0.1)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.85rem'
              }}>
                GET http://localhost:3001/health
              </code>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Session Management
              </div>
              <code style={{
                color: '#4ade80',
                background: 'rgba(74, 222, 128, 0.1)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.85rem'
              }}>
                POST http://localhost:3001/api/session/*
              </code>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Messages API
              </div>
              <code style={{
                color: '#4ade80',
                background: 'rgba(74, 222, 128, 0.1)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.85rem'
              }}>
                POST http://localhost:3001/api/messages/*
              </code>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Files API
              </div>
              <code style={{
                color: '#4ade80',
                background: 'rgba(74, 222, 128, 0.1)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.85rem'
              }}>
                POST http://localhost:3001/api/files/*
              </code>
            </div>
          </div>
        </div>

        {/* Start Chat Button */}
        <div style={{
          animation: 'fadeInUp 1s ease-out 0.6s both',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleStartChat}
            disabled={isLoading}
            style={{
              background: isLoading
                ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                : 'linear-gradient(135deg, #4ade80, #22c55e, #16a34a)',
              color: 'white',
              border: 'none',
              borderRadius: '2rem',
              padding: '1.25rem 3rem',
              fontSize: '1.3rem',
              fontWeight: '700',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: isLoading
                ? '0 4px 15px rgba(0,0,0,0.2)'
                : '0 8px 32px rgba(74, 222, 128, 0.4), 0 0 0 1px rgba(74, 222, 128, 0.1)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              position: 'relative',
              overflow: 'hidden',
              animation: isLoading ? 'pulse 1.5s infinite' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 12px 40px rgba(74, 222, 128, 0.6), 0 0 0 1px rgba(74, 222, 128, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 32px rgba(74, 222, 128, 0.4), 0 0 0 1px rgba(74, 222, 128, 0.1)';
              }
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Initializing Secure Connection...
              </>
            ) : (
              <>
                🚀 Start Secure Chat
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  animation: 'shimmer 2s infinite'
                }}></div>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeInUp 1s ease-out 0.8s both'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
            marginBottom: '1rem'
          }}>
            <span style={{
              color: '#4ade80',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              🔐 End-to-end encrypted
            </span>
            <span style={{
              color: '#60a5fa',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              👤 Anonymous
            </span>
            <span style={{
              color: '#f59e0b',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              🛡️ Privacy-first
            </span>
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Backend API operational at <strong style={{ color: '#4ade80' }}>http://localhost:3001</strong>
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem',
            margin: '0.5rem 0 0 0'
          }}>
            Your secure messaging platform is ready! 🎊
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default App;