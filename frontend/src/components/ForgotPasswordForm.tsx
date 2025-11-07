import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { dynamoDBAuthService } from '../services/dynamoAuth';
import { FaLock, FaEnvelope, FaLightbulb } from 'react-icons/fa';

interface ForgotPasswordFormProps {
  onCancel?: () => void;
  onSuccess?: (resetToken?: string) => void;
  onBackToLogin?: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ 
  onCancel, 
  onSuccess, 
  onBackToLogin 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please enter your email address',
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await dynamoDBAuthService.forgotPassword(email);
      
      await Swal.fire({
        icon: 'success',
        title: 'Reset Link Sent',
        text: response.message,
        confirmButtonColor: '#667eea'
      });
      
      onSuccess?.(response.resetToken);
    } catch (error) {
      console.error('Forgot password error:', error);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to send reset email',
        confirmButtonColor: '#667eea'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div className="form-group">
          <label 
            htmlFor="forgot-password-email"
            className="form-label"
          >
            Email Address
          </label>
          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
            placeholder="Enter your email"
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={onBackToLogin || onCancel}
            className="btn-google"
            style={{ flex: 1 }}
          >
            {onBackToLogin ? 'Back to Login' : 'Cancel'}
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <FaEnvelope style={{ fontSize: '1rem' }} />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Help text */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#f7fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        width: '100%'
      }}>
        <p style={{
          fontSize: '12px',
          color: '#718096',
          margin: 0,
          lineHeight: '1.4',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          fontFamily: 'Poppins, sans-serif'
        }}>
          <FaLightbulb style={{ fontSize: '1rem', color: '#667eea', marginTop: '2px', flexShrink: 0 }} />
          <span>
            <strong>Note:</strong> The reset link will expire in 1 hour for security reasons. 
            If you don&apos;t receive an email, please check your spam folder.
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;