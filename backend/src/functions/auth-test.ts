import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

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
    // Always return success with debugging info
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Lambda function is working',
        debug: {
          httpMethod: event.httpMethod,
          path: event.path,
          pathParameters: event.pathParameters,
          resource: event.resource,
          body: event.body,
          queryStringParameters: event.queryStringParameters,
        },
        environment: {
          USERS_TABLE_NAME: process.env.USERS_TABLE_NAME,
          NODE_ENV: process.env.NODE_ENV,
          AWS_REGION: process.env.AWS_REGION,
        },
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
        stack: error instanceof Error ? error.stack : undefined,
      }),
    };
  }
};