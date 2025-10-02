/**
 * Shared User Preferences Interface
 * Defines the structure for user travel preferences used across profile and plan trip
 */

export interface TravelPreferences {
  // Basic Travel Information
  budget: number;
  travelers: number;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
  
  // Destination Preferences
  favoriteDestinations: string[];
  avoidDestinations: string[];
  preferredRegions: string[];
  
  // Travel Interests
  interests: string[];
  
  // Accommodation Preferences
  accommodationType: 'hotel' | 'airbnb' | 'hostel' | 'resort' | 'villa' | 'any';
  roomPreference: 'single' | 'double' | 'suite' | 'family' | 'any';
  
  // Flight Preferences
  flightPreferences: {
    preferDirect: boolean;
    timePreference: 'morning' | 'afternoon' | 'evening' | 'any';
    seatPreference: 'window' | 'aisle' | 'any';
    cabinClass: 'economy' | 'business' | 'first';
    maxLayovers: number;
  };
  
  // Food & Dietary
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  
  // Activity Preferences
  activityLevel: 'low' | 'moderate' | 'high';
  groupSize: 'solo' | 'couple' | 'family' | 'group';
  
  // Trip Duration
  preferredDuration: {
    min: number;
    max: number;
  };
  
  // Seasonal Preferences
  preferredSeasons: string[];
  avoidSeasons: string[];
  
  // Personal Information
  numberOfKids: number;
  ageRanges: string[];
  
  // Accessibility
  accessibilityNeeds: string[];
  
  // Communication Preferences
  language: string;
  currency: string;
  
  // Experience Level
  travelExperience: 'beginner' | 'intermediate' | 'expert';
  
  // Last Updated
  lastUpdated: string;
}

// Default preferences with sensible defaults
export const defaultTravelPreferences: TravelPreferences = {
  budget: 2000,
  travelers: 2,
  travelStyle: 'mid-range',
  favoriteDestinations: [],
  avoidDestinations: [],
  preferredRegions: [],
  interests: ['culture', 'food'],
  accommodationType: 'hotel',
  roomPreference: 'double',
  flightPreferences: {
    preferDirect: false,
    timePreference: 'any',
    seatPreference: 'any',
    cabinClass: 'economy',
    maxLayovers: 2
  },
  dietaryRestrictions: [],
  cuisinePreferences: [],
  activityLevel: 'moderate',
  groupSize: 'couple',
  preferredDuration: {
    min: 3,
    max: 14
  },
  preferredSeasons: [],
  avoidSeasons: [],
  numberOfKids: 0,
  ageRanges: [],
  accessibilityNeeds: [],
  language: 'en',
  currency: 'USD',
  travelExperience: 'intermediate',
  lastUpdated: new Date().toISOString()
};

