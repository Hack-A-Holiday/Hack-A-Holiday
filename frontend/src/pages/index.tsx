import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
      router.push('/home');
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
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse'
        }} />

        {/* Main loading content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '30px'
        }}>
          {/* Animated plane icon */}
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            animation: 'bounce 2s ease-in-out infinite'
          }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3))'
              }}
            >
              <path
                d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                fill="white"
                style={{
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
            </svg>
          </div>

          {/* Animated dots loader */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: `wave 1.4s ease-in-out ${i * 0.2}s infinite`,
                  boxShadow: '0 4px 15px rgba(255, 255, 255, 0.4)'
                }}
              />
            ))}
          </div>

          {/* Loading text */}
          <div style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            textAlign: 'center',
            animation: 'fadeInOut 2s ease-in-out infinite',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
          }}>
            Preparing Your Journey
          </div>

          {/* Subtitle */}
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            textAlign: 'center',
            maxWidth: '300px',
            lineHeight: '1.5'
          }}>
            Your intelligent travel companion is getting ready...
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px) scale(1);
            }
            50% {
              transform: translateY(-30px) scale(1.05);
            }
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            25% {
              transform: translateY(-15px) rotate(-5deg);
            }
            50% {
              transform: translateY(-20px) rotate(0deg);
            }
            75% {
              transform: translateY(-15px) rotate(5deg);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }

          @keyframes wave {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-15px);
            }
          }

          @keyframes fadeInOut {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.6;
            }
          }
        `}</style>
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
        <title>{mode === 'login' ? 'Sign In' : 'Sign Up'} - Hack Travel</title>
        <meta name="description" content="Sign in to your Hack Travel account" />
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
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '15px',
              marginBottom: '10px'
            }}>
              <Image
                src="/Hack Travel.png"
                alt="Hack Travel Logo"
                width={200}
                height={80}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p className="auth-subtitle">
              Your intelligent travel planning assistant
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