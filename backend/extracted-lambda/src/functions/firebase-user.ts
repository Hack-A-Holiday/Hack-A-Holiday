import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { createResponse } from '../utils/lambda-utils';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const USERS_TABLE = process.env.USERS_TABLE_NAME || 'TravelCompanion-Users';

interface FirebaseUser {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
  return createResponse(200, '', event.requestContext.requestId);
    }

    if (event.httpMethod === 'POST') {
      return await createOrUpdateUser(event);
    }

    if (event.httpMethod === 'GET') {
      return await getUser(event);
    }

    return createResponse(405, {
      error: 'Method not allowed',
      message: `HTTP method ${event.httpMethod} is not supported.`,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }, event.requestContext.requestId);
  }
};

async function createOrUpdateUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createResponse(400, {
      error: 'Bad request',
      message: 'Request body is required',
    }, event.requestContext.requestId);
  }

  try {
    const userData: FirebaseUser = JSON.parse(event.body);

    // Validate required fields
    if (!userData.userId || !userData.email) {
      return createResponse(400, {
        error: 'Bad request',
        message: 'userId and email are required fields',
      }, event.requestContext.requestId);
    }

    // Check if user already exists
    const getUserCommand = new GetItemCommand({
      TableName: USERS_TABLE,
      Key: marshall({ userId: userData.userId }),
    });

    const existingUser = await dynamoDBClient.send(getUserCommand);
    
    const userItem = {
      userId: userData.userId,
      email: userData.email,
      displayName: userData.displayName || userData.email,
      photoURL: userData.photoURL,
      provider: userData.provider || 'firebase',
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Keep original createdAt if user exists, otherwise set it now
      createdAt: existingUser.Item 
        ? unmarshall(existingUser.Item).createdAt 
        : userData.createdAt || new Date().toISOString(),
    };

    const putCommand = new PutItemCommand({
      TableName: USERS_TABLE,
      Item: marshall(userItem),
    });

    await dynamoDBClient.send(putCommand);

    return createResponse(200, {
      message: 'User stored successfully',
      user: userItem,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error storing user:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to store user',
    }, event.requestContext.requestId);
  }
}

async function getUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.pathParameters?.userId;
  
  if (!userId) {
    return createResponse(400, {
      error: 'Bad request',
      message: 'userId path parameter is required',
    }, event.requestContext.requestId);
  }

  try {
    const getCommand = new GetItemCommand({
      TableName: USERS_TABLE,
      Key: marshall({ userId }),
    });

    const result = await dynamoDBClient.send(getCommand);

    if (!result.Item) {
      return createResponse(404, {
        error: 'Not found',
        message: 'User not found',
      }, event.requestContext.requestId);
    }

    const user = unmarshall(result.Item);

    return createResponse(200, {
      user,
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error retrieving user:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to retrieve user',
    }, event.requestContext.requestId);
  }
}