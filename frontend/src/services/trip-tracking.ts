/**
 * Trip Tracking Service
 * Tracks user trips and booking confirmations
 */

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
}

export interface TripStats {
  tripsPlanned: number;
  countriesExplored: number;
  totalSpent: number;
}

class TripTrackingService {
  private readonly TRIPS_KEY = 'hack-a-holiday-trips';
  private readonly PENDING_BOOKING_KEY = 'hack-a-holiday-pending-booking';

  /**
   * Save a pending booking (when user clicks book button)
   */
  savePendingBooking(bookingData: {
    type: 'flight' | 'package' | 'hotel' | 'vacation';
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    details: any;
  }) {
    const pending = {
      ...bookingData,
      timestamp: new Date().toISOString(),
      tabOpenedAt: Date.now()
    };

    localStorage.setItem(this.PENDING_BOOKING_KEY, JSON.stringify(pending));
    console.log('📝 Saved pending booking:', pending);

    // Set up visibility change listener
    this.setupReturnDetection();
  }

  /**
   * Get pending booking
   */
  getPendingBooking(): any | null {
    const pending = localStorage.getItem(this.PENDING_BOOKING_KEY);
    if (!pending) return null;

    try {
      const data = JSON.parse(pending);
      
      // Check if it's still valid (within 30 minutes)
      const age = Date.now() - data.tabOpenedAt;
      if (age > 30 * 60 * 1000) {
        // Expired, clear it
        this.clearPendingBooking();
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Clear pending booking
   */
  clearPendingBooking() {
    localStorage.removeItem(this.PENDING_BOOKING_KEY);
  }

  /**
   * Confirm booking and save as trip
   */
  confirmBooking(userId: string, bookingData?: any): Trip | null {
    const pending = bookingData || this.getPendingBooking();
    if (!pending) return null;

    const trip: Trip = {
      id: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      origin: pending.origin,
      destination: pending.destination,
      departureDate: pending.departureDate,
      returnDate: pending.returnDate,
      type: pending.type,
      status: 'planned',
      details: pending.details || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to trips list
    const trips = this.getTrips(userId);
    trips.push(trip);
    this.saveTrips(userId, trips);

    // Clear pending
    this.clearPendingBooking();

    console.log('✅ Trip confirmed and saved:', trip);

    // Dispatch event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tripUpdated', { detail: trip }));
    }

    return trip;
  }

  /**
   * Get all trips for a user
   */
  getTrips(userId: string): Trip[] {
    try {
      const key = `${this.TRIPS_KEY}-${userId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save trips for a user
   */
  private saveTrips(userId: string, trips: Trip[]) {
    const key = `${this.TRIPS_KEY}-${userId}`;
    localStorage.setItem(key, JSON.stringify(trips));
  }

  /**
   * Get trip statistics
   */
  getTripStats(userId: string): TripStats {
    const trips = this.getTrips(userId);

    // Count unique countries (based on destination airport/city)
    const countries = new Set<string>();
    let totalSpent = 0;

    trips.forEach(trip => {
      // Extract country from destination (simplified)
      countries.add(trip.destination);
      
      if (trip.details.totalPrice) {
        totalSpent += trip.details.totalPrice;
      }
    });

    return {
      tripsPlanned: trips.length,
      countriesExplored: countries.size,
      totalSpent
    };
  }

  /**
   * Setup detection for when user returns to the app
   */
  private setupReturnDetection() {
    // Use Page Visibility API to detect when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const pending = this.getPendingBooking();
        
        if (pending) {
          // User returned with a pending booking
          // Trigger event for the app to show confirmation modal
          const event = new CustomEvent('bookingTabReturned', { 
            detail: pending 
          });
          window.dispatchEvent(event);
        }
      }
    };

    // Remove old listener if exists
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    // Add new listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Delete a trip
   */
  deleteTrip(userId: string, tripId: string) {
    const trips = this.getTrips(userId);
    const updated = trips.filter(t => t.id !== tripId);
    this.saveTrips(userId, updated);
  }

  /**
   * Update trip status
   */
  updateTripStatus(userId: string, tripId: string, status: Trip['status']) {
    const trips = this.getTrips(userId);
    const trip = trips.find(t => t.id === tripId);
    
    if (trip) {
      trip.status = status;
      trip.updatedAt = new Date().toISOString();
      this.saveTrips(userId, trips);
    }
  }
}

export const tripTrackingService = new TripTrackingService();
