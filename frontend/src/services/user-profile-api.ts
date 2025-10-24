/**
 * User Profile API Service
 * Handles API calls for user profile and preferences
 */

import { TravelPreferences } from '../types/preferences';
import { buildApiUrl } from '../config/api';

export interface UserProfile {
  email: string;
  homeCity: string;
  travelPreferences: TravelPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface CitySuggestion {
  name: string;
  country: string;
  iataCode?: string;
  displayName: string;
}

class UserProfileApiService {
  /**
   * Get user profile
   */
  async getUserProfile(userEmail: string): Promise<UserProfile> {
    try {
      console.log(`📋 Fetching profile for user: ${userEmail}`);
      
      const response = await fetch(buildApiUrl(`/api/user-profile/${encodeURIComponent(userEmail)}`));

      if (!response.ok) {
        // Fallback to localStorage if API is not available
        console.log('🔄 API not available, using localStorage fallback');
        return this.getProfileFromLocalStorage(userEmail);
      }

      const data = await response.json();
      console.log('✅ User profile retrieved from API');
      return data.profile;
    } catch (error) {
      console.error('❌ Error fetching user profile, using localStorage fallback:', error);
      return this.getProfileFromLocalStorage(userEmail);
    }
  }

  /**
   * Update travel preferences
   */
  async updateTravelPreferences(userEmail: string, preferences: TravelPreferences): Promise<void> {
    try {
      console.log(`💾 Updating travel preferences for user: ${userEmail}`);
      
      const response = await fetch(buildApiUrl(`/api/user-profile/${encodeURIComponent(userEmail)}/preferences`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        // Fallback to localStorage if API is not available
        console.log('🔄 API not available, saving preferences to localStorage');
        this.savePreferencesToLocalStorage(userEmail, preferences);
        return;
      }

      console.log('✅ Travel preferences updated successfully via API');
    } catch (error) {
      console.error('❌ Error updating travel preferences via API, using localStorage fallback:', error);
      this.savePreferencesToLocalStorage(userEmail, preferences);
    }
  }

  /**
   * Update home city
   */
  async updateHomeCity(userEmail: string, homeCity: string): Promise<void> {
    try {
      console.log(`🏠 Updating home city for user: ${userEmail}`);
      
      const response = await fetch(buildApiUrl(`/api/user-profile/${encodeURIComponent(userEmail)}/home-city`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ homeCity }),
      });

      if (!response.ok) {
        // Fallback to localStorage if API is not available
        console.log('🔄 API not available, saving home city to localStorage');
        this.saveHomeCityToLocalStorage(userEmail, homeCity);
        return;
      }

      console.log('✅ Home city updated successfully via API');
    } catch (error) {
      console.error('❌ Error updating home city via API, using localStorage fallback:', error);
      this.saveHomeCityToLocalStorage(userEmail, homeCity);
    }
  }

