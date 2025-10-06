import React from 'react';
import { useRouter } from 'next/router';
import ResetPasswordForm from '../components/ResetPasswordForm';

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;

  if (!token || typeof token !== 'string') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#4a5568', marginBottom: '10px' }}>Invalid Reset Link</h2>
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            This password reset link is missing or invalid.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <ResetPasswordForm token={token} />
    </div>
  );
};

export default ResetPasswordPage;