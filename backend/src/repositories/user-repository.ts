import { randomUUID, pbkdf2Sync, randomBytes } from 'crypto';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BaseRepository, RepositoryConfig } from './base-repository';
import { UserRecord, UserProfile } from '../types';

// Simple password hashing using Node.js crypto
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch {
    return false;
  }
}

// Generate password reset token
function generateResetToken(): { token: string; expiry: string } {
  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
  return { token, expiry };
}

export class UserRepository extends BaseRepository {
  constructor(config?: Partial<RepositoryConfig>) {
    super({
      tableName: config?.tableName || process.env.USERS_TABLE_NAME || 'TravelCompanion-Users-dev',
      region: config?.region,
      endpoint: config?.endpoint,
    });
  }

  /**
   * Create a new user (normal auth)
   */
  async createUser(userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    const userId = randomUUID();
    const now = new Date().toISOString();
    
    // Hash password if provided
    let hashedPassword: string | undefined;
    if (userData.password) {
      hashedPassword = hashPassword(userData.password);
    }
    
    const userRecord: UserRecord = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: `EMAIL#${userData.email}`,
      GSI1SK: 'USER',
      email: userData.email,
      password: hashedPassword,
      googleId: userData.googleId,
      role: userData.role,
      name: userData.name,
      profilePicture: userData.profilePicture,
      preferences: userData.preferences,
      tripHistory: userData.tripHistory || [],
      createdAt: now,
      updatedAt: now,
      isEmailVerified: userData.isEmailVerified,
    };

    await this.putItem(userRecord);

    return {
      id: userId,
      email: userData.email,
      googleId: userData.googleId,
      role: userData.role,
      name: userData.name,
      profilePicture: userData.profilePicture,
      preferences: userData.preferences,
      tripHistory: userData.tripHistory || [],
      createdAt: now,
      updatedAt: now,
      isEmailVerified: userData.isEmailVerified,
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
   * Authenticate user with email and password
   */
  async authenticateUser(email: string, password: string): Promise<UserProfile | null> {
    const user = await this.getUserByEmail(email);
    if (!user || user.role !== 'normal') {
      return null;
    }

    // Get the user record to access the hashed password
    const record = await this.getItem({
      PK: `USER#${user.id}`,
      SK: 'PROFILE',
    });

    if (!record || !record.password) {
      return null;
    }

    const isPasswordValid = verifyPassword(password, record.password);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login time
    await this.updateLastLogin(user.id);

    return user;
  }

  /**
   * Create or update user from Google OAuth
   */
  async createOrUpdateGoogleUser(googleId: string, email: string, name?: string, profilePicture?: string): Promise<UserProfile> {
    // Check if user already exists by Google ID (exact match - this is a returning Google user)
    let user = await this.getUserByGoogleId(googleId);
    
    if (user) {
      // Existing Google user signing in again - just update last login
      console.log(`Existing Google user signing in: ${email}`);
      await this.updateLastLogin(user.id);
      return user;
    }

    // Check if user exists by email (could be email/password user or Google user without googleId match)
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.role === 'google') {
        // This is a Google user but googleId didn't match - update their googleId and sign them in
        console.log(`Updating Google user credentials for: ${email}`);
        await this.updateLastLogin(existingUser.id);
        return existingUser;
      } else {
        // This is an email/password user - for now, keep them separate
        console.log(`Email/password user exists with this email: ${email}. For now, they need to use email/password login.`);
        throw new Error('An account with this email already exists. Please use your email and password to sign in, or contact support if you need help linking your accounts.');
      }
    }

