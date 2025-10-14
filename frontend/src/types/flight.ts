/**
 * Flight-related TypeScript types for the frontend
 * 
 * These types match the backend flight search system and provide
 * type safety for the frontend flight search components.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

export interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    city: string;
    time: string;
    date: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
    date: string;
    terminal?: string;
    gate?: string;
  };
  duration: string; // e.g., "2h 30m"
  durationMinutes: number; // Duration in minutes for calculations
  price: number;
  currency: string;
  stops: number;
  baggage: {
    carry: boolean;
    checked: number;
    weightLimit?: string;
    checkedBagCost: number; // Cost per additional checked bag
    maxCheckedBags: number; // Maximum number of checked bags allowed
  };
  aircraft?: string;
  cabinClass?: 'economy' | 'premium-economy' | 'business' | 'first';
  refundable: boolean;
  changeable: boolean;
  bookingUrl?: string;
  source: 'amadeus' | 'rapidapi' | 'mock' | 'skyscanner' | 'kiwi';
  score?: number; // Recommendation score
  metadata?: {
    lastUpdated: string;
    availability: number;
    priceHistory?: number[];
  };
  // Grouped flight options (when multiple dates/times available)
  availableDates?: Array<{
    date: string;
    time: string;
    price: number;
    duration: string;
  }>;
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  cabinClass?: 'economy' | 'premium-economy' | 'business' | 'first';
  currency?: string;
  filters?: FlightSearchFilters;
  preferences?: FlightSearchPreferences;
}

export interface FlightSearchFilters {
  maxPrice?: number;
  minPrice?: number;
  maxStops?: number;
  preferredAirlines?: string[];
  excludedAirlines?: string[];
  departureTimeRange?: {
    earliest: string; // HH:MM format
    latest: string;   // HH:MM format
  };
  arrivalTimeRange?: {
    earliest: string;
    latest: string;
  };
  maxDuration?: number; // in minutes
  minDuration?: number; // in minutes
  refundable?: boolean;
  changeable?: boolean;
  directFlightsOnly?: boolean;
  checkedBags?: number; // Number of checked bags preferred
  includeBaggageCosts?: boolean; // Whether to include baggage costs in total price
}

export interface FlightSearchPreferences {
  prioritizePrice: boolean;
  prioritizeConvenience: boolean;
  prioritizeDuration: boolean;
  prioritizeDirectFlights: boolean;
  userTravelStyle: 'budget' | 'mid-range' | 'luxury';
  flexibility: 'strict' | 'moderate' | 'flexible';
  preferredDepartureTime?: 'morning' | 'afternoon' | 'evening' | 'any';
}

export interface FlightSearchResponse {
  success: boolean;
  flights: FlightOption[];
  totalResults: number;
  searchId: string;
  searchTime: number; // milliseconds
  filters: FlightSearchFilters;
  recommendations: {
    bestPrice: FlightOption | null;
    bestValue: FlightOption | null;
    fastest: FlightOption | null;
    mostConvenient: FlightOption | null;
  };
  fallbackUsed?: boolean;
  fallbackReason?: string;
  error?: string;
}

export interface FlightRecommendations {
  bestPrice: FlightOption | null;
  bestValue: FlightOption | null;
  fastest: FlightOption | null;
  mostConvenient: FlightOption | null;
  topRated: FlightOption[];
  personalized: FlightOption[];
}

export type FlightSortOption = 
  | 'price-asc' 
  | 'price-desc' 
  | 'duration-asc' 
  | 'duration-desc' 
  | 'departure-asc' 
  | 'departure-desc' 
  | 'stops-asc' 
  | 'stops-desc' 
  | 'score-desc'
  | 'recommended';

export interface FlightSearchMetrics {
  searchId: string;
  timestamp: string;
  origin: string;
  destination: string;
  resultsCount: number;
  searchDuration: number;
  apiUsed: string;
  fallbackUsed: boolean;
  userAgent?: string;
  ipAddress?: string;
}

// Common airports for dropdowns
export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  region: string;
}

export const COMMON_AIRPORTS: Airport[] = [
  // North America
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA', region: 'North America' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', region: 'North America' },
  { code: 'ORD', name: 'O\'Hare International', city: 'Chicago', country: 'USA', region: 'North America' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'USA', region: 'North America' },
  { code: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'Canada', region: 'North America' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada', region: 'North America' },
  { code: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'Mexico', region: 'North America' },
  
  // Europe
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', region: 'Europe' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', region: 'Europe' },
  { code: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', region: 'Europe' },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', region: 'Europe' },
  { code: 'MAD', name: 'Madrid-Barajas', city: 'Madrid', country: 'Spain', region: 'Europe' },
  { code: 'BCN', name: 'Barcelona-El Prat', city: 'Barcelona', country: 'Spain', region: 'Europe' },
  { code: 'FCO', name: 'Fiumicino', city: 'Rome', country: 'Italy', region: 'Europe' },
  { code: 'MXP', name: 'Malpensa', city: 'Milan', country: 'Italy', region: 'Europe' },
  { code: 'ZUR', name: 'Zurich', city: 'Zurich', country: 'Switzerland', region: 'Europe' },
  { code: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'Austria', region: 'Europe' },
  { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden', region: 'Europe' },
  { code: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark', region: 'Europe' },
  { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway', region: 'Europe' },
  { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland', region: 'Europe' },
  { code: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland', region: 'Europe' },
  { code: 'LIS', name: 'Lisbon', city: 'Lisbon', country: 'Portugal', region: 'Europe' },
  { code: 'ATH', name: 'Athens International', city: 'Athens', country: 'Greece', region: 'Europe' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', region: 'Europe' },
  { code: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'Poland', region: 'Europe' },
  { code: 'PRG', name: 'Prague Václav Havel', city: 'Prague', country: 'Czech Republic', region: 'Europe' },
  { code: 'BUD', name: 'Budapest Ferenc Liszt', city: 'Budapest', country: 'Hungary', region: 'Europe' },
  
  // Asia
  { code: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan', region: 'Asia' },
  { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', region: 'Asia' },
  { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', region: 'Asia' },
  { code: 'PEK', name: 'Beijing Capital', city: 'Beijing', country: 'China', region: 'Asia' },
  { code: 'PVG', name: 'Shanghai Pudong', city: 'Shanghai', country: 'China', region: 'Asia' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', region: 'Asia' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', region: 'Asia' },
  { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', region: 'Asia' },
  { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia' },
  { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'Philippines', region: 'Asia' },
  { code: 'CGK', name: 'Soekarno-Hatta', city: 'Jakarta', country: 'Indonesia', region: 'Asia' },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India', region: 'Asia' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'India', region: 'Asia' },
  { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'India', region: 'Asia' },
  
  // Middle East & Africa
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', region: 'Middle East' },
  { code: 'AUH', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'UAE', region: 'Middle East' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', region: 'Middle East' },
  { code: 'JED', name: 'King Abdulaziz International', city: 'Jeddah', country: 'Saudi Arabia', region: 'Middle East' },
  { code: 'TLV', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel', region: 'Middle East' },
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'South Africa', region: 'Africa' },
  { code: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'Egypt', region: 'Africa' },
  { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'Kenya', region: 'Africa' },
  
  // Oceania
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', region: 'Oceania' },
  { code: 'MEL', name: 'Melbourne', city: 'Melbourne', country: 'Australia', region: 'Oceania' },
  { code: 'BNE', name: 'Brisbane', city: 'Brisbane', country: 'Australia', region: 'Oceania' },
  { code: 'AKL', name: 'Auckland', city: 'Auckland', country: 'New Zealand', region: 'Oceania' },
  
  // South America
  { code: 'GRU', name: 'São Paulo/Guarulhos', city: 'São Paulo', country: 'Brazil', region: 'South America' },
  { code: 'GIG', name: 'Rio de Janeiro/Galeão', city: 'Rio de Janeiro', country: 'Brazil', region: 'South America' },
  { code: 'EZE', name: 'Ministro Pistarini', city: 'Buenos Aires', country: 'Argentina', region: 'South America' },
  { code: 'SCL', name: 'Arturo Merino Benítez', city: 'Santiago', country: 'Chile', region: 'South America' },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'Peru', region: 'South America' },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'Colombia', region: 'South America' }
];

// Common airlines
export const COMMON_AIRLINES: string[] = [
  'American Airlines',
  'Delta Air Lines',
  'United Airlines',
  'British Airways',
  'Lufthansa',
  'Air France',
  'KLM Royal Dutch Airlines',
  'Virgin Atlantic',
  'Emirates',
  'Qatar Airways',
  'Singapore Airlines',
  'Cathay Pacific',
  'Japan Airlines',
  'All Nippon Airways',
  'Turkish Airlines'
];

// Utility functions for flight data
export const FlightUtils = {
  formatPrice: (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  },

  formatDuration: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  },

  getTimeOfDay: (time: string): string => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    return 'Evening';
  },

  getStopsText: (stops: number): string => {
    if (stops === 0) return 'Direct';
    if (stops === 1) return '1 stop';
    return `${stops} stops`;
  },

  getScoreColor: (score?: number): string => {
    if (!score) return '#666';
    if (score >= 0.8) return '#22c55e';
    if (score >= 0.6) return '#eab308';
    return '#ef4444';
  },

  getScoreText: (score?: number): string => {
    if (!score) return 'No score';
    if (score >= 0.8) return 'Excellent match';
    if (score >= 0.6) return 'Good match';
    if (score >= 0.4) return 'Fair match';
    return 'Poor match';
  },

  calculateBaggageCost: (flight: FlightOption, requestedBags: number): number => {
    const includedBags = flight.baggage.checked;
    const costPerBag = flight.baggage.checkedBagCost || 50; // Default $50 per bag
    
    if (requestedBags <= includedBags) {
      return 0; // No additional cost
    }
    
    const additionalBags = requestedBags - includedBags;
    return additionalBags * costPerBag;
  },

  getTotalPrice: (flight: FlightOption, requestedBags: number): number => {
    const basePrice = flight.price;
    const baggageCost = FlightUtils.calculateBaggageCost(flight, requestedBags);
    return basePrice + baggageCost;
  },

  formatBaggageInfo: (flight: FlightOption): string => {
    const included = flight.baggage.checked;
    const cost = flight.baggage.checkedBagCost;
    
    if (included === 0) {
      return cost ? `No bags included ($${cost} each)` : 'No bags included';
    }
    
    if (included === 1) {
      return cost ? `1 bag included ($${cost} for additional)` : '1 bag included';
    }
    
    return cost ? `${included} bags included ($${cost} for additional)` : `${included} bags included`;
  }
};
