import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { AuthService } from '../services/auth-service';
import { GoogleAuthRequest, AuthResponse } from '../types';
import { createErrorResponse, createResponse, parseJsonBody } from '../utils/lambda-utils';

const userRepository = new UserRepository();
const authService = new AuthService();

export async function googleAuth(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const requestId = context.awsRequestId;

  try {
    // Parse request body
    const body = parseJsonBody<GoogleAuthRequest>(event);
    if (!body) {
      return createErrorResponse(400, 'Request body is required', requestId);
    }

    const { googleToken, name, profilePicture } = body;

    // Validate required fields
    if (!googleToken) {
      return createErrorResponse(400, 'Google token is required', requestId);
    }

    // Verify Google token
    let googleUserData;
    try {
      googleUserData = await authService.verifyGoogleToken(googleToken);
    } catch (error) {
      return createErrorResponse(401, 'Invalid Google token', requestId);
    }

    // Create or update Google user
    let user;
    try {
      user = await userRepository.createOrUpdateGoogleUser(
        googleUserData.googleId,
        googleUserData.email,
        name || googleUserData.name,
        profilePicture || googleUserData.profilePicture
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user account';
      return createErrorResponse(409, errorMessage, requestId);
    }

    // Generate JWT token
    const token = authService.generateToken(authService.createUserResponse(user));

    const response: AuthResponse = {
      success: true,
      user: authService.createUserResponse(user),
      token,
      message: 'Google authentication successful',
    };

    return createResponse(200, response, requestId);

  } catch (error) {
    console.error('Google auth error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return createErrorResponse(500, errorMessage, requestId);
  }
}