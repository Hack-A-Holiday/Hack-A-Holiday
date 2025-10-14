/**
 * Trip API Service
 * Handles API calls to backend for trip operations
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Trip {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  type: 'flight' | 'package' | 'hotel' | 'vacation';
  status: 'planned' | 'booked' | 'completed' | 'cancelled';
  details: {
    flights?: {
      outbound?: any;
      return?: any;
    };
    hotel?: any;
    totalPrice?: number;
  };
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface TripStats {
  tripsPlanned: number;
  tripsCompleted: number;
  totalTrips: number;
  destinationsExplored: number;
  totalSpent: number;
}

export interface CreateTripRequest {
  userId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  type: 'flight' | 'package' | 'hotel' | 'vacation';
  details?: any;
}

export interface CancelTripRequest {
  userId: string;
  tripId: string;
  reason: string;
}

class TripApiService {
  /**
   * Create a new trip
   */
  async createTrip(request: CreateTripRequest): Promise<Trip> {
    try {
      console.log('📝 Creating trip:', request);
      
      const response = await fetch(`${API_URL}/api/trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create trip');
      }

      const data = await response.json();
      console.log('✅ Trip created successfully:', data.trip);
      return data.trip;
    } catch (error) {
      console.error('❌ Error creating trip:', error);
      throw error;
    }
  }

  /**
   * Get all trips for a user
   */
  async getUserTrips(userId: string, includeExpired = false): Promise<{ trips: Trip[], stats: TripStats }> {
    try {
      console.log(`📋 Fetching trips for user: ${userId}`);
      
      const url = `${API_URL}/api/trip/user/${userId}${includeExpired ? '?includeExpired=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch trips');
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.trips.length} trips for user`);
      return {
        trips: data.trips,
        stats: data.stats
      };
    } catch (error) {
      console.error('❌ Error fetching trips:', error);
      throw error;
    }
  }

  /**
   * Get a single trip by ID
   */
  async getTripById(userId: string, tripId: string): Promise<Trip> {
    try {
      console.log(`📋 Fetching trip: ${tripId}`);
      
      const response = await fetch(`${API_URL}/api/trip/${userId}/${tripId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch trip');
      }

      const data = await response.json();
      console.log('✅ Trip retrieved:', data.trip);
      return data.trip;
    } catch (error) {
      console.error('❌ Error fetching trip:', error);
      throw error;
    }
  }

  /**
   * Cancel a trip with reason
   */
  async cancelTrip(request: CancelTripRequest): Promise<Trip> {
    try {
      console.log(`❌ Cancelling trip: ${request.tripId}`);
      
      const response = await fetch(`${API_URL}/api/trip/${request.userId}/${request.tripId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: request.reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel trip');
      }

      const data = await response.json();
      console.log('✅ Trip cancelled successfully');
      return data.trip;
    } catch (error) {
      console.error('❌ Error cancelling trip:', error);
      throw error;
    }
  }

  /**
   * Delete a trip permanently
   */
  async deleteTrip(userId: string, tripId: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting trip: ${tripId}`);
      
      const response = await fetch(`${API_URL}/api/trip/${userId}/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete trip');
      }

      console.log('✅ Trip deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting trip:', error);
      throw error;
    }
  }

  /**
   * Update trip status
   */
  async updateTripStatus(userId: string, tripId: string, status: Trip['status']): Promise<Trip> {
    try {
      console.log(`🔄 Updating trip status: ${tripId} -> ${status}`);
      
      const response = await fetch(`${API_URL}/api/trip/${userId}/${tripId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update trip status');
      }

      const data = await response.json();
      console.log('✅ Trip status updated successfully');
      return data.trip;
    } catch (error) {
      console.error('❌ Error updating trip status:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired trips (admin only)
   */
  async cleanupExpiredTrips(): Promise<number> {
    try {
      console.log('🧹 Running cleanup of expired trips...');
      
      const response = await fetch(`${API_URL}/api/trip/cleanup`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cleanup trips');
      }

      const data = await response.json();
      console.log(`✅ Cleanup complete: ${data.deletedCount} trips deleted`);
      return data.deletedCount;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }
}

export const tripApiService = new TripApiService();
