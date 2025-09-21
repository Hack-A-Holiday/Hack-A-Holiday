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
  }, [state.user, state.loading, requireAuth, router, redirectTo]);

  // Show loading spinner while checking authentication
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4 animate-bounce">
            <span className="text-2xl">✈️</span>
          </div>
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading your travel companion...</p>
        </div>
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