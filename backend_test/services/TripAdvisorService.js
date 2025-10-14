const axios = require('axios');

/**
 * TripAdvisor API Service
 * Provides real-time travel data for enhanced AI responses
 */
class TripAdvisorService {
  constructor() {
    this.apiKey = process.env.TRIPADVISOR_API_KEY || 'API_KEY_PLACEHOLDER';
    this.baseUrl = 'https://api.content.tripadvisor.com/api/v1';
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Search for locations by query
   */
  async searchLocations(query, limit = 10) {
    try {
      const cacheKey = `locations_${query}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/location/search`, {
        params: {
          key: this.apiKey,
          searchQuery: query,
          language: 'en',
          limit: limit
        }
      });

      const data = this.processLocationSearch(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor location search error:', error.message);
      return this.getMockLocationData(query);
    }
  }

  /**
   * Get attractions for a specific location
   */
  async getAttractions(locationId, category = 'attractions', limit = 10) {
    try {
      const cacheKey = `attractions_${locationId}_${category}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/location/${locationId}/${category}`, {
        params: {
          key: this.apiKey,
          language: 'en',
          limit: limit
        }
      });

      const data = this.processAttractionsData(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor attractions error:', error.message);
      return this.getMockAttractionsData(locationId, category);
    }
  }

  /**
   * Get restaurants for a specific location
   */
  async getRestaurants(locationId, cuisine = null, priceRange = null, limit = 10) {
    try {
      const cacheKey = `restaurants_${locationId}_${cuisine}_${priceRange}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.apiKey,
        language: 'en',
        limit: limit
      };

      if (cuisine) params.cuisine = cuisine;
      if (priceRange) params.priceRange = priceRange;

      const response = await axios.get(`${this.baseUrl}/location/${locationId}/restaurants`, {
        params: params
      });

      const data = this.processRestaurantsData(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor restaurants error:', error.message);
      return this.getMockRestaurantsData(locationId, cuisine);
    }
  }

  /**
   * Get hotels for a specific location
   */
  async getHotels(locationId, amenities = null, priceRange = null, limit = 10) {
    try {
      const cacheKey = `hotels_${locationId}_${amenities}_${priceRange}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.apiKey,
        language: 'en',
        limit: limit
      };

      if (amenities) params.amenities = amenities;
      if (priceRange) params.priceRange = priceRange;

      const response = await axios.get(`${this.baseUrl}/location/${locationId}/hotels`, {
        params: params
      });

      const data = this.processHotelsData(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor hotels error:', error.message);
      return this.getMockHotelsData(locationId, amenities);
    }
  }

  /**
   * Get location details
   */
  async getLocationDetails(locationId) {
    try {
      const cacheKey = `location_details_${locationId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/location/${locationId}/details`, {
        params: {
          key: this.apiKey,
          language: 'en'
        }
      });

      const data = this.processLocationDetails(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor location details error:', error.message);
      return this.getMockLocationDetails(locationId);
    }
  }

  /**
   * Get comprehensive travel data for AI enhancement
   */
  async getTravelDataForAI(location, userPreferences = {}) {
    try {
      // First, search for the location
      const locations = await this.searchLocations(location, 1);
      if (!locations || locations.length === 0) {
        return this.getMockTravelData(location, userPreferences);
      }

      const locationId = locations[0].location_id;
      const locationDetails = await this.getLocationDetails(locationId);

      // Get different types of data based on user preferences
      const data = {
        location: locationDetails,
        attractions: [],
        restaurants: [],
        hotels: []
      };

      // Get attractions
      if (userPreferences.interests?.includes('sightseeing') || !userPreferences.interests) {
        data.attractions = await this.getAttractions(locationId, 'attractions', 5);
      }

      // Get restaurants
      if (userPreferences.interests?.includes('food') || !userPreferences.interests) {
        data.restaurants = await this.getRestaurants(locationId, userPreferences.cuisine, userPreferences.budget, 5);
      }

      // Get hotels
      if (userPreferences.interests?.includes('accommodation') || !userPreferences.interests) {
        data.hotels = await this.getHotels(locationId, userPreferences.amenities, userPreferences.budget, 5);
      }

      return data;

    } catch (error) {
      console.error('TripAdvisor AI data error:', error.message);
      return this.getMockTravelData(location, userPreferences);
    }
  }

  // Data processing methods
  processLocationSearch(data) {
    return data.data?.map(item => ({
      location_id: item.location_id,
      name: item.name,
      address: item.address_obj?.address_string,
      latitude: item.latitude,
      longitude: item.longitude,
      category: item.category?.key
    })) || [];
  }

  processAttractionsData(data) {
    return data.data?.map(item => ({
      location_id: item.location_id,
      name: item.name,
      rating: item.rating,
      review_count: item.num_reviews,
      price_level: item.price_level,
      category: item.category?.key,
      address: item.address_obj?.address_string,
      description: item.description,
      photo_url: item.photo?.images?.medium?.url
    })) || [];
  }

  processRestaurantsData(data) {
    return data.data?.map(item => ({
      location_id: item.location_id,
      name: item.name,
      rating: item.rating,
      review_count: item.num_reviews,
      price_level: item.price_level,
      cuisine: item.cuisine?.map(c => c.name),
      address: item.address_obj?.address_string,
      description: item.description,
      photo_url: item.photo?.images?.medium?.url,
      hours: item.hours?.weekday_text
    })) || [];
  }

  processHotelsData(data) {
    return data.data?.map(item => ({
      location_id: item.location_id,
      name: item.name,
      rating: item.rating,
      review_count: item.num_reviews,
      price_level: item.price_level,
      amenities: item.amenities?.map(a => a.name),
      address: item.address_obj?.address_string,
      description: item.description,
      photo_url: item.photo?.images?.medium?.url
    })) || [];
  }

  processLocationDetails(data) {
    return {
      location_id: data.location_id,
      name: data.name,
      description: data.description,
      rating: data.rating,
      review_count: data.num_reviews,
      address: data.address_obj?.address_string,
      latitude: data.latitude,
      longitude: data.longitude,
      photo_url: data.photo?.images?.large?.url,
      category: data.category?.key
    };
  }

  // Cache management
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Mock data methods (fallback when API is not available)
  getMockLocationData(query) {
    return [{
      location_id: 'mock_' + query.toLowerCase().replace(/\s+/g, '_'),
      name: query,
      address: `${query} City`,
      latitude: 0,
      longitude: 0,
      category: 'city'
    }];
  }

  getMockAttractionsData(locationId, category) {
    return [
      {
        location_id: locationId,
        name: 'Famous Landmark',
        rating: 4.5,
        review_count: 1250,
        price_level: '$$',
        category: 'attraction',
        address: 'Main Street',
        description: 'A must-visit landmark with historical significance.',
        photo_url: null
      },
      {
        location_id: locationId,
        name: 'Cultural Museum',
        rating: 4.2,
        review_count: 890,
        price_level: '$',
        category: 'museum',
        address: 'Cultural District',
        description: 'Explore local culture and history.',
        photo_url: null
      }
    ];
  }

  getMockRestaurantsData(locationId, cuisine) {
    return [
      {
        location_id: locationId,
        name: 'Local Bistro',
        rating: 4.3,
        review_count: 450,
        price_level: '$$',
        cuisine: [cuisine || 'Local'],
        address: 'Downtown Area',
        description: 'Authentic local cuisine with fresh ingredients.',
        photo_url: null,
        hours: ['Mon-Sun: 11:00 AM - 10:00 PM']
      }
    ];
  }

  getMockHotelsData(locationId, amenities) {
    return [
      {
        location_id: locationId,
        name: 'City Center Hotel',
        rating: 4.1,
        review_count: 320,
        price_level: '$$$',
        amenities: amenities ? [amenities] : ['WiFi', 'Pool', 'Gym'],
        address: 'City Center',
        description: 'Comfortable accommodation in the heart of the city.',
        photo_url: null
      }
    ];
  }

  getMockLocationDetails(locationId) {
    return {
      location_id: locationId,
      name: 'Sample Destination',
      description: 'A beautiful destination with rich culture and history.',
      rating: 4.4,
      review_count: 2500,
      address: 'Sample City, Country',
      latitude: 0,
      longitude: 0,
      photo_url: null,
      category: 'city'
    };
  }

  getMockTravelData(location, userPreferences) {
    return {
      location: this.getMockLocationDetails('mock_' + location.toLowerCase().replace(/\s+/g, '_')),
      attractions: this.getMockAttractionsData('mock_' + location.toLowerCase().replace(/\s+/g, '_'), 'attractions'),
      restaurants: this.getMockRestaurantsData('mock_' + location.toLowerCase().replace(/\s+/g, '_'), userPreferences.cuisine),
      hotels: this.getMockHotelsData('mock_' + location.toLowerCase().replace(/\s+/g, '_'), userPreferences.amenities)
    };
  }
}

module.exports = TripAdvisorService;
