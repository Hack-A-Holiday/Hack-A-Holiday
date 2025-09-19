import { randomUUID } from 'crypto';
import { BaseRepository, RepositoryConfig } from './base-repository';
import { TripRecord, Itinerary, TripPreferences } from '../types';

export class TripRepository extends BaseRepository {
  constructor(config?: Partial<RepositoryConfig>) {
    super({
      tableName: config?.tableName || process.env.TRIPS_TABLE_NAME || 'TravelCompanion-Trips',
      region: config?.region,
      endpoint: config?.endpoint,
    });
  }

  /**
   * Create a new trip
   */
  async createTrip(
    preferences: TripPreferences,
    userId?: string
  ): Promise<string> {
    const tripId = randomUUID();
    const now = new Date().toISOString();
    
    const tripRecord: TripRecord = {
      PK: `TRIP#${tripId}`,
      SK: 'METADATA',
      GSI1PK: userId ? `USER#${userId}` : undefined,
      GSI1SK: `TRIP#${now}`,
      userId,
      destination: preferences.destination,
      status: 'draft',
      preferences,
      itinerary: {
        id: tripId,
        userId,
        destination: preferences.destination,
        startDate: preferences.startDate,
        endDate: this.calculateEndDate(preferences.startDate, preferences.duration),
        totalCost: 0,
        budgetBreakdown: {
          flights: 0,
          accommodation: 0,
          activities: 0,
          meals: 0,
          transportation: 0,
          miscellaneous: 0,
        },
        days: [],
        flights: {} as any,
        hotels: [],
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        confidence: 0,
      },
      totalCost: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.putItem(tripRecord);
    return tripId;
  }

  /**
   * Get trip by ID
   */
  async getTripById(tripId: string): Promise<Itinerary | null> {
    const key = {
      PK: `TRIP#${tripId}`,
      SK: 'METADATA',
    };

    const record = await this.getItem(key);
    if (!record) return null;

    return record.itinerary;
  }

  /**
   * Update trip itinerary
   */
  async updateTripItinerary(tripId: string, itinerary: Itinerary): Promise<Itinerary> {
    const key = {
      PK: `TRIP#${tripId}`,
      SK: 'METADATA',
    };

    const updatedItinerary = {
      ...itinerary,
      updatedAt: new Date().toISOString(),
    };

    const result = await this.updateItem(key, {
      updateExpression: 'SET itinerary = :itinerary, totalCost = :totalCost, #status = :status, updatedAt = :updatedAt',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':itinerary': updatedItinerary,
        ':totalCost': itinerary.totalCost,
        ':status': itinerary.status,
      },
    });

    return result.itinerary;
  }

  /**
   * Update trip status
   */
  async updateTripStatus(
    tripId: string, 
    status: Itinerary['status']
  ): Promise<void> {
    const key = {
      PK: `TRIP#${tripId}`,
      SK: 'METADATA',
    };

    await this.updateItem(key, {
      updateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':status': status,
      },
    });

