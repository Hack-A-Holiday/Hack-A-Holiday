import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { planTrip, getTrip, listTrips } from '../plan-trip';
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
    process.env.NODE_ENV = 'test';

    // Create mocks
    mockTripRepository = new TripRepository() as jest.Mocked<TripRepository>;
    mockS3Service = new S3Service({ bucketName: 'test' }) as jest.Mocked<S3Service>;

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
      memoryLimitInMB: '512',
      awsRequestId: 'test-request-id',
      logGroupName: 'test-log-group',
      logStreamName: 'test-log-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

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

      const result = await planTrip(mockEvent, mockContext);

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

      const result = await planTrip(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).success).toBe(false);
      expect(JSON.parse(result.body).error.code).toBe('INVALID_INPUT');
    });

    it('should handle missing request body', async () => {
      const invalidEvent = {
        ...mockEvent,
        body: null,
      };

      const result = await planTrip(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).success).toBe(false);
    });

    it('should handle invalid HTTP method', async () => {
      const invalidEvent = {
        ...mockEvent,
        httpMethod: 'GET',
      };

      const result = await planTrip(invalidEvent, mockContext);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body).error.message).toContain('not allowed');
    });

    it('should handle repository errors', async () => {
      mockTripRepository.createTrip.mockRejectedValueOnce(new Error('Database error'));

      const result = await planTrip(mockEvent, mockContext);

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
      days: [],
      flights: {} as any,
      hotels: [],
      status: 'ready' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      confidence: 0.9,
    };

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

      const result = await getTrip(mockEvent, mockContext);

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

      const result = await getTrip(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error.message).toContain('Trip ID is required');
    });

    it('should handle trip not found', async () => {
      mockTripRepository.getTripById.mockResolvedValueOnce(null);

      const result = await getTrip(mockEvent, mockContext);

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

      const result = await listTrips(mockEvent, mockContext);

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

      const result = await listTrips(invalidEvent, mockContext);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error.code).toBe('UNAUTHORIZED');
    });
  });
});