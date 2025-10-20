/**
 * Flight Search Feature Types
 * 
 * Type definitions for the flight search feature including
 * attractions, hotels, and recommendations.
 */

export interface AttractionPhoto {
  images: {
    large?: { url: string };
    medium?: { url: string };
    original?: { url: string };
  };
  caption?: string;
}

export interface Attraction {
  location_id: string;
  name: string;
  category: string | { name: string };
  rating: number | string;
  num_reviews: number | string;
  description?: string;
  address?: string;
  photos?: AttractionPhoto[];
  reviews?: any[];
  web_url?: string;
  personalizationScore?: number;
}

export interface HotelResult {
  id: string;
  name: string;
  imageUrl?: string;
  reviewScore?: number;
  reviewCount?: number;
  reviewScoreWord?: string;
  rating?: number;
  totalPrice?: number;
  isPreferred?: boolean;
}

export interface UserPreferences {
  interests?: string[];
  travelStyle?: 'luxury' | 'budget' | 'mid-range';
  budget?: number;
  accommodationType?: string;
}

export interface PhotoGallery {
  location: Attraction;
  photos: AttractionPhoto[];
}

export type FilterType = 'All' | 'Top Rated' | 'Popular' | 'Hidden Gems';
