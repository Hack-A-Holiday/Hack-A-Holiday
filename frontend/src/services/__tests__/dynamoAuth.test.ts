import { dynamoDBAuthService } from '../dynamoAuth'

// Mock fetch globally
global.fetch = jest.fn()

describe('DynamoDBAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up environment variable for API URL
    process.env.NEXT_PUBLIC_API_URL = 'https://test-api.com'
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'auth-token'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await dynamoDBAuthService.login('test@example.com', 'password')

      expect(fetch).toHaveBeenCalledWith('https://test-api.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password'
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should throw error for failed login', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      })

      await expect(dynamoDBAuthService.login('test@example.com', 'wrong'))
        .rejects.toThrow('Invalid credentials')
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(dynamoDBAuthService.login('test@example.com', 'password'))
        .rejects.toThrow('Network error')
    })
  })

  describe('signup', () => {
    it('should signup successfully with valid data', async () => {
      const mockResponse = {
        user: { id: '123', email: 'new@example.com', name: 'New User' },
        token: 'auth-token'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await dynamoDBAuthService.signup('new@example.com', 'password', 'New User')

      expect(fetch).toHaveBeenCalledWith('https://test-api.com/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'password',
          name: 'New User'
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should throw error for existing user', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'User already exists' })
      })

      await expect(dynamoDBAuthService.signup('existing@example.com', 'password', 'User'))
        .rejects.toThrow('User already exists')
    })
  })

  describe('storeGoogleUser', () => {
    it('should store Google user successfully', async () => {
      const mockResponse = {
        user: { id: '123', email: 'google@example.com', name: 'Google User' },
        token: 'google-token'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const googleUser = {
        uid: 'google-uid-123',
        email: 'google@example.com',
        displayName: 'Google User',
        photoURL: 'https://example.com/photo.jpg'
      }

      const result = await dynamoDBAuthService.storeGoogleUser(googleUser)

      expect(fetch).toHaveBeenCalledWith('https://test-api.com/auth/google-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleId: 'google-uid-123',
          email: 'google@example.com',
          name: 'Google User',
          profilePicture: 'https://example.com/photo.jpg'
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle Google user storage errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to store Google user' })
      })

      const googleUser = {
        uid: 'google-uid-123',
        email: 'google@example.com',
        displayName: 'Google User'
      }

      await expect(dynamoDBAuthService.storeGoogleUser(googleUser))
        .rejects.toThrow('Failed to store Google user')
    })
  })

  describe('getCurrentUser', () => {
    it('should get current user with valid token', async () => {
      const mockResponse = {
        user: { id: '123', email: 'test@example.com', name: 'Test User' }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await dynamoDBAuthService.getCurrentUser('valid-token')

      expect(fetch).toHaveBeenCalledWith('https://test-api.com/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        }
      })

      expect(result).toEqual(mockResponse)
    })

    it('should throw error for invalid token', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid token' })
      })

      await expect(dynamoDBAuthService.getCurrentUser('invalid-token'))
        .rejects.toThrow('Invalid token')
    })
  })

  describe('forgotPassword', () => {
    it('should send reset email successfully', async () => {
      const mockResponse = { message: 'Reset email sent', resetToken: 'token123' }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await dynamoDBAuthService.forgotPassword('test@example.com')

      expect(fetch).toHaveBeenCalledWith('https://test-api.com/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com'
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle forgot password errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Service unavailable' })
      })

      await expect(dynamoDBAuthService.forgotPassword('test@example.com'))
        .rejects.toThrow('Service unavailable')
    })
  })

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockResponse = { message: 'Password reset successful' }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await dynamoDBAuthService.resetPassword('token123', 'newpassword')

      expect(fetch).toHaveBeenCalledWith('https://test-api.com/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'token123',
          newPassword: 'newpassword'
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle invalid reset token', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid or expired token' })
      })

      await expect(dynamoDBAuthService.resetPassword('invalid-token', 'newpassword'))
        .rejects.toThrow('Invalid or expired token')
    })
  })

  describe('verifyResetToken', () => {
    it('should verify valid reset token', async () => {
      const mockResponse = { valid: true }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await dynamoDBAuthService.verifyResetToken('valid-token')

      expect(fetch).toHaveBeenCalledWith('https://test-api.com/auth/verify-reset-token?token=valid-token', {
        method: 'GET'
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle invalid reset token', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ valid: false, error: 'Invalid token' })
      })

      await expect(dynamoDBAuthService.verifyResetToken('invalid-token'))
        .rejects.toThrow('Invalid token')
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      await expect(dynamoDBAuthService.login('test@example.com', 'password'))
        .rejects.toThrow('An error occurred')
    })

    it('should handle missing API URL', async () => {
      delete process.env.NEXT_PUBLIC_API_URL

      await expect(dynamoDBAuthService.login('test@example.com', 'password'))
        .rejects.toThrow()
    })

    it('should handle fetch failures', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'))

      await expect(dynamoDBAuthService.login('test@example.com', 'password'))
        .rejects.toThrow('Network failure')
    })
  })
})