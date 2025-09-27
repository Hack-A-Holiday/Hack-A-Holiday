import { S3Service } from '../s3-service';
import { Itinerary } from '../../types';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let s3Service: S3Service;
  let mockClient: any;

  const mockItinerary: Itinerary = {
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
    status: 'ready',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    confidence: 0.9,
  };

  beforeEach(() => {
    mockClient = {
      send: jest.fn(),
    };

    s3Service = new S3Service({
      bucketName: 'test-bucket',
      region: 'us-east-1',
    });

    // Replace the client with our mock
    (s3Service as any).client = mockClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadItinerary', () => {
    it('should upload itinerary as JSON successfully', async () => {
      mockClient.send.mockResolvedValueOnce({}); // PutObjectCommand response

      const key = await s3Service.uploadItinerary(
        'test-user-id',
        'test-trip-id',
        mockItinerary
      );

      expect(key).toBe('users/test-user-id/trips/test-trip-id/itinerary.json');
      expect(mockClient.send).toHaveBeenCalledTimes(1);

      const putCommand = mockClient.send.mock.calls[0][0];
      expect(putCommand.input.Bucket).toBe('test-bucket');
      expect(putCommand.input.Key).toBe('users/test-user-id/trips/test-trip-id/itinerary.json');
      expect(putCommand.input.ContentType).toBe('application/json');
    });

    it('should handle anonymous user uploads', async () => {
      mockClient.send.mockResolvedValueOnce({});

      const key = await s3Service.uploadItinerary(
        undefined,
        'test-trip-id',
        mockItinerary
      );

      expect(key).toBe('anonymous/trips/test-trip-id/itinerary.json');
    });

    it('should handle upload errors', async () => {
      mockClient.send.mockRejectedValueOnce(new Error('S3 error'));

      await expect(s3Service.uploadItinerary(
        'test-user-id',
        'test-trip-id',
        mockItinerary
      )).rejects.toThrow('Failed to upload file');
    });
  });

  describe('uploadItineraryPDF', () => {
    it('should upload PDF successfully', async () => {
      mockClient.send.mockResolvedValueOnce({});
      const pdfBuffer = Buffer.from('fake pdf content');

      const key = await s3Service.uploadItineraryPDF(
        'test-user-id',
        'test-trip-id',
        pdfBuffer
      );

      expect(key).toBe('users/test-user-id/trips/test-trip-id/itinerary.pdf');
      expect(mockClient.send).toHaveBeenCalledTimes(1);

      const putCommand = mockClient.send.mock.calls[0][0];
      expect(putCommand.input.ContentType).toBe('application/pdf');
    });
  });

  describe('getFile', () => {
    it('should get file content successfully', async () => {
      const mockContent = 'file content';
      const mockStream = {
        transformToWebStream: () => ({
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockContent) })
              .mockResolvedValueOnce({ done: true, value: undefined })
          })
        })
      };

      mockClient.send.mockResolvedValueOnce({
        Body: mockStream,
      });

      const result = await s3Service.getFile('test-key');

      expect(result).toBeInstanceOf(Buffer);
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle missing file body', async () => {
      mockClient.send.mockResolvedValueOnce({});

      await expect(s3Service.getFile('test-key'))
        .rejects.toThrow('No file content received');
    });
  });

  describe('getItinerary', () => {
    it('should get and parse itinerary successfully', async () => {
      const mockContent = JSON.stringify(mockItinerary);
      const mockStream = {
        transformToWebStream: () => ({
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockContent) })
              .mockResolvedValueOnce({ done: true, value: undefined })
          })
        })
      };

      mockClient.send.mockResolvedValueOnce({
        Body: mockStream,
      });

      const result = await s3Service.getItinerary('test-user-id', 'test-trip-id');

      expect(result).toEqual(mockItinerary);
    });

    it('should return null when itinerary not found', async () => {
      mockClient.send.mockRejectedValueOnce(new Error('Not found'));

      const result = await s3Service.getItinerary('test-user-id', 'test-trip-id');

      expect(result).toBeNull();
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const mockUrl = 'https://signed-url.com';
      
      // Mock the getSignedUrl function
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockResolvedValueOnce(mockUrl);

      const result = await s3Service.getSignedUrl('test-key');

      expect(result).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('getItinerarySignedUrl', () => {
    it('should generate signed URL for JSON itinerary', async () => {
      const mockUrl = 'https://signed-url.com';
      
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockResolvedValueOnce(mockUrl);

      const result = await s3Service.getItinerarySignedUrl(
        'test-user-id',
        'test-trip-id',
        'json'
      );

      expect(result).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            Key: 'users/test-user-id/trips/test-trip-id/itinerary.json',
            ResponseContentType: 'application/json',
          })
        }),
        expect.objectContaining({
          expiresIn: 3600,
        })
      );
    });

    it('should generate signed URL for PDF itinerary', async () => {
      const mockUrl = 'https://signed-url.com';
      
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockResolvedValueOnce(mockUrl);

      const result = await s3Service.getItinerarySignedUrl(
        'test-user-id',
        'test-trip-id',
        'pdf'
      );

      expect(result).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            ResponseContentType: 'application/pdf',
          })
        }),
        expect.anything()
      );
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockClient.send.mockResolvedValueOnce({}); // HeadObjectCommand response

      const result = await s3Service.fileExists('test-key');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const error = new Error('Not found');
      error.name = 'NotFound';
      mockClient.send.mockRejectedValueOnce(error);

      const result = await s3Service.fileExists('test-key');

      expect(result).toBe(false);
    });

    it('should return false for 404 status code', async () => {
      const error = new Error('Not found');
      (error as any).$metadata = { httpStatusCode: 404 };
      mockClient.send.mockRejectedValueOnce(error);

      const result = await s3Service.fileExists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockClient.send.mockResolvedValueOnce({}); // DeleteObjectCommand response

      await s3Service.deleteFile('test-key');

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const deleteCommand = mockClient.send.mock.calls[0][0];
      expect(deleteCommand.input.Key).toBe('test-key');
    });
  });

  describe('deleteTripFiles', () => {
    it('should delete all trip files successfully', async () => {
      // Mock ListObjectsV2Command response
      mockClient.send.mockResolvedValueOnce({
        Contents: [
          { Key: 'users/test-user-id/trips/test-trip-id/itinerary.json' },
          { Key: 'users/test-user-id/trips/test-trip-id/itinerary.pdf' },
        ],
      });

      // Mock DeleteObjectCommand responses
      mockClient.send.mockResolvedValueOnce({});
      mockClient.send.mockResolvedValueOnce({});

      await s3Service.deleteTripFiles('test-user-id', 'test-trip-id');

      expect(mockClient.send).toHaveBeenCalledTimes(3); // 1 list + 2 deletes
    });

    it('should handle empty trip folder', async () => {
      mockClient.send.mockResolvedValueOnce({
        Contents: [],
      });

      await s3Service.deleteTripFiles('test-user-id', 'test-trip-id');

      expect(mockClient.send).toHaveBeenCalledTimes(1); // Only list command
    });
  });
});