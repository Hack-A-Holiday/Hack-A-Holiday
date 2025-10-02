import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { AuthService } from '../services/auth-service';
import { createErrorResponse } from '../utils/lambda-utils';

const authService = new AuthService();
const userRepository = new UserRepository();

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user?: {
    userId: string;
    email: string;
    role: 'normal' | 'google';
    name?: string;
  };
}

export interface UserPreferences {
  numberOfKids?: number;
  budget?: number;
  favoriteDestinations?: string[];
  interests?: string[];
  travelStyle?: 'budget' | 'mid-range' | 'luxury';
  dietaryRestrictions?: string[];
  accessibility?: string[];
  defaultBudget?: number; // Added for compatibility
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  preferences: UserPreferences;
}

export async function authenticateUser(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<{ user: any; error?: APIGatewayProxyResult }> {
  const requestId = context.awsRequestId;

  try {
    // Extract token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = authService.extractBearerToken(authHeader);
    
    if (!token) {
      return {
        user: null,
        error: createErrorResponse(401, 'Authorization token is required', requestId),
      };
    }

    // Verify JWT token
    let tokenPayload;
    try {
      tokenPayload = authService.verifyToken(token);
    } catch (error) {
      console.warn('Token verification failed in middleware:', error instanceof Error ? error.message : 'Unknown error');
      return {
        user: null,
        error: createErrorResponse(401, 'Invalid or expired token', requestId),
      };
    }

    // Verify user still exists
    const user = await userRepository.getUserById(tokenPayload.userId);
    if (!user) {
      return {
        user: null,
        error: createErrorResponse(401, 'User not found', requestId),
      };
    }

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };

  } catch (error) {
    console.error('Authentication error:', error);
    
    return {
      user: null,
      error: createErrorResponse(500, 'Authentication failed', requestId),
    };
  }
}

/**
 * Higher-order function to protect Lambda routes
 */
export function withAuth(
  handler: (
    event: AuthenticatedEvent,
    context: Context
  ) => Promise<APIGatewayProxyResult>
) {
  return async (
    event: APIGatewayProxyEvent,
    context: Context
  ): Promise<APIGatewayProxyResult> => {
    
    // Authenticate user
    const { user, error } = await authenticateUser(event, context);
    
    if (error) {
      return error;
    }

    // Add user info to event
    const authenticatedEvent: AuthenticatedEvent = {
      ...event,
      user,
    };

    // Call the original handler
    return handler(authenticatedEvent, context);
  };
}

/**
 * Get current user profile
 */
export async function me(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const requestId = context.awsRequestId;
  const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  const { user, error } = await authenticateUser(event, context);
  if (error) {
    return { ...error, headers: { ...error.headers, ...corsHeaders } };
  }

  try {
    // Get full user profile
    const fullUser = await userRepository.getUserById(user.userId);
    if (!fullUser) {
      return { ...createErrorResponse(404, 'User not found', requestId), headers: corsHeaders };
    }

    const response = {
      success: true,
      user: authService.createUserResponse(fullUser),
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Get user profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { ...createErrorResponse(500, errorMessage, requestId), headers: corsHeaders };
  }
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  try {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    console.error('Get user profile error:', error);
    throw error;
  }
}