  /**
   * Get city suggestions for autocomplete
   */
  async getCitySuggestions(query: string): Promise<CitySuggestion[]> {
    try {
      if (query.length < 2) return [];
      
      console.log(`🔍 Searching cities for: ${query}`);
      
      const response = await fetch(buildApiUrl(`/api/cities/search?q=${encodeURIComponent(query)}&limit=10`));

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to search cities');
      }

      const data = await response.json();
      console.log(`✅ Found ${data.cities.length} city suggestions`);
      return data.cities;
    } catch (error) {
      console.error('❌ Error searching cities:', error);
      // Return fallback suggestions on error
      return this.getFallbackCitySuggestions(query);
    }
  }

  /**
   * Get profile from localStorage (fallback)
   */
  private getProfileFromLocalStorage(userEmail: string): UserProfile {
    try {
      const profileKey = `hack-travel-profile-${userEmail}`;
      const stored = localStorage.getItem(profileKey);
      
      if (stored) {
        const profile = JSON.parse(stored);
        console.log('✅ Profile loaded from localStorage');
        return profile;
      }
    } catch (error) {
      console.error('❌ Error loading profile from localStorage:', error);
    }
    
    // Return default profile
    const defaultProfile: UserProfile = {
      email: userEmail,
      homeCity: '',
      travelPreferences: {
        budget: 2000,
        travelers: 2,
        travelStyle: 'mid-range',
        favoriteDestinations: [],
        avoidDestinations: [],
        preferredRegions: [],
        interests: [],
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
        preferredDuration: { min: 3, max: 14 },
        preferredSeasons: [],
        avoidSeasons: [],
        numberOfKids: 0,
        ageRanges: [],
        accessibilityNeeds: [],
        language: 'en',
        currency: 'USD',
        travelExperience: 'intermediate',
        lastUpdated: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ Created default profile for localStorage');
    return defaultProfile;
  }

  /**
   * Save preferences to localStorage (fallback)
   */
  private savePreferencesToLocalStorage(userEmail: string, preferences: any): void {
    try {
      const profileKey = `hack-travel-profile-${userEmail}`;
      const existingProfile = this.getProfileFromLocalStorage(userEmail);
      
      const updatedProfile = {
        ...existingProfile,
        travelPreferences: {
          ...existingProfile.travelPreferences,
          ...preferences,
          lastUpdated: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
      console.log('✅ Travel preferences saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving preferences to localStorage:', error);
    }
  }

  /**
   * Save home city to localStorage (fallback)
   */
  private saveHomeCityToLocalStorage(userEmail: string, homeCity: string): void {
    try {
      const profileKey = `hack-travel-profile-${userEmail}`;
      const existingProfile = this.getProfileFromLocalStorage(userEmail);
      
      const updatedProfile = {
        ...existingProfile,
        homeCity,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
      console.log('✅ Home city saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving home city to localStorage:', error);
    }
  }

  /**
   * Fallback city suggestions when API fails
   */
  private getFallbackCitySuggestions(query: string): CitySuggestion[] {
    const popularCities = [
      { name: 'New York', country: 'United States', iataCode: 'NYC', displayName: 'New York, NY, USA' },
      { name: 'London', country: 'United Kingdom', iataCode: 'LON', displayName: 'London, UK' },
      { name: 'Paris', country: 'France', iataCode: 'PAR', displayName: 'Paris, France' },
      { name: 'Tokyo', country: 'Japan', iataCode: 'TYO', displayName: 'Tokyo, Japan' },
      { name: 'Los Angeles', country: 'United States', iataCode: 'LAX', displayName: 'Los Angeles, CA, USA' },
      { name: 'Dubai', country: 'United Arab Emirates', iataCode: 'DXB', displayName: 'Dubai, UAE' },
      { name: 'Singapore', country: 'Singapore', iataCode: 'SIN', displayName: 'Singapore' },
      { name: 'Sydney', country: 'Australia', iataCode: 'SYD', displayName: 'Sydney, Australia' },
      { name: 'Mumbai', country: 'India', iataCode: 'BOM', displayName: 'Mumbai, India' },
      { name: 'Toronto', country: 'Canada', iataCode: 'YYZ', displayName: 'Toronto, ON, Canada' },
      { name: 'Barcelona', country: 'Spain', iataCode: 'BCN', displayName: 'Barcelona, Spain' },
      { name: 'Amsterdam', country: 'Netherlands', iataCode: 'AMS', displayName: 'Amsterdam, Netherlands' },
      { name: 'Rome', country: 'Italy', iataCode: 'ROM', displayName: 'Rome, Italy' },
      { name: 'Bangkok', country: 'Thailand', iataCode: 'BKK', displayName: 'Bangkok, Thailand' },
      { name: 'Hong Kong', country: 'Hong Kong', iataCode: 'HKG', displayName: 'Hong Kong' }
    ];

    const lowerQuery = query.toLowerCase();
    return popularCities
      .filter(city => 
        city.name.toLowerCase().includes(lowerQuery) ||
        city.country.toLowerCase().includes(lowerQuery) ||
        city.displayName.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10);
  }
}

export const userProfileApiService = new UserProfileApiService();