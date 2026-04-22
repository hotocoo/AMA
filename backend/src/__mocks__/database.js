/**
 * Mock database module for testing
 */

const mockSessionManager = {
  createSession: jest.fn().mockResolvedValue({ id: 'anon_test123', created: Date.now(), messageCount: 0, chatCount: 0 }),
  getSession: jest.fn().mockResolvedValue(null),
  updateSession: jest.fn().mockResolvedValue({}),
  deleteSession: jest.fn().mockResolvedValue(undefined),
  incrementMessageCount: jest.fn().mockResolvedValue({}),
  getSessionStats: jest.fn().mockResolvedValue({ totalSessions: 0, activeSessions: 0, totalMessages: 0, timestamp: Date.now() }),
  redis: { setex: jest.fn(), get: jest.fn().mockResolvedValue(null) },
};

const mockMessageStore = {
  storeMessage: jest.fn().mockResolvedValue({}),
  getMessage: jest.fn().mockResolvedValue(null),
  getChatMessages: jest.fn().mockResolvedValue([]),
  getChatMessageCount: jest.fn().mockResolvedValue(0),
  getChatMessagesByTimeRange: jest.fn().mockResolvedValue([]),
  deleteMessage: jest.fn().mockResolvedValue(undefined),
  deleteChatMessages: jest.fn().mockResolvedValue(undefined),
};

const mockFileStore = {
  storeFile: jest.fn().mockResolvedValue({}),
  getFile: jest.fn().mockResolvedValue(null),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

const mockChatStore = {
  createChat: jest.fn().mockResolvedValue({ id: 'chat_test', type: 'private', participants: [], created: Date.now() }),
  getChat: jest.fn().mockResolvedValue(null),
  updateChat: jest.fn().mockResolvedValue({}),
  deleteChat: jest.fn().mockResolvedValue(undefined),
  addParticipant: jest.fn().mockResolvedValue({}),
  removeParticipant: jest.fn().mockResolvedValue({}),
  generateInviteCode: jest.fn().mockResolvedValue('abc123'),
  getChatByInviteCode: jest.fn().mockResolvedValue(null),
  incrementMessageCount: jest.fn().mockResolvedValue({}),
};

const mockWebSocketManager = {
  registerConnection: jest.fn().mockResolvedValue({}),
  updateConnectionPing: jest.fn().mockResolvedValue({}),
  unregisterConnection: jest.fn().mockResolvedValue(undefined),
  getSessionConnections: jest.fn().mockResolvedValue([]),
};

const mockDatabaseServices = {
  sessionManager: mockSessionManager,
  messageStore: mockMessageStore,
  fileStore: mockFileStore,
  chatStore: mockChatStore,
  webSocketManager: mockWebSocketManager,
};

module.exports = {
  connectDatabase: jest.fn().mockResolvedValue({ ping: jest.fn().mockResolvedValue('PONG') }),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
  initializeDatabaseServices: jest.fn().mockReturnValue(mockDatabaseServices),
  healthCheck: jest.fn().mockResolvedValue({ status: 'connected', latency: '1ms', timestamp: Date.now() }),
  AnonymousSessionManager: jest.fn(),
  MessageStore: jest.fn(),
  FileStore: jest.fn(),
  ChatStore: jest.fn(),
  WebSocketManager: jest.fn(),
};
