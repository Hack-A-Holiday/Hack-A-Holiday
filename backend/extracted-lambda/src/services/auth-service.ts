import { OAuth2Client } from 'google-auth-library';
import { UserProfile } from '../types';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly googleClient: OAuth2Client;

  constructor() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = jwtSecret;

    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is required');
    }

    this.googleClient = new OAuth2Client(googleClientId);
  }

  /**
   * Generate token for authenticated user
   */
  generateToken(user: Omit<UserProfile, 'password'>): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = Buffer.from(this.jwtSecret).toString('base64');

    return `${base64Payload}.${signature}`;
  }

  /**
   * Verify and decode token
   */
  verifyToken(token: string): any {
    try {
      const [base64Payload, signature] = token.split('.');

      if (signature !== Buffer.from(this.jwtSecret).toString('base64')) {
        throw new Error('Invalid token signature');
      }

      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
      return payload;
    } catch (error) {
      console.error('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify Google OAuth token
   */
  async verifyGoogleToken(googleToken: string): Promise<{
    googleId: string;
    email: string;
    name: string;
    profilePicture: string;
  }> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google token payload');
      }

      return {
        googleId: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        profilePicture: payload.picture || '',
      };
    } catch (error) {
      console.error('Google token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Invalid Google token');
    }
  }

  /**
   * Extract bearer token from authorization header
   */
  extractBearerToken(authHeader?: string): string | null {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  isValidPassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true };
  }

  /**
   * Create user response (excludes sensitive data)
   */
  createUserResponse(user: UserProfile): Omit<UserProfile, 'password'> {
    const { password, ...userResponse } = user as any;
    return userResponse;
  }
}