import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface TripPreferences {
  destination: string;
  budget: number;
  duration: number;
}

/**
 * Simple plan trip function for testing - no dependencies
 */
export const planTrip = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('🚀 Plan trip function called');
  console.log('📥 Event:', JSON.stringify(event, null, 2));

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  try {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { destination, budget, duration } = body as TripPreferences;

    console.log(`📍 Planning trip to: ${destination}`);
    console.log(`💰 Budget: $${budget}`);
    console.log(`📅 Duration: ${duration} days`);

    // Validate required fields
    if (!destination || !budget || !duration) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: destination, budget, duration',
        }),
      };
    }

    // Create a simple mock trip plan
    const tripPlan = {
      id: `trip-${Date.now()}`,
      destination,
      budget,
      duration,
      created: new Date().toISOString(),
      status: 'draft',
      summary: `A ${duration}-day trip to ${destination} with a budget of $${budget}`,
      recommendations: [
        {
          type: 'accommodation',
          name: 'Recommended Hotel',
          description: `A great hotel in ${destination} within your budget`,
          estimatedCost: Math.round(budget * 0.4),
        },
        {
          type: 'activity',
          name: 'Top Attraction',
          description: `Must-see attraction in ${destination}`,
          estimatedCost: Math.round(budget * 0.2),
        },
        {
          type: 'dining',
          name: 'Local Restaurant',
          description: `Authentic dining experience in ${destination}`,
          estimatedCost: Math.round(budget * 0.3),
        },
      ],
    };

    console.log('✅ Trip plan created successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        trip: tripPlan,
        message: 'Trip plan created successfully (test mode)',
      }),
    };

  } catch (error) {
    console.error('❌ Error in plan trip:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

// Placeholder functions for other handlers
export const getTrip = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Get trip endpoint (test mode)',
    }),
  };
};

export const listTrips = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      trips: [],
      message: 'List trips endpoint (test mode)',
    }),
  };
};