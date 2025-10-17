export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | Record<string, any>;
  timestamp: number;
  type?: 'text' | 'recommendation' | 'link' | 'itinerary' | 'hotel_cards' | 'flight_recommendations' | 'attractions_recommendations';
  data?: any;
}

export interface Recommendation {
  type: 'destination' | 'flight' | 'hotel';
  title: string;
  description: string;
  link?: string;
  price?: string;
  rating?: number;
  image?: string;
}