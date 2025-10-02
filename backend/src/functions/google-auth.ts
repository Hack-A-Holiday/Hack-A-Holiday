
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { AuthService } from '../services/auth-service';
import { GoogleAuthRequest } from '../types';
import { createErrorResponse, parseJsonBody } from '../utils/lambda-utils';

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
    let googleProfile;
    try {
      googleProfile = await authService.verifyGoogleToken(googleToken);
    } catch (error) {
      return createErrorResponse(401, 'Invalid Google token', requestId);
    }
    // Find or create user
    let user = await userRepository.getUserByGoogleId(googleProfile.googleId);
    if (!user) {
      user = await userRepository.createUser({
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        role: 'google',
        name: googleProfile.name || name,
        profilePicture: googleProfile.profilePicture || profilePicture,
        preferences: {
          defaultBudget: 2000,
          favoriteDestinations: [],
          interests: [],
          travelStyle: 'mid-range',
          dietaryRestrictions: [],
          accessibility: [],
        },
        tripHistory: [],
        isEmailVerified: true,
      });
    }
    // Generate JWT
    const token = authService.generateToken({ userId: user.id, email: user.email, role: user.role });
  // Set cookie (httpOnly, secure, sameSite)
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
    console.error('Google auth error:', error);
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