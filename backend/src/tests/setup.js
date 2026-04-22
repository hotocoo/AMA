/**
 * Jest test setup
 * Sets NODE_ENV to 'test' and mocks external dependencies
 */

process.env.NODE_ENV = 'test';

// Mock ioredis to avoid needing a real Redis server in tests
jest.mock('ioredis', () => {
  const mockRedis = {
    on: jest.fn().mockReturnThis(),
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    scan: jest.fn().mockResolvedValue(['0', []]),
    mget: jest.fn().mockResolvedValue([]),
    sadd: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    srem: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    zadd: jest.fn().mockResolvedValue(1),
    zrevrange: jest.fn().mockResolvedValue([]),
    zrange: jest.fn().mockResolvedValue([]),
    zrangebyscore: jest.fn().mockResolvedValue([]),
    zrem: jest.fn().mockResolvedValue(1),
    zcard: jest.fn().mockResolvedValue(0),
    quit: jest.fn().mockResolvedValue('OK'),
    info: jest.fn().mockResolvedValue('used_memory_human:1.00M\r\n'),
    pipeline: jest.fn().mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      zrem: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  };
  return jest.fn(() => mockRedis);
});

// Prevent process.exit from killing jest
const originalExit = process.exit;
process.exit = jest.fn((code) => {
  if (process.env.NODE_ENV === 'test') {
    console.warn(`process.exit(${code}) called in test — suppressed`);
    return;
  }
  originalExit(code);
});
