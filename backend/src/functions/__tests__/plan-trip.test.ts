import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler as planTrip, getTrip, listTrips } from '../plan-trip';
import { TripRepository } from '../../repositories/trip-repository';
import { S3Service } from '../../services/s3-service';

// Mock dependencies
jest.mock('../../repositories/trip-repository');
jest.mock('../../services/s3-service');

describe('Plan Trip Lambda Functions', () => {
  let mockTripRepository: jest.Mocked<TripRepository>;
  let mockS3Service: jest.Mocked<S3Service>;
  let mockContext: Context;

  beforeEach(() => {
    // Set up environment variables
    process.env.TRIPS_TABLE_NAME = 'test-trips-table';
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';


    // Create mocks
    mockTripRepository = new TripRepository() as jest.Mocked<TripRepository>;
    mockS3Service = new S3Service({ bucketName: 'test' }) as jest.Mocked<S3Service>;



    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('planTrip', () => {
    const validTripPreferences = {
      destination: 'Paris, France',
      budget: 2000,
      duration: 5,
      interests: ['culture', 'food'],
      startDate: '2024-06-01',
      travelers: 2,
    };

  const mockEvent: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/plan-trip',
      resource: '/plan-trip',
      pathParameters: null,
      queryStringParameters: null,
      headers: {
        'Content-Type': 'application/json',
      },
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
      body: JSON.stringify({ preferences: validTripPreferences }),
      isBase64Encoded: false,
      stageVariables: null,
      requestContext: {
        requestId: 'test-request-id',
        stage: 'test',
        resourceId: 'test-resource',
        resourcePath: '/plan-trip',
        httpMethod: 'POST',
        path: '/test/plan-trip',
        protocol: 'HTTP/1.1',
        requestTime: '01/Jan/2024:00:00:00 +0000',
        requestTimeEpoch: 1704067200000,
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          user: null,
          userArn: null,
          clientCert: null,
        },
        accountId: '123456789012',
        apiId: 'test-api-id',
        domainName: 'test-domain',
        domainPrefix: 'test',
        extendedRequestId: 'test-extended-id',
        authorizer: null,
      },
    };

    it('should create trip plan successfully', async () => {
      const mockTripId = 'test-trip-id';
      const mockS3Key = 'users/test-user/trips/test-trip-id/itinerary.json';
      const mockSignedUrl = 'https://signed-url.com';

      mockTripRepository.createTrip.mockResolvedValueOnce(mockTripId);
      mockS3Service.uploadItinerary.mockResolvedValueOnce(mockS3Key);
      mockS3Service.getItinerarySignedUrl.mockResolvedValueOnce(mockSignedUrl);

  const result = await planTrip(mockEvent);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body).success).toBe(true);
      expect(JSON.parse(result.body).data.tripId).toBe(mockTripId);
      expect(JSON.parse(result.body).data.s3Url).toBe(mockSignedUrl);
      
      expect(mockTripRepository.createTrip).toHaveBeenCalledWith(
        validTripPreferences,
        undefined
      );
    });

    it('should handle invalid request body', async () => {
      const invalidEvent = {
        ...mockEvent,
        body: JSON.stringify({ invalid: 'data' }),
      };

  const result = await planTrip(invalidEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).success).toBe(false);
      expect(JSON.parse(result.body).error.code).toBe('INVALID_INPUT');
    });

    it('should handle missing request body', async () => {
      const invalidEvent = {
        ...mockEvent,
        body: null,
      };

  const result = await planTrip(invalidEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).success).toBe(false);
    });

    it('should handle invalid HTTP method', async () => {
      const invalidEvent = {
        ...mockEvent,
        httpMethod: 'GET',
      };

  const result = await planTrip(invalidEvent);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body).error.message).toContain('not allowed');
    });

    it('should handle repository errors', async () => {
      mockTripRepository.createTrip.mockRejectedValueOnce(new Error('Database error'));

  const result = await planTrip(mockEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).success).toBe(false);
      expect(JSON.parse(result.body).error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getTrip', () => {
  const mockItinerary = {
      id: 'test-trip-id',
      userId: 'test-user-id',
      destination: 'Paris, France',
      startDate: '2024-06-01',
      endDate: '2024-06-06',
      totalCost: 2000,
      budgetBreakdown: {
        flights: 1200,
        accommodation: 500,
        activities: 200,
        meals: 100,
        transportation: 0,
        miscellaneous: 0,
      },
  days: [] as any[],
      flights: {
        outbound: {
          id: '1',
          airline: 'Test Air',
          flightNumber: 'TA123',
          departure: { airport: 'JFK', city: 'New York', time: '10:00', date: '2024-06-01' },
          arrival: { airport: 'CDG', city: 'Paris', time: '22:00', date: '2024-06-01' },
          duration: '8h 0m',
          durationMinutes: 480,
          price: 600,
          stops: 0,
          baggage: { carry: true, checked: 1 },
          currency: 'USD',
          refundable: true,
          changeable: true,
          source: 'mock' as 'mock',
        },
  return: {
          id: '2',
          airline: 'Test Air',
          flightNumber: 'TA456',
          departure: { airport: 'CDG', city: 'Paris', time: '14:00', date: '2024-06-06' },
          arrival: { airport: 'JFK', city: 'New York', time: '18:00', date: '2024-06-06' },
          duration: '8h 0m',
          durationMinutes: 480,
          price: 650,
          stops: 0,
          baggage: { carry: true, checked: 1 },
          currency: 'USD',
          refundable: true,
          changeable: true,
          source: 'mock' as 'mock',
        }
      },
  hotels: [] as any[],
  status: 'ready',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      confidence: 0.9,
  } as const;

  const mockEvent: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/trips/test-trip-id',
      resource: '/trips/{tripId}',
      pathParameters: {
        tripId: 'test-trip-id',
      },
      queryStringParameters: null,
      headers: {},
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
      body: null,
      isBase64Encoded: false,
      stageVariables: null,
      requestContext: {
        requestId: 'test-request-id',
        stage: 'test',
        resourceId: 'test-resource',
        resourcePath: '/trips/{tripId}',
        httpMethod: 'GET',
        path: '/test/trips/test-trip-id',
        protocol: 'HTTP/1.1',
        requestTime: '01/Jan/2024:00:00:00 +0000',
        requestTimeEpoch: 1704067200000,
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          user: null,
          userArn: null,
          clientCert: null,
        },
        accountId: '123456789012',
        apiId: 'test-api-id',
        domainName: 'test-domain',
        domainPrefix: 'test',
        extendedRequestId: 'test-extended-id',
        authorizer: null,
      },
    };

    it('should get trip successfully', async () => {
      const mockSignedUrl = 'https://signed-url.com';

      mockTripRepository.getTripById.mockResolvedValueOnce(mockItinerary);
      mockS3Service.getItinerarySignedUrl.mockResolvedValueOnce(mockSignedUrl);

  const result = await getTrip(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).success).toBe(true);
      expect(JSON.parse(result.body).data.itinerary).toEqual(mockItinerary);
      expect(JSON.parse(result.body).data.s3Url).toBe(mockSignedUrl);
    });

    it('should handle missing trip ID', async () => {
      const invalidEvent = {
        ...mockEvent,
        pathParameters: null,
      };

  const result = await getTrip(invalidEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error.message).toContain('Trip ID is required');
    });

    it('should handle trip not found', async () => {
      mockTripRepository.getTripById.mockResolvedValueOnce(null);

  const result = await getTrip(mockEvent);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error.code).toBe('NOT_FOUND');
    });
  });

  describe('listTrips', () => {
    const mockTrips = [
      {
        id: 'trip-1',
        destination: 'Paris',
        status: 'ready',
        totalCost: 2000,
      },
      {
        id: 'trip-2',
        destination: 'Tokyo',
        status: 'draft',
        totalCost: 3000,
      },
    ];

  const mockEvent: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/trips',
      resource: '/trips',
      pathParameters: null,
      queryStringParameters: {
        limit: '10',
      },
      headers: {
        'x-user-id': 'test-user-id',
      },
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
      body: null,
      isBase64Encoded: false,
      stageVariables: null,
      requestContext: {
        requestId: 'test-request-id',
        stage: 'test',
        resourceId: 'test-resource',
        resourcePath: '/trips',
        httpMethod: 'GET',
        path: '/test/trips',
        protocol: 'HTTP/1.1',
        requestTime: '01/Jan/2024:00:00:00 +0000',
        requestTimeEpoch: 1704067200000,
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          user: null,
          userArn: null,
          clientCert: null,
        },
        accountId: '123456789012',
        apiId: 'test-api-id',
        domainName: 'test-domain',
        domainPrefix: 'test',
        extendedRequestId: 'test-extended-id',
        authorizer: null,
      },
    };

    it('should list trips successfully', async () => {
      mockTripRepository.getTripsByUserId.mockResolvedValueOnce({
        trips: mockTrips as any,
        lastEvaluatedKey: undefined,
      });

  const result = await listTrips(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).success).toBe(true);
      expect(JSON.parse(result.body).data.trips).toEqual(mockTrips);
      expect(JSON.parse(result.body).data.hasMore).toBe(false);
    });

    it('should handle missing user authentication', async () => {
      const invalidEvent = {
        ...mockEvent,
        headers: {},
      };

  const result = await listTrips(invalidEvent);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error.code).toBe('UNAUTHORIZED');
    });
  });
});