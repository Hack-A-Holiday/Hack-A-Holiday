import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { UserProfile } from '../types';

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

// Helper function to create standardized response
function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body)
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };

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
      return {
        statusCode: 200,
        headers,
        body: '',
      };
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
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Not found',
        message: `Route ${method} ${path} not found`,
      }),
    };
  } catch (error) {
    console.error('Error processing request:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
    };
  }
};

async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Bad request',
        message: 'Request body is required',
      }),
    };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad request',
          message: 'Email and password are required',
        }),
      };
    }

    // Authenticate user
    const user = await userRepository.authenticateUser(email, password);

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        }),
      };
    }

    // Generate JWT token
    const token = createSimpleToken(
      { userId: user.id, email: user.email }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user,
        token,
      }),
    };
  } catch (error) {
    console.error('Error in login:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to login',
      }),
    };
  }
}

async function handleSignup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  console.log('Starting handleSignup');

  if (!event.body) {
    console.log('No request body provided');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Bad request',
        message: 'Request body is required',
      }),
    };
  }

  try {
    console.log('Parsing request body:', event.body);
    const { email, password, name } = JSON.parse(event.body);

    if (!email || !password || !name) {
      console.log('Missing required fields:', { email: !!email, password: !!password, name: !!name });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad request',
          message: 'Email, password, and name are required',
        }),
      };
    }

    console.log('Checking if user exists for email:', email);
    // Check if user already exists
    const existingUser = await userRepository.getUserByEmail(email);

    if (existingUser) {
      console.log('User already exists:', email);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'User already exists',
          message: 'An account with this email already exists',
        }),
      };
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
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        user,
        token,
      }),
    };
  } catch (error) {
    console.error('Error in signup:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to create account',
        details: error instanceof Error ? error.stack : undefined,
      }),
    };
  }
}

async function handleGoogleUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Bad request',
        message: 'Request body is required',
      }),
    };
  }

  try {
    const { googleId, email, name, profilePicture } = JSON.parse(event.body);

    if (!googleId || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad request',
          message: 'Google ID and email are required',
        }),
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user,
        token,
      }),
    };
  } catch (error) {
    console.error('Error storing Google user:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to store Google user',
      }),
    };
  }
}

async function handleGetCurrentUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authHeader = event.headers.Authorization || event.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'Unauthorized',
        message: 'Valid authorization token required',
      }),
    };
  }

  try {
    const token = authHeader.substring(7);
    const decoded = verifySimpleToken(token) as { userId: string };

    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          message: 'Invalid token',
        }),
      };
    }

    const user = await userRepository.getUserById(decoded.userId);

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Not found',
          message: 'User not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user,
      }),
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }),
    };
  }
}

async function handleForgotPassword(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Bad request',
        message: 'Request body is required',
      }),
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad request',
          message: 'Email is required',
        }),
      };
    }

    // Generate reset token
    const resetData = await userRepository.generatePasswordResetToken(email);

    if (!resetData) {
      // Don't reveal whether email exists or not for security
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'If an account with this email exists, a password reset link has been sent.',
        }),
      };
    }

    // In a real application, you would send an email here
    // For now, we'll return the token for testing purposes
    // FIXME: Integrate with email service (SES, SendGrid, etc.) when ready for production
    
    console.log(`Password reset requested for ${email}. Reset token: ${resetData.token}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'If an account with this email exists, a password reset link has been sent.',
        // Remove this in production - only for testing
        resetToken: resetData.token,
      }),
    };
  } catch (error) {
    console.error('Error in forgot password:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to process request',
      }),
    };
  }
}

async function handleResetPassword(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Bad request',
        message: 'Request body is required',
      }),
    };
  }

  try {
    const { token, newPassword } = JSON.parse(event.body);

    if (!token || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad request',
          message: 'Reset token and new password are required',
        }),
      };
    }

    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad request',
          message: 'Password must be at least 6 characters long',
        }),
      };
    }

    const success = await userRepository.resetPasswordWithToken(token, newPassword);

    if (!success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid or expired token',
          message: 'Password reset token is invalid or has expired',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password has been reset successfully',
      }),
    };
  } catch (error) {
    console.error('Error in reset password:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to reset password',
      }),
    };
  }
}

async function handleVerifyResetToken(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const token = event.queryStringParameters?.token;

  if (!token) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Bad request',
        message: 'Reset token is required',
      }),
    };
  }

  try {
    const verification = await userRepository.verifyPasswordResetToken(token);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: verification.valid,
        email: verification.email,
      }),
    };
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to verify token',
      }),
    };
  }
}