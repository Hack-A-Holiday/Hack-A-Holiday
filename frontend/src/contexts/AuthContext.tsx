import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { googleAuthService, GoogleUser } from '../services/googleAuth';
import { dynamoDBAuthService, User } from '../services/dynamoAuth';

// Types
interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
}

// Context
interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  googleAuth: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { ...initialState, loading: true });
  const router = useRouter();

  // Utility functions for consistent cookie and token storage
  const setCookie = (name: string, value: string, days: number = 7) => {
    if (typeof window === 'undefined') return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; secure; samesite=strict`;
  };

  const getCookie = (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };

  const removeCookie = (name: string) => {
    if (typeof window === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  const setToken = (token: string) => {
    if (typeof window === 'undefined') return;
    // Store in both localStorage and cookie for consistency
    localStorage.setItem('auth_token', token);
    setCookie('authToken', token, 7);
  };

  const setUserSession = (user: User) => {
    if (typeof window === 'undefined') return;
    // Store user data in both localStorage and cookie
    localStorage.setItem('user_session', JSON.stringify(user));
    setCookie('userSession', JSON.stringify(user), 7);
  };

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    // Try cookie first, then localStorage for backward compatibility
    return getCookie('authToken') || localStorage.getItem('auth_token');
  };

  const removeToken = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_session');
    removeCookie('authToken');
    removeCookie('userSession');
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = getToken();
        
        if (token) {
          const response = await dynamoDBAuthService.getCurrentUser(token);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: response.user,
              token,
            },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        // Token is invalid, remove it and log the error
        console.warn('Invalid or expired token detected during auth check:', error instanceof Error ? error.message : 'Unknown error');
        removeToken();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuthState();
  }, []);

  // Firebase auth state listener for Google OAuth only
  useEffect(() => {
    // Skip Firebase auth listener if Firebase is not configured
    if (!auth) {
      console.log('Firebase auth not available, skipping auth state listener');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Skip if user is already authenticated in our app to prevent duplicate messages
        if (state.user && state.token) {
          return;
        }

        // This means user logged in via Google OAuth
        try {
          const googleUser: GoogleUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || firebaseUser.email!,
            photoURL: firebaseUser.photoURL || undefined
          };

          // Store Google user in DynamoDB and get our app token
          const response = await dynamoDBAuthService.storeGoogleUser(googleUser);
          
          // Store token and user session consistently
          setToken(response.token);
          setUserSession(response.user);
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: response.user, token: response.token },
          });

          // Show success alert for Google auth
          const displayName = (response.user.name && response.user.name.trim()) ? response.user.name : response.user.email;
          await Swal.fire({
            icon: 'success',
            title: 'Google Sign-in Successful!',
            text: `Welcome ${displayName}!`,
            timer: 2500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });

          // Only redirect if we're on the auth page
            if (router.pathname === '/') {
              router.replace('/home');
          }
        } catch (error) {
          console.error('Error storing Google user:', error);
          const errorMessage = error instanceof Error ? error.message : 'Google authentication failed';
          
          dispatch({
            type: 'LOGIN_FAILURE',
            payload: errorMessage,
          });

          // Show error alert
          await Swal.fire({
            icon: 'error',
            title: 'Google Authentication Failed',
            text: errorMessage,
            confirmButtonColor: '#667eea'
          });
        }
      }
      // Note: We don't handle logout here as normal users aren't in Firebase
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Email/Password login - goes directly to DynamoDB
  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await dynamoDBAuthService.login(email, password);
      
      // Store token and user session consistently (same as Google OAuth)
      setToken(response.token);
      setUserSession(response.user);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.token },
      });

      // Show success alert
      const displayName = (response.user.name && response.user.name.trim()) ? response.user.name : response.user.email;
      await Swal.fire({
        icon: 'success',
        title: 'Welcome Back!',
        text: `Hello ${displayName}!`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

  // Redirect to home after successful login
  router.replace('/home');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });

      // Show error alert
      await Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: errorMessage,
        confirmButtonColor: '#667eea'
      });
    }
  }, [router, dispatch]);

  // Email/Password signup - goes directly to DynamoDB
  const signup = useCallback(async (email: string, password: string, name: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await dynamoDBAuthService.signup(email, password, name);
      
      // Store token and user session consistently (same as other auth methods)
      setToken(response.token);
      setUserSession(response.user);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.token },
      });

      // Show success alert
      await Swal.fire({
        icon: 'success',
        title: 'Account Created!',
        text: `Welcome to Travel Companion, ${(response.user.name && response.user.name.trim()) ? response.user.name : response.user.email}!`,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      // Redirect to dashboard after successful signup
      router.push('/home');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });

      // Show error alert
      await Swal.fire({
        icon: 'error',
        title: 'Signup Failed',
        text: errorMessage,
        confirmButtonColor: '#667eea'
      });
    }
  }, [router, dispatch]);

  // Google OAuth - uses Firebase then stores in DynamoDB
  const googleAuth = useCallback(async () => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      await googleAuthService.signInWithGoogle();
      
      // The Firebase auth state listener will handle the rest
      console.log('Google OAuth successful, storing user in DynamoDB...');
    } catch (error: any) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error instanceof Error ? error.message : 'Google authentication failed',
      });

      // Show error alert
      await Swal.fire({
        icon: 'error',
        title: 'Google Authentication Failed',
        text: error instanceof Error ? error.message : 'Google authentication failed',
        confirmButtonColor: '#667eea'
      });
    }
  }, [dispatch]);

  // Logout - handles both regular and Google users
  const logout = useCallback(async () => {
    const result = await Swal.fire({
      title: 'Sign Out?',
      text: 'Are you sure you want to sign out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // If user is a Google user, sign out from Firebase too
        if (state.user?.role === 'google') {
          await googleAuthService.signOut();
        }
        
        removeToken();
        dispatch({ type: 'LOGOUT' });

        // Show logout success
        await Swal.fire({
          icon: 'success',
          title: 'Signed Out',
          text: 'You have been successfully signed out.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Still clear local state even if Firebase logout fails
        removeToken();
        dispatch({ type: 'LOGOUT' });
      }
    }
  }, [state.user?.role, dispatch]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, [dispatch]);

  const value: AuthContextType = useMemo(() => ({
    state,
    login,
    signup,
    googleAuth,
    logout,
    clearError,
  }), [state, login, signup, googleAuth, logout, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}