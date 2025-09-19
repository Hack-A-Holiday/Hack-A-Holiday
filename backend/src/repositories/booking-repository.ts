import { randomUUID } from 'crypto';
import { BaseRepository, RepositoryConfig } from './base-repository';
import { BookingRecord, BookingConfirmation } from '../types';

export class BookingRepository extends BaseRepository {
  constructor(config?: Partial<RepositoryConfig>) {
    super({
      tableName: config?.tableName || process.env.BOOKINGS_TABLE_NAME || 'TravelCompanion-Bookings',
      region: config?.region,
      endpoint: config?.endpoint,
    });
  }

  /**
   * Create a new booking
   */
  async createBooking(
    tripId: string,
    userId: string | undefined,
    type: BookingConfirmation['type'],
    itemId: string,
    itemName: string,
    cost: number,
    details: any
  ): Promise<BookingConfirmation> {
    const bookingId = randomUUID();
    const confirmationNumber = this.generateConfirmationNumber();
    const now = new Date().toISOString();
    
    const bookingRecord: BookingRecord = {
      PK: `BOOKING#${bookingId}`,
      SK: `${type.toUpperCase()}#${itemId}`,
      GSI1PK: `TRIP#${tripId}`,
      GSI1SK: `BOOKING#${now}`,
      tripId,
      userId,
      type,
      confirmationNumber,
      itemId,
      itemName,
      cost,
      status: 'confirmed',
      details,
      createdAt: now,
    };

    await this.putItem(bookingRecord);

    return {
      id: bookingId,
      type,
      confirmationNumber,
      itemId,
      itemName,
      cost,
      status: 'confirmed',
      details,
      bookedAt: now,
    };
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<BookingConfirmation | null> {
    // We need to scan since we don't know the SK
    const result = await this.query(
      'PK = :pk',
      {
        expressionAttributeValues: {
          ':pk': `BOOKING#${bookingId}`,
        },
        limit: 1,
      }
    );

    if (result.items.length === 0) return null;

    return this.mapRecordToBooking(result.items[0]);
  }

  /**
   * Get bookings by trip ID
   */
  async getBookingsByTripId(
    tripId: string,
    limit: number = 50
  ): Promise<BookingConfirmation[]> {
    const result = await this.queryGSI(
      'GSI1',
      'GSI1PK = :tripId',
      {
        expressionAttributeValues: {
          ':tripId': `TRIP#${tripId}`,
        },
        limit,
        scanIndexForward: false, // Most recent first
      }
    );

    return result.items.map(record => this.mapRecordToBooking(record));
  }

  /**
   * Get bookings by user ID
   */
  async getBookingsByUserId(
    userId: string,
    limit: number = 100
  ): Promise<BookingConfirmation[]> {
    const result = await this.scan({
      filterExpression: 'userId = :userId',
      expressionAttributeValues: {
        ':userId': userId,
      },
      limit,
    });

    return result.items
      .map(record => this.mapRecordToBooking(record))
      .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
  }

  /**
   * Get bookings by type
   */
  async getBookingsByType(
    type: BookingConfirmation['type'],
    limit: number = 100
  ): Promise<BookingConfirmation[]> {
    const result = await this.scan({
      filterExpression: '#type = :type',
      expressionAttributeNames: {
        '#type': 'type',
      },
      expressionAttributeValues: {
        ':type': type,
      },
      limit,
    });

    return result.items.map(record => this.mapRecordToBooking(record));
  }

  /**
   * Get bookings by confirmation number
   */
  async getBookingByConfirmationNumber(
    confirmationNumber: string
  ): Promise<BookingConfirmation | null> {
    const result = await this.scan({
      filterExpression: 'confirmationNumber = :confirmationNumber',
      expressionAttributeValues: {
        ':confirmationNumber': confirmationNumber,
      },
      limit: 1,
    });

    if (result.items.length === 0) return null;

    return this.mapRecordToBooking(result.items[0]);
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    itemId: string,
    type: BookingConfirmation['type'],
    status: BookingConfirmation['status']
  ): Promise<BookingConfirmation | null> {
    const key = {
      PK: `BOOKING#${bookingId}`,
      SK: `${type.toUpperCase()}#${itemId}`,
    };

    const result = await this.updateItem(key, {
      updateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      expressionAttributeNames: {
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':status': status,
      },
    });

    return this.mapRecordToBooking(result);
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    bookingId: string,
    itemId: string,
    type: BookingConfirmation['type']
  ): Promise<BookingConfirmation | null> {
    return await this.updateBookingStatus(bookingId, itemId, type, 'cancelled');
  }

  /**
   * Delete booking
   */
  async deleteBooking(
    bookingId: string,
    itemId: string,
    type: BookingConfirmation['type']
  ): Promise<void> {
    const key = {
      PK: `BOOKING#${bookingId}`,
      SK: `${type.toUpperCase()}#${itemId}`,
    };

    await this.deleteItem(key);
  }

  /**
   * Get booking statistics
   */
  async getBookingStatistics(): Promise<{
    totalBookings: number;
    bookingsByType: Record<string, number>;
    bookingsByStatus: Record<string, number>;
    totalRevenue: number;
    averageBookingValue: number;
  }> {
    const result = await this.scan({ limit: 1000 });
    
    const bookings = result.items.map(record => this.mapRecordToBooking(record));
    const totalBookings = bookings.length;
    
    const bookingsByType = bookings.reduce((acc, booking) => {
      acc[booking.type] = (acc[booking.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bookingsByStatus = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalRevenue = bookings
      .filter(booking => booking.status === 'confirmed')
      .reduce((sum, booking) => sum + booking.cost, 0);
    
    const averageBookingValue = totalBookings > 0 
      ? totalRevenue / totalBookings 
      : 0;

    return {
      totalBookings,
      bookingsByType,
      bookingsByStatus,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageBookingValue: Math.round(averageBookingValue * 100) / 100,
    };
  }

  /**
   * Get recent bookings
   */
  async getRecentBookings(
    days: number = 7,
    limit: number = 50
  ): Promise<BookingConfirmation[]> {
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
      .map(record => this.mapRecordToBooking(record))
      .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
  }

  /**
   * Search bookings by multiple criteria
   */
  async searchBookings(criteria: {
    tripId?: string;
    userId?: string;
    type?: BookingConfirmation['type'];
    status?: BookingConfirmation['status'];
    minCost?: number;
    maxCost?: number;
    startDate?: string;
    endDate?: string;
  }, limit: number = 50): Promise<BookingConfirmation[]> {
    let filterExpressions: string[] = [];
    let expressionAttributeValues: Record<string, any> = {};
    let expressionAttributeNames: Record<string, string> = {};

    if (criteria.userId) {
      filterExpressions.push('userId = :userId');
      expressionAttributeValues[':userId'] = criteria.userId;
    }

    if (criteria.type) {
      filterExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = criteria.type;
    }

    if (criteria.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = criteria.status;
    }

    if (criteria.minCost !== undefined && criteria.maxCost !== undefined) {
      filterExpressions.push('cost BETWEEN :minCost AND :maxCost');
      expressionAttributeValues[':minCost'] = criteria.minCost;
      expressionAttributeValues[':maxCost'] = criteria.maxCost;
    } else if (criteria.minCost !== undefined) {
      filterExpressions.push('cost >= :minCost');
      expressionAttributeValues[':minCost'] = criteria.minCost;
    } else if (criteria.maxCost !== undefined) {
      filterExpressions.push('cost <= :maxCost');
      expressionAttributeValues[':maxCost'] = criteria.maxCost;
    }

    if (criteria.startDate) {
      filterExpressions.push('createdAt >= :startDate');
      expressionAttributeValues[':startDate'] = criteria.startDate;
    }

    if (criteria.endDate) {
      filterExpressions.push('createdAt <= :endDate');
      expressionAttributeValues[':endDate'] = criteria.endDate;
    }

    // If searching by tripId, use GSI query, otherwise scan
    if (criteria.tripId) {
      const result = await this.queryGSI(
        'GSI1',
        'GSI1PK = :tripId',
        {
          expressionAttributeValues: {
            ':tripId': `TRIP#${criteria.tripId}`,
            ...expressionAttributeValues,
          },
          expressionAttributeNames,
          filterExpression: filterExpressions.length > 0 
            ? filterExpressions.join(' AND ') 
            : undefined,
          limit,
        }
      );
      return result.items.map(record => this.mapRecordToBooking(record));
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
      return result.items.map(record => this.mapRecordToBooking(record));
    }
  }

  /**
   * Generate a unique confirmation number
   */
  private generateConfirmationNumber(): string {
    const prefix = 'TC'; // Travel Companion
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Map database record to BookingConfirmation
   */
  private mapRecordToBooking(record: BookingRecord): BookingConfirmation {
    const bookingId = record.PK.replace('BOOKING#', '');
    
    return {
      id: bookingId,
      type: record.type,
      confirmationNumber: record.confirmationNumber,
      itemId: record.itemId,
      itemName: record.itemName,
      cost: record.cost,
      status: record.status,
      details: record.details,
      bookedAt: record.createdAt,
    };
  }
}