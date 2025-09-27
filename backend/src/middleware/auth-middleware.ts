import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserProfile } from '@/services/user-service';

export const authMiddleware = async (
  event: APIGatewayProxyEvent,
  next: () => Promise<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> => {
  const userId = event.headers['Authorization'];

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }

  // Simulate user validation
  const user = await getUserProfile(userId);

  if (!user) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }

  return next();
};