import {
  calculateTotalCost,
  calculateDayCost,
  calculateBudgetBreakdown,
  optimizeBudget,
  calculateEndDate,
  getDaysBetween,
  generateDateRange,
  adjustCostForTravelers,
  calculateConfidenceScore,
  calculateBudgetMatch,
  formatCurrency,
  formatDuration,
  formatDate
} from '../calculations';
import { Itinerary, TripPreferences } from '../../types';

describe('Calculation Utils', () => {
  const mockItinerary: Partial<Itinerary> = {
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
  source: 'mock',
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
  source: 'mock',
      }
    },
    hotels: [{
      id: '1',
      name: 'Test Hotel',
      rating: 4,
      address: '123 Test St',
      city: 'Paris',
      pricePerNight: 150,
      totalPrice: 750, // 5 nights
      amenities: ['wifi', 'breakfast'],
      images: [],
      description: 'Nice hotel',
      checkIn: '2024-06-01',
      checkOut: '2024-06-06',
      roomType: 'Standard'
    }],
    days: [{
      date: '2024-06-01',
      dayNumber: 1,
      activities: [{
        id: '1',
        name: 'Eiffel Tower',
        description: 'Famous tower',
        category: 'sightseeing',
        duration: '2 hours',
        price: 25,
        rating: 4.5,
        address: 'Paris',
        openingHours: '9-23',
        images: [],
        bookingRequired: false
      }],
      meals: [{
        id: '1',
        name: 'Cafe de Flore',
        type: 'lunch',
        cuisine: 'French',
        priceRange: '$$',
        estimatedCost: 35,
        rating: 4.2,
        address: 'Paris',
        description: 'Classic cafe'
      }],
      transportation: [{
        id: '1',
        type: 'public',
        from: 'Hotel',
        to: 'Eiffel Tower',
        duration: '30 min',
        cost: 5,
        description: 'Metro line 6',
        // Remove refundable, currency, source if not in TransportOption type
      }],
      totalCost: 65
    }]
  };

  describe('calculateTotalCost', () => {
    it('should calculate total cost correctly', () => {
      const total = calculateTotalCost(mockItinerary);
      expect(total).toBe(2065); // 600 + 650 + 750 + 65
    });

    it('should handle missing flights', () => {
      const itinerary = { ...mockItinerary };
      delete itinerary.flights;
      
      const total = calculateTotalCost(itinerary);
      expect(total).toBe(815); // 750 + 65
    });

    it('should handle empty itinerary', () => {
      const total = calculateTotalCost({});
      expect(total).toBe(0);
    });
  });

  describe('calculateDayCost', () => {
    it('should calculate day cost correctly', () => {
      const day = mockItinerary.days![0];
      const cost = calculateDayCost(day);
      expect(cost).toBe(65); // 25 + 35 + 5
    });
  });

  describe('calculateBudgetBreakdown', () => {
    it('should break down budget correctly', () => {
      const breakdown = calculateBudgetBreakdown(mockItinerary);
      
      expect(breakdown.flights).toBe(1250); // 600 + 650
      expect(breakdown.accommodation).toBe(750);
      expect(breakdown.activities).toBe(25);
      expect(breakdown.meals).toBe(35);
      expect(breakdown.transportation).toBe(5);
      expect(breakdown.miscellaneous).toBe(0);
    });
  });

  describe('optimizeBudget', () => {
    const preferences: TripPreferences = {
      destination: 'Paris',
      budget: 2000,
      duration: 5,
      interests: ['culture'],
      startDate: '2024-06-01',
      travelers: 2
    };

    it('should not optimize when within budget', () => {
      const result = optimizeBudget(preferences, 1800);
      expect(result.canOptimize).toBe(false);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should provide optimization suggestions when over budget', () => {
      const result = optimizeBudget(preferences, 2500);
      expect(result.canOptimize).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.targetReductions.flights).toBeGreaterThan(0);
    });

    it('should provide different suggestions based on overage amount', () => {
      const smallOverage = optimizeBudget(preferences, 2200);
      const largeOverage = optimizeBudget(preferences, 3000);
      
      expect(smallOverage.suggestions).not.toEqual(largeOverage.suggestions);
    });
  });

  describe('date utilities', () => {
    it('should calculate end date correctly', () => {
      const endDate = calculateEndDate('2024-06-01', 5);
      expect(endDate).toBe('2024-06-06');
    });

    it('should calculate days between dates', () => {
      const days = getDaysBetween('2024-06-01', '2024-06-06');
      expect(days).toBe(5);
    });

    it('should generate date range', () => {
      const dates = generateDateRange('2024-06-01', 3);
      expect(dates).toEqual(['2024-06-01', '2024-06-02', '2024-06-03']);
    });
  });

  describe('adjustCostForTravelers', () => {
    it('should adjust per-person costs', () => {
      const cost = adjustCostForTravelers(100, 3, 'per-person');
      expect(cost).toBe(300);
    });

    it('should adjust per-room costs', () => {
      const cost = adjustCostForTravelers(100, 3, 'per-room');
      expect(cost).toBe(200); // 2 rooms for 3 people
    });

    it('should not adjust per-group costs', () => {
      const cost = adjustCostForTravelers(100, 3, 'per-group');
      expect(cost).toBe(100);
    });
  });

  describe('scoring utilities', () => {
    it('should calculate confidence score', () => {
      const score = calculateConfidenceScore(0.9, 0.8, 0.7);
      expect(score).toBeCloseTo(0.81); // 0.9*0.4 + 0.8*0.3 + 0.7*0.3
    });

    it('should calculate budget match for within budget', () => {
      const match = calculateBudgetMatch(1800, 2000);
      expect(match).toBe(1.0);
    });

    it('should calculate budget match for over budget', () => {
      const match = calculateBudgetMatch(2200, 2000);
      expect(match).toBe(0.9); // 1 - (200/2000)
    });
  });

  describe('formatting utilities', () => {
    it('should format currency', () => {
      const formatted = formatCurrency(1234.56);
      expect(formatted).toBe('$1,234.56');
    });

    it('should format duration in minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(45)).toBe('45m');
      expect(formatDuration(120)).toBe('2h');
    });

    it('should format dates', () => {
      const shortFormat = formatDate('2024-06-01', 'short');
      const longFormat = formatDate('2024-06-01', 'long');
      
      expect(shortFormat).toContain('Jun');
      expect(longFormat).toContain('Saturday');
    });
  });
});