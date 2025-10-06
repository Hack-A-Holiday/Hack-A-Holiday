import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthForm from '../auth/AuthForm'

// Mock the auth service
jest.mock('../../services/dynamoAuth', () => ({
  dynamoDBAuthService: {
    login: jest.fn(),
    signup: jest.fn(),
    googleAuth: jest.fn(),
  }
}))

describe('AuthForm Integration', () => {
  const defaultProps = {
    mode: 'login' as const,
    onSubmit: jest.fn(),
    onSwitchMode: jest.fn(),
    onGoogleAuth: jest.fn(),
    onForgotPassword: jest.fn(),
    loading: false,
    googleLoading: false,
    error: undefined
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login Mode', () => {
    it('should render login form correctly', () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      expect(screen.getByText('Welcome Back!')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    })

    it('should show forgot password link in login mode', () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    })

    it('should submit login form with valid data', async () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByText('Sign In')
      
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should call onForgotPassword when forgot password link is clicked', () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const forgotLink = screen.getByText('Forgot password?')
      fireEvent.click(forgotLink)

      expect(defaultProps.onForgotPassword).toHaveBeenCalled()
    })
  })

  describe('Signup Mode', () => {
    it('should render signup form correctly', () => {
      render(<AuthForm {...defaultProps} mode="signup" />)
      
      expect(screen.getByText('Create Account')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    it('should not show forgot password link in signup mode', () => {
      render(<AuthForm {...defaultProps} mode="signup" />)
      
      expect(screen.queryByText('Forgot password?')).not.toBeInTheDocument()
    })

    it('should submit signup form with valid data', async () => {
      render(<AuthForm {...defaultProps} mode="signup" />)
      
      const nameInput = screen.getByPlaceholderText('Enter your full name')
      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByText('Create Account')
      
      await userEvent.type(nameInput, 'Test User')
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  describe('Form Validation', () => {
    it('should require email and password fields', async () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const submitButton = screen.getByText('Sign In')
      fireEvent.click(submitButton)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      
      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })

    it('should require name field in signup mode', () => {
      render(<AuthForm {...defaultProps} mode="signup" />)
      
      const nameInput = screen.getByPlaceholderText('Enter your full name')
      expect(nameInput).toBeRequired()
    })

    it('should validate email format', () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      expect(emailInput).toHaveAttribute('type', 'email')
    })
  })

  describe('Loading States', () => {
    it('should show loading state on form submission', () => {
      render(<AuthForm {...defaultProps} mode="login" loading={true} />)
      
      const submitButton = screen.getByText('Signing In...')
      expect(submitButton).toBeDisabled()
    })

    it('should show loading state on Google auth', () => {
      render(<AuthForm {...defaultProps} mode="login" googleLoading={true} />)
      
      const googleButton = screen.getByText('Signing in with Google...')
      expect(googleButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error messages', () => {
      render(<AuthForm {...defaultProps} error="Invalid credentials" />)
      
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    it('should style error messages appropriately', () => {
      render(<AuthForm {...defaultProps} error="Test error" />)
      
      const errorElement = screen.getByText('Test error')
      expect(errorElement).toHaveStyle({
        color: '#e53e3e'
      })
    })
  })

  describe('Google Authentication', () => {
    it('should call onGoogleAuth when Google button is clicked', () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const googleButton = screen.getByText('Sign in with Google')
      fireEvent.click(googleButton)

      expect(defaultProps.onGoogleAuth).toHaveBeenCalled()
    })

    it('should show appropriate text for signup mode', () => {
      render(<AuthForm {...defaultProps} mode="signup" />)
      
      expect(screen.getByText('Sign up with Google')).toBeInTheDocument()
    })
  })

  describe('Mode Switching', () => {
    it('should call onSwitchMode when switch link is clicked in login mode', () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const switchLink = screen.getByText("Don't have an account? Sign up")
      fireEvent.click(switchLink)

      expect(defaultProps.onSwitchMode).toHaveBeenCalled()
    })

    it('should call onSwitchMode when switch link is clicked in signup mode', () => {
      render(<AuthForm {...defaultProps} mode="signup" />)
      
      const switchLink = screen.getByText('Already have an account? Sign in')
      fireEvent.click(switchLink)

      expect(defaultProps.onSwitchMode).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
    })

    it('should be keyboard navigable', async () => {
      render(<AuthForm {...defaultProps} mode="login" />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByText('Sign In')
      
      // Tab navigation should work
      await userEvent.tab()
      expect(emailInput).toHaveFocus()
      
      await userEvent.tab()
      expect(passwordInput).toHaveFocus()
      
      await userEvent.tab()
      expect(submitButton).toHaveFocus()
    })
  })
})