import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
         process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your-firebase-api-key-here' &&
         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'your-project-id';
};

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'placeholder',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'placeholder.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:placeholder',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-PLACEHOLDER'
};

// Initialize Firebase only if properly configured
let app: any = null;
let auth: any = null;
let googleProvider: any = null;
let analytics: any = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configure Google provider for popup
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Initialize Analytics (optional, only in browser)
    analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
} else {
  console.warn('Firebase not configured. Authentication features will be disabled.');
}

// Export Firebase services (will be null if not configured)
export { auth, googleProvider, analytics };
export default app;