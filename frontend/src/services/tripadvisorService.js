/**
 * TripAdvisor Service for Frontend
 * Handles API calls to our backend TripAdvisor endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class TripAdvisorService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/tripadvisor`;
  }

  /**
   * Search for locations (attractions, restaurants, etc.)
   */
  async searchLocations(query, limit = 10, language = 'en') {
    try {
      const response = await fetch(
        `${this.baseUrl}/location/search?searchQuery=${encodeURIComponent(query)}&limit=${limit}&language=${language}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching locations:', error);
      throw error;
    }
  }

  /**
   * Get location details with photos and reviews
   */
  async getLocationDetails(locationId, includePhotos = true, includeReviews = true, photoLimit = 5, reviewLimit = 5) {
    try {
      const response = await fetch(
        `${this.baseUrl}/location/${locationId}?includePhotos=${includePhotos}&includeReviews=${includeReviews}&photoLimit=${photoLimit}&reviewLimit=${reviewLimit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting location details:', error);
      throw error;
    }
  }

  /**
   * Get location photos
   */
  async getLocationPhotos(locationId, limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/location/${locationId}/photos?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting location photos:', error);
      throw error;
    }
  }

  /**
   * Get location reviews
   */
  async getLocationReviews(locationId, limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/location/${locationId}/reviews?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting location reviews:', error);
      throw error;
    }
  }

  /**
   * Search for attractions in a specific location
   */
  async searchAttractions(location, limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/location/search?searchQuery=${encodeURIComponent(location)}&limit=${limit}&category=attractions`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching attractions:', error);
      throw error;
    }
  }

  /**
   * Search for restaurants in a specific location
   */
  async searchRestaurants(location, limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/location/search?searchQuery=${encodeURIComponent(location)}&limit=${limit}&category=restaurants`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching restaurants:', error);
      throw error;
    }
  }
}

const tripAdvisorService = new TripAdvisorService();
export default tripAdvisorService;