// Available options for dropdowns and selections
export const preferenceOptions = {
  travelStyles: [
    { value: 'budget', label: 'Budget Traveler', description: 'Cost-conscious, value-focused travel' },
    { value: 'mid-range', label: 'Mid-Range Explorer', description: 'Balance of comfort and value' },
    { value: 'luxury', label: 'Luxury Seeker', description: 'Premium experiences and comfort' }
  ],
  
  interests: [
    'culture', 'history', 'museums', 'art', 'architecture',
    'food', 'nightlife', 'shopping', 'nature', 'hiking',
    'beaches', 'adventure', 'sports', 'photography',
    'music', 'festivals', 'local-experiences', 'wellness',
    'wildlife', 'skiing', 'diving', 'sailing'
  ],
  
  accommodationTypes: [
    { value: 'hotel', label: 'Hotel' },
    { value: 'airbnb', label: 'Airbnb/Vacation Rental' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'resort', label: 'Resort' },
    { value: 'villa', label: 'Villa' },
    { value: 'any', label: 'Any' }
  ],
  
  roomPreferences: [
    { value: 'single', label: 'Single Room' },
    { value: 'double', label: 'Double Room' },
    { value: 'suite', label: 'Suite' },
    { value: 'family', label: 'Family Room' },
    { value: 'any', label: 'Any' }
  ],
  
  timePreferences: [
    { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
    { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
    { value: 'evening', label: 'Evening (6 PM - 12 AM)' },
    { value: 'any', label: 'Any Time' }
  ],
  
  seatPreferences: [
    { value: 'window', label: 'Window Seat' },
    { value: 'aisle', label: 'Aisle Seat' },
    { value: 'any', label: 'No Preference' }
  ],
  
  cabinClasses: [
    { value: 'economy', label: 'Economy' },
    { value: 'business', label: 'Business' },
    { value: 'first', label: 'First Class' }
  ],
  
  activityLevels: [
    { value: 'low', label: 'Low - Relaxed pace, minimal physical activity' },
    { value: 'moderate', label: 'Moderate - Balanced mix of activities' },
    { value: 'high', label: 'High - Active adventures and physical activities' }
  ],
  
  groupSizes: [
    { value: 'solo', label: 'Solo Traveler' },
    { value: 'couple', label: 'Couple' },
    { value: 'family', label: 'Family' },
    { value: 'group', label: 'Group (3+)' }
  ],
  
  travelExperience: [
    { value: 'beginner', label: 'Beginner - New to travel' },
    { value: 'intermediate', label: 'Intermediate - Some travel experience' },
    { value: 'expert', label: 'Expert - Extensive travel experience' }
  ],
  
  seasons: [
    'Spring', 'Summer', 'Fall', 'Winter'
  ],
  
  cuisines: [
    'Italian', 'French', 'Japanese', 'Chinese', 'Indian', 'Mexican',
    'Thai', 'Mediterranean', 'American', 'Korean', 'Vietnamese',
    'Greek', 'Spanish', 'Middle Eastern', 'Caribbean'
  ],
  
  dietaryRestrictions: [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher',
    'Dairy-Free', 'Nut Allergy', 'Shellfish Allergy', 'None'
  ],
  
  accessibilityNeeds: [
    'Wheelchair Accessible', 'Mobility Assistance', 'Visual Impairment Support',
    'Hearing Impairment Support', 'None'
  ],
  
  ageRanges: [
    'Infant (0-2)', 'Toddler (3-5)', 'Child (6-12)', 'Teen (13-17)',
    'Adult (18-64)', 'Senior (65+)'
  ],
  
  languages: [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' }
  ],
  
  currencies: [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' }
  ]
};

// Utility functions for preferences
export class PreferencesUtils {
  static validatePreferences(preferences: Partial<TravelPreferences>): string[] {
    const errors: string[] = [];
    
    if (preferences.budget && preferences.budget < 100) {
      errors.push('Budget must be at least $100');
    }
    
    if (preferences.travelers && preferences.travelers < 1) {
      errors.push('Number of travelers must be at least 1');
    }
    
    if (preferences.preferredDuration) {
      if (preferences.preferredDuration.min > preferences.preferredDuration.max) {
        errors.push('Minimum duration cannot be greater than maximum duration');
      }
    }
    
    return errors;
  }
  
  static mergePreferences(existing: TravelPreferences, updates: Partial<TravelPreferences>): TravelPreferences {
    return {
      ...existing,
      ...updates,
      flightPreferences: {
        ...existing.flightPreferences,
        ...(updates.flightPreferences || {})
      },
      preferredDuration: {
        ...existing.preferredDuration,
        ...(updates.preferredDuration || {})
      },
      lastUpdated: new Date().toISOString()
    };
  }
  
  static getPreferenceSummary(preferences: TravelPreferences): string {
    const parts: string[] = [];
    
    parts.push(`${preferences.travelStyle} traveler`);
    parts.push(`$${preferences.budget} budget`);
    parts.push(`${preferences.travelers} traveler(s)`);
    
    if (preferences.interests.length > 0) {
      parts.push(`Interested in ${preferences.interests.slice(0, 3).join(', ')}`);
    }
    
    if (preferences.favoriteDestinations.length > 0) {
      parts.push(`Loves ${preferences.favoriteDestinations.slice(0, 2).join(', ')}`);
    }
    
    return parts.join(' • ');
  }
  
  static isComplete(preferences: TravelPreferences): boolean {
    const required = [
      'budget', 'travelers', 'travelStyle', 'interests',
      'accommodationType', 'activityLevel'
    ];
    
    return required.every(key => {
      const value = preferences[key as keyof TravelPreferences];
      return value !== undefined && value !== null && value !== '';
    });
  }
  
  static getMissingFields(preferences: Partial<TravelPreferences>): string[] {
    const required = [
      'budget', 'travelers', 'travelStyle', 'interests',
      'accommodationType', 'activityLevel'
    ];
    
    const missing: string[] = [];
    
    required.forEach(key => {
      const value = preferences[key as keyof TravelPreferences];
      if (value === undefined || value === null || value === '') {
        missing.push(key);
      }
    });
    
    return missing;
  }
}