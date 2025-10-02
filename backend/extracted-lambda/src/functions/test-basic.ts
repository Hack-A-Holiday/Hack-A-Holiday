import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse } from '../utils/lambda-utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Basic handler started', { httpMethod: event.httpMethod });

  if (event.httpMethod === 'OPTIONS') {
  return createResponse(204, '', event.requestContext.requestId);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Received body:', JSON.stringify(body, null, 2));

    return createResponse(200, {
      success: true,
      message: 'Basic handler working!',
      received: body,
      timestamp: new Date().toISOString()
    }, event.requestContext.requestId);
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, {
      success: false,
      error: `${error}`,
      timestamp: new Date().toISOString()
    }, event.requestContext.requestId);
  }
};