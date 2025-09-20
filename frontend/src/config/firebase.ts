import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA_848VVWMHs2Rc9w4O5fnGJ4yaSDHs6us",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "travelhack-472621.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "travelhack-472621",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "travelhack-472621.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1053415549741",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1053415549741:web:3e76740b77de607ee2c1a4",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-N5MYZGWHPS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider for popup
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics (optional, only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;