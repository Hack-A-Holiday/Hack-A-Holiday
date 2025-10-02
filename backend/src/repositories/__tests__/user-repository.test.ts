import { UserRepository } from '../user-repository';
import { UserProfile } from '../../types';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockClient: any;

  beforeEach(() => {
    // Create a mock DynamoDB client
    mockClient = {
      send: jest.fn(),
    };

    userRepository = new UserRepository({
      tableName: 'test-users-table',
      endpoint: 'http://localhost:8000', // Local DynamoDB
    });

    // Replace the client with our mock
    (userRepository as any).client = mockClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const mockUserData = {
      email: 'test@example.com',
      preferences: {
        defaultBudget: 2000,
        favoriteDestinations: ['Paris', 'Tokyo'],
        interests: ['culture', 'food'],
        travelStyle: 'mid-range' as const,
        dietaryRestrictions: [],
        accessibility: [],
      },
      tripHistory: [],
  role: 'normal' as const,
      isEmailVerified: true,
    };

    it('should create a new user successfully', async () => {
      mockClient.send.mockResolvedValueOnce({}); // PutCommand response

      const result = await userRepository.createUser(mockUserData);

      expect(result).toMatchObject({
        email: mockUserData.email,
        preferences: mockUserData.preferences,
        tripHistory: [],
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle creation errors', async () => {
      mockClient.send.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(userRepository.createUser(mockUserData))
        .rejects.toThrow('Failed to put item');
    });
  });

  describe('getUserById', () => {
    const mockUserId = 'test-user-id';
    const mockUserRecord = {
      PK: `USER#${mockUserId}`,
      SK: 'PROFILE',
      email: 'test@example.com',
      preferences: {
        defaultBudget: 2000,
        favoriteDestinations: ['Paris'],
        interests: ['culture'],
        travelStyle: 'mid-range',
        dietaryRestrictions: [],
        accessibility: [],
      },
      tripHistory: ['trip1', 'trip2'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should get user by ID successfully', async () => {
      mockClient.send.mockResolvedValueOnce({
        Item: mockUserRecord,
      });

      const result = await userRepository.getUserById(mockUserId);

      expect(result).toEqual({
        id: mockUserId,
        email: mockUserRecord.email,
        preferences: mockUserRecord.preferences,
        tripHistory: mockUserRecord.tripHistory,
        createdAt: mockUserRecord.createdAt,
        updatedAt: mockUserRecord.updatedAt,
      });
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found', async () => {
      mockClient.send.mockResolvedValueOnce({}); // No Item in response

      const result = await userRepository.getUserById(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    const mockEmail = 'test@example.com';
    const mockUserId = 'test-user-id';
    const mockUserRecord = {
      PK: `USER#${mockUserId}`,
      SK: 'PROFILE',
      email: mockEmail,
      preferences: {
        defaultBudget: 2000,
        favoriteDestinations: [],
        interests: ['culture'],
        travelStyle: 'mid-range',
        dietaryRestrictions: [],
        accessibility: [],
      },
      tripHistory: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should get user by email successfully', async () => {
      mockClient.send.mockResolvedValueOnce({
        Items: [mockUserRecord],
      });

      const result = await userRepository.getUserByEmail(mockEmail);

      expect(result).toEqual({
        id: mockUserId,
        email: mockEmail,
        preferences: mockUserRecord.preferences,
        tripHistory: [],
        createdAt: mockUserRecord.createdAt,
        updatedAt: mockUserRecord.updatedAt,
      });
    });

    it('should return null when email not found', async () => {
      mockClient.send.mockResolvedValueOnce({
        Items: [],
      });

      const result = await userRepository.getUserByEmail(mockEmail);

      expect(result).toBeNull();
    });
  });

  describe('updateUserPreferences', () => {
    const mockUserId = 'test-user-id';
    const mockCurrentUser: UserProfile = {
      id: mockUserId,
      email: 'test@example.com',
      preferences: {
        defaultBudget: 2000,
        favoriteDestinations: ['Paris'],
        interests: ['culture'],
        travelStyle: 'mid-range',
        dietaryRestrictions: [],
        accessibility: [],
      },
      tripHistory: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
  role: 'normal' as const,
      isEmailVerified: true,
    };

    it('should update user preferences successfully', async () => {
      // Mock getUserById call
      mockClient.send.mockResolvedValueOnce({
        Item: {
          PK: `USER#${mockUserId}`,
          SK: 'PROFILE',
          ...mockCurrentUser,
        },
      });

      // Mock updateItem call
      const updatedRecord = {
        ...mockCurrentUser,
        preferences: {
          ...mockCurrentUser.preferences,
          defaultBudget: 3000,
          interests: ['culture', 'food'],
        },
        updatedAt: '2024-01-02T00:00:00.000Z',
      };
      mockClient.send.mockResolvedValueOnce({
        Attributes: updatedRecord,
      });

      const newPreferences = {
        defaultBudget: 3000,
        interests: ['culture', 'food'],
      };

      const result = await userRepository.updateUserPreferences(mockUserId, newPreferences);

      expect(result?.preferences.defaultBudget).toBe(3000);
      expect(result?.preferences.interests).toEqual(['culture', 'food']);
      expect(mockClient.send).toHaveBeenCalledTimes(2);
    });

    it('should return null when user not found', async () => {
      mockClient.send.mockResolvedValueOnce({}); // No user found

      const result = await userRepository.updateUserPreferences(mockUserId, {
        defaultBudget: 3000,
      });

      expect(result).toBeNull();
    });
  });

  describe('addTripToHistory', () => {
    const mockUserId = 'test-user-id';
    const mockTripId = 'test-trip-id';

    it('should add trip to user history successfully', async () => {
      mockClient.send.mockResolvedValueOnce({}); // UpdateCommand response

      await userRepository.addTripToHistory(mockUserId, mockTripId);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const updateCall = mockClient.send.mock.calls[0][0];
      expect(updateCall.input.UpdateExpression).toContain('list_append');
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      mockClient.send.mockResolvedValueOnce({
        Items: [{ email: 'test@example.com' }],
      });

      const result = await userRepository.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockClient.send.mockResolvedValueOnce({
        Items: [],
      });

      const result = await userRepository.emailExists('test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('deleteUser', () => {
    const mockUserId = 'test-user-id';

    it('should delete user successfully', async () => {
      mockClient.send.mockResolvedValueOnce({}); // DeleteCommand response

      await userRepository.deleteUser(mockUserId);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
  });
});