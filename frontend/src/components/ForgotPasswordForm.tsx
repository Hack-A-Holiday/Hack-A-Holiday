import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { dynamoDBAuthService } from '../services/dynamoAuth';

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{
          color: '#4a5568',
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          🔐 Forgot Password
        </h2>
        <p style={{
          color: '#718096',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: '#4a5568',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              fontSize: '16px',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="Enter your email"
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
          <button
            type="button"
            onClick={onBackToLogin || onCancel}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              background: 'white',
              color: '#4a5568',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f7fafc';
              e.currentTarget.style.borderColor = '#cbd5e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {onBackToLogin ? 'Back to Login' : 'Cancel'}
          </button>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? '🔄 Sending...' : '📧 Send Reset Link'}
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
          lineHeight: '1.4'
        }}>
          💡 <strong>Note:</strong> The reset link will expire in 1 hour for security reasons. 
          If you don't receive an email, please check your spam folder.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;