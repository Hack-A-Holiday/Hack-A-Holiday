/**
 * Enhanced Flight Search Service
 * 
 * Enterprise-grade flight search service with advanced filtering, sorting,
 * and recommendation capabilities. Follows Google/Meta engineering standards.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  FlightOption,
  FlightSearchRequest,
  FlightSearchResponse,
  FlightSearchFilters,
  FlightSearchPreferences,
  FlightSearchMetrics,
  TripPreferences
} from '../types';
import { FlightRecommendationEngine } from './flight-recommendation-engine';

/**
 * Configuration for the enhanced flight service
 */
export interface EnhancedFlightServiceConfig {
  amadeusApiKey?: string;
  amadeusApiSecret?: string;
  rapidApiKey?: string;
  skyscannerApiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  cacheTimeout?: number;
}

/**
 * API Provider configuration
 */
interface ApiProvider {
  name: string;
  priority: number;
  enabled: boolean;
  config: any;
}

/**
 * Search result with metadata
 */
interface SearchResult {
  flights: FlightOption[];
  source: string;
  searchTime: number;
  success: boolean;
  error?: string;
}

/**
 * Enhanced Flight Search Service
 * 
 * Provides comprehensive flight search with multiple API providers,
 * advanced filtering, intelligent recommendations, and robust fallback logic.
 */
export class EnhancedFlightService {
  private readonly config: EnhancedFlightServiceConfig;
  private readonly recommendationEngine: FlightRecommendationEngine;
  private readonly httpClient: AxiosInstance;
  private readonly providers: ApiProvider[];
  private amadeusToken: string | null = null;
  private tokenExpiry: number = 0;
  private searchCache: Map<string, { data: FlightOption[]; timestamp: number }> = new Map();

