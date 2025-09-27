import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export function withCorsHeaders(handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>) {
  return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const response = await handler(event, context);
      return {
        ...response,
        headers: {
          ...response.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Credentials': true,
        },
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ error: 'Internal server error' }),
      };
    }
  };
}