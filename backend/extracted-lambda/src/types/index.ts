// Core data models and interfaces for the travel companion system

export interface TripPreferences {
  destination: string;
  budget: number;
  duration: number; // days
  interests: string[];
  startDate: string; // ISO date string
  travelers: number;
  travelStyle?: 'budget' | 'mid-range' | 'luxury';
  accommodationType?: 'hotel' | 'hostel' | 'apartment' | 'any';
}

export interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    city: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
    date: string;
  };
  duration: string; // e.g., "2h 30m"
  price: number;
  stops: number;
  baggage: {
    carry: boolean;
    checked: number;
  };
  bookingUrl?: string;
}

export interface HotelOption {
  id: string;
  name: string;
  rating: number; // 1-5 stars
  address: string;
  city: string;
  pricePerNight: number;
  totalPrice: number;
  amenities: string[];
  images: string[];
  description: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  bookingUrl?: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: string; // e.g., "2 hours"
  price: number;
  rating: number;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  openingHours: string;
  images: string[];
  bookingRequired: boolean;
  bookingUrl?: string;
}

export interface MealSuggestion {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  cuisine: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  estimatedCost: number;
  rating: number;
  address: string;
  description: string;
}

export interface TransportOption {
  id: string;
  type: 'taxi' | 'uber' | 'public' | 'walking' | 'rental-car';
  from: string;
  to: string;
  duration: string;
  cost: number;
  description: string;
}

export interface DayPlan {
  date: string;
  dayNumber: number;
  activities: Activity[];
  meals: MealSuggestion[];
  transportation: TransportOption[];
  totalCost: number;
  notes?: string;
}

export interface Itinerary {
  id: string;
  userId?: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  budgetBreakdown: {
    flights: number;
    accommodation: number;
    activities: number;
    meals: number;
    transportation: number;
    miscellaneous: number;
  };
  days: DayPlan[];
  flights: {
    outbound: FlightOption;
    return: FlightOption;
  };
  hotels: HotelOption[];
  status: 'draft' | 'ready' | 'booked' | 'completed';
  createdAt: string;
  updatedAt: string;
  confidence: number; // AI confidence score 0-1
  alternatives?: {
    flights: FlightOption[];
    hotels: HotelOption[];
    budgetOptions: Partial<Itinerary>;
  };
}

export interface BookingConfirmation {
  id: string;
  type: 'flight' | 'hotel' | 'activity';
  confirmationNumber: string;
  itemId: string;
  itemName: string;
  cost: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  details: any;
  bookedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  password?: string; // For normal auth users
  googleId?: string; // For Google OAuth users
  role: 'normal' | 'google';
  name?: string;
  profilePicture?: string;
  preferences: {
    defaultBudget: number;
    favoriteDestinations: string[];
    interests: string[];
    travelStyle: 'budget' | 'mid-range' | 'luxury';
    dietaryRestrictions: string[];
    accessibility: string[];
    budget?: number;
    duration?: number;
    startDate?: string;
    travelers?: number;
  };
  tripHistory: string[]; // trip IDs
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isEmailVerified: boolean;
}

// API Request/Response types
export interface TripPlanRequest {
  preferences: TripPreferences;
  userId?: string;
}

export interface TripPlanResponse {
  success: boolean;
  itinerary?: Itinerary;
  s3Url?: string;
  error?: string;
  requestId: string;
}

export interface BookingRequest {
  itineraryId: string;
  userId?: string;
  selectedOptions: {
    flightIds: string[];
    hotelId: string;
    activityIds: string[];
  };
}

export interface BookingResponse {
  success: boolean;
  confirmationNumber?: string;
  bookings?: BookingConfirmation[];
  totalCost?: number;
  error?: string;
  requestId: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
  preferences?: Partial<UserProfile['preferences']>;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<UserProfile, 'password'>;
  token?: string;
  error?: string;
  message?: string;
}

export interface GoogleAuthRequest {
  googleToken: string;
  name?: string;
  profilePicture?: string;
}

// Database record types
export interface UserRecord {
  PK: string; // USER#${userId}
  SK: string; // PROFILE
  GSI1PK?: string; // EMAIL#${email}
  GSI1SK?: string; // USER
  email: string;
  password?: string; // For normal auth users
  googleId?: string; // For Google OAuth users
  role: 'normal' | 'google';
  name?: string;
  profilePicture?: string;
  preferences: UserProfile['preferences'];
  tripHistory: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isEmailVerified: boolean;
}

export interface TripRecord {
  PK: string; // TRIP#${tripId}
  SK: string; // METADATA
  GSI1PK?: string; // USER#${userId}
  GSI1SK?: string; // TRIP#${createdAt}
  userId?: string;
  destination: string;
  status: Itinerary['status'];
  preferences: TripPreferences;
  itinerary: Itinerary;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRecord {
  PK: string; // BOOKING#${bookingId}
  SK: string; // ${bookingType}#${itemId}
  GSI1PK?: string; // TRIP#${tripId}
  GSI1SK?: string; // BOOKING#${createdAt}
  tripId: string;
  userId?: string;
  type: BookingConfirmation['type'];
  confirmationNumber: string;
  itemId: string;
  itemName: string;
  cost: number;
  status: BookingConfirmation['status'];
  details: any;
  createdAt: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  requestId: string;
  timestamp: string;
}

export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  BUDGET_TOO_LOW: 'BUDGET_TOO_LOW',
  NO_FLIGHTS_FOUND: 'NO_FLIGHTS_FOUND',
  NO_HOTELS_FOUND: 'NO_HOTELS_FOUND',
  BEDROCK_ERROR: 'BEDROCK_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  S3_ERROR: 'S3_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];