  constructor(config: EnhancedFlightServiceConfig = {}) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      cacheEnabled: true,
      cacheTimeout: 300000, // 5 minutes
      ...config
    };

    this.recommendationEngine = new FlightRecommendationEngine();
    this.httpClient = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'TravelCompanion/1.0.0',
        'Accept': 'application/json'
      }
    });

    this.providers = this.initializeProviders();
  }

  /**
   * Main flight search method with comprehensive functionality
   */
  async searchFlights(request: FlightSearchRequest): Promise<FlightSearchResponse> {
    const searchId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Validate request
      this.validateSearchRequest(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (this.config.cacheEnabled) {
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          return this.buildSearchResponse(cachedResult, request, searchId, startTime);
        }
      }

      // Search across multiple providers
      const searchResults = await this.searchMultipleProviders(request);
      
      // Combine and deduplicate results
      const allFlights = this.combineAndDeduplicateResults(searchResults);
      
      // Apply filters
      const filteredFlights = this.recommendationEngine.applyFilters(
        allFlights, 
        request.filters || {}
      );

      // Calculate recommendation scores
      const scoredFlights = this.calculateRecommendationScores(
        filteredFlights, 
        request.preferences || this.getDefaultPreferences()
      );

      // Get recommendations
      const recommendations = this.recommendationEngine.getRecommendations(
        scoredFlights,
        request.preferences || this.getDefaultPreferences()
      );

      // Cache results
      if (this.config.cacheEnabled && scoredFlights.length > 0) {
        this.cacheResult(cacheKey, scoredFlights);
      }

      const searchTime = Date.now() - startTime;
      
      return {
        success: true,
        flights: scoredFlights,
        totalResults: scoredFlights.length,
        searchId,
        searchTime,
        filters: request.filters || {},
        recommendations,
        fallbackUsed: searchResults.some(r => r.source === 'mock'),
        fallbackReason: searchResults.some(r => r.source === 'mock') ? 'API providers unavailable' : undefined
      };

    } catch (error) {
      console.error('Flight search error:', error);
      
      // Fallback to mock data
      const fallbackFlights = await this.generateFallbackFlights(request);
      
      return {
        success: false,
        flights: fallbackFlights,
        totalResults: fallbackFlights.length,
        searchId,
        searchTime: Date.now() - startTime,
        filters: request.filters || {},
        recommendations: this.recommendationEngine.getRecommendations(
          fallbackFlights,
          request.preferences || this.getDefaultPreferences()
        ),
        fallbackUsed: true,
        fallbackReason: 'Service error - using fallback data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search flights using trip preferences (legacy compatibility)
   */
  async searchFlightsFromPreferences(
    preferences: TripPreferences, 
    originAirport?: string
  ): Promise<FlightOption[]> {
    const request: FlightSearchRequest = {
      origin: originAirport || this.guessOriginAirport(),
      destination: this.getDestinationAirport(preferences.destination),
      departureDate: preferences.startDate,
      returnDate: this.calculateReturnDate(preferences.startDate, preferences.duration),
      passengers: {
        adults: preferences.travelers,
        children: 0,
        infants: 0
      },
      cabinClass: this.mapTravelStyleToCabinClass(preferences.travelStyle),
      currency: 'USD',
      preferences: this.mapPreferencesToSearchPreferences(preferences)
    };

    const response = await this.searchFlights(request);
    return response.flights;
  }

  /**
   * Get flight details by ID
   */
  async getFlightDetails(flightId: string): Promise<FlightOption | null> {
    try {
      // Try to get from Amadeus first
      if (this.config.amadeusApiKey && this.config.amadeusApiSecret) {
        return await this.getAmadeusFlightDetails(flightId);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting flight details:', error);
      return null;
    }
  }

  /**
   * Get search metrics for analytics
   */
  getSearchMetrics(searchId: string, request: FlightSearchRequest): FlightSearchMetrics {
    return {
      searchId,
      timestamp: new Date().toISOString(),
      origin: request.origin,
      destination: request.destination,
      resultsCount: 0, // Will be updated by caller
      searchDuration: 0, // Will be updated by caller
      apiUsed: 'multiple',
      fallbackUsed: false
    };
  }

  // Private methods

  private initializeProviders(): ApiProvider[] {
    const providers: ApiProvider[] = [];

    if (this.config.amadeusApiKey && this.config.amadeusApiSecret) {
      providers.push({
        name: 'amadeus',
        priority: 1,
        enabled: true,
        config: {
          apiKey: this.config.amadeusApiKey,
          apiSecret: this.config.amadeusApiSecret
        }
      });
    }

    if (this.config.rapidApiKey) {
      providers.push({
        name: 'rapidapi',
        priority: 2,
        enabled: true,
        config: {
          apiKey: this.config.rapidApiKey
        }
      });
    }

    if (this.config.skyscannerApiKey) {
      providers.push({
        name: 'skyscanner',
        priority: 3,
        enabled: true,
        config: {
          apiKey: this.config.skyscannerApiKey
        }
      });
    }

    // Always add mock provider as fallback
    providers.push({
      name: 'mock',
      priority: 999,
      enabled: true,
      config: {}
    });

    return providers.sort((a, b) => a.priority - b.priority);
  }

  private async searchMultipleProviders(request: FlightSearchRequest): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const enabledProviders = this.providers.filter(p => p.enabled);

    // Search providers in parallel with timeout
    const searchPromises = enabledProviders.map(async (provider) => {
      try {
        const startTime = Date.now();
        const flights = await this.searchWithProvider(provider, request);
        const searchTime = Date.now() - startTime;

        return {
          flights,
          source: provider.name,
          searchTime,
          success: true
        };
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        return {
          flights: [],
          source: provider.name,
          searchTime: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const searchResults = await Promise.allSettled(searchPromises);
    
    searchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    return results;
  }

  private async searchWithProvider(provider: ApiProvider, request: FlightSearchRequest): Promise<FlightOption[]> {
    switch (provider.name) {
      case 'amadeus':
        return await this.searchAmadeusFlights(request);
      case 'rapidapi':
        return await this.searchRapidApiFlights(request);
      case 'skyscanner':
        return await this.searchSkyscannerFlights(request);
      case 'mock':
        return await this.generateMockFlights(request);
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  private async searchAmadeusFlights(request: FlightSearchRequest): Promise<FlightOption[]> {
    await this.ensureAmadeusToken();
    
    const searchParams = {
      originLocationCode: request.origin,
      destinationLocationCode: request.destination,
      departureDate: request.departureDate,
      returnDate: request.returnDate,
      adults: request.passengers.adults,
      children: request.passengers.children || 0,
      infants: request.passengers.infants || 0,
      currencyCode: request.currency || 'USD',
      max: 50
    };

    const response = await this.httpClient.get(
      'https://test.api.amadeus.com/v2/shopping/flight-offers',
      {
        headers: {
          'Authorization': `Bearer ${this.amadeusToken}`,
          'Content-Type': 'application/json'
        },
        params: searchParams
      }
    );

    return this.parseAmadeusFlights(response.data);
  }

  private async searchRapidApiFlights(request: FlightSearchRequest): Promise<FlightOption[]> {
    // Try multiple RapidAPI flight endpoints
    const endpoints = [
      {
        url: this.buildKiwiApiUrl(request),
        host: 'kiwi-com-cheap-flights.p.rapidapi.com',
        name: 'kiwi'
      },
      {
        url: `https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/US/USD/en-US/${request.origin}/${request.destination}/${request.departureDate}`,
        host: 'skyscanner-skyscanner-flight-search-v1.p.rapidapi.com',
        name: 'skyscanner'
      },
      {
        url: `https://amadeus-flight-search.p.rapidapi.com/v2/shopping/flight-offers?originLocationCode=${request.origin}&destinationLocationCode=${request.destination}&departureDate=${request.departureDate}&adults=${request.passengers.adults}`,
        host: 'amadeus-flight-search.p.rapidapi.com',
        name: 'amadeus'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.httpClient.get(endpoint.url, {
          headers: {
            'X-RapidAPI-Key': this.config.rapidApiKey!,
            'X-RapidAPI-Host': endpoint.host
          },
          timeout: 10000
        });

        if (endpoint.name === 'kiwi') {
          return this.parseKiwiFlights(response.data, request);
        } else {
          return this.parseRapidApiFlights(response.data, request);
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint.host}:`, error);
        continue; // Try next endpoint
      }
    }

    // If all endpoints fail, return empty array
    console.warn('All RapidAPI flight endpoints failed');
    return [];
  }

  private buildKiwiApiUrl(request: FlightSearchRequest): string {
    const baseUrl = 'https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip';
    const params = new URLSearchParams({
      source: `City:${request.origin}`,
      destination: `City:${request.destination}`,
      currency: request.currency || 'USD',
      locale: 'en',
      adults: request.passengers.adults.toString(),
      children: (request.passengers.children || 0).toString(),
      infants: (request.passengers.infants || 0).toString(),
      handbags: '1', // Carry-on bags
      holdbags: (request.filters?.checkedBags || 0).toString(),
      cabinClass: request.cabinClass || 'ECONOMY',
      sortBy: 'QUALITY',
      sortOrder: 'ASCENDING',
      applyMixedClasses: 'true',
      allowReturnFromDifferentCity: 'true',
      allowChangeInboundDestination: 'true',
      allowChangeInboundSource: 'true',
      allowDifferentStationConnection: 'true',
      enableSelfTransfer: 'true',
      allowOvernightStopover: 'true',
      enableTrueHiddenCity: 'true',
      enableThrowAwayTicketing: 'true',
      outbound: 'SUNDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,MONDAY,TUESDAY',
      transportTypes: 'FLIGHT',
      contentProviders: 'FLIXBUS_DIRECTS,FRESH,KAYAK,KIWI',
      limit: '20'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private async searchSkyscannerFlights(_request: FlightSearchRequest): Promise<FlightOption[]> {
    // Skyscanner API implementation would go here
    // For now, return empty array as placeholder
    return [];
  }

  private async generateMockFlights(request: FlightSearchRequest): Promise<FlightOption[]> {
    const basePrice = this.calculateBasePrice(request.destination);
    const flights: FlightOption[] = [];

    const airlines = [
      { code: 'AA', name: 'American Airlines' },
      { code: 'DL', name: 'Delta Air Lines' },
      { code: 'UA', name: 'United Airlines' },
      { code: 'BA', name: 'British Airways' },
      { code: 'LH', name: 'Lufthansa' },
      { code: 'AF', name: 'Air France' }
    ];

    // Generate outbound flights
    airlines.forEach((airline, index) => {
      const priceVariation = 1 + (Math.random() - 0.5) * 0.4;
      const price = Math.round(basePrice * priceVariation);
      
      const departureHour = 8 + (index * 2) % 16;
      const flightDuration = this.calculateFlightDuration(request.origin, request.destination);
      const arrivalHour = (departureHour + Math.floor(flightDuration / 60)) % 24;

      flights.push({
        id: `mock-outbound-${index}`,
        airline: airline.name,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
        departure: {
          airport: request.origin,
          city: this.getAirportCity(request.origin),
          time: `${departureHour.toString().padStart(2, '0')}:${(Math.random() * 60).toFixed(0).padStart(2, '0')}`,
          date: request.departureDate
        },
        arrival: {
          airport: request.destination,
          city: this.getAirportCity(request.destination),
          time: `${arrivalHour.toString().padStart(2, '0')}:${(Math.random() * 60).toFixed(0).padStart(2, '0')}`,
          date: request.departureDate
        },
        duration: this.formatDuration(flightDuration),
        durationMinutes: flightDuration,
        price: price,
        currency: request.currency || 'USD',
        stops: Math.random() > 0.7 ? 1 : 0,
        baggage: {
          carry: true,
          checked: 1,
          weightLimit: '23kg'
        },
        aircraft: 'Boeing 737',
        cabinClass: request.cabinClass || 'economy',
        refundable: Math.random() > 0.5,
        changeable: Math.random() > 0.3,
        source: 'mock',
        metadata: {
          lastUpdated: new Date().toISOString(),
          availability: Math.floor(Math.random() * 9) + 1
        }
      });
    });

    return flights.sort((a, b) => a.price - b.price);
  }

  private async generateFallbackFlights(request: FlightSearchRequest): Promise<FlightOption[]> {
    console.warn('Using fallback flight data due to service error');
    return await this.generateMockFlights(request);
  }

  private combineAndDeduplicateResults(results: SearchResult[]): FlightOption[] {
    const flightMap = new Map<string, FlightOption>();
    
    results.forEach(result => {
      result.flights.forEach(flight => {
        // Use flight number + date as unique key
        const key = `${flight.flightNumber}-${flight.departure.date}`;
        
        if (!flightMap.has(key) || this.isBetterFlight(flight, flightMap.get(key)!)) {
          flightMap.set(key, flight);
        }
      });
    });

    return Array.from(flightMap.values());
  }

  private isBetterFlight(flight1: FlightOption, flight2: FlightOption): boolean {
    // Prefer flights with more metadata, better pricing, or from higher priority sources
    const sourcePriority = { amadeus: 1, rapidapi: 2, skyscanner: 3, mock: 4 };
    const priority1 = sourcePriority[flight1.source] || 5;
    const priority2 = sourcePriority[flight2.source] || 5;
    
    if (priority1 !== priority2) {
      return priority1 < priority2;
    }
    
    // If same source, prefer lower price
    return flight1.price < flight2.price;
  }

  private calculateRecommendationScores(
    flights: FlightOption[],
    preferences: FlightSearchPreferences
  ): FlightOption[] {
    return flights.map(flight => ({
      ...flight,
      score: this.recommendationEngine.calculateScore(flight, preferences, {})
    }));
  }

  private buildSearchResponse(
    flights: FlightOption[],
    request: FlightSearchRequest,
    searchId: string,
    startTime: number
  ): FlightSearchResponse {
    const searchTime = Date.now() - startTime;
    const recommendations = this.recommendationEngine.getRecommendations(
      flights,
      request.preferences || this.getDefaultPreferences()
    );

    return {
      success: true,
      flights,
      totalResults: flights.length,
      searchId,
      searchTime,
      filters: request.filters || {},
      recommendations
    };
  }

  // Cache management
  private generateCacheKey(request: FlightSearchRequest): string {
    const keyData = {
      origin: request.origin,
      destination: request.destination,
      departureDate: request.departureDate,
      returnDate: request.returnDate,
      passengers: request.passengers,
      cabinClass: request.cabinClass,
      currency: request.currency
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private getCachedResult(key: string): FlightOption[] | null {
    const cached = this.searchCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.config.cacheTimeout!) {
      this.searchCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private cacheResult(key: string, flights: FlightOption[]): void {
    this.searchCache.set(key, {
      data: flights,
      timestamp: Date.now()
    });
  }

  // Validation and utility methods
  private validateSearchRequest(request: FlightSearchRequest): void {
    if (!request.origin || !request.destination) {
      throw new Error('Origin and destination are required');
    }
    
    if (!request.departureDate) {
      throw new Error('Departure date is required');
    }
    
    if (!request.passengers || request.passengers.adults < 1) {
      throw new Error('At least one adult passenger is required');
    }
  }

  private getDefaultPreferences(): FlightSearchPreferences {
    return {
      prioritizePrice: true,
      prioritizeConvenience: false,
      prioritizeDuration: false,
      prioritizeDirectFlights: false,
      userTravelStyle: 'mid-range',
      flexibility: 'moderate'
    };
  }

  private mapTravelStyleToCabinClass(style?: string): 'economy' | 'premium-economy' | 'business' | 'first' {
    switch (style) {
      case 'luxury': return 'business';
      case 'budget': return 'economy';
      default: return 'economy';
    }
  }

  private mapPreferencesToSearchPreferences(preferences: TripPreferences): FlightSearchPreferences {
    return {
      prioritizePrice: preferences.travelStyle === 'budget',
      prioritizeConvenience: preferences.travelStyle === 'luxury',
      prioritizeDuration: true,
      prioritizeDirectFlights: false,
      userTravelStyle: preferences.travelStyle || 'mid-range',
      flexibility: 'moderate'
    };
  }

  // Legacy methods for backward compatibility
  private async ensureAmadeusToken(): Promise<void> {
    if (this.amadeusToken && Date.now() < this.tokenExpiry) {
      return;
    }

    const response = await this.httpClient.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.amadeusApiKey!,
        client_secret: this.config.amadeusApiSecret!
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    this.amadeusToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
  }

  private parseAmadeusFlights(data: any): FlightOption[] {
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((offer: any, index: number) => {
      const outbound = offer.itineraries[0];
      const segments = outbound.segments;
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];

      return {
        id: `amadeus-${offer.id || index}`,
        airline: this.getAirlineName(firstSegment.carrierCode),
        flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
        departure: {
          airport: firstSegment.departure.iataCode,
          city: this.getAirportCity(firstSegment.departure.iataCode),
          time: this.formatTime(firstSegment.departure.at),
          date: this.formatDate(firstSegment.departure.at)
        },
        arrival: {
          airport: lastSegment.arrival.iataCode,
          city: this.getAirportCity(lastSegment.arrival.iataCode),
          time: this.formatTime(lastSegment.arrival.at),
          date: this.formatDate(lastSegment.arrival.at)
        },
        duration: outbound.duration,
        durationMinutes: this.parseDurationToMinutes(outbound.duration),
        price: parseFloat(offer.price.total),
        currency: offer.price.currency || 'USD',
        stops: segments.length - 1,
        baggage: {
          carry: true,
          checked: 1
        },
        refundable: false,
        changeable: false,
        source: 'amadeus',
        metadata: {
          lastUpdated: new Date().toISOString(),
          availability: 9
        }
      };
    });
  }

  private parseKiwiFlights(data: any, request: FlightSearchRequest): FlightOption[] {
    if (!data || !data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((flight: any, index: number) => {
      const outbound = flight.outbound;
      const inbound = flight.inbound;
      
      return {
        id: `kiwi-${flight.id || index}`,
        airline: outbound.airlines?.[0] || 'Unknown Airline',
        flightNumber: `${outbound.airlines?.[0]?.substring(0, 2).toUpperCase() || 'XX'}${outbound.flight_number || Math.floor(Math.random() * 9000) + 1000}`,
        departure: {
          airport: outbound.flyFrom,
          city: outbound.cityFrom,
          time: this.formatTime(outbound.dTimeUTC),
          date: this.formatDate(outbound.dTimeUTC)
        },
        arrival: {
          airport: outbound.flyTo,
          city: outbound.cityTo,
          time: this.formatTime(outbound.aTimeUTC),
          date: this.formatDate(outbound.aTimeUTC)
        },
        duration: this.formatDuration(outbound.fly_duration),
        durationMinutes: this.parseDurationToMinutes(outbound.fly_duration),
        price: flight.price,
        currency: flight.currency || 'USD',
        stops: outbound.route?.length - 1 || 0,
        baggage: {
          carry: true,
          checked: request.filters?.checkedBags || 0,
          checkedBagCost: 50,
          maxCheckedBags: 3
        },
        refundable: flight.refundable || false,
        changeable: flight.changeable || false,
        source: 'kiwi',
        metadata: {
          lastUpdated: new Date().toISOString(),
          availability: flight.availability || 9,
          priceHistory: flight.price_history || []
        }
      };
    });
  }

  private parseRapidApiFlights(data: any, request: FlightSearchRequest): FlightOption[] {
    if (!data.Quotes || !Array.isArray(data.Quotes)) {
      return [];
    }

    return data.Quotes.map((quote: any, index: number) => {
      const outbound = quote.OutboundLeg;
      const carriers = data.Carriers || [];
      const places = data.Places || [];
      
      const carrier = carriers.find((c: any) => c.CarrierId === outbound.CarrierIds[0]);
      const origin = places.find((p: any) => p.PlaceId === outbound.OriginId);
      const destination = places.find((p: any) => p.PlaceId === outbound.DestinationId);

      return {
        id: `rapidapi-${index}`,
        airline: carrier?.Name || 'Unknown Airline',
        flightNumber: `${carrier?.Name?.substring(0, 2).toUpperCase() || 'XX'}${Math.floor(Math.random() * 9000) + 1000}`,
        departure: {
          airport: origin?.IataCode || 'XXX',
          city: origin?.CityName || 'Unknown',
          time: '10:00',
          date: request.departureDate
        },
        arrival: {
          airport: destination?.IataCode || 'XXX',
          city: destination?.CityName || request.destination,
          time: '14:00',
          date: request.departureDate
        },
        duration: '4h 0m',
        durationMinutes: 240,
        price: quote.MinPrice,
        currency: request.currency || 'USD',
        stops: 0,
        baggage: {
          carry: true,
          checked: 1
        },
        refundable: false,
        changeable: false,
        source: 'rapidapi',
        metadata: {
          lastUpdated: new Date().toISOString(),
          availability: 5
        }
      };
    });
  }

  private async getAmadeusFlightDetails(flightId: string): Promise<FlightOption | null> {
    await this.ensureAmadeusToken();
    
    try {
      const response = await this.httpClient.get(
        `https://test.api.amadeus.com/v1/shopping/flight-offers/${flightId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.amadeusToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const flights = this.parseAmadeusFlights({ data: [response.data] });
      return flights[0] || null;
    } catch (error) {
      console.error('Error getting Amadeus flight details:', error);
      return null;
    }
  }

  // Utility methods
  private guessOriginAirport(): string {
    const commonOrigins = ['JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'SFO', 'BOS', 'SEA'];
    return commonOrigins[Math.floor(Math.random() * commonOrigins.length)];
  }

  private getDestinationAirport(destination: string): string {
    const airportMap: Record<string, string> = {
      'Paris': 'CDG', 'London': 'LHR', 'Tokyo': 'NRT', 'New York': 'JFK',
      'Los Angeles': 'LAX', 'Rome': 'FCO', 'Barcelona': 'BCN', 'Amsterdam': 'AMS',
      'Berlin': 'BER', 'Madrid': 'MAD', 'Dubai': 'DXB', 'Singapore': 'SIN',
      'Hong Kong': 'HKG', 'Sydney': 'SYD', 'Toronto': 'YYZ'
    };

    for (const [city, airport] of Object.entries(airportMap)) {
      if (destination.toLowerCase().includes(city.toLowerCase())) {
        return airport;
      }
    }

    return 'XXX';
  }

  private calculateBasePrice(destination: string): number {
    const priceMap: Record<string, number> = {
      'Paris': 650, 'London': 600, 'Tokyo': 1200, 'Rome': 700,
      'Barcelona': 550, 'Amsterdam': 580, 'Berlin': 520, 'Madrid': 530,
      'Dubai': 900, 'Singapore': 1100, 'Hong Kong': 1000, 'Sydney': 1400, 'Toronto': 400
    };

    for (const [city, price] of Object.entries(priceMap)) {
      if (destination.toLowerCase().includes(city.toLowerCase())) {
        return price;
      }
    }

    return 600;
  }

  private calculateFlightDuration(origin: string, destination: string): number {
    const durationMap: Record<string, number> = {
      'JFK-CDG': 450, 'CDG-JFK': 480, 'LAX-NRT': 660, 'NRT-LAX': 600,
      'JFK-LHR': 420, 'LHR-JFK': 450, 'JFK-FCO': 480, 'FCO-JFK': 510
    };

    const key = `${origin}-${destination}`;
    return durationMap[key] || 360;
  }

  private calculateReturnDate(startDate: string, duration: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + duration);
    return date.toISOString().split('T')[0];
  }

  private getAirlineName(code: string): string {
    const airlineMap: Record<string, string> = {
      'AA': 'American Airlines', 'DL': 'Delta Air Lines', 'UA': 'United Airlines',
      'BA': 'British Airways', 'LH': 'Lufthansa', 'AF': 'Air France',
      'KL': 'KLM', 'VS': 'Virgin Atlantic', 'EK': 'Emirates', 'QR': 'Qatar Airways'
    };

    return airlineMap[code] || code;
  }

  private getAirportCity(code: string): string {
    const cityMap: Record<string, string> = {
      'JFK': 'New York', 'LAX': 'Los Angeles', 'CDG': 'Paris', 'LHR': 'London',
      'NRT': 'Tokyo', 'FCO': 'Rome', 'BCN': 'Barcelona', 'AMS': 'Amsterdam',
      'BER': 'Berlin', 'MAD': 'Madrid'
    };

    return cityMap[code] || code;
  }

  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private parseDurationToMinutes(duration: string): number {
    // Parse duration like "2h 30m" or "PT2H30M" to minutes
    if (!duration) return 0;
    
    const match = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (match) {
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      return hours * 60 + minutes;
    }
    
    // Try ISO 8601 format (PT2H30M)
    const isoMatch = duration.match(/PT(\d+)H(\d+)?M?/);
    if (isoMatch) {
      const hours = parseInt(isoMatch[1]) || 0;
      const minutes = parseInt(isoMatch[2]) || 0;
      return hours * 60 + minutes;
    }
    
    return 0;
  }

  private formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

}
