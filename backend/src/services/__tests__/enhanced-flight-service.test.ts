/**
 * Enhanced Flight Service Tests
 * 
 * Comprehensive test suite for the enhanced flight search service.
 * Follows Google/Meta testing standards with high coverage.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

import { EnhancedFlightService } from '../enhanced-flight-service';
import { FlightRecommendationEngine } from '../flight-recommendation-engine';
import {
  FlightSearchRequest,
  FlightSearchPreferences,
  FlightSearchFilters,
  FlightOption
} from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = require('axios');

describe('EnhancedFlightService', () => {
  let flightService: EnhancedFlightService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      amadeusApiKey: 'test-amadeus-key',
      amadeusApiSecret: 'test-amadeus-secret',
      rapidApiKey: 'test-rapidapi-key',
      timeout: 5000,
      retryAttempts: 2,
      cacheEnabled: false
    };

    flightService = new EnhancedFlightService(mockConfig);
    
    // Reset axios mocks
    mockedAxios.create.mockReturnValue(mockedAxios);
    mockedAxios.get.mockClear();
    mockedAxios.post.mockClear();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const service = new EnhancedFlightService();
      expect(service).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const service = new EnhancedFlightService(mockConfig);
      expect(service).toBeDefined();
    });

    it('should set up HTTP client with correct timeout', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: mockConfig.timeout,
        headers: {
          'User-Agent': 'TravelCompanion/1.0.0',
          'Accept': 'application/json'
        }
      });
    });
  });

  describe('Flight Search', () => {
    const mockSearchRequest: FlightSearchRequest = {
      origin: 'JFK',
      destination: 'CDG',
      departureDate: '2024-06-01',
      returnDate: '2024-06-08',
      passengers: {
        adults: 2,
        children: 0,
        infants: 0
      },
      cabinClass: 'economy',
      currency: 'USD'
    };

    it('should validate search request', async () => {
      const invalidRequest = { ...mockSearchRequest, origin: '' };
      
      await expect(flightService.searchFlights(invalidRequest))
        .rejects.toThrow('Origin and destination are required');
    });

    it('should handle successful flight search', async () => {
      // Mock successful API response
      const mockFlights: FlightOption[] = [
        {
          id: 'test-flight-1',
          airline: 'Air France',
          flightNumber: 'AF123',
          departure: {
            airport: 'JFK',
            city: 'New York',
            time: '10:00',
            date: '2024-06-01'
          },
          arrival: {
            airport: 'CDG',
            city: 'Paris',
            time: '22:00',
            date: '2024-06-01'
          },
          duration: '8h 0m',
          durationMinutes: 480,
          price: 650,
          currency: 'USD',
          stops: 0,
          baggage: {
            carry: true,
            checked: 1
          },
          refundable: false,
          changeable: true,
          source: 'mock'
        }
      ];

      // Mock the search method to return mock data
      jest.spyOn(flightService as any, 'searchMultipleProviders')
        .mockResolvedValue([{
          flights: mockFlights,
          source: 'mock',
          searchTime: 1000,
          success: true
        }]);

      const result = await flightService.searchFlights(mockSearchRequest);

      expect(result.success).toBe(true);
      expect(result.flights).toHaveLength(1);
      expect(result.flights[0].airline).toBe('Air France');
      expect(result.totalResults).toBe(1);
      expect(result.searchId).toBeDefined();
      expect(result.searchTime).toBeGreaterThan(0);
    });

    it('should handle API failures gracefully', async () => {
      // Mock API failure
      jest.spyOn(flightService as any, 'searchMultipleProviders')
        .mockRejectedValue(new Error('API Error'));

      const result = await flightService.searchFlights(mockSearchRequest);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.fallbackReason).toContain('Service error');
      expect(result.flights.length).toBeGreaterThan(0); // Should have fallback data
    });

    it('should apply filters correctly', async () => {
      const requestWithFilters: FlightSearchRequest = {
        ...mockSearchRequest,
        filters: {
          maxPrice: 500,
          maxStops: 0,
          directFlightsOnly: true
        }
      };

      const mockFlights: FlightOption[] = [
        {
          id: 'flight-1',
          airline: 'Air France',
          flightNumber: 'AF123',
          departure: { airport: 'JFK', city: 'New York', time: '10:00', date: '2024-06-01' },
          arrival: { airport: 'CDG', city: 'Paris', time: '22:00', date: '2024-06-01' },
          duration: '8h 0m',
          durationMinutes: 480,
          price: 400,
          currency: 'USD',
          stops: 0,
          baggage: { carry: true, checked: 1 },
          refundable: false,
          changeable: true,
          source: 'mock'
        },
        {
          id: 'flight-2',
          airline: 'Delta',
          flightNumber: 'DL456',
          departure: { airport: 'JFK', city: 'New York', time: '12:00', date: '2024-06-01' },
          arrival: { airport: 'CDG', city: 'Paris', time: '01:00', date: '2024-06-02' },
          duration: '9h 0m',
          durationMinutes: 540,
          price: 600,
          currency: 'USD',
          stops: 1,
          baggage: { carry: true, checked: 1 },
          refundable: false,
          changeable: true,
          source: 'mock'
        }
      ];

      jest.spyOn(flightService as any, 'searchMultipleProviders')
        .mockResolvedValue([{
          flights: mockFlights,
          source: 'mock',
          searchTime: 1000,
          success: true
        }]);

      const result = await flightService.searchFlights(requestWithFilters);

      // Should filter out flight-2 due to price and stops
      expect(result.flights).toHaveLength(1);
      expect(result.flights[0].id).toBe('flight-1');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should search flights from trip preferences', async () => {
      const preferences = {
        destination: 'Paris, France',
        budget: 2000,
        duration: 7,
        interests: ['culture'],
        startDate: '2024-06-01',
        travelers: 2,
        travelStyle: 'mid-range' as const
      };

      jest.spyOn(flightService as any, 'searchMultipleProviders')
        .mockResolvedValue([{
          flights: [],
          source: 'mock',
          searchTime: 1000,
          success: true
        }]);

      const result = await flightService.searchFlightsFromPreferences(preferences, 'JFK');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Flight Details', () => {
    it('should get flight details successfully', async () => {
      const mockFlightDetails: FlightOption = {
        id: 'test-flight-1',
        airline: 'Air France',
        flightNumber: 'AF123',
        departure: {
          airport: 'JFK',
          city: 'New York',
          time: '10:00',
          date: '2024-06-01'
        },
        arrival: {
          airport: 'CDG',
          city: 'Paris',
          time: '22:00',
          date: '2024-06-01'
        },
        duration: '8h 0m',
        durationMinutes: 480,
        price: 650,
        currency: 'USD',
        stops: 0,
        baggage: {
          carry: true,
          checked: 1
        },
        refundable: false,
        changeable: true,
        source: 'amadeus'
      };

      jest.spyOn(flightService as any, 'getAmadeusFlightDetails')
        .mockResolvedValue(mockFlightDetails);

      const result = await flightService.getFlightDetails('test-flight-1');

      expect(result).toEqual(mockFlightDetails);
    });

    it('should return null when flight details not found', async () => {
      jest.spyOn(flightService as any, 'getAmadeusFlightDetails')
        .mockResolvedValue(null);

      const result = await flightService.getFlightDetails('non-existent-flight');

      expect(result).toBeNull();
    });
  });

  describe('Search Metrics', () => {
    it('should generate search metrics', () => {
      const request: FlightSearchRequest = {
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2024-06-01',
        passengers: { adults: 2 }
      };

      const metrics = flightService.getSearchMetrics('test-search-id', request);

      expect(metrics.searchId).toBe('test-search-id');
      expect(metrics.origin).toBe('JFK');
      expect(metrics.destination).toBe('CDG');
      expect(metrics.apiUsed).toBe('multiple');
    });
  });

  describe('Utility Methods', () => {
    it('should calculate base price correctly', () => {
      const price = (flightService as any).calculateBasePrice('Paris');
      expect(price).toBe(650);
    });

    it('should get destination airport code', () => {
      const airport = (flightService as any).getDestinationAirport('Paris, France');
      expect(airport).toBe('CDG');
    });

    it('should format duration correctly', () => {
      const duration = (flightService as any).formatDuration(150);
      expect(duration).toBe('2h 30m');
    });

    it('should parse duration to minutes', () => {
      const minutes = (flightService as any).parseDurationToMinutes('2h 30m');
      expect(minutes).toBe(150);
    });
  });
});

describe('FlightRecommendationEngine', () => {
  let engine: FlightRecommendationEngine;

  beforeEach(() => {
    engine = new FlightRecommendationEngine();
  });

  describe('Score Calculation', () => {
    const mockFlight: FlightOption = {
      id: 'test-flight',
      airline: 'Air France',
      flightNumber: 'AF123',
      departure: {
        airport: 'JFK',
        city: 'New York',
        time: '10:00',
        date: '2024-06-01'
      },
      arrival: {
        airport: 'CDG',
        city: 'Paris',
        time: '22:00',
        date: '2024-06-01'
      },
      duration: '8h 0m',
      durationMinutes: 480,
      price: 650,
      currency: 'USD',
      stops: 0,
      baggage: {
        carry: true,
        checked: 1
      },
      refundable: true,
      changeable: true,
      source: 'mock'
    };

    const mockPreferences: FlightSearchPreferences = {
      prioritizePrice: true,
      prioritizeConvenience: false,
      prioritizeDuration: false,
      prioritizeDirectFlights: false,
      userTravelStyle: 'mid-range',
      flexibility: 'moderate'
    };

    it('should calculate score between 0 and 1', () => {
      const score = engine.calculateScore(mockFlight, mockPreferences, {});
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should give higher scores to budget-friendly flights for budget travelers', () => {
      const budgetPreferences = { ...mockPreferences, userTravelStyle: 'budget' as const };
      const expensiveFlight = { ...mockFlight, price: 1000 };
      const cheapFlight = { ...mockFlight, price: 300 };

      const expensiveScore = engine.calculateScore(expensiveFlight, budgetPreferences, {});
      const cheapScore = engine.calculateScore(cheapFlight, budgetPreferences, {});

      expect(cheapScore).toBeGreaterThan(expensiveScore);
    });

    it('should give higher scores to direct flights when prioritized', () => {
      const directFlightPreferences = { ...mockPreferences, prioritizeDirectFlights: true };
      const directFlight = { ...mockFlight, stops: 0 };
      const connectingFlight = { ...mockFlight, stops: 1 };

      const directScore = engine.calculateScore(directFlight, directFlightPreferences, {});
      const connectingScore = engine.calculateScore(connectingFlight, directFlightPreferences, {});

      expect(directScore).toBeGreaterThan(connectingScore);
    });
  });

  describe('Filtering', () => {
    const mockFlights: FlightOption[] = [
      {
        id: 'flight-1',
        airline: 'Air France',
        flightNumber: 'AF123',
        departure: { airport: 'JFK', city: 'New York', time: '10:00', date: '2024-06-01' },
        arrival: { airport: 'CDG', city: 'Paris', time: '22:00', date: '2024-06-01' },
        duration: '8h 0m',
        durationMinutes: 480,
        price: 400,
        currency: 'USD',
        stops: 0,
        baggage: { carry: true, checked: 1 },
        refundable: true,
        changeable: true,
        source: 'mock'
      },
      {
        id: 'flight-2',
        airline: 'Delta',
        flightNumber: 'DL456',
        departure: { airport: 'JFK', city: 'New York', time: '12:00', date: '2024-06-01' },
        arrival: { airport: 'CDG', city: 'Paris', time: '01:00', date: '2024-06-02' },
        duration: '9h 0m',
        durationMinutes: 540,
        price: 600,
        currency: 'USD',
        stops: 1,
        baggage: { carry: true, checked: 1 },
        refundable: false,
        changeable: false,
        source: 'mock'
      }
    ];

    it('should filter by max price', () => {
      const filters: FlightSearchFilters = { maxPrice: 500 };
      const filtered = engine.applyFilters(mockFlights, filters);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('flight-1');
    });

    it('should filter by max stops', () => {
      const filters: FlightSearchFilters = { maxStops: 0 };
      const filtered = engine.applyFilters(mockFlights, filters);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('flight-1');
    });

    it('should filter by refundable flights', () => {
      const filters: FlightSearchFilters = { refundable: true };
      const filtered = engine.applyFilters(mockFlights, filters);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('flight-1');
    });
  });

  describe('Sorting', () => {
    const mockFlights: FlightOption[] = [
      {
        id: 'flight-1',
        airline: 'Air France',
        flightNumber: 'AF123',
        departure: { airport: 'JFK', city: 'New York', time: '10:00', date: '2024-06-01' },
        arrival: { airport: 'CDG', city: 'Paris', time: '22:00', date: '2024-06-01' },
        duration: '8h 0m',
        durationMinutes: 480,
        price: 600,
        currency: 'USD',
        stops: 0,
        baggage: { carry: true, checked: 1 },
        refundable: true,
        changeable: true,
        source: 'mock'
      },
      {
        id: 'flight-2',
        airline: 'Delta',
        flightNumber: 'DL456',
        departure: { airport: 'JFK', city: 'New York', time: '12:00', date: '2024-06-01' },
        arrival: { airport: 'CDG', city: 'Paris', time: '01:00', date: '2024-06-02' },
        duration: '9h 0m',
        durationMinutes: 540,
        price: 400,
        currency: 'USD',
        stops: 1,
        baggage: { carry: true, checked: 1 },
        refundable: false,
        changeable: false,
        source: 'mock'
      }
    ];

    it('should sort by price ascending', () => {
      const sorted = engine.sortFlights(mockFlights, 'price-asc');
      expect(sorted[0].price).toBe(400);
      expect(sorted[1].price).toBe(600);
    });

    it('should sort by price descending', () => {
      const sorted = engine.sortFlights(mockFlights, 'price-desc');
      expect(sorted[0].price).toBe(600);
      expect(sorted[1].price).toBe(400);
    });

    it('should sort by duration ascending', () => {
      const sorted = engine.sortFlights(mockFlights, 'duration-asc');
      expect(sorted[0].durationMinutes).toBe(480);
      expect(sorted[1].durationMinutes).toBe(540);
    });
  });

  describe('Recommendations', () => {
    const mockFlights: FlightOption[] = [
      {
        id: 'flight-1',
        airline: 'Air France',
        flightNumber: 'AF123',
        departure: { airport: 'JFK', city: 'New York', time: '10:00', date: '2024-06-01' },
        arrival: { airport: 'CDG', city: 'Paris', time: '22:00', date: '2024-06-01' },
        duration: '8h 0m',
        durationMinutes: 480,
        price: 600,
        currency: 'USD',
        stops: 0,
        baggage: { carry: true, checked: 1 },
        refundable: true,
        changeable: true,
        source: 'mock'
      },
      {
        id: 'flight-2',
        airline: 'Delta',
        flightNumber: 'DL456',
        departure: { airport: 'JFK', city: 'New York', time: '12:00', date: '2024-06-01' },
        arrival: { airport: 'CDG', city: 'Paris', time: '01:00', date: '2024-06-02' },
        duration: '9h 0m',
        durationMinutes: 540,
        price: 400,
        currency: 'USD',
        stops: 1,
        baggage: { carry: true, checked: 1 },
        refundable: false,
        changeable: false,
        source: 'mock'
      }
    ];

    const mockPreferences: FlightSearchPreferences = {
      prioritizePrice: true,
      prioritizeConvenience: false,
      prioritizeDuration: false,
      prioritizeDirectFlights: false,
      userTravelStyle: 'mid-range',
      flexibility: 'moderate'
    };

    it('should generate recommendations', () => {
      const recommendations = engine.getRecommendations(mockFlights, mockPreferences);

      expect(recommendations.bestPrice).toBeDefined();
      expect(recommendations.fastest).toBeDefined();
      expect(recommendations.topRated).toBeDefined();
      expect(recommendations.personalized).toBeDefined();
    });

    it('should identify best price flight', () => {
      const recommendations = engine.getRecommendations(mockFlights, mockPreferences);
      expect(recommendations.bestPrice?.price).toBe(400);
    });

    it('should identify fastest flight', () => {
      const recommendations = engine.getRecommendations(mockFlights, mockPreferences);
      expect(recommendations.fastest?.durationMinutes).toBe(480);
    });
  });
});
