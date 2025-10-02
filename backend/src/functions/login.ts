

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { AuthService } from '../services/auth-service';
import { LoginRequest } from '../types';
import { createErrorResponse, parseJsonBody } from '../utils/lambda-utils';

const userRepository = new UserRepository();
const authService = new AuthService();

export async function login(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const requestId = context.awsRequestId;
  try {
    // Parse request body
    const body = parseJsonBody<LoginRequest>(event);
    if (!body) {
      return {
        ...createErrorResponse(400, 'Request body is required', requestId),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        }
      };
    }
    const { email, password } = body;
    // Validate required fields
    if (!email || !password) {
      return {
        ...createErrorResponse(400, 'Email and password are required', requestId),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        }
      };
    }
    // Validate email format
    if (!authService.isValidEmail(email)) {
      return {
        ...createErrorResponse(400, 'Invalid email format', requestId),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        }
      };
    }
    // Authenticate user
    const user = await userRepository.authenticateUser(email, password);
    if (!user) {
      return {
        ...createErrorResponse(401, 'Invalid email or password', requestId),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        }
      };
    }
    // Generate JWT with userId and email in payload
    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const token = authService.generateToken(tokenPayload);
    // Set cookie (httpOnly, secure, sameSite=None, for cross-site)
    const cookie = `jwt=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=None; Secure`;
    // Return user info (omit password)
    const response = {
      success: true,
      user: authService.createUserResponse(user),
      token,
    };
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      ...createErrorResponse(500, errorMessage, requestId),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      }
    };
  }
}