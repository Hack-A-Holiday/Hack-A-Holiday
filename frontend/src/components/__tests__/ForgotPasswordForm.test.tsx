import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPasswordForm from '../ForgotPasswordForm'
import { dynamoDBAuthService } from '../../services/dynamoAuth'

// Mock the auth service
jest.mock('../../services/dynamoAuth', () => ({
  dynamoDBAuthService: {
    forgotPassword: jest.fn(),
  }
}))

// Mock SweetAlert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn()
}))

describe('ForgotPasswordForm', () => {
  const defaultProps = {
    onCancel: jest.fn(),
    onSuccess: jest.fn(),
    onBackToLogin: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render email input field', () => {
      render(<ForgotPasswordForm {...defaultProps} />)
      
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<ForgotPasswordForm {...defaultProps} />)
      
      expect(screen.getByText('Send Reset Link')).toBeInTheDocument()
    })

    it('should render back to login button when onBackToLogin is provided', () => {
      render(<ForgotPasswordForm {...defaultProps} />)
      
      expect(screen.getByText('Back to Login')).toBeInTheDocument()
    })

    it('should render cancel button when onBackToLogin is not provided', () => {
      render(<ForgotPasswordForm {...defaultProps} onBackToLogin={undefined} />)
      
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should require email input', async () => {
      render(<ForgotPasswordForm {...defaultProps} />)
      
      const submitButton = screen.getByText('Send Reset Link')
      fireEvent.click(submitButton)

      // HTML5 validation should prevent submission
      const emailInput = screen.getByPlaceholderText('Enter your email')
      expect(emailInput).toBeRequired()
    })

    it('should validate email format', async () => {
      render(<ForgotPasswordForm {...defaultProps} />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      await userEvent.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByText('Send Reset Link')
      fireEvent.click(submitButton)

      // HTML5 validation should show error for invalid email
      expect(emailInput).toHaveAttribute('type', 'email')
    })
  })

  describe('Form Submission', () => {
    it('should submit form with valid email', async () => {
      const mockResponse = { message: 'Reset link sent' }
      ;(dynamoDBAuthService.forgotPassword as jest.Mock).mockResolvedValue(mockResponse)

      render(<ForgotPasswordForm {...defaultProps} />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByText('Send Reset Link')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(dynamoDBAuthService.forgotPassword).toHaveBeenCalledWith('test@example.com')
      })
    })

    it('should show loading state during submission', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      ;(dynamoDBAuthService.forgotPassword as jest.Mock).mockReturnValue(promise)

      render(<ForgotPasswordForm {...defaultProps} />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByText('Send Reset Link')
      fireEvent.click(submitButton)

      expect(screen.getByText('Sending...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise
      resolvePromise!({ message: 'Success' })
      
      await waitFor(() => {
        expect(screen.getByText('Send Reset Link')).toBeInTheDocument()
      })
    })

    it('should handle submission errors', async () => {
      ;(dynamoDBAuthService.forgotPassword as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<ForgotPasswordForm {...defaultProps} />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByText('Send Reset Link')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(dynamoDBAuthService.forgotPassword).toHaveBeenCalled()
      })

      // Error should be handled (likely shown via SweetAlert)
    })

    it('should call onSuccess after successful submission', async () => {
      const mockResponse = { message: 'Reset link sent', resetToken: 'token123' }
      ;(dynamoDBAuthService.forgotPassword as jest.Mock).mockResolvedValue(mockResponse)

      render(<ForgotPasswordForm {...defaultProps} />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByText('Send Reset Link')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('token123')
      })
    })
  })

  describe('User Interactions', () => {
    it('should call onBackToLogin when back button is clicked', () => {
      render(<ForgotPasswordForm {...defaultProps} />)
      
      const backButton = screen.getByText('Back to Login')
      fireEvent.click(backButton)

      expect(defaultProps.onBackToLogin).toHaveBeenCalled()
    })

    it('should call onCancel when cancel button is clicked', () => {
      render(<ForgotPasswordForm {...defaultProps} onBackToLogin={undefined} />)
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(defaultProps.onCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ForgotPasswordForm {...defaultProps} />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toBeRequired()
    })

    it('should disable submit button when loading', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      ;(dynamoDBAuthService.forgotPassword as jest.Mock).mockReturnValue(promise)

      render(<ForgotPasswordForm {...defaultProps} />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByText('Send Reset Link')
      fireEvent.click(submitButton)

      expect(screen.getByText('Sending...')).toBeDisabled()
      
      // Clean up
      resolvePromise!({ message: 'Success' })
    })
  })
})