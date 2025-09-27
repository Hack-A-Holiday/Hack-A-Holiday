// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      scan: jest.fn(),
      query: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  },
}))

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mocked-random-string')
  })),
  pbkdf2Sync: jest.fn(() => Buffer.from('mocked-hash')),
}))

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.DYNAMODB_TABLE_NAME = 'test-table'