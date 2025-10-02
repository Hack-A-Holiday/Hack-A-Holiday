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
import { validateBookingRequest } from '../utils/validation';
import { TripRepository } from '../repositories/trip-repository';
import { BookingRepository } from '../repositories/booking-repository';
import { S3Service } from '../services/s3-service';
import { BookingRequest, ERROR_CODES, BookingConfirmation } from '../types';

// Validate required environment variables
const REQUIRED_ENV_VARS = [
  'TRIPS_TABLE_NAME',
  'BOOKINGS_TABLE_NAME',
  'S3_BUCKET_NAME',
  'AWS_REGION'
];

// Initialize services
let tripRepository: TripRepository;
let bookingRepository: BookingRepository;
let s3Service: S3Service;

function initializeServices() {
  if (!tripRepository) {
    validateEnvironment(REQUIRED_ENV_VARS);
    
    tripRepository = new TripRepository({
      tableName: process.env.TRIPS_TABLE_NAME!,
    });
    
    bookingRepository = new BookingRepository({
      tableName: process.env.BOOKINGS_TABLE_NAME!,
    });
    
    s3Service = new S3Service({
      bucketName: process.env.S3_BUCKET_NAME!,
    });
  }
}

/**
 * Lambda handler for booking confirmations
 * POST /bookings
 */
