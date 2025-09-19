import axios from 'axios';
import { FlightOption, TripPreferences } from '../types';

export interface FlightServiceConfig {
  amadeuApiKey?: string;
  amadeuApiSecret?: string;
  rapidApiKey?: string;
}

export interface FlightSearchFilters {
  maxPrice?: number;
  maxStops?: number;
  preferredAirlines?: string[];
  departureTimeRange?: {
    earliest: string; // HH:MM format
    latest: string;   // HH:MM format
  };
  maxDuration?: number; // in minutes
}

export interface FlightRecommendationOptions {
  prioritizePrice: boolean;
  prioritizeConvenience: boolean;
  prioritizeDuration: boolean;
  userTravelStyle: 'budget' | 'mid-range' | 'luxury';
}

export class FlightService {
  private amadeuApiKey: string;
  private amadeuApiSecret: string;
  private rapidApiKey: string;
  private amadeuToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: FlightServiceConfig = {}) {
    this.amadeuApiKey = config.amadeuApiKey || process.env.AMADEUS_API_KEY || '';
    this.amadeuApiSecret = config.amadeuApiSecret || process.env.AMADEUS_API_SECRET || '';
    this.rapidApiKey = config.rapidApiKey || process.env.RAPIDAPI_KEY || '';
  }

  /**
   * Search for flights based on trip preferences
   */
  async searchFlights(preferences: TripPreferences, originAirport?: string): Promise<FlightOption[]> {
    try {
      // Try Amadeus API first (most comprehensive)
      if (this.amadeuApiKey && this.amadeuApiSecret) {
        return await this.searchAmadeusFlights(preferences, originAirport);
      }
      
      // Fallback to RapidAPI flight search
      if (this.rapidApiKey) {
        return await this.searchRapidApiFlights(preferences, originAirport);
      }
      
      // If no API keys available, return mock data with real-world pricing
      console.warn('No flight API keys configured, using realistic mock data');
      return this.generateRealisticMockFlights(preferences, originAirport);
      
    } catch (error) {
      console.error('Error searching flights:', error);
      return this.generateRealisticMockFlights(preferences, originAirport);
    }
  }

  /**
   * Get flight details by ID
   */
  async getFlightDetails(flightId: string): Promise<FlightOption | null> {
    try {
      if (this.amadeuApiKey && this.amadeuApiSecret) {
        return await this.getAmadeusFlightDetails(flightId);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting flight details:', error);
      return null;
    }
  }

  /**
   * Search flights using Amadeus API
   */
  private async searchAmadeusFlights(preferences: TripPreferences, originAirport?: string): Promise<FlightOption[]> {
    await this.ensureAmadeusToken();
    
    const origin = originAirport || this.guessOriginAirport();
    const destination = this.getDestinationAirport(preferences.destination);
    
    const searchParams = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: preferences.startDate,
      returnDate: this.calculateReturnDate(preferences.startDate, preferences.duration),
      adults: preferences.travelers,
      currencyCode: 'USD',
      max: 20
    };

    const response = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
      headers: {
        'Authorization': `Bearer ${this.amadeuToken}`,
        'Content-Type': 'application/json'
      },
      params: searchParams
    });

    return this.parseAmadeusFlights(response.data);
  }

  /**
   * Search flights using RapidAPI
   */
  private async searchRapidApiFlights(preferences: TripPreferences, originAirport?: string): Promise<FlightOption[]> {
    const origin = originAirport || this.guessOriginAirport();
    const destination = this.getDestinationAirport(preferences.destination);
    
    const response = await axios.get('https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/US/USD/en-US/' + origin + '/' + destination + '/' + preferences.startDate, {
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': 'skyscanner-skyscanner-flight-search-v1.p.rapidapi.com'
      }
    });

    return this.parseRapidApiFlights(response.data, preferences);
  }

  /**
   * Ensure Amadeus token is valid
   */
  private async ensureAmadeusToken(): Promise<void> {
    if (this.amadeuToken && Date.now() < this.tokenExpiry) {
      return; // Token is still valid
    }

    const response = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token', 
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.amadeuApiKey,
        client_secret: this.amadeuApiSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    this.amadeuToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute early
  }

  /**
   * Parse Amadeus flight response
   */
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
        price: parseFloat(offer.price.total),
        stops: segments.length - 1,
        baggage: {
          carry: true,
          checked: 1
        }
      };
    });
  }

  /**
   * Parse RapidAPI flight response
   */
  private parseRapidApiFlights(data: any, preferences: TripPreferences): FlightOption[] {
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
          date: preferences.startDate
        },
        arrival: {
          airport: destination?.IataCode || 'XXX',
          city: destination?.CityName || preferences.destination,
          time: '14:00',
          date: preferences.startDate
        },
        duration: '4h 0m',
        price: quote.MinPrice,
        stops: 0,
        baggage: {
          carry: true,
          checked: 1
        }
      };
    });
  }

  /**
   * Generate realistic mock flights with real-world pricing
   */
  private generateRealisticMockFlights(preferences: TripPreferences, originAirport?: string): FlightOption[] {
    const origin = originAirport || this.guessOriginAirport();
    const destination = this.getDestinationAirport(preferences.destination);
    const basePrice = this.calculateBasePrice(preferences.destination);
    
    const airlines = [
      { code: 'AA', name: 'American Airlines' },
      { code: 'DL', name: 'Delta Air Lines' },
      { code: 'UA', name: 'United Airlines' },
      { code: 'BA', name: 'British Airways' },
      { code: 'LH', name: 'Lufthansa' },
      { code: 'AF', name: 'Air France' }
    ];

    const flights: FlightOption[] = [];

    // Generate outbound flights
    airlines.forEach((airline, index) => {
      const priceVariation = 1 + (Math.random() - 0.5) * 0.4; // ±20% variation
      const price = Math.round(basePrice * priceVariation);
      
      const departureHour = 8 + (index * 2) % 16; // Spread throughout the day
      const flightDuration = this.calculateFlightDuration(origin, destination);
      const arrivalHour = (departureHour + Math.floor(flightDuration / 60)) % 24;

      flights.push({
        id: `mock-outbound-${index}`,
        airline: airline.name,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
        departure: {
          airport: origin,
          city: this.getAirportCity(origin),
          time: `${departureHour.toString().padStart(2, '0')}:${(Math.random() * 60).toFixed(0).padStart(2, '0')}`,
          date: preferences.startDate
        },
        arrival: {
          airport: destination,
          city: preferences.destination,
          time: `${arrivalHour.toString().padStart(2, '0')}:${(Math.random() * 60).toFixed(0).padStart(2, '0')}`,
          date: preferences.startDate
        },
        duration: this.formatDuration(flightDuration),
        price: price,
        stops: Math.random() > 0.7 ? 1 : 0, // 30% chance of 1 stop
        baggage: {
          carry: true,
          checked: 1
        }
      });
    });

    // Generate return flights
    const returnDate = this.calculateReturnDate(preferences.startDate, preferences.duration);
    airlines.slice(0, 3).forEach((airline, index) => {
      const priceVariation = 1 + (Math.random() - 0.5) * 0.3;
      const price = Math.round(basePrice * priceVariation * 0.9); // Return flights often cheaper
      
      const departureHour = 10 + (index * 4) % 12;
      const flightDuration = this.calculateFlightDuration(destination, origin);
      const arrivalHour = (departureHour + Math.floor(flightDuration / 60)) % 24;

      flights.push({
        id: `mock-return-${index}`,
        airline: airline.name,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
        departure: {
          airport: destination,
          city: preferences.destination,
          time: `${departureHour.toString().padStart(2, '0')}:${(Math.random() * 60).toFixed(0).padStart(2, '0')}`,
          date: returnDate
        },
        arrival: {
          airport: origin,
          city: this.getAirportCity(origin),
          time: `${arrivalHour.toString().padStart(2, '0')}:${(Math.random() * 60).toFixed(0).padStart(2, '0')}`,
          date: returnDate
        },
        duration: this.formatDuration(flightDuration),
        price: price,
        stops: Math.random() > 0.8 ? 1 : 0,
        baggage: {
          carry: true,
          checked: 1
        }
      });
    });

    return flights.sort((a, b) => a.price - b.price);
  }

  /**
   * Get Amadeus flight details
   */
  private async getAmadeusFlightDetails(flightId: string): Promise<FlightOption | null> {
    await this.ensureAmadeusToken();
    
    try {
      const response = await axios.get(`https://test.api.amadeus.com/v1/shopping/flight-offers/${flightId}`, {
        headers: {
          'Authorization': `Bearer ${this.amadeuToken}`,
          'Content-Type': 'application/json'
        }
      });

      const flights = this.parseAmadeusFlights({ data: [response.data] });
      return flights[0] || null;
    } catch (error) {
      console.error('Error getting Amadeus flight details:', error);
      return null;
    }
  }

  /**
   * Guess origin airport based on common patterns
   */
  private guessOriginAirport(): string {
    // Default to major US airports - in production, you'd determine this from user location
    const commonOrigins = ['JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'SFO', 'BOS', 'SEA'];
    return commonOrigins[Math.floor(Math.random() * commonOrigins.length)];
  }

  /**
   * Get destination airport code from city name
   */
  private getDestinationAirport(destination: string): string {
    const airportMap: Record<string, string> = {
      'Paris': 'CDG',
      'London': 'LHR',
      'Tokyo': 'NRT',
      'New York': 'JFK',
      'Los Angeles': 'LAX',
      'Rome': 'FCO',
      'Barcelona': 'BCN',
      'Amsterdam': 'AMS',
      'Berlin': 'BER',
      'Madrid': 'MAD',
      'Dubai': 'DXB',
      'Singapore': 'SIN',
      'Hong Kong': 'HKG',
      'Sydney': 'SYD',
      'Toronto': 'YYZ'
    };

    // Try to find exact match
    for (const [city, airport] of Object.entries(airportMap)) {
      if (destination.toLowerCase().includes(city.toLowerCase())) {
        return airport;
      }
    }

    // Default fallback
    return 'XXX';
  }

  /**
   * Calculate base price for destination
   */
  private calculateBasePrice(destination: string): number {
    const priceMap: Record<string, number> = {
      'Paris': 650,
      'London': 600,
      'Tokyo': 1200,
      'Rome': 700,
      'Barcelona': 550,
      'Amsterdam': 580,
      'Berlin': 520,
      'Madrid': 530,
      'Dubai': 900,
      'Singapore': 1100,
      'Hong Kong': 1000,
      'Sydney': 1400,
      'Toronto': 400
    };

    for (const [city, price] of Object.entries(priceMap)) {
      if (destination.toLowerCase().includes(city.toLowerCase())) {
        return price;
      }
    }

    return 600; // Default price
  }

  /**
   * Calculate flight duration in minutes
   */
  private calculateFlightDuration(origin: string, destination: string): number {
    // Simplified duration calculation - in production, use actual distance/routing
    const durationMap: Record<string, number> = {
      'JFK-CDG': 450, 'CDG-JFK': 480,
      'LAX-NRT': 660, 'NRT-LAX': 600,
      'JFK-LHR': 420, 'LHR-JFK': 450,
      'JFK-FCO': 480, 'FCO-JFK': 510
    };

    const key = `${origin}-${destination}`;
    return durationMap[key] || 360; // Default 6 hours
  }

  /**
   * Calculate return date
   */
  private calculateReturnDate(startDate: string, duration: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + duration);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get airline name from code
   */
  private getAirlineName(code: string): string {
    const airlineMap: Record<string, string> = {
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
      'BA': 'British Airways',
      'LH': 'Lufthansa',
      'AF': 'Air France',
      'KL': 'KLM',
      'VS': 'Virgin Atlantic',
      'EK': 'Emirates',
      'QR': 'Qatar Airways'
    };

    return airlineMap[code] || code;
  }

  /**
   * Get airport city from code
   */
  private getAirportCity(code: string): string {
    const cityMap: Record<string, string> = {
      'JFK': 'New York',
      'LAX': 'Los Angeles',
      'CDG': 'Paris',
      'LHR': 'London',
      'NRT': 'Tokyo',
      'FCO': 'Rome',
      'BCN': 'Barcelona',
      'AMS': 'Amsterdam',
      'BER': 'Berlin',
      'MAD': 'Madrid'
    };

    return cityMap[code] || code;
  }

  /**
   * Format time from ISO string
   */
  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  /**
   * Format date from ISO string
   */
  private formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  }

  /**
   * Format duration from minutes
   */
  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
}