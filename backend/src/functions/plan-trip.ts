import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { 
  withMiddleware, 
  createResponse, 
  createErrorResponse, 
  parseJsonBody,
  validateMethod,
  applyRateLimit,
  validateEnvironment,
  RequestContext
} from '../utils/lambda-utils';
import { addCorsHeaders } from '../utils/cors';
import { validateTripPreferences } from '../utils/validation';
import { TripRepository } from '../repositories/trip-repository';
import { S3Service } from '../services/s3-service';
import { TripPreferences, TripPlanRequest, ERROR_CODES, Itinerary } from '../types';

// Validate required environment variables
const REQUIRED_ENV_VARS = [
  'TRIPS_TABLE_NAME',
  'S3_BUCKET_NAME',
  'AWS_REGION'
];

// Initialize services
let tripRepository: TripRepository;
let s3Service: S3Service;

function initializeServices() {
  if (!tripRepository) {
    validateEnvironment(REQUIRED_ENV_VARS);
    
    tripRepository = new TripRepository({
      tableName: process.env.TRIPS_TABLE_NAME!,
    });
    
    s3Service = new S3Service({
      bucketName: process.env.S3_BUCKET_NAME!,
    });
  }
}

/**
 * Lambda handler for trip planning requests
 * POST /plan-trip
 */
