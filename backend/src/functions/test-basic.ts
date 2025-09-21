import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Basic handler started', { httpMethod: event.httpMethod });

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
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
    const body = JSON.parse(event.body || '{}');
    console.log('Received body:', JSON.stringify(body, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Basic handler working!',
        received: body,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `${error}`,
        timestamp: new Date().toISOString()
      })
    };
  }
};