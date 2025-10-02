
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

/**
 * Extract userId from JWT in cookie or Authorization header
 */
export async function authenticateUser(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<{ user: any; error?: APIGatewayProxyResult }> {
  const requestId = context.awsRequestId;
  try {
    // Try to extract token from cookie (case-insensitive), else from Authorization header
    let token: string | null = null;
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    if (cookieHeader) {
      token = authService.extractTokenFromCookie(cookieHeader);
    }
    if (!token) {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      token = authService.extractBearerToken(authHeader);
    }
    if (!token) {
      return {
        user: null,
        error: createErrorResponse(401, 'Unauthorized: No auth token found in cookie or header', requestId),
      };
    }
    let payload;
    try {
      payload = authService.verifyToken(token);
    } catch (error) {
      return {
        user: null,
        error: createErrorResponse(401, 'Unauthorized: Invalid or expired token', requestId),
      };
    }
    const userId = payload.userId;
    if (!userId) {
      return {
        user: null,
        error: createErrorResponse(401, 'Unauthorized: userId missing in token', requestId),
      };
    }
    const user = await userRepository.getUserById(userId);
    if (!user) {
      return {
        user: null,
        error: createErrorResponse(401, 'Unauthorized: User not found', requestId),
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
    return {
      user: null,
      error: createErrorResponse(500, 'Authentication failed', requestId),
    };
  }
}

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
    const { user, error } = await authenticateUser(event, context);
    if (error) {
      return error;
    }
    const authenticatedEvent: AuthenticatedEvent = {
      ...event,
      user,
    };
    return handler(authenticatedEvent, context);
  };
}

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
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return createErrorResponse(500, errorMessage, requestId);
  }
}