    // Also update the status in the itinerary
    const trip = await this.getTripById(tripId);
    if (trip) {
      trip.status = status;
      await this.updateTripItinerary(tripId, trip);
    }
  }

  /**
   * Get trips by user ID
   */
  async getTripsByUserId(
    userId: string,
    limit: number = 20,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<{ trips: Itinerary[]; lastEvaluatedKey?: Record<string, any> }> {
    const result = await this.queryGSI(
      'GSI1',
      'GSI1PK = :userId',
      {
        expressionAttributeValues: {
          ':userId': `USER#${userId}`,
        },
        limit,
        exclusiveStartKey: lastEvaluatedKey,
        scanIndexForward: false, // Most recent first
      }
    );

    const trips = result.items.map(record => record.itinerary);
    return {
      trips,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Get trips by destination
   */
  async getTripsByDestination(
    destination: string,
    limit: number = 50
  ): Promise<Itinerary[]> {
    const result = await this.scan({
      filterExpression: 'contains(destination, :destination)',
      expressionAttributeValues: {
        ':destination': destination,
      },
      limit,
    });

    return result.items.map(record => record.itinerary);
  }

  /**
   * Get trips by status
   */
  async getTripsByStatus(
    status: Itinerary['status'],
    limit: number = 100
  ): Promise<Itinerary[]> {
    const result = await this.scan({
      filterExpression: '#status = :status',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':status': status,
      },
      limit,
    });

    return result.items.map(record => record.itinerary);
  }

  /**
   * Get recent trips (for analytics)
   */
  async getRecentTrips(
    days: number = 30,
    limit: number = 100
  ): Promise<Itinerary[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    const result = await this.scan({
      filterExpression: 'createdAt >= :cutoff',
      expressionAttributeValues: {
        ':cutoff': cutoffIso,
      },
      limit,
    });

    return result.items
      .map(record => record.itinerary)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get trips by budget range
   */
  async getTripsByBudgetRange(
    minBudget: number,
    maxBudget: number,
    limit: number = 50
  ): Promise<Itinerary[]> {
    const result = await this.scan({
      filterExpression: 'totalCost BETWEEN :min AND :max',
      expressionAttributeValues: {
        ':min': minBudget,
        ':max': maxBudget,
      },
      limit,
    });

    return result.items.map(record => record.itinerary);
  }

  /**
   * Delete trip
   */
  async deleteTrip(tripId: string): Promise<void> {
    const key = {
      PK: `TRIP#${tripId}`,
      SK: 'METADATA',
    };

    await this.deleteItem(key);
  }

  /**
   * Check if trip exists
   */
  async tripExists(tripId: string): Promise<boolean> {
    const key = {
      PK: `TRIP#${tripId}`,
      SK: 'METADATA',
    };

    return await this.itemExists(key);
  }

  /**
   * Get trip statistics
   */
  async getTripStatistics(): Promise<{
    totalTrips: number;
    tripsByStatus: Record<string, number>;
    averageBudget: number;
    popularDestinations: Array<{ destination: string; count: number }>;
  }> {
    // This is a simplified implementation
    // In production, you might want to use DynamoDB Streams or separate analytics tables
    const result = await this.scan({ limit: 1000 });
    
    const trips = result.items.map(record => record.itinerary);
    const totalTrips = trips.length;
    
    const tripsByStatus = trips.reduce((acc, trip) => {
      acc[trip.status] = (acc[trip.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const averageBudget = trips.length > 0 
      ? trips.reduce((sum, trip) => sum + trip.totalCost, 0) / trips.length 
      : 0;
    
    const destinationCounts = trips.reduce((acc, trip) => {
      acc[trip.destination] = (acc[trip.destination] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const popularDestinations = Object.entries(destinationCounts)
      .map(([destination, count]) => ({ destination, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalTrips,
      tripsByStatus,
      averageBudget: Math.round(averageBudget * 100) / 100,
      popularDestinations,
    };
  }

  /**
   * Search trips by multiple criteria
   */
  async searchTrips(criteria: {
    userId?: string;
    destination?: string;
    status?: Itinerary['status'];
    minBudget?: number;
    maxBudget?: number;
    startDate?: string;
    endDate?: string;
  }, limit: number = 50): Promise<Itinerary[]> {
    let filterExpressions: string[] = [];
    let expressionAttributeValues: Record<string, any> = {};
    let expressionAttributeNames: Record<string, string> = {};

    if (criteria.destination) {
      filterExpressions.push('contains(destination, :destination)');
      expressionAttributeValues[':destination'] = criteria.destination;
    }

    if (criteria.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = criteria.status;
    }

    if (criteria.minBudget !== undefined && criteria.maxBudget !== undefined) {
      filterExpressions.push('totalCost BETWEEN :minBudget AND :maxBudget');
      expressionAttributeValues[':minBudget'] = criteria.minBudget;
      expressionAttributeValues[':maxBudget'] = criteria.maxBudget;
    } else if (criteria.minBudget !== undefined) {
      filterExpressions.push('totalCost >= :minBudget');
      expressionAttributeValues[':minBudget'] = criteria.minBudget;
    } else if (criteria.maxBudget !== undefined) {
      filterExpressions.push('totalCost <= :maxBudget');
      expressionAttributeValues[':maxBudget'] = criteria.maxBudget;
    }

    if (criteria.startDate) {
      filterExpressions.push('itinerary.startDate >= :startDate');
      expressionAttributeValues[':startDate'] = criteria.startDate;
    }

    if (criteria.endDate) {
      filterExpressions.push('itinerary.endDate <= :endDate');
      expressionAttributeValues[':endDate'] = criteria.endDate;
    }

    // If searching by userId, use GSI query, otherwise scan
    if (criteria.userId) {
      const result = await this.queryGSI(
        'GSI1',
        'GSI1PK = :userId',
        {
          expressionAttributeValues: {
            ':userId': `USER#${criteria.userId}`,
            ...expressionAttributeValues,
          },
          expressionAttributeNames,
          filterExpression: filterExpressions.length > 0 
            ? filterExpressions.join(' AND ') 
            : undefined,
          limit,
        }
      );
      return result.items.map(record => record.itinerary);
    } else {
      const result = await this.scan({
        filterExpression: filterExpressions.length > 0 
          ? filterExpressions.join(' AND ') 
          : undefined,
        expressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 
          ? expressionAttributeValues 
          : undefined,
        expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
          ? expressionAttributeNames 
          : undefined,
        limit,
      });
      return result.items.map(record => record.itinerary);
    }
  }

  /**
   * Helper method to calculate end date
   */
  private calculateEndDate(startDate: string, duration: number): string {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration);
    return end.toISOString().split('T')[0];
  }
}