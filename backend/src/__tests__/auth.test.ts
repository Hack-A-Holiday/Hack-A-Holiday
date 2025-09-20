import { handler } from '../functions/auth'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

// Mock user repository
const mockUserRepository = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  generatePasswordResetToken: jest.fn(),
  resetPasswordWithToken: jest.fn(),
  verifyPasswordResetToken: jest.fn(),
}

jest.mock('../repositories/user-repository', () => ({
  UserRepository: jest.fn(() => mockUserRepository)
}))

describe('Auth Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createEvent = (httpMethod: string, path: string, body?: any): APIGatewayProxyEvent => ({
    httpMethod,
    path,
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  })

  describe('POST /auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        salt: 'salt123'
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)

      const event = createEvent('POST', '/auth/login', {
        email: 'test@example.com',
        password: 'correct-password'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.user).toBeDefined()
      expect(body.token).toBeDefined()
      expect(body.user.email).toBe('test@example.com')
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('should return 401 for invalid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)

      const event = createEvent('POST', '/auth/login', {
        email: 'test@example.com',
        password: 'wrong-password'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Invalid credentials')
    })

    it('should return 400 for missing email or password', async () => {
      const event = createEvent('POST', '/auth/login', {
        email: 'test@example.com'
        // missing password
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Email and password are required')
    })
  })

  describe('POST /auth/signup', () => {
    it('should successfully create a new user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null) // User doesn't exist
      mockUserRepository.create.mockResolvedValue({
        id: 'user123',
        email: 'newuser@example.com',
        name: 'New User'
      })

      const event = createEvent('POST', '/auth/signup', {
        email: 'newuser@example.com',
        password: 'secure-password',
        name: 'New User'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(201)
      const body = JSON.parse(result.body)
      expect(body.user).toBeDefined()
      expect(body.token).toBeDefined()
      expect(body.user.email).toBe('newuser@example.com')
      expect(mockUserRepository.create).toHaveBeenCalled()
    })

    it('should return 409 if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com'
      })

      const event = createEvent('POST', '/auth/signup', {
        email: 'existing@example.com',
        password: 'password',
        name: 'Existing User'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(409)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('User already exists')
    })

    it('should validate email format', async () => {
      const event = createEvent('POST', '/auth/signup', {
        email: 'invalid-email',
        password: 'password',
        name: 'Test User'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Invalid email format')
    })

    it('should validate password strength', async () => {
      const event = createEvent('POST', '/auth/signup', {
        email: 'test@example.com',
        password: '123', // Too short
        name: 'Test User'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Password must be at least 6 characters long')
    })
  })

  describe('POST /auth/forgot-password', () => {
    it('should generate reset token for existing user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockUserRepository.generatePasswordResetToken.mockResolvedValue({
        resetToken: 'reset-token-123',
        resetTokenExpiry: Date.now() + 3600000
      })

      const event = createEvent('POST', '/auth/forgot-password', {
        email: 'test@example.com'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.message).toBe('Password reset instructions sent to email')
      expect(mockUserRepository.generatePasswordResetToken).toHaveBeenCalledWith('test@example.com')
    })

    it('should return success even for non-existent user (security)', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)

      const event = createEvent('POST', '/auth/forgot-password', {
        email: 'nonexistent@example.com'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.message).toBe('Password reset instructions sent to email')
    })
  })

  describe('POST /auth/reset-password', () => {
    it('should successfully reset password with valid token', async () => {
      mockUserRepository.verifyPasswordResetToken.mockResolvedValue(true)
      mockUserRepository.resetPasswordWithToken.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      })

      const event = createEvent('POST', '/auth/reset-password', {
        token: 'valid-reset-token',
        newPassword: 'new-secure-password'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.message).toBe('Password reset successful')
      expect(mockUserRepository.resetPasswordWithToken).toHaveBeenCalledWith('valid-reset-token', 'new-secure-password')
    })

    it('should return 400 for invalid or expired token', async () => {
      mockUserRepository.verifyPasswordResetToken.mockResolvedValue(false)

      const event = createEvent('POST', '/auth/reset-password', {
        token: 'invalid-token',
        newPassword: 'new-password'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Invalid or expired reset token')
    })
  })

  describe('GET /auth/verify-reset-token', () => {
    it('should verify valid reset token', async () => {
      mockUserRepository.verifyPasswordResetToken.mockResolvedValue(true)

      const event = createEvent('GET', '/auth/verify-reset-token?token=valid-token')
      event.queryStringParameters = { token: 'valid-token' }

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.valid).toBe(true)
    })

    it('should reject invalid reset token', async () => {
      mockUserRepository.verifyPasswordResetToken.mockResolvedValue(false)

      const event = createEvent('GET', '/auth/verify-reset-token?token=invalid-token')
      event.queryStringParameters = { token: 'invalid-token' }

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.valid).toBe(false)
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database connection failed'))

      const event = createEvent('POST', '/auth/login', {
        email: 'test@example.com',
        password: 'password'
      })

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Internal server error')
    })

    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createEvent('DELETE', '/auth/login', {})

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(405)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Method not allowed')
    })

    it('should return 404 for unknown endpoints', async () => {
      const event = createEvent('GET', '/auth/unknown-endpoint', {})

      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(404)
      const body = JSON.parse(result.body)
      expect(body.error).toBe('Endpoint not found')
    })
  })
})