import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResetPasswordForm from '../ResetPasswordForm'
import { dynamoDBAuthService } from '../../services/dynamoAuth'

// Mock the auth service
jest.mock('../../services/dynamoAuth', () => ({
  dynamoDBAuthService: {
    resetPassword: jest.fn(),
  }
}))

// Mock SweetAlert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn()
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  })
}))

describe('ResetPasswordForm', () => {
  const defaultProps = {
    token: 'valid-reset-token'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  describe('Rendering', () => {
    it('should render password input fields', () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Confirm your new password')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      expect(screen.getByText('Reset Password')).toBeInTheDocument()
    })

    it('should render password strength indicator', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      await userEvent.type(passwordInput, 'weak')
      
      expect(screen.getByText('Password Strength:')).toBeInTheDocument()
    })
  })

  describe('Password Validation', () => {
    it('should show weak password strength for short passwords', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      await userEvent.type(passwordInput, '123')
      
      expect(screen.getByText('Weak')).toBeInTheDocument()
    })

    it('should show medium password strength for moderate passwords', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      await userEvent.type(passwordInput, 'password123')
      
      expect(screen.getByText('Medium')).toBeInTheDocument()
    })

    it('should show strong password strength for complex passwords', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      await userEvent.type(passwordInput, 'StrongP@ssw0rd!')
      
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })

    it('should validate password confirmation match', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'password123')
      await userEvent.type(confirmInput, 'different123')
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    it('should show matching passwords message when passwords match', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'password123')
      await userEvent.type(confirmInput, 'password123')
      
      expect(screen.getByText('Passwords match')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should submit form with valid passwords', async () => {
      const mockResponse = { message: 'Password reset successful' }
      ;(dynamoDBAuthService.resetPassword as jest.Mock).mockResolvedValue(mockResponse)

      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'NewP@ssw0rd!')
      await userEvent.type(confirmInput, 'NewP@ssw0rd!')
      
      const submitButton = screen.getByText('Reset Password')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(dynamoDBAuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'NewP@ssw0rd!')
      })
    })

    it('should not submit if passwords do not match', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'password123')
      await userEvent.type(confirmInput, 'different123')
      
      const submitButton = screen.getByText('Reset Password')
      fireEvent.click(submitButton)

      expect(dynamoDBAuthService.resetPassword).not.toHaveBeenCalled()
    })

    it('should not submit if password is too weak', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, '123')
      await userEvent.type(confirmInput, '123')
      
      const submitButton = screen.getByText('Reset Password')
      fireEvent.click(submitButton)

      expect(dynamoDBAuthService.resetPassword).not.toHaveBeenCalled()
    })

    it('should show loading state during submission', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      ;(dynamoDBAuthService.resetPassword as jest.Mock).mockReturnValue(promise)

      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'StrongP@ssw0rd!')
      await userEvent.type(confirmInput, 'StrongP@ssw0rd!')
      
      const submitButton = screen.getByText('Reset Password')
      fireEvent.click(submitButton)

      expect(screen.getByText('Resetting...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise
      resolvePromise!({ message: 'Success' })
      
      await waitFor(() => {
        expect(screen.queryByText('Resetting...')).not.toBeInTheDocument()
      })
    })

    it('should redirect to home page after successful reset', async () => {
      const mockResponse = { message: 'Password reset successful' }
      ;(dynamoDBAuthService.resetPassword as jest.Mock).mockResolvedValue(mockResponse)

      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'NewP@ssw0rd!')
      await userEvent.type(confirmInput, 'NewP@ssw0rd!')
      
      const submitButton = screen.getByText('Reset Password')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('should handle submission errors', async () => {
      ;(dynamoDBAuthService.resetPassword as jest.Mock).mockRejectedValue(new Error('Invalid token'))

      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'NewP@ssw0rd!')
      await userEvent.type(confirmInput, 'NewP@ssw0rd!')
      
      const submitButton = screen.getByText('Reset Password')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(dynamoDBAuthService.resetPassword).toHaveBeenCalled()
      })

      // Error should be handled (likely shown via SweetAlert)
    })
  })

  describe('Password Strength Calculation', () => {
    it('should calculate password strength correctly', async () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      
      // Test different password strengths
      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, '12345')
      expect(screen.getByText('Weak')).toBeInTheDocument()
      
      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, 'password123')
      expect(screen.getByText('Medium')).toBeInTheDocument()
      
      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, 'StrongP@ssw0rd!')
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and attributes', () => {
      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(confirmInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toBeRequired()
      expect(confirmInput).toBeRequired()
    })

    it('should disable submit button when loading', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      ;(dynamoDBAuthService.resetPassword as jest.Mock).mockReturnValue(promise)

      render(<ResetPasswordForm {...defaultProps} />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your new password')
      const confirmInput = screen.getByPlaceholderText('Confirm your new password')
      
      await userEvent.type(passwordInput, 'StrongP@ssw0rd!')
      await userEvent.type(confirmInput, 'StrongP@ssw0rd!')
      
      const submitButton = screen.getByText('Reset Password')
      fireEvent.click(submitButton)

      expect(screen.getByText('Resetting...')).toBeDisabled()
      
      // Clean up
      resolvePromise!({ message: 'Success' })
    })
  })
})