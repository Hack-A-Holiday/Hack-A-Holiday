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

  const { user, error } = await authenticateUser(event, context);
  
  if (error) {
    return error;
  }

  try {
    // Get full user profile
    const fullUser = await userRepository.getUserById(user.userId);
    if (!fullUser) {
      return createErrorResponse(404, 'User not found', requestId);
    }

    const response = {
      success: true,
      user: authService.createUserResponse(fullUser),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Get user profile error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return createErrorResponse(500, errorMessage, requestId);
  }
}