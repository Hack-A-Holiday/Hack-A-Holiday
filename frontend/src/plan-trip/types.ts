import { Destination } from '../data/destinations';

export interface TripPreferences {
  destination: string;
  destinationData?: Destination;
  budget: number;
  duration: number;
  interests: string[];
  startDate: string;
  travelers: number;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
}

export interface ApiResponse {
  success: boolean;
  tripId?: string;
  itinerary?: any;
  message?: string;
  error?: any;
  requestId?: string;
  timestamp?: string;
  data?: {
    response?: any;
    conversationId?: string;
  };
}

export interface DailyPlan {
  day: number;
  title: string;
  description: string;
  activities: string[];
}

export interface Itinerary {
  destination: string;
  origin?: string;
  duration: number;
  budget: number;
  travelers: number;
  startDate: string;
  travelStyle: string;
  interests: string[];
  aiResponse: string;
  dailyPlans: DailyPlan[];
  recommendations?: any[];
  realData?: any;
  conversationId?: string;
  totalBudget?: string;
  overview?: {
    destination: string;
    duration: number;
    travelStyle: string;
  };
}

export interface TripAdvisorLocation {
  location_id: string;
  name: string;
  description?: string;
  photos?: any[];
  rating?: number;
  num_reviews?: number;
}
