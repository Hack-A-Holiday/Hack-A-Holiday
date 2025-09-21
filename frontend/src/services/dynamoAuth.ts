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

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'An error occurred');
    }

    return data;
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

  async storeGoogleUser(googleUser: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }): Promise<AuthResponse> {
    return this.request('/auth/google-user', {
      method: 'POST',
      body: JSON.stringify({
        googleId: googleUser.uid,
        email: googleUser.email,
        name: googleUser.displayName,
        profilePicture: googleUser.photoURL,
      }),
    });
  }

  async getCurrentUser(token: string): Promise<{ user: User }> {
    return this.request('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    return this.request(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  }
}

export const dynamoDBAuthService = new DynamoDBAuthService();