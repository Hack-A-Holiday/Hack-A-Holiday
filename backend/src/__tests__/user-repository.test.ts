import { UserRepository } from '../repositories/user-repository'
import { DynamoDB } from 'aws-sdk'

// Mock DynamoDB
const mockDocumentClient = {
  scan: jest.fn(),
  query: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => mockDocumentClient)
  }
}))

describe('UserRepository', () => {
  let userRepository: UserRepository

  beforeEach(() => {
    jest.clearAllMocks()
    userRepository = new UserRepository()
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hash',
        salt: 'salt'
      }

      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [mockUser]
        })
      })

      const result = await userRepository.findByEmail('test@example.com')

      expect(result).toEqual(mockUser)
      expect(mockDocumentClient.scan).toHaveBeenCalledWith({
        TableName: process.env.DYNAMODB_TABLE_NAME,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': 'test@example.com'
        }
      })
    })

    it('should return null if user not found', async () => {
      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      })

      const result = await userRepository.findByEmail('notfound@example.com')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        passwordHash: 'hashed-password',
        salt: 'salt123'
      }

      mockDocumentClient.put.mockReturnValue({
        promise: () => Promise.resolve({})
      })

      const result = await userRepository.create(userData)

      expect(result).toMatchObject({
        email: userData.email,
        name: userData.name
      })
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(mockDocumentClient.put).toHaveBeenCalled()
    })
  })

  describe('generatePasswordResetToken', () => {
    it('should generate reset token for existing user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      }

      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [mockUser]
        })
      })

      mockDocumentClient.update.mockReturnValue({
        promise: () => Promise.resolve({})
      })

      const result = await userRepository.generatePasswordResetToken('test@example.com')

      expect(result).toMatchObject({
        resetToken: expect.any(String),
        resetTokenExpiry: expect.any(Number)
      })
      expect(mockDocumentClient.update).toHaveBeenCalled()
    })

    it('should throw error for non-existent user', async () => {
      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      })

      await expect(userRepository.generatePasswordResetToken('notfound@example.com'))
        .rejects.toThrow('User not found')
    })
  })

  describe('verifyPasswordResetToken', () => {
    it('should verify valid token', async () => {
      const mockUser = {
        id: 'user123',
        resetToken: 'valid-token',
        resetTokenExpiry: Date.now() + 3600000 // 1 hour from now
      }

      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [mockUser]
        })
      })

      const result = await userRepository.verifyPasswordResetToken('valid-token')

      expect(result).toBe(true)
    })

    it('should reject expired token', async () => {
      const mockUser = {
        id: 'user123',
        resetToken: 'expired-token',
        resetTokenExpiry: Date.now() - 3600000 // 1 hour ago
      }

      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [mockUser]
        })
      })

      const result = await userRepository.verifyPasswordResetToken('expired-token')

      expect(result).toBe(false)
    })

    it('should reject invalid token', async () => {
      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      })

      const result = await userRepository.verifyPasswordResetToken('invalid-token')

      expect(result).toBe(false)
    })
  })

  describe('resetPasswordWithToken', () => {
    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        resetToken: 'valid-token',
        resetTokenExpiry: Date.now() + 3600000
      }

      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [mockUser]
        })
      })

      mockDocumentClient.update.mockReturnValue({
        promise: () => Promise.resolve({})
      })

      const result = await userRepository.resetPasswordWithToken('valid-token', 'new-password')

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email
      })
      expect(mockDocumentClient.update).toHaveBeenCalled()
    })

    it('should throw error for invalid token', async () => {
      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      })

      await expect(userRepository.resetPasswordWithToken('invalid-token', 'new-password'))
        .rejects.toThrow('Invalid or expired reset token')
    })
  })

  describe('clearExpiredResetTokens', () => {
    it('should clear expired reset tokens', async () => {
      const mockUsers = [
        {
          id: 'user1',
          resetToken: 'token1',
          resetTokenExpiry: Date.now() - 3600000 // expired
        },
        {
          id: 'user2',
          resetToken: 'token2',
          resetTokenExpiry: Date.now() + 3600000 // not expired
        }
      ]

      mockDocumentClient.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockUsers
        })
      })

      mockDocumentClient.update.mockReturnValue({
        promise: () => Promise.resolve({})
      })

      await userRepository.clearExpiredResetTokens()

      // Should only update the expired token
      expect(mockDocumentClient.update).toHaveBeenCalledTimes(1)
    })
  })
})