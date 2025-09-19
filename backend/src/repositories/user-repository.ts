import { randomUUID } from 'crypto';
import { BaseRepository, RepositoryConfig } from './base-repository';
import { UserRecord, UserProfile } from '../types';

export class UserRepository extends BaseRepository {
  constructor(config?: Partial<RepositoryConfig>) {
    super({
      tableName: config?.tableName || process.env.USERS_TABLE_NAME || 'TravelCompanion-Users',
      region: config?.region,
      endpoint: config?.endpoint,
    });
  }

  /**
   * Create a new user
   */
  async createUser(userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    const userId = randomUUID();
    const now = new Date().toISOString();
    
    const userRecord: UserRecord = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: `EMAIL#${userData.email}`,
      GSI1SK: 'USER',
      email: userData.email,
      preferences: userData.preferences,
      tripHistory: userData.tripHistory || [],
      createdAt: now,
      updatedAt: now,
    };

    await this.putItem(userRecord);

    return {
      id: userId,
      email: userData.email,
      preferences: userData.preferences,
      tripHistory: userData.tripHistory || [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    const record = await this.getItem(key);
    if (!record) return null;

    return this.mapRecordToProfile(record, userId);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const result = await this.queryGSI(
      'GSI1',
      'GSI1PK = :email',
      {
        expressionAttributeValues: {
          ':email': `EMAIL#${email}`,
        },
        limit: 1,
      }
    );

    if (result.items.length === 0) return null;

    const record = result.items[0];
    const userId = record.PK.replace('USER#', '');
    return this.mapRecordToProfile(record, userId);
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string, 
    preferences: Partial<UserProfile['preferences']>
  ): Promise<UserProfile | null> {
    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    // First get current preferences to merge
    const currentUser = await this.getUserById(userId);
    if (!currentUser) return null;

    const updatedPreferences = {
      ...currentUser.preferences,
      ...preferences,
    };

    const result = await this.updateItem(key, {
      updateExpression: 'SET preferences = :preferences, updatedAt = :updatedAt',
      expressionAttributeValues: {
        ':preferences': updatedPreferences,
      },
    });

    return this.mapRecordToProfile(result, userId);
  }

  /**
   * Add trip to user's history
   */
  async addTripToHistory(userId: string, tripId: string): Promise<void> {
    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    await this.updateItem(key, {
      updateExpression: 'SET tripHistory = list_append(if_not_exists(tripHistory, :empty_list), :tripId), updatedAt = :updatedAt',
      expressionAttributeValues: {
        ':tripId': [tripId],
        ':empty_list': [],
      },
    });
  }

  /**
   * Remove trip from user's history
   */
  async removeTripFromHistory(userId: string, tripId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const updatedHistory = user.tripHistory.filter(id => id !== tripId);

    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    await this.updateItem(key, {
      updateExpression: 'SET tripHistory = :history, updatedAt = :updatedAt',
      expressionAttributeValues: {
        ':history': updatedHistory,
      },
    });
  }

  /**
   * Get user's trip history with pagination
   */
  async getUserTripHistory(
    userId: string, 
    limit: number = 10, 
    lastEvaluatedKey?: Record<string, any>
  ): Promise<{ tripIds: string[]; lastEvaluatedKey?: Record<string, any> }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { tripIds: [] };
    }

    // For simplicity, return all trip IDs
    // In a real implementation, you might want to paginate this differently
    return { tripIds: user.tripHistory };
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    await this.deleteItem(key);
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    return await this.itemExists(key);
  }

  /**
   * Check if email is already registered
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return user !== null;
  }

  /**
   * Get users by travel style (for analytics/recommendations)
   */
  async getUsersByTravelStyle(
    travelStyle: 'budget' | 'mid-range' | 'luxury',
    limit: number = 50
  ): Promise<UserProfile[]> {
    const result = await this.scan({
      filterExpression: 'preferences.travelStyle = :style',
      expressionAttributeValues: {
        ':style': travelStyle,
      },
      limit,
    });

    return result.items.map(record => {
      const userId = record.PK.replace('USER#', '');
      return this.mapRecordToProfile(record, userId);
    });
  }

  /**
   * Get users with similar interests (for recommendations)
   */
  async getUsersWithSimilarInterests(
    interests: string[],
    limit: number = 20
  ): Promise<UserProfile[]> {
    // This is a simplified implementation
    // In production, you might want to use a more sophisticated matching algorithm
    const result = await this.scan({
      filterExpression: 'contains(preferences.interests, :interest)',
      expressionAttributeValues: {
        ':interest': interests[0], // Just check first interest for simplicity
      },
      limit,
    });

    return result.items.map(record => {
      const userId = record.PK.replace('USER#', '');
      return this.mapRecordToProfile(record, userId);
    });
  }

  /**
   * Map database record to UserProfile
   */
  private mapRecordToProfile(record: UserRecord, userId: string): UserProfile {
    return {
      id: userId,
      email: record.email,
      preferences: record.preferences,
      tripHistory: record.tripHistory || [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}