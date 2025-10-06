import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import { dynamoDBAuthService } from '../services/dynamoAuth';

interface ResetPasswordFormProps {
  token: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const verification = await dynamoDBAuthService.verifyResetToken(token);
        if (verification.valid) {
          setTokenValid(true);
          setEmail(verification.email || '');
        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Invalid Reset Link',
            text: 'This password reset link is invalid or has expired.',
            confirmButtonColor: '#667eea'
          });
          router.push('/');
        }
      } catch (error) {
        console.error('Token verification error:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to verify reset token. Please try again.',
          confirmButtonColor: '#667eea'
        });
        router.push('/');
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please fill in all fields',
      });
      return;
    }

    if (newPassword.length < 6) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Password must be at least 6 characters long',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Passwords do not match',
      });
      return;
    }

    setLoading(true);
    
    try {
      await dynamoDBAuthService.resetPassword(token, newPassword);
      
      await Swal.fire({
        icon: 'success',
        title: 'Password Reset Successful!',
        text: 'Your password has been reset successfully. You can now log in with your new password.',
        confirmButtonColor: '#667eea'
      });
      
      router.push('/');
    } catch (error) {
      console.error('Reset password error:', error);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to reset password',
        confirmButtonColor: '#667eea'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '#e2e8f0' };
    if (password.length < 6) return { strength: 1, label: 'Too short', color: '#f56565' };
    if (password.length < 8) return { strength: 2, label: 'Weak', color: '#ed8936' };
    if (password.length < 12) return { strength: 3, label: 'Good', color: '#38b2ac' };
    return { strength: 4, label: 'Strong', color: '#48bb78' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (verifying) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
        <h2 style={{ color: '#4a5568', marginBottom: '10px' }}>Verifying Reset Link...</h2>
        <p style={{ color: '#718096', textAlign: 'center' }}>
          Please wait while we verify your password reset token.
        </p>
      </div>
    );
  }

  if (!tokenValid) {
    return null; // Component will redirect
  }

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
          🔑 Reset Password
        </h2>
        <p style={{
          color: '#718096',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Enter your new password for <strong>{email}</strong>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        {/* New Password */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="newPassword"
            style={{
              display: 'block',
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
            placeholder="Enter new password"
          />
          
          {/* Password strength indicator */}
          {newPassword && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e2e8f0',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(passwordStrength.strength / 4) * 100}%`,
                  height: '100%',
                  backgroundColor: passwordStrength.color,
                  transition: 'all 0.3s ease'
                }} />
              </div>
              <p style={{
                fontSize: '12px',
                color: passwordStrength.color,
                margin: '4px 0 0 0',
                fontWeight: '500'
              }}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="confirmPassword"
            style={{
              display: 'block',
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: `2px solid ${confirmPassword && newPassword !== confirmPassword ? '#f56565' : '#e2e8f0'}`,
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
              e.target.style.borderColor = confirmPassword && newPassword !== confirmPassword ? '#f56565' : '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="Confirm new password"
          />
          
          {/* Password match indicator */}
          {confirmPassword && (
            <p style={{
              fontSize: '12px',
              color: newPassword === confirmPassword ? '#48bb78' : '#f56565',
              margin: '4px 0 0 0',
              fontWeight: '500'
            }}>
              {newPassword === confirmPassword ? '✅ Passwords match' : '❌ Passwords do not match'}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            background: loading || !newPassword || !confirmPassword || newPassword !== confirmPassword 
              ? '#a0aec0' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading || !newPassword || !confirmPassword || newPassword !== confirmPassword 
              ? 'not-allowed' 
              : 'pointer',
            transition: 'all 0.2s ease',
            opacity: loading || !newPassword || !confirmPassword || newPassword !== confirmPassword ? 0.7 : 1,
            marginTop: '30px'
          }}
          onMouseEnter={(e) => {
            if (!loading && newPassword && confirmPassword && newPassword === confirmPassword) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && newPassword && confirmPassword && newPassword === confirmPassword) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {loading ? '🔄 Resetting Password...' : '🔑 Reset Password'}
        </button>
      </form>

      {/* Security note */}
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
          🔒 <strong>Security:</strong> Choose a strong password with at least 6 characters. 
          Your new password will be securely encrypted and stored.
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordForm;