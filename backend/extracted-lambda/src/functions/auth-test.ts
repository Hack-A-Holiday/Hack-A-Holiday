import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse } from '../utils/lambda-utils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Always return success with debugging info
    return createResponse(200, {
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
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
    }, event.requestContext.requestId);
  }
};