async function planTripHandler(
  event: APIGatewayProxyEvent,
  context: Context,
  requestContext: RequestContext
): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };
  
  try {
    // Handle OPTIONS requests for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

    // Parse and validate request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid request body' })
      };
    }

    // Initialize services
    initializeServices();

    // Apply rate limiting
    const rateLimitError = applyRateLimit(event, requestContext);
    if (rateLimitError) {
      return {
        ...rateLimitError,
        headers: { ...rateLimitError.headers, ...corsHeaders }
      };
    }

    // Validate trip preferences
    const validation = validateTripPreferences(body?.preferences);
    if (!validation.isValid || !validation.data) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Invalid trip preferences',
          details: validation.errors,
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        })
      };
    }

    const preferences = validation.data;
    const userId = body?.userId || requestContext.userId;

    // Create trip plan
    const tripId = await tripRepository.createTrip({
      userId,
      preferences,
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        tripId,
        message: 'Trip planning started',
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }

  // Apply rate limiting
  const rateLimitError = applyRateLimit(event, requestContext);
  if (rateLimitError) return rateLimitError;

  // Initialize services
  initializeServices();

  try {
    // Parse request body
    const body = parseJsonBody<TripPlanRequest>(event);
    if (!body) {
      return createErrorResponse(
        400,
        {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Request body is required',
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    // Validate trip preferences
    const validation = validateTripPreferences(body.preferences);
    if (!validation.isValid) {
      return createErrorResponse(
        400,
        {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Invalid trip preferences',
          details: validation.errors,
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    const preferences = validation.data!;
    const userId = body.userId || requestContext.userId;

    console.log('Creating trip plan', {
      requestId: requestContext.requestId,
      userId,
      destination: preferences.destination,
      budget: preferences.budget,
      duration: preferences.duration,
    });

    // Create initial trip record
    const tripId = await tripRepository.createTrip(preferences, userId);

    console.log('Trip created', {
      requestId: requestContext.requestId,
      tripId,
      userId,
    });

    // Import services for AI and real-time data
    const { BedrockService } = await import('../services/bedrock-service');
    const { FlightService } = await import('../services/flight-service');
    const { HotelService } = await import('../services/hotel-service');

    // Initialize services
    const bedrockService = new BedrockService();
    const flightService = new FlightService();
    const hotelService = new HotelService();

    console.log('Searching for real-time flight and hotel data', {
      requestId: requestContext.requestId,
      destination: preferences.destination,
    });

    // Get real-time flight and hotel data
    const [flightData, hotelData] = await Promise.all([
      flightService.searchFlights(preferences).catch(error => {
        console.error('Flight search failed, using fallback:', error);
        return [];
      }),
      hotelService.searchHotels(preferences).catch(error => {
        console.error('Hotel search failed, using fallback:', error);
        return [];
      }),
    ]);

    console.log('Real-time data retrieved', {
      requestId: requestContext.requestId,
      flightCount: flightData.length,
      hotelCount: hotelData.length,
    });

    // Get activity recommendations from Bedrock
    console.log('Getting activity recommendations from Bedrock', {
      requestId: requestContext.requestId,
    });

    const activityBudget = preferences.budget * 0.25; // 25% for activities
    const activities = await bedrockService.getActivityRecommendations(
      preferences.destination,
      preferences.interests,
      activityBudget,
      preferences.duration
    ).catch(error => {
      console.error('Activity recommendations failed:', error);
      return [];
    });

    // Generate AI-powered itinerary using Bedrock
    console.log('Generating AI itinerary with Bedrock', {
      requestId: requestContext.requestId,
      flightCount: flightData.length,
      hotelCount: hotelData.length,
      activityCount: activities.length,
    });

    const completeItinerary = await bedrockService.generateTripItinerary(
      preferences,
      flightData,
      hotelData,
      activities
    ).catch(error => {
      console.error('Bedrock generation failed, using structured fallback:', error);
      
      // Create structured fallback itinerary
      const fallbackItinerary: Itinerary = {
        id: tripId,
        userId,
        destination: preferences.destination,
        startDate: preferences.startDate,
        endDate: calculateEndDate(preferences.startDate, preferences.duration),
        totalCost: Math.min(preferences.budget * 0.85, 2000), // Use 85% of budget
        budgetBreakdown: {
          flights: flightData.length > 0 ? Math.min(flightData[0].price * 2, preferences.budget * 0.4) : preferences.budget * 0.4,
          accommodation: hotelData.length > 0 ? Math.min(hotelData[0].totalPrice, preferences.budget * 0.3) : preferences.budget * 0.3,
          activities: preferences.budget * 0.15,
          meals: preferences.budget * 0.1,
          transportation: preferences.budget * 0.05,
          miscellaneous: 0,
        },
        days: Array.from({ length: preferences.duration }, (_, i) => ({
          date: addDays(preferences.startDate, i),
          dayNumber: i + 1,
          activities: activities.slice(i * 2, (i + 1) * 2), // 2 activities per day
          meals: [
            {
              id: `meal-${i}-breakfast`,
              name: 'Local Breakfast Spot',
              type: 'breakfast' as const,
              cuisine: 'Local',
              priceRange: '$$' as const,
              estimatedCost: 15,
              rating: 4.0,
              address: preferences.destination,
              description: 'Traditional breakfast'
            },
            {
              id: `meal-${i}-dinner`,
              name: 'Recommended Restaurant',
              type: 'dinner' as const,
              cuisine: 'Local',
              priceRange: '$$$' as const,
              estimatedCost: 45,
              rating: 4.3,
              address: preferences.destination,
              description: 'Local cuisine experience'
            }
          ],
          transportation: [
            {
              id: `transport-${i}`,
              type: 'public' as const,
              from: 'Hotel',
              to: 'Activities',
              duration: '30 min',
              cost: 10,
              description: 'Daily transportation'
            }
          ],
          totalCost: (preferences.budget * 0.25) / preferences.duration, // 25% of budget per day
        })),
        flights: flightData.length >= 2 ? {
          outbound: flightData[0],
          return: flightData[1],
        } : flightData.length === 1 ? {
          outbound: flightData[0],
          return: flightData[0], // Use same flight as template
        } : {} as any,
        hotels: hotelData.slice(0, 1),
        status: 'ready' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confidence: 0.7, // Good confidence with real data
      };
      
      return fallbackItinerary;
    });

    // Set the trip ID and user ID
    completeItinerary.id = tripId;
    completeItinerary.userId = userId;
    completeItinerary.updatedAt = new Date().toISOString();

    // Update trip status to ready
    await tripRepository.updateTripItinerary(tripId, completeItinerary);

    // Store complete itinerary in S3
    const s3Key = await s3Service.uploadItinerary(userId, tripId, completeItinerary);
    
    // Generate signed URL for access
    const signedUrl = await s3Service.getItinerarySignedUrl(userId, tripId, 'json', {
      expiresIn: 3600, // 1 hour
    });

    console.log('AI-powered trip plan created successfully', {
      requestId: requestContext.requestId,
      tripId,
      s3Key,
      confidence: completeItinerary.confidence,
      totalCost: completeItinerary.totalCost,
      flightsIncluded: !!completeItinerary.flights?.outbound,
      hotelsIncluded: completeItinerary.hotels?.length || 0,
    });

    return createResponse(
      201,
      {
        tripId,
        itinerary: completeItinerary,
        s3Url: signedUrl,
        confidence: completeItinerary.confidence,
        realTimeData: {
          flightsFound: flightData.length,
          hotelsFound: hotelData.length,
          activitiesFound: activities.length,
        },
        message: `AI-powered trip plan created! Total: $${completeItinerary.totalCost} with real-time flight and hotel data.`,
      },
      requestContext.requestId
    );

  } catch (error) {
    console.error('Error in planTripHandler:', error);
    
    return createErrorResponse(
      500,
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create trip plan',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      requestContext.requestId
    );
  }
}

/**
 * Get trip by ID
 * GET /trips/{tripId}
 */
async function getTripHandler(
  event: APIGatewayProxyEvent,
  context: Context,
  requestContext: RequestContext
): Promise<APIGatewayProxyResult> {
  // Validate HTTP method
  const methodError = validateMethod(event, ['GET']);
  if (methodError) return methodError;

  // Initialize services
  initializeServices();

  try {
    const tripId = event.pathParameters?.tripId;
    if (!tripId) {
      return createErrorResponse(
        400,
        {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Trip ID is required',
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    console.log('Getting trip', {
      requestId: requestContext.requestId,
      tripId,
      userId: requestContext.userId,
    });

    // Get trip from repository
    const itinerary = await tripRepository.getTripById(tripId);
    if (!itinerary) {
      return createErrorResponse(
        404,
        {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Trip not found',
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    // Check if user has access to this trip
    if (itinerary.userId && itinerary.userId !== requestContext.userId) {
      return createErrorResponse(
        403,
        {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Access denied',
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    // Generate signed URL for itinerary access
    const signedUrl = await s3Service.getItinerarySignedUrl(
      itinerary.userId, 
      tripId, 
      'json',
      { expiresIn: 3600 }
    );

    console.log('Trip retrieved successfully', {
      requestId: requestContext.requestId,
      tripId,
      status: itinerary.status,
    });

    return createResponse(
      200,
      {
        itinerary,
        s3Url: signedUrl,
      },
      requestContext.requestId
    );

  } catch (error) {
    console.error('Error in getTripHandler:', error);
    
    return createErrorResponse(
      500,
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to retrieve trip',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      requestContext.requestId
    );
  }
}

/**
 * List trips for a user
 * GET /trips
 */
async function listTripsHandler(
  event: APIGatewayProxyEvent,
  context: Context,
  requestContext: RequestContext
): Promise<APIGatewayProxyResult> {
  // Validate HTTP method
  const methodError = validateMethod(event, ['GET']);
  if (methodError) return methodError;

  // Initialize services
  initializeServices();

  try {
    const userId = requestContext.userId;
    if (!userId) {
      return createErrorResponse(
        401,
        {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'User authentication required',
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    console.log('Listing trips for user', {
      requestId: requestContext.requestId,
      userId,
    });

    // Get pagination parameters
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit || '20', 10), 100);
    const lastEvaluatedKey = queryParams.lastEvaluatedKey 
      ? JSON.parse(decodeURIComponent(queryParams.lastEvaluatedKey))
      : undefined;

    // Get trips from repository
    const result = await tripRepository.getTripsByUserId(userId, limit, lastEvaluatedKey);

    console.log('Trips retrieved successfully', {
      requestId: requestContext.requestId,
      userId,
      count: result.trips.length,
    });

    return createResponse(
      200,
      {
        trips: result.trips,
        lastEvaluatedKey: result.lastEvaluatedKey 
          ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
          : undefined,
        hasMore: !!result.lastEvaluatedKey,
      },
      requestContext.requestId
    );

  } catch (error) {
    console.error('Error in listTripsHandler:', error);
    
    return createErrorResponse(
      500,
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to list trips',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      requestContext.requestId
    );
  }
}

// Helper functions
function calculateEndDate(startDate: string, duration: number): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + duration);
  return end.toISOString().split('T')[0];
}

function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Export handlers with middleware and CORS
export const planTrip = withMiddleware(async (event, context, reqContext) => {
  const response = await planTripHandler(event, context, reqContext);
  return addCorsHeaders(response);
});

export const getTrip = withMiddleware(async (event, context, reqContext) => {
  const response = await getTripHandler(event, context, reqContext);
  return addCorsHeaders(response);
});

export const listTrips = withMiddleware(async (event, context, reqContext) => {
  const response = await listTripsHandler(event, context, reqContext);
  return addCorsHeaders(response);
});