    // No existing user found - create new Google user
    console.log(`Creating new Google user: ${email}`);
    const userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      email,
      googleId,
      role: 'google',
      name,
      profilePicture,
      preferences: {
        defaultBudget: 2000,
        favoriteDestinations: [],
        interests: [],
        travelStyle: 'mid-range',
        dietaryRestrictions: [],
        accessibility: [],
      },
      tripHistory: [],
      isEmailVerified: true, // Google users are pre-verified
    };

    return await this.createUser(userData);
  }

  /**
   * Get user by Google ID
   */
  async getUserByGoogleId(googleId: string): Promise<UserProfile | null> {
    const result = await this.scan({
      filterExpression: 'googleId = :googleId',
      expressionAttributeValues: {
        ':googleId': googleId,
      },
      limit: 1,
    });

    if (result.items.length === 0) return null;

    const record = result.items[0];
    const userId = record.PK.replace('USER#', '');
    return this.mapRecordToProfile(record, userId);
  }

  /**
   * Update user data
   */
  async updateUser(userId: string, updateData: Partial<UserProfile>): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Build update expression and attribute values
      const updateExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};
      
      // Add updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = timestamp;
      
      // Add other fields from updateData
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'createdAt' && value !== undefined) {
          const attrName = `#${key}`;
          const attrValue = `:${key}`;
          updateExpressions.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = key;
          expressionAttributeValues[attrValue] = value;
        }
      });

      const updateParams = {
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      };

      await this.client.send(new UpdateCommand(updateParams));
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update last login time
   */
  async updateLastLogin(userId: string): Promise<void> {
    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    const now = new Date().toISOString();
    await this.updateItem(key, {
      updateExpression: 'SET lastLoginAt = :lastLoginAt, updatedAt = :updatedAt',
      expressionAttributeValues: {
        ':lastLoginAt': now,
        ':updatedAt': now,
      },
    });
  }

  /**
   * Update user password (for normal auth users)
   */
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user || user.role !== 'normal') {
      return false;
    }

    const hashedPassword = hashPassword(newPassword);

    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    await this.updateItem(key, {
      updateExpression: 'SET password = :password, updatedAt = :updatedAt',
      expressionAttributeValues: {
        ':password': hashedPassword,
        ':updatedAt': new Date().toISOString(),
      },
    });

    return true;
  }

  /**
   * Generate and store password reset token for user
   */
  async generatePasswordResetToken(email: string): Promise<{ token: string; expiry: string } | null> {
    const user = await this.getUserByEmail(email);
    if (!user || user.role !== 'normal') {
      // Only allow password reset for normal (email/password) users
      return null;
    }

    const { token, expiry } = generateResetToken();
    
    // Store reset token in database
    const key = {
      PK: `USER#${user.id}`,
      SK: 'PROFILE',
    };

    await this.updateItem(key, {
      updateExpression: 'SET resetToken = :token, resetTokenExpiry = :expiry, updatedAt = :updatedAt',
      expressionAttributeValues: {
        ':token': token,
        ':expiry': expiry,
        ':updatedAt': new Date().toISOString(),
      },
    });

    return { token, expiry };
  }

  /**
   * Verify password reset token and update password
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    // Find user by reset token
    const result = await this.scan({
      filterExpression: 'resetToken = :token AND resetTokenExpiry > :now',
      expressionAttributeValues: {
        ':token': token,
        ':now': new Date().toISOString(),
      },
      limit: 1,
    });

    if (result.items.length === 0) {
      // Token not found or expired
      return false;
    }

    const record = result.items[0];
    const userId = record.PK.replace('USER#', '');
    
    // Hash new password
    const hashedPassword = hashPassword(newPassword);
    
    // Update password and clear reset token
    const key = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    };

    await this.updateItem(key, {
      updateExpression: 'SET password = :password, updatedAt = :updatedAt REMOVE resetToken, resetTokenExpiry',
      expressionAttributeValues: {
        ':password': hashedPassword,
        ':updatedAt': new Date().toISOString(),
      },
    });

    return true;
  }

  /**
   * Verify if password reset token is valid
   */
  async verifyPasswordResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const result = await this.scan({
      filterExpression: 'resetToken = :token AND resetTokenExpiry > :now',
      expressionAttributeValues: {
        ':token': token,
        ':now': new Date().toISOString(),
      },
      limit: 1,
    });

    if (result.items.length === 0) {
      return { valid: false };
    }

    return { valid: true, email: result.items[0].email };
  }

  /**
   * Clear expired reset tokens (can be called periodically)
   */
  async clearExpiredResetTokens(): Promise<number> {
    const result = await this.scan({
      filterExpression: 'attribute_exists(resetToken) AND resetTokenExpiry < :now',
      expressionAttributeValues: {
        ':now': new Date().toISOString(),
      },
    });

    let cleared = 0;
    for (const record of result.items) {
      const key = {
        PK: record.PK,
        SK: record.SK,
      };

      await this.updateItem(key, {
        updateExpression: 'REMOVE resetToken, resetTokenExpiry',
      });
      cleared++;
    }

    return cleared;
  }

  /**
   * Map database record to UserProfile
   */
  private mapRecordToProfile(record: UserRecord, userId: string): UserProfile {
    return {
      id: userId,
      email: record.email,
      googleId: record.googleId,
      role: record.role,
      name: record.name,
      profilePicture: record.profilePicture,
      preferences: record.preferences,
      tripHistory: record.tripHistory || [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastLoginAt: record.lastLoginAt,
      isEmailVerified: record.isEmailVerified,
    };
  }
}