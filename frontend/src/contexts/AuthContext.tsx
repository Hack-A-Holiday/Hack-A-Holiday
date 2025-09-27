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

  // Utility functions for token storage
  const setToken = (token: string) => {
    localStorage.setItem('auth_token', token);
  };

  const getToken = (): string | null => {
    return localStorage.getItem('auth_token');
  };

  const removeToken = () => {
    localStorage.removeItem('auth_token');
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
          
          setToken(response.token);
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: response.user, token: response.token },
          });

          // Show success alert for Google auth
          await Swal.fire({
            icon: 'success',
            title: 'Google Sign-in Successful!',
            text: `Welcome ${response.user.name}!`,
            timer: 2500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });

          // Only redirect if we're on the auth page
          if (router.pathname === '/') {
            router.push('/dashboard');
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
  }, [router, state.user, state.token]);

  // Email/Password login - goes directly to DynamoDB
  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await dynamoDBAuthService.login(email, password);
      
      setToken(response.token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.token },
      });

      // Show success alert
      await Swal.fire({
        icon: 'success',
        title: 'Welcome Back!',
        text: `Hello ${response.user.name || response.user.email}!`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      // Redirect to dashboard after successful login
      router.push('/dashboard');
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
  }, [router]);

  // Email/Password signup - goes directly to DynamoDB
  const signup = useCallback(async (email: string, password: string, name: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await dynamoDBAuthService.signup(email, password, name);
      
      setToken(response.token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.token },
      });

      // Show success alert
      await Swal.fire({
        icon: 'success',
        title: 'Account Created!',
        text: `Welcome to Travel Companion, ${response.user.name}!`,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      // Redirect to dashboard after successful signup
      router.push('/dashboard');
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
  }, [router]);

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
  }, []);

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
  }, [state.user?.role]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

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