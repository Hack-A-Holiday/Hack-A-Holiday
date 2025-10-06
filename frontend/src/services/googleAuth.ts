import { 
  signInWithPopup,
  signOut,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export interface GoogleUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export class GoogleAuthService {
  // Sign in with Google using popup
  async signInWithGoogle(): Promise<GoogleUser> {
    if (!auth || !googleProvider) {
      throw new Error('Firebase authentication is not configured. Please set up Firebase credentials.');
    }
    
    try {
      const result: UserCredential = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const googleUser: GoogleUser = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || user.email!,
        photoURL: user.photoURL || undefined
      };

      return googleUser;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  // Sign out from Google
  async signOut(): Promise<void> {
    if (!auth) {
      console.log('Firebase auth not available, skipping sign out');
      return;
    }
    
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out from Google:', error);
      throw error;
    }
  }
}

export const googleAuthService = new GoogleAuthService();