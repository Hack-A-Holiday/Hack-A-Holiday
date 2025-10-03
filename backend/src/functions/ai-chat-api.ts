import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const CHAT_HISTORY_TABLE_NAME = process.env.CHAT_HISTORY_TABLE_NAME || 'ChatHistory';
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || 'Users';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,HEAD,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    const pathSegments = event.path.split('/');
    const resource = pathSegments[pathSegments.length - 1];
    
    // Extract user ID from auth token or request
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    // Simple token extraction - in production, verify JWT properly
    const userId = extractUserIdFromToken(authHeader);
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    switch (event.httpMethod) {
      case 'GET':
        if (resource === 'history') {
          return await getChatHistory(userId, headers);
        } else if (resource === 'preferences') {
          return await getUserPreferences(userId, headers);
        }
        break;
        
      case 'POST':
        if (resource === 'save') {
          const body = JSON.parse(event.body || '{}');
          return await saveChatMessage(userId, body, headers);
        }
        break;
        
      case 'PUT':
        if (resource === 'preferences') {
          const body = JSON.parse(event.body || '{}');
          return await updateUserPreferences(userId, body, headers);
        }
        break;
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error: any) {
    console.error('AI Chat API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

async function getChatHistory(userId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new QueryCommand({
      TableName: CHAT_HISTORY_TABLE_NAME,
      IndexName: 'UserIdIndex', // Assuming you have a GSI on userId
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: marshall({
        ':userId': userId
      }),
      ScanIndexForward: false, // Most recent first
      Limit: 50 // Limit to last 50 messages
    });

    const result = await dynamoClient.send(command);
    const messages = result.Items?.map(item => unmarshall(item)) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.userMessage?.role || msg.aiResponse?.role,
          content: msg.userMessage?.content || msg.aiResponse?.content,
          timestamp: msg.timestamp,
          metadata: msg.aiResponse?.metadata || {}
        }))
      })
    };
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch chat history' })
    };
  }
}

async function getUserPreferences(userId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new GetItemCommand({
      TableName: USERS_TABLE_NAME,
      Key: marshall({ id: userId }),
      ProjectionExpression: 'preferences'
    });

    const result = await dynamoClient.send(command);
    const preferences = result.Item ? unmarshall(result.Item).preferences || {} : {};

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(preferences)
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch preferences' })
    };
  }
}

async function saveChatMessage(userId: string, body: any, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const { message } = body;
    
    const chatRecord = {
      id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      sessionId: message.sessionId || `session_${Date.now()}`,
      message: message,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    const command = new PutItemCommand({
      TableName: CHAT_HISTORY_TABLE_NAME,
      Item: marshall(chatRecord)
    });

    await dynamoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: chatRecord.id })
    };
  } catch (error) {
    console.error('Error saving chat message:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save message' })
    };
  }
}

async function updateUserPreferences(userId: string, preferences: any, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new UpdateItemCommand({
      TableName: USERS_TABLE_NAME,
      Key: marshall({ id: userId }),
      UpdateExpression: 'SET preferences = :prefs, updatedAt = :timestamp',
      ExpressionAttributeValues: marshall({
        ':prefs': { ...preferences, lastUpdated: Date.now() },
        ':timestamp': new Date().toISOString()
      })
    });

    await dynamoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, preferences })
    };
  } catch (error) {
    console.error('Error updating preferences:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update preferences' })
    };
  }
}

function extractUserIdFromToken(authHeader: string): string | null {
  try {
    // Simple token extraction - in production, properly verify JWT
    const token = authHeader.replace('Bearer ', '');
    
    // For now, assume the token contains the user ID
    // In production, decode and verify the JWT properly
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.userId || payload.sub || payload.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
}