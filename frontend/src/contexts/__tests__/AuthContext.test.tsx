import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { dynamoDBAuthService } from '../../services/dynamoAuth'
import { googleAuthService } from '../../services/googleAuth'

// Mock the auth service
jest.mock('../../services/dynamoAuth', () => ({
  dynamoDBAuthService: {
    login: jest.fn(),
    signup: jest.fn(),
    storeGoogleUser: jest.fn(),
    getCurrentUser: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyResetToken: jest.fn(),
  }
}))

// Mock the Google auth service
jest.mock('../../services/googleAuth', () => ({
  googleAuthService: {
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  }
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/',
  })
}))

// Test component to access auth context
const TestComponent: React.FC = () => {
  const { state, login, signup, googleAuth, logout, clearError } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{state.loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{state.user ? state.user.email : 'no-user'}</div>
      <div data-testid="error">{state.error || 'no-error'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => signup('test@example.com', 'password', 'Test User')}>Signup</button>
      <button onClick={googleAuth}>Google Auth</button>
      <button onClick={logout}>Logout</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  )
}

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should start with no user and not loading', () => {
      renderWithAuthProvider(<TestComponent />)
      
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
    })

    it('should restore user from localStorage on mount', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' }
      const mockToken = 'mock-token'
      
      localStorage.setItem('authToken', mockToken)
      localStorage.setItem('user', JSON.stringify(mockUser))
      
      // Mock getCurrentUser to return the user
      ;(dynamoDBAuthService.getCurrentUser as jest.Mock).mockResolvedValue({
        user: mockUser
      })

      renderWithAuthProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })
    })
  })

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'auth-token'
      }
      
      ;(dynamoDBAuthService.login as jest.Mock).mockResolvedValue(mockResponse)

      renderWithAuthProvider(<TestComponent />)
      
      const loginButton = screen.getByText('Login')
      
      await act(async () => {
        loginButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      expect(dynamoDBAuthService.login).toHaveBeenCalledWith('test@example.com', 'password')
  expect(mockPush).toHaveBeenCalledWith('/plantrip')
    })

    it('should handle login errors', async () => {
      ;(dynamoDBAuthService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

      renderWithAuthProvider(<TestComponent />)
      
      const loginButton = screen.getByText('Login')
      
      await act(async () => {
        loginButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials')
      })

      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })
  })

  describe('Signup', () => {
    it('should signup successfully', async () => {
      const mockResponse = {
        user: { id: '123', email: 'newuser@example.com', name: 'New User' },
        token: 'auth-token'
      }
      
      ;(dynamoDBAuthService.signup as jest.Mock).mockResolvedValue(mockResponse)

      renderWithAuthProvider(<TestComponent />)
      
      const signupButton = screen.getByText('Signup')
      
      await act(async () => {
        signupButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('newuser@example.com')
      })

      expect(dynamoDBAuthService.signup).toHaveBeenCalledWith('test@example.com', 'password', 'Test User')
  expect(mockPush).toHaveBeenCalledWith('/plantrip')
    })

    it('should handle signup errors', async () => {
      ;(dynamoDBAuthService.signup as jest.Mock).mockRejectedValue(new Error('User already exists'))

      renderWithAuthProvider(<TestComponent />)
      
      const signupButton = screen.getByText('Signup')
      
      await act(async () => {
        signupButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('User already exists')
      })
    })
  })

  describe('Google Auth', () => {
    it('should authenticate with Google successfully', async () => {
      const mockGoogleUser = {
        uid: 'google-uid-123',
        email: 'google@example.com',
        displayName: 'Google User',
        photoURL: 'https://example.com/photo.jpg'
      }
      
      const mockAuthResponse = {
        user: { id: '123', email: 'google@example.com', name: 'Google User' },
        token: 'google-token'
      }
      
      ;(googleAuthService.signInWithGoogle as jest.Mock).mockResolvedValue(mockGoogleUser)
      ;(dynamoDBAuthService.storeGoogleUser as jest.Mock).mockResolvedValue(mockAuthResponse)

      renderWithAuthProvider(<TestComponent />)
      
      const googleButton = screen.getByText('Google Auth')
      
      await act(async () => {
        googleButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('google@example.com')
      })

      expect(googleAuthService.signInWithGoogle).toHaveBeenCalled()
      expect(dynamoDBAuthService.storeGoogleUser).toHaveBeenCalledWith(mockGoogleUser)
  expect(mockPush).toHaveBeenCalledWith('/plantrip')
    })

    it('should handle Google auth errors', async () => {
      ;(googleAuthService.signInWithGoogle as jest.Mock).mockRejectedValue(new Error('Google auth failed'))

      renderWithAuthProvider(<TestComponent />)
      
      const googleButton = screen.getByText('Google Auth')
      
      await act(async () => {
        googleButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Google auth failed')
      })
    })
  })

  describe('Logout', () => {
    it('should logout and clear user data', async () => {
      // First login
      const mockResponse = {
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'auth-token'
      }
      
      ;(dynamoDBAuthService.login as jest.Mock).mockResolvedValue(mockResponse)

      renderWithAuthProvider(<TestComponent />)
      
      const loginButton = screen.getByText('Login')
      await act(async () => {
        loginButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Then logout
      const logoutButton = screen.getByText('Logout')
      await act(async () => {
        logoutButton.click()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(localStorage.getItem('authToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('Error Handling', () => {
    it('should clear errors', async () => {
      ;(dynamoDBAuthService.login as jest.Mock).mockRejectedValue(new Error('Test error'))

      renderWithAuthProvider(<TestComponent />)
      
      const loginButton = screen.getByText('Login')
      await act(async () => {
        loginButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Test error')
      })

      const clearButton = screen.getByText('Clear Error')
      await act(async () => {
        clearButton.click()
      })

      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
    })
  })

  describe('Loading States', () => {
    it('should show loading during login', async () => {
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve
      })
      
      ;(dynamoDBAuthService.login as jest.Mock).mockReturnValue(loginPromise)

      renderWithAuthProvider(<TestComponent />)
      
      const loginButton = screen.getByText('Login')
      
      await act(async () => {
        loginButton.click()
      })

      expect(screen.getByTestId('loading')).toHaveTextContent('loading')

      await act(async () => {
        resolveLogin!({
          user: { id: '123', email: 'test@example.com', name: 'Test User' },
          token: 'token'
        })
      })

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      })
    })
  })

  describe('Token Management', () => {
    it('should store token in localStorage on successful login', async () => {
      const mockResponse = {
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'auth-token-123'
      }
      
      ;(dynamoDBAuthService.login as jest.Mock).mockResolvedValue(mockResponse)

      renderWithAuthProvider(<TestComponent />)
      
      const loginButton = screen.getByText('Login')
      
      await act(async () => {
        loginButton.click()
      })

      await waitFor(() => {
        expect(localStorage.getItem('authToken')).toBe('auth-token-123')
        expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.user))
      })
    })

    it('should handle invalid token on mount', async () => {
      localStorage.setItem('authToken', 'invalid-token')
      localStorage.setItem('user', JSON.stringify({ id: '123', email: 'test@example.com' }))
      
      ;(dynamoDBAuthService.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Invalid token'))

      renderWithAuthProvider(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
        expect(localStorage.getItem('authToken')).toBeNull()
        expect(localStorage.getItem('user')).toBeNull()
      })
    })
  })
})