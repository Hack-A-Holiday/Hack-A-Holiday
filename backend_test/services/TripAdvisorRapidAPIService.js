const axios = require('axios');

/**
 * TripAdvisor RapidAPI Service
 * Provides real-time travel data using RapidAPI TripAdvisor endpoints
 * Enhanced for AI agent integration with attractions, restaurants, and reviews
 */
class TripAdvisorRapidAPIService {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    this.baseUrl = 'https://tripadvisor-com1.p.rapidapi.com';
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    
    if (!this.apiKey) {
      console.warn('⚠️ RAPIDAPI_KEY not set. TripAdvisor features will use mock data. Set RAPIDAPI_KEY in backend_test/.env');
    }
  }

  /**
   * Get headers for RapidAPI requests
   */
  getHeaders() {
    return {
      'x-rapidapi-host': 'tripadvisor-com1.p.rapidapi.com',
      'x-rapidapi-key': this.apiKey
    };
  }

  /**
   * Search for attractions by geoId (location ID)
   */
  async searchAttractions(geoId, sortType = 'asc', units = 'miles') {
    try {
      const cacheKey = `attractions_${geoId}_${sortType}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      console.log(`🔍 Searching attractions for geoId: ${geoId}`);
      
      const response = await axios.get(`${this.baseUrl}/attractions/search`, {
        headers: this.getHeaders(),
        params: {
          geoId: geoId,
          units: units,
          sortType: sortType
        }
      });

      console.log(`📊 Raw API response:`, JSON.stringify(response.data, null, 2));
      
      const data = this.processAttractionsSearch(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor attractions search error:', error.message);
      console.error('Error details:', error.response?.data);
      return this.getMockAttractionsData(geoId);
    }
  }

  /**
   * Get detailed information about a specific attraction
   */
  async getAttractionDetails(contentId, units = 'miles') {
    try {
      const cacheKey = `attraction_details_${contentId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/attractions/details`, {
        headers: this.getHeaders(),
        params: {
          contentId: contentId,
          units: units
        }
      });

      const data = this.processAttractionDetails(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor attraction details error:', error.message);
      return this.getMockAttractionDetails(contentId);
    }
  }

  /**
   * Get media gallery for an attraction
   */
  async getAttractionMedia(contentId, units = 'miles') {
    try {
      const cacheKey = `attraction_media_${contentId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/attractions/media-gallery`, {
        headers: this.getHeaders(),
        params: {
          contentId: contentId,
          units: units
        }
      });

      const data = this.processAttractionMedia(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor attraction media error:', error.message);
      return [];
    }
  }

  /**
   * Get reviews for an attraction
   */
  async getAttractionReviews(contentId, units = 'miles') {
    try {
      const cacheKey = `attraction_reviews_${contentId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/attractions/reviews`, {
        headers: this.getHeaders(),
        params: {
          contentId: contentId,
          units: units
        }
      });

      const data = this.processAttractionReviews(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor attraction reviews error:', error.message);
      return [];
    }
  }

  /**
   * Search for restaurants by geoId
   */
  async searchRestaurants(geoId, sortType = 'asc', units = 'miles') {
    try {
      const cacheKey = `restaurants_${geoId}_${sortType}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      console.log(`🔍 Searching restaurants for geoId: ${geoId}`);
      
      const response = await axios.get(`${this.baseUrl}/restaurants/search`, {
        headers: this.getHeaders(),
        params: {
          geoId: geoId,
          units: units,
          sortType: sortType
        }
      });

      console.log(`📊 Raw restaurants API response:`, JSON.stringify(response.data, null, 2));
      
      const data = this.processRestaurantsSearch(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor restaurants search error:', error.message);
      console.error('Error details:', error.response?.data);
      return this.getMockRestaurantsData(geoId);
    }
  }

  /**
   * Get detailed information about a specific restaurant
   */
  async getRestaurantDetails(contentId, units = 'miles') {
    try {
      const cacheKey = `restaurant_details_${contentId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/restaurants/details`, {
        headers: this.getHeaders(),
        params: {
          contentId: contentId,
          units: units
        }
      });

      const data = this.processRestaurantDetails(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor restaurant details error:', error.message);
      return this.getMockRestaurantDetails(contentId);
    }
  }

  /**
   * Get media gallery for a restaurant
   */
  async getRestaurantMedia(contentId, units = 'miles') {
    try {
      const cacheKey = `restaurant_media_${contentId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/restaurants/media-gallery`, {
        headers: this.getHeaders(),
        params: {
          contentId: contentId,
          units: units
        }
      });

      const data = this.processRestaurantMedia(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor restaurant media error:', error.message);
      return [];
    }
  }

  /**
   * Get reviews for a restaurant
   */
  async getRestaurantReviews(contentId, units = 'miles') {
    try {
      const cacheKey = `restaurant_reviews_${contentId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/restaurants/reviews`, {
        headers: this.getHeaders(),
        params: {
          contentId: contentId,
          units: units
        }
      });

      const data = this.processRestaurantReviews(response.data);
      this.setCachedData(cacheKey, data);
      return data;

    } catch (error) {
      console.error('TripAdvisor restaurant reviews error:', error.message);
      return [];
    }
  }

  /**
   * Get comprehensive travel data for AI enhancement
   * This is the main method that the AI agent will use
   */
  async getTravelDataForAI(location, userPreferences = {}) {
    try {
      // For now, we'll use a mock geoId. In a real implementation, you'd need to
      // map location names to geoIds using a location search service
      const geoId = this.getGeoIdForLocation(location);
      
      const data = {
        location: {
          name: location,
          geoId: geoId
        },
        attractions: [],
        restaurants: []
      };

      // Get attractions
      if (userPreferences.interests?.includes('sightseeing') || !userPreferences.interests) {
        data.attractions = await this.searchAttractions(geoId);
        
        // Get detailed info for top attractions
        if (data.attractions.length > 0) {
          const topAttractions = data.attractions.slice(0, 3);
          for (let attraction of topAttractions) {
            if (attraction.contentId) {
              attraction.details = await this.getAttractionDetails(attraction.contentId);
              attraction.reviews = await this.getAttractionReviews(attraction.contentId);
            }
          }
        }
      }

      // Get restaurants
      if (userPreferences.interests?.includes('food') || !userPreferences.interests) {
        data.restaurants = await this.searchRestaurants(geoId);
        
        // Get detailed info for top restaurants
        if (data.restaurants.length > 0) {
          const topRestaurants = data.restaurants.slice(0, 3);
          for (let restaurant of topRestaurants) {
            if (restaurant.contentId) {
              restaurant.details = await this.getRestaurantDetails(restaurant.contentId);
              restaurant.reviews = await this.getRestaurantReviews(restaurant.contentId);
            }
          }
        }
      }

      return data;

    } catch (error) {
      console.error('TripAdvisor AI data error:', error.message);
      return this.getMockTravelData(location, userPreferences);
    }
  }

  /**
   * Get attractions near a location (for AI agent tool)
   */
  async getAttractionsNearby(location, limit = 5) {
    try {
      const geoId = this.getGeoIdForLocation(location);
      const attractions = await this.searchAttractions(geoId);
      
      // Get basic details for each attraction
      const detailedAttractions = [];
      for (let attraction of attractions.slice(0, limit)) {
        if (attraction.contentId) {
          const details = await this.getAttractionDetails(attraction.contentId);
          detailedAttractions.push({
            ...attraction,
            ...details
          });
        }
      }
      
      return detailedAttractions;
    } catch (error) {
      console.error('Error getting nearby attractions:', error.message);
      return this.getMockAttractionsData(this.getGeoIdForLocation(location));
    }
  }

  /**
   * Get restaurants near a location (for AI agent tool)
   */
  async getRestaurantsNearby(location, limit = 5) {
    try {
      const geoId = this.getGeoIdForLocation(location);
      const restaurants = await this.searchRestaurants(geoId);
      
      // Get basic details for each restaurant
      const detailedRestaurants = [];
      for (let restaurant of restaurants.slice(0, limit)) {
        if (restaurant.contentId) {
          const details = await this.getRestaurantDetails(restaurant.contentId);
          detailedRestaurants.push({
            ...restaurant,
            ...details
          });
        }
      }
      
      return detailedRestaurants;
    } catch (error) {
      console.error('Error getting nearby restaurants:', error.message);
      return this.getMockRestaurantsData(this.getGeoIdForLocation(location));
    }
  }

  // Data processing methods
  processAttractionsSearch(data) {
    if (!data || !data.data || !Array.isArray(data.data)) return [];
    
    return data.data.map(item => ({
      contentId: item.id || item.contentId,
      name: item.name || item.title,
      rating: item.rating || item.averageRating,
      reviewCount: item.reviewCount || item.numReviews || 0,
      priceLevel: item.priceLevel || item.price,
      category: item.category || 'attraction',
      address: item.address || item.location,
      description: item.description || item.summary,
      photoUrl: item.photoUrl || item.imageUrl,
      latitude: item.latitude,
      longitude: item.longitude,
      distance: item.distance
    }));
  }

  processAttractionDetails(data) {
    if (!data) return {};
    
    return {
      contentId: data.contentId || data.id,
      name: data.name || data.title,
      rating: data.rating || data.averageRating,
      reviewCount: data.reviewCount || data.numReviews || 0,
      priceLevel: data.priceLevel || data.price,
      category: data.category || 'attraction',
      address: data.address || data.location,
      description: data.description || data.summary,
      photoUrl: data.photoUrl || data.imageUrl,
      latitude: data.latitude,
      longitude: data.longitude,
      hours: data.hours || data.openingHours,
      website: data.website,
      phone: data.phone
    };
  }

  processAttractionMedia(data) {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(item => ({
      url: item.url || item.imageUrl,
      caption: item.caption || item.description,
      type: item.type || 'image'
    }));
  }

  processAttractionReviews(data) {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(item => ({
      rating: item.rating,
      title: item.title,
      text: item.text || item.review,
      author: item.author || item.userName,
      date: item.date || item.reviewDate,
      helpful: item.helpful || item.helpfulVotes || 0
    }));
  }

  processRestaurantsSearch(data) {
    if (!data || !data.data || !Array.isArray(data.data)) return [];
    
    return data.data.map(item => ({
      contentId: item.id || item.contentId,
      name: item.name || item.title,
      rating: item.rating || item.averageRating,
      reviewCount: item.reviewCount || item.numReviews || 0,
      priceLevel: item.priceLevel || item.price,
      cuisine: item.cuisine || item.cuisineType,
      address: item.address || item.location,
      description: item.description || item.summary,
      photoUrl: item.photoUrl || item.imageUrl,
      latitude: item.latitude,
      longitude: item.longitude,
      distance: item.distance
    }));
  }

  processRestaurantDetails(data) {
    if (!data) return {};
    
    return {
      contentId: data.contentId || data.id,
      name: data.name || data.title,
      rating: data.rating || data.averageRating,
      reviewCount: data.reviewCount || data.numReviews || 0,
      priceLevel: data.priceLevel || data.price,
      cuisine: data.cuisine || data.cuisineType,
      address: data.address || data.location,
      description: data.description || data.summary,
      photoUrl: data.photoUrl || data.imageUrl,
      latitude: data.latitude,
      longitude: data.longitude,
      hours: data.hours || data.openingHours,
      website: data.website,
      phone: data.phone,
      features: data.features || data.amenities
    };
  }

  processRestaurantMedia(data) {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(item => ({
      url: item.url || item.imageUrl,
      caption: item.caption || item.description,
      type: item.type || 'image'
    }));
  }

  processRestaurantReviews(data) {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(item => ({
      rating: item.rating,
      title: item.title,
      text: item.text || item.review,
      author: item.author || item.userName,
      date: item.date || item.reviewDate,
      helpful: item.helpful || item.helpfulVotes || 0
    }));
  }

  // Helper method to get geoId for a location
  // In a real implementation, you'd use a location search API
  getGeoIdForLocation(location) {
    // Mock geoId mapping - in production, use a proper location search service
    const locationMap = {
      'paris': '1954828',
      'london': '186338',
      'new york': '60763',
      'tokyo': '298184',
      'rome': '187791',
      'barcelona': '187497',
      'amsterdam': '188590',
      'berlin': '187275',
      'mumbai': '304554',
      'delhi': '304555',
      'bangalore': '304556',
      'goa': '304557'
    };
    
    const normalizedLocation = location.toLowerCase().trim();
    return locationMap[normalizedLocation] || '1954828'; // Default to Paris
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
  getMockAttractionsData(geoId) {
    return [
      {
        contentId: '3436969',
        name: 'Eiffel Tower',
        rating: 4.5,
        reviewCount: 125000,
        priceLevel: '$$',
        category: 'landmark',
        address: 'Champ de Mars, 7th arrondissement, Paris',
        description: 'Iconic iron lattice tower and symbol of Paris.',
        photoUrl: null,
        latitude: 48.8584,
        longitude: 2.2945
      },
      {
        contentId: '3436970',
        name: 'Louvre Museum',
        rating: 4.6,
        reviewCount: 98000,
        priceLevel: '$$',
        category: 'museum',
        address: 'Rue de Rivoli, 1st arrondissement, Paris',
        description: 'World\'s largest art museum and historic monument.',
        photoUrl: null,
        latitude: 48.8606,
        longitude: 2.3376
      }
    ];
  }

  getMockAttractionDetails(contentId) {
    return {
      contentId: contentId,
      name: 'Sample Attraction',
      rating: 4.3,
      reviewCount: 5000,
      priceLevel: '$$',
      category: 'attraction',
      address: 'Sample Address',
      description: 'A wonderful place to visit with rich history and culture.',
      photoUrl: null,
      latitude: 48.8566,
      longitude: 2.3522,
      hours: 'Daily: 9:00 AM - 6:00 PM',
      website: 'https://example.com',
      phone: '+33 1 23 45 67 89'
    };
  }

  getMockRestaurantsData(geoId) {
    return [
      {
        contentId: '27717696',
        name: 'Le Comptoir du Relais',
        rating: 4.4,
        reviewCount: 1200,
        priceLevel: '$$$',
        cuisine: ['French', 'European'],
        address: '9 Carrefour de l\'Odéon, 6th arrondissement, Paris',
        description: 'Traditional French bistro with excellent cuisine.',
        photoUrl: null,
        latitude: 48.8519,
        longitude: 2.3396
      },
      {
        contentId: '27717697',
        name: 'L\'As du Fallafel',
        rating: 4.2,
        reviewCount: 800,
        priceLevel: '$',
        cuisine: ['Middle Eastern', 'Israeli'],
        address: '34 Rue des Rosiers, 4th arrondissement, Paris',
        description: 'Famous for the best falafel in Paris.',
        photoUrl: null,
        latitude: 48.8575,
        longitude: 2.3606
      }
    ];
  }

  getMockRestaurantDetails(contentId) {
    return {
      contentId: contentId,
      name: 'Sample Restaurant',
      rating: 4.2,
      reviewCount: 300,
      priceLevel: '$$',
      cuisine: ['French', 'International'],
      address: 'Sample Restaurant Address',
      description: 'A delightful restaurant offering excellent cuisine and atmosphere.',
      photoUrl: null,
      latitude: 48.8566,
      longitude: 2.3522,
      hours: 'Mon-Sun: 12:00 PM - 11:00 PM',
      website: 'https://example-restaurant.com',
      phone: '+33 1 23 45 67 89',
      features: ['Outdoor Seating', 'WiFi', 'Reservations']
    };
  }

  getMockTravelData(location, userPreferences) {
    const geoId = this.getGeoIdForLocation(location);
    return {
      location: {
        name: location,
        geoId: geoId
      },
      attractions: this.getMockAttractionsData(geoId),
      restaurants: this.getMockRestaurantsData(geoId)
    };
  }
}

module.exports = TripAdvisorRapidAPIService;