async function createBookingHandler(
  event: APIGatewayProxyEvent,
  context: Context,
  requestContext: RequestContext
): Promise<APIGatewayProxyResult> {
  // Validate HTTP method
  const methodError = validateMethod(event, ['POST']);
  if (methodError) return methodError;

  // Apply rate limiting
  const rateLimitError = applyRateLimit(event, requestContext);
  if (rateLimitError) return rateLimitError;

  // Initialize services
  initializeServices();

  try {
    // Parse request body
    const body = parseJsonBody<BookingRequest>(event);
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

    // Validate booking request
    const validation = validateBookingRequest(body);
    if (!validation.isValid) {
      return createErrorResponse(
        400,
        {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Invalid booking request',
          details: validation.errors,
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    const bookingRequest = validation.data!;
    const userId = bookingRequest.userId || requestContext.userId;

    console.log('Processing booking request', {
      requestId: requestContext.requestId,
      userId,
      itineraryId: bookingRequest.itineraryId,
    });

    // Get the itinerary to validate and get booking details
    const itinerary = await tripRepository.getTripById(bookingRequest.itineraryId);
    if (!itinerary) {
      return createErrorResponse(
        404,
        {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Itinerary not found',
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    // Check if user has access to this itinerary
    if (itinerary.userId && itinerary.userId !== userId) {
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

    // Check if itinerary is ready for booking
    if (itinerary.status !== 'ready') {
      return createErrorResponse(
        400,
        {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Itinerary must be ready before booking',
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    const bookings: BookingConfirmation[] = [];
    let totalCost = 0;

    // Process flight bookings
    for (const flightId of bookingRequest.selectedOptions.flightIds) {
      let flight = null;
      
      // Find flight in outbound or return flights
      if (itinerary.flights.outbound?.id === flightId) {
        flight = itinerary.flights.outbound;
      } else if (itinerary.flights.return?.id === flightId) {
        flight = itinerary.flights.return;
      }

      if (!flight) {
        return createErrorResponse(
          400,
          {
            code: ERROR_CODES.INVALID_INPUT,
            message: `Flight ${flightId} not found in itinerary`,
            requestId: requestContext.requestId,
            timestamp: new Date().toISOString(),
          },
          requestContext.requestId
        );
      }

      const booking = await bookingRepository.createBooking(
        bookingRequest.itineraryId,
        userId,
        'flight',
        flight.id,
        `${flight.airline} ${flight.flightNumber}`,
        flight.price,
        {
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          departure: flight.departure,
          arrival: flight.arrival,
          duration: flight.duration,
        }
      );

      bookings.push(booking);
      totalCost += flight.price;
    }

    // Process hotel booking
    const hotel = itinerary.hotels.find(h => h.id === bookingRequest.selectedOptions.hotelId);
    if (!hotel) {
      return createErrorResponse(
        400,
        {
          code: ERROR_CODES.INVALID_INPUT,
          message: `Hotel ${bookingRequest.selectedOptions.hotelId} not found in itinerary`,
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );
    }

    const hotelBooking = await bookingRepository.createBooking(
      bookingRequest.itineraryId,
      userId,
      'hotel',
      hotel.id,
      hotel.name,
      hotel.totalPrice,
      {
        name: hotel.name,
        address: hotel.address,
        checkIn: hotel.checkIn,
        checkOut: hotel.checkOut,
        roomType: hotel.roomType,
        rating: hotel.rating,
      }
    );

    bookings.push(hotelBooking);
    totalCost += hotel.totalPrice;

    // Process activity bookings
    if (bookingRequest.selectedOptions.activityIds) {
      for (const activityId of bookingRequest.selectedOptions.activityIds) {
        let activity = null;
        
        // Find activity in daily plans
        for (const day of itinerary.days) {
          activity = day.activities.find(a => a.id === activityId);
          if (activity) break;
        }

        if (!activity) {
          console.warn(`Activity ${activityId} not found in itinerary, skipping`);
          continue;
        }

        const activityBooking = await bookingRepository.createBooking(
          bookingRequest.itineraryId,
          userId,
          'activity',
          activity.id,
          activity.name,
          activity.price,
          {
            name: activity.name,
            description: activity.description,
            category: activity.category,
            duration: activity.duration,
            address: activity.address,
          }
        );

        bookings.push(activityBooking);
        totalCost += activity.price;
      }
    }

    // Update itinerary status to booked
    await tripRepository.updateTripStatus(bookingRequest.itineraryId, 'booked');

    // Store booking confirmations in S3
    await s3Service.uploadBookingConfirmations(userId, bookingRequest.itineraryId, bookings);

    // Generate a master confirmation number
    const masterConfirmationNumber = `TC${Date.now().toString(36).toUpperCase()}`;

    console.log('Booking completed successfully', {
      requestId: requestContext.requestId,
      userId,
      itineraryId: bookingRequest.itineraryId,
      masterConfirmationNumber,
      totalBookings: bookings.length,
      totalCost,
    });

    return createResponse(
      201,
      {
        confirmationNumber: masterConfirmationNumber,
        bookings,
        totalCost,
        itineraryId: bookingRequest.itineraryId,
        message: 'All bookings confirmed successfully',
      },
      requestContext.requestId
    );

  } catch (error) {
    console.error('Error in createBookingHandler:', error);
    
    return createErrorResponse(
      500,
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to process booking',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      requestContext.requestId
    );
  }
}

/**
 * Get bookings for a trip
 * GET /trips/{tripId}/bookings
 */
async function getTripBookingsHandler(
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

    console.log('Getting bookings for trip', {
      requestId: requestContext.requestId,
      tripId,
      userId: requestContext.userId,
    });

    // Verify trip exists and user has access
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

    // Get bookings for this trip
    const bookings = await bookingRepository.getBookingsByTripId(tripId);

    console.log('Bookings retrieved successfully', {
      requestId: requestContext.requestId,
      tripId,
      count: bookings.length,
    });

    return createResponse(
      200,
      {
        tripId,
        bookings,
        totalBookings: bookings.length,
        totalCost: bookings.reduce((sum, booking) => sum + booking.cost, 0),
      },
      requestContext.requestId
    );

  } catch (error) {
    console.error('Error in getTripBookingsHandler:', error);
    
    return createErrorResponse(
      500,
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to retrieve bookings',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      requestContext.requestId
    );
  }
}

/**
 * Get user's booking history
 * GET /bookings
 */
async function getUserBookingsHandler(
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

    console.log('Getting user bookings', {
      requestId: requestContext.requestId,
      userId,
    });

    // Get pagination parameters
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit || '50', 10), 100);

    // Get bookings for this user
    const bookings = await bookingRepository.getBookingsByUserId(userId, limit);

    console.log('User bookings retrieved successfully', {
      requestId: requestContext.requestId,
      userId,
      count: bookings.length,
    });

    return createResponse(
      200,
      {
        bookings,
        totalBookings: bookings.length,
        totalValue: bookings
          .filter(b => b.status === 'confirmed')
          .reduce((sum, booking) => sum + booking.cost, 0),
      },
      requestContext.requestId
    );

  } catch (error) {
    console.error('Error in getUserBookingsHandler:', error);
    
    return createErrorResponse(
      500,
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to retrieve user bookings',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      requestContext.requestId
    );
  }
}

// Export handlers with middleware
export const createBooking = withMiddleware(createBookingHandler);
export const getTripBookings = withMiddleware(getTripBookingsHandler);
export const getUserBookings = withMiddleware(getUserBookingsHandler);

// Main Lambda handler export for AWS Lambda
export const handler = createBooking;