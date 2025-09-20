import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AuthForm from '../components/auth/AuthForm';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { state, login, signup, googleAuth, clearError } = useAuth();
  const router = useRouter();

  // Clear error when switching modes
  useEffect(() => {
    clearError();
  }, [mode, clearError]);

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (state.user && !state.loading) {
      router.push('/dashboard');
    }
  }, [state.user, state.loading, router]);

  const handleSubmit = async (data: { email: string; password: string; name?: string }) => {
    if (mode === 'login') {
      await login(data.email, data.password);
    } else {
      await signup(data.email, data.password, data.name || '');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      await googleAuth();
    } catch (error) {
      console.error('Google auth error:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
  };

  const handleSwitchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  // Show loading while checking authentication
  if (state.loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading your travel companion...
      </div>
    );
  }

  // Don't render anything if user is logged in (will redirect)
  if (state.user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{mode === 'login' ? 'Sign In' : 'Sign Up'} - Travel Companion</title>
        <meta name="description" content="Sign in to your Travel Companion account" />
      </Head>

      <div className="auth-container">
        {/* Animated background elements */}
        <div className="auth-background">
          <div className="auth-bg-element-1"></div>
          <div className="auth-bg-element-2"></div>
          <div className="auth-bg-element-3"></div>
        </div>

        <div className="auth-content">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo">
              <span>✈️</span>
            </div>
            <h1 className="auth-title">
              Travel Companion
            </h1>
            <p className="auth-subtitle">
              Your AI-powered travel planning assistant
            </p>
          </div>

          {/* Auth Form Card */}
          <div className="auth-card">
            {!showForgotPassword ? (
              <>
                <div className="auth-card-header">
                  <h2 className="auth-card-title">
                    {mode === 'login' ? 'Welcome Back!' : 'Join the Journey'}
                  </h2>
                  <p className="auth-card-description">
                    {mode === 'login' 
                      ? 'Sign in to continue your travel adventures' 
                      : 'Create your account to start planning amazing trips'
                    }
                  </p>
                </div>

                <AuthForm
                  mode={mode}
                  onSubmit={handleSubmit}
                  onSwitchMode={handleSwitchMode}
                  onGoogleAuth={handleGoogleAuth}
                  onForgotPassword={handleForgotPassword}
                  loading={state.loading}
                  googleLoading={googleLoading}
                  error={state.error || undefined}
                />

                {mode === 'signup' && (
                  <div className="terms-notice">
                    <div className="terms-text">
                      <span>🔒</span>
                      <span>By creating an account, you agree to our Terms of Service and Privacy Policy.</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="auth-card-header">
                  <h2 className="auth-card-title">Reset Password</h2>
                  <p className="auth-card-description">
                    Enter your email address and we&apos;ll send you a link to reset your password
                  </p>
                </div>

                <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
              </>
            )}
          </div>

          {/* Features preview */}
          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">🤖</div>
              <span>AI Planning</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">🌍</div>
              <span>Global Destinations</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">💰</div>
              <span>Smart Budgeting</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}