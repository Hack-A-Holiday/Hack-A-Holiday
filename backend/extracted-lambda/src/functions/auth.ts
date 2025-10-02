import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { UserProfile } from '../types';
import { createResponse } from '../utils/lambda-utils';

// Simple token creation without external library
function createSimpleToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.no-signature`;
}

function verifySimpleToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch {
    return null;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
let userRepository: UserRepository;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Auth handler invoked:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
    body: event.body,
  });

  try {
    // Initialize userRepository if not already initialized
    if (!userRepository) {
      console.log('Initializing UserRepository with environment:', {
        USERS_TABLE_NAME: process.env.USERS_TABLE_NAME,
        AWS_REGION: process.env.AWS_REGION,
      });
      userRepository = new UserRepository();
    }
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request');
  return createResponse(200, '', event.requestContext.requestId);
    }

    const path = event.path;
    const method = event.httpMethod;

    console.log(`Processing ${method} ${path}`);

    if (method === 'POST' && path.endsWith('/auth/login')) {
      return await handleLogin(event);
    }

    if (method === 'POST' && path.endsWith('/auth/signup')) {
      return await handleSignup(event);
    }

    if (method === 'POST' && path.endsWith('/auth/google-user')) {
      return await handleGoogleUser(event);
    }

    if (method === 'GET' && path.endsWith('/auth/me')) {
      return await handleGetCurrentUser(event);
    }

    if (method === 'POST' && path.endsWith('/auth/forgot-password')) {
      return await handleForgotPassword(event);
    }

    if (method === 'POST' && path.endsWith('/auth/reset-password')) {
      return await handleResetPassword(event);
    }

    if (method === 'GET' && path.endsWith('/auth/verify-reset-token')) {
      return await handleVerifyResetToken(event);
    }

    console.log('No matching route found');
    return createResponse(404, {
      error: 'Not found',
      message: `Route ${method} ${path} not found`,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error processing request:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }, event.requestContext.requestId);
  }
};

async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createResponse(400, {
      error: 'Bad request',
      message: 'Request body is required',
    }, event.requestContext.requestId);
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return createResponse(400, {
        error: 'Bad request',
        message: 'Email and password are required',
      }, event.requestContext.requestId);
    }

    // Authenticate user
    const user = await userRepository.authenticateUser(email, password);

    if (!user) {
      return createResponse(401, {
        error: 'Authentication failed',
        message: 'Invalid email or password',
      }, event.requestContext.requestId);
    }

    // Generate JWT token
    const token = createSimpleToken(
      { userId: user.id, email: user.email }
    );

    // Set cookie for browser session (HttpOnly, Secure, SameSite=None for cross-site)
    const cookie = [
      `token=${token}`,
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=None',
      // Optionally: `Max-Age=604800` // 7 days
    ].join('; ');
    return createResponse(200, {
      user,
      token,
    }, event.requestContext.requestId, {
      'Set-Cookie': cookie
    });
  } catch (error) {
    console.error('Error in login:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to login',
    }, event.requestContext.requestId);
  }
}

async function handleSignup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Starting handleSignup');

  if (!event.body) {
    console.log('No request body provided');
    return createResponse(400, {
      error: 'Bad request',
      message: 'Request body is required',
    }, event.requestContext.requestId);
  }

  try {
    console.log('Parsing request body:', event.body);
    const { email, password, name } = JSON.parse(event.body);

    if (!email || !password || !name) {
      console.log('Missing required fields:', { email: !!email, password: !!password, name: !!name });
      return createResponse(400, {
        error: 'Bad request',
        message: 'Email, password, and name are required',
      }, event.requestContext.requestId);
    }

    console.log('Checking if user exists for email:', email);
    // Check if user already exists
    const existingUser = await userRepository.getUserByEmail(email);

    if (existingUser) {
      console.log('User already exists:', email);
      return createResponse(400, {
        error: 'User already exists',
        message: 'An account with this email already exists',
      }, event.requestContext.requestId);
    }

    console.log('Creating user data object');
    // Create user
    const userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      email,
      password,
      role: 'normal',
      name,
      preferences: {
        defaultBudget: 2000,
        favoriteDestinations: [],
        interests: [],
        travelStyle: 'mid-range',
        dietaryRestrictions: [],
        accessibility: [],
      },
      tripHistory: [],
      isEmailVerified: false,
    };

    console.log('Calling userRepository.createUser');
    const user = await userRepository.createUser(userData);

    console.log('User created successfully, generating JWT');
    // Generate JWT token
    const token = createSimpleToken(
      { userId: user.id, email: user.email }
    );

    console.log('Signup completed successfully');
    return createResponse(201, {
      user,
      token,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error in signup:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to create account',
      details: error instanceof Error ? error.stack : undefined,
    }, event.requestContext.requestId);
  }
}

async function handleGoogleUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createResponse(400, {
      error: 'Bad request',
      message: 'Request body is required',
    }, event.requestContext.requestId);
  }

  try {
    const { googleId, email, name, profilePicture } = JSON.parse(event.body);

    if (!googleId || !email) {
      return createResponse(400, {
        error: 'Bad request',
        message: 'Google ID and email are required',
      }, event.requestContext.requestId);
    }

    // Create or update Google user
    const user = await userRepository.createOrUpdateGoogleUser(
      googleId,
      email,
      name,
      profilePicture
    );

    // Generate JWT token
    const token = createSimpleToken(
      { userId: user.id, email: user.email }
    );

    return createResponse(200, {
      user,
      token,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error storing Google user:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to store Google user',
    }, event.requestContext.requestId);
  }
}

async function handleGetCurrentUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Accept JWT from Authorization header or token cookie
  let token = '';
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (event.headers.cookie) {
    // Parse cookies for token
    const cookies = event.headers.cookie.split(';').map(c => c.trim());
    const jwtCookie = cookies.find(c => c.startsWith('token='));
    if (jwtCookie) {
      token = jwtCookie.replace('token=', '');
    }
  }
  if (!token) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Valid authorization token or cookie required',
    }, event.requestContext.requestId);
  }
  try {
    const decoded = verifySimpleToken(token) as { userId: string };
    if (!decoded) {
      return createResponse(401, {
        message: 'Invalid token',
      }, event.requestContext.requestId);
    }
    const user = await userRepository.getUserById(decoded.userId);
    if (!user) {
      return createResponse(404, {
        error: 'Not found',
        message: 'User not found',
      }, event.requestContext.requestId);
    }
    return createResponse(200, {
      user,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error getting current user:', error);
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    }, event.requestContext.requestId);
  }
}

async function handleForgotPassword(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createResponse(400, {
      error: 'Bad request',
      message: 'Request body is required',
    }, event.requestContext.requestId);
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return createResponse(400, {
        error: 'Bad request',
        message: 'Email is required',
      }, event.requestContext.requestId);
    }

    // Generate reset token
    const resetData = await userRepository.generatePasswordResetToken(email);

    if (!resetData) {
      // Don't reveal whether email exists or not for security
      return createResponse(200, {
        message: 'If an account with this email exists, a password reset link has been sent.',
      }, event.requestContext.requestId);
    }

    // In a real application, you would send an email here
    // For now, we'll return the token for testing purposes
    // FIXME: Integrate with email service (SES, SendGrid, etc.) when ready for production
    
    console.log(`Password reset requested for ${email}. Reset token: ${resetData.token}`);

    return createResponse(200, {
      message: 'If an account with this email exists, a password reset link has been sent.',
      // Remove this in production - only for testing
      resetToken: resetData.token,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error in forgot password:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to process request',
    }, event.requestContext.requestId);
  }
}

async function handleResetPassword(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createResponse(400, {
      error: 'Bad request',
      message: 'Request body is required',
    }, event.requestContext.requestId);
  }

  try {
    const { token, newPassword } = JSON.parse(event.body);

    if (!token || !newPassword) {
      return createResponse(400, {
        error: 'Bad request',
        message: 'Reset token and new password are required',
      }, event.requestContext.requestId);
    }

    if (newPassword.length < 6) {
      return createResponse(400, {
        error: 'Bad request',
        message: 'Password must be at least 6 characters long',
      }, event.requestContext.requestId);
    }

    const success = await userRepository.resetPasswordWithToken(token, newPassword);

    if (!success) {
      return createResponse(400, {
        error: 'Invalid or expired token',
        message: 'Password reset token is invalid or has expired',
      }, event.requestContext.requestId);
    }

    return createResponse(200, {
      message: 'Password has been reset successfully',
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error in reset password:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to reset password',
    }, event.requestContext.requestId);
  }
}

async function handleVerifyResetToken(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const token = event.queryStringParameters?.token;

  if (!token) {
    return createResponse(400, {
      error: 'Bad request',
      message: 'Reset token is required',
    }, event.requestContext.requestId);
  }

  try {
    const verification = await userRepository.verifyPasswordResetToken(token);

    return createResponse(200, {
      valid: verification.valid,
      email: verification.email,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to verify token',
    }, event.requestContext.requestId);
  }
}