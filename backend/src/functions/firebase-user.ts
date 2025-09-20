import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    if (event.httpMethod === 'POST') {
      return await createOrUpdateUser(event);
    }

    if (event.httpMethod === 'GET') {
      return await getUser(event);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed',
        message: `HTTP method ${event.httpMethod} is not supported.`,
      }),
    };
  } catch (error) {
    console.error('Error processing request:', error);
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

async function createOrUpdateUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
    const userData: FirebaseUser = JSON.parse(event.body);

    // Validate required fields
    if (!userData.userId || !userData.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad request',
          message: 'userId and email are required fields',
        }),
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'User stored successfully',
        user: userItem,
      }),
    };
  } catch (error) {
    console.error('Error storing user:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to store user',
      }),
    };
  }
}

async function getUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const userId = event.pathParameters?.userId;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Bad request',
        message: 'userId path parameter is required',
      }),
    };
  }

  try {
    const getCommand = new GetItemCommand({
      TableName: USERS_TABLE,
      Key: marshall({ userId }),
    });

    const result = await dynamoDBClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Not found',
          message: 'User not found',
        }),
      };
    }

    const user = unmarshall(result.Item);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user,
      }),
    };
  } catch (error) {
    console.error('Error retrieving user:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to retrieve user',
      }),
    };
  }
}