import { APIGatewayProxyResult } from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

export const addCorsHeaders = (response: APIGatewayProxyResult): APIGatewayProxyResult => {
  // For OPTIONS requests, return 200 with CORS headers
  if (response.statusCode === 204 || response.statusCode === 403) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  return {
    ...response,
    headers: {
      ...response.headers,
      ...CORS_HEADERS
    }
  };
};