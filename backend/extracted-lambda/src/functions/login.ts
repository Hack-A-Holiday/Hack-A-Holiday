import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { AuthService } from '../services/auth-service';
import { LoginRequest, AuthResponse } from '../types';
import { createErrorResponse, createResponse, parseJsonBody } from '../utils/lambda-utils';
import jwt from 'jsonwebtoken';

const userRepository = new UserRepository();
const authService = new AuthService();

export const login = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;

  try {
    // Parse request body
    const body = parseJsonBody<LoginRequest>(event);
    if (!body) {
      return createErrorResponse(400, 'Request body is required', requestId);
    }

    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return createErrorResponse(400, 'Email and password are required', requestId);
    }

    // Validate email format
    if (!authService.isValidEmail(email)) {
      return createErrorResponse(400, 'Invalid email format', requestId);
    }

    // Authenticate user
    const user = await userRepository.authenticateUser(email, password);
    if (!user) {
      return createErrorResponse(401, 'Invalid email or password', requestId);
    }


    // Create JWT with userId and preferences for cookie
    const cookiePayload = {
      userId: user.id,
      preferences: user.preferences || {},
    };
    const cookieToken = jwt.sign(cookiePayload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    const response: AuthResponse = {
      success: true,
      user: authService.createUserResponse(user),
      token: cookieToken,
      message: 'Login successful',
    };

    // Set cookie in response header
    const cookieHeader = `token=${cookieToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`;
    return createResponse(200, response, requestId, { 'Set-Cookie': cookieHeader });

  } catch (error) {
    console.error('Login error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return createErrorResponse(500, errorMessage, requestId);
  }
};