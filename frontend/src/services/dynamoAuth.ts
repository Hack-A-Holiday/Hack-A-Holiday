export interface UserPreferences {
  numberOfKids?: number;
  budget?: number;
  favoriteDestinations?: string[];
  interests?: string[];
  travelStyle?: 'budget' | 'mid-range' | 'luxury';
  dietaryRestrictions?: string[];
  accessibility?: string[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'normal' | 'google';
  profilePicture?: string;
  isEmailVerified: boolean;
  passwordHash?: string;
  createdAt: string;
  lastLoginAt: string;
  preferences?: UserPreferences;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class DynamoDBAuthService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async request(endpoint: string, options: RequestInit = {}, requireAuth: boolean = false) {
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Always include cookies for consistent session management
      ...options,
    };
    
    if (requireAuth) {
      const token = this.getTokenFromStorage();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'An error occurred');
    }
    
    return data;
  }

  private getTokenFromStorage(): string | null {
    // Try cookie first, then localStorage for backward compatibility
    const getCookie = (name: string): string | null => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
    return getCookie('authToken') || localStorage.getItem('auth_token');
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  // NOTE: Make sure the backend exposes /auth/google-user and expects this payload.
  // If you get a 404, check API Gateway/Lambda mapping and backend handler filename.
  async storeGoogleUser(googleUser: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }): Promise<AuthResponse> {
    try {
      return await this.request('/auth/google-user', {
        method: 'POST',
        body: JSON.stringify({
          googleId: googleUser.uid,
          email: googleUser.email,
          name: googleUser.displayName,
          profilePicture: googleUser.photoURL,
        }),
      });
    } catch (error: any) {
      // Log full error response for debugging
      console.error('Google user storage failed:', error);
      throw error;
    }
  }

  async getCurrentUser(token: string): Promise<{ user: User }> {
    return this.request('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }, true);
  }

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }); // No credentials for forgot password
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }); // No credentials for reset password
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    return this.request(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    }); // No credentials for verify reset token
  }
}

export const dynamoDBAuthService = new DynamoDBAuthService();