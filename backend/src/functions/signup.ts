import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { UserRepository } from '../repositories/user-repository';
import { AuthService } from '../services/auth-service';
import { SignupRequest, AuthResponse } from '../types';
import { createErrorResponse, createResponse, parseJsonBody } from '../utils/lambda-utils';

const userRepository = new UserRepository();
const authService = new AuthService();

export async function signup(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const requestId = context.awsRequestId;

  try {
    // Parse request body
    const body = parseJsonBody<SignupRequest>(event);
    if (!body) {
      return createErrorResponse(400, 'Request body is required', requestId);
    }

    const { email, password, name, preferences } = body;

    // Validate required fields
    if (!email || !password) {
      return createErrorResponse(400, 'Email and password are required', requestId);
    }

    // Validate email format
    if (!authService.isValidEmail(email)) {
      return createErrorResponse(400, 'Invalid email format', requestId);
    }

    // Validate password strength
    const passwordValidation = authService.isValidPassword(password);
    if (!passwordValidation.valid) {
      return createErrorResponse(400, passwordValidation.message!, requestId);
    }

    // Check if user already exists
    const existingUser = await userRepository.getUserByEmail(email);
    if (existingUser) {
      return createErrorResponse(409, 'An account with this email already exists', requestId);
    }

    // Create new user
    const userData = {
      email,
      password,
      role: 'normal' as const,
      name,
      preferences: {
        defaultBudget: preferences?.defaultBudget || 2000,
        favoriteDestinations: preferences?.favoriteDestinations || [],
        interests: preferences?.interests || [],
        travelStyle: preferences?.travelStyle || 'mid-range',
        dietaryRestrictions: preferences?.dietaryRestrictions || [],
        accessibility: preferences?.accessibility || [],
      },
      tripHistory: [],
      isEmailVerified: false, // In production, implement email verification
    };

    const newUser = await userRepository.createUser(userData);
    
    // Generate JWT token
    const token = authService.generateToken(authService.createUserResponse(newUser));

    const response: AuthResponse = {
      success: true,
      user: authService.createUserResponse(newUser),
      token,
      message: 'Account created successfully',
    };

    return createResponse(201, response, requestId);

  } catch (error) {
    console.error('Signup error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return createErrorResponse(500, errorMessage, requestId);
  }
}