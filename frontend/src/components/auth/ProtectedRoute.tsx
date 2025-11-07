import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
  readonly requireAuth?: boolean;
  readonly redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo 
}: ProtectedRouteProps) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading authentication state
    if (state.loading) return;

    if (requireAuth && !state.user) {
      // User must be authenticated but isn't - redirect to auth page
      router.push(redirectTo || '/');
    } else if (!requireAuth && state.user) {
      // User must NOT be authenticated but is - redirect to home page
      router.push(redirectTo || '/home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user, state.loading, requireAuth, redirectTo]);

  // Show loading spinner while checking authentication
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

  // Don't render children if authentication check fails
  if (requireAuth && !state.user) {
    return null;
  }

  if (!requireAuth && state.user) {
    return null;
  }

  return <>{children}</>;
}