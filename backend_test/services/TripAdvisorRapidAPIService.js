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
    
    // TripAdvisor Content API configuration
    this.contentApiKey = process.env.TRIPADVISOR_API_KEY || '';
    this.contentApiBaseUrl = 'https://api.content.tripadvisor.com/api/v1';
    
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = parseInt(process.env.TRIPADVISOR_CACHE_TTL) || 10 * 60 * 1000; // 10 minutes default
    
    if (!this.apiKey) {
      console.warn('⚠️ RAPIDAPI_KEY not set. TripAdvisor features will use mock data. Set RAPIDAPI_KEY in backend_test/.env');
    }
    
    if (!this.contentApiKey) {
      console.warn('⚠️ TRIPADVISOR_API_KEY not set. Location details and photos will use mock data.');
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
   * Fetch with retry logic and exponential backoff
   */
  async fetchWithRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`⚠️ Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Get location details using TripAdvisor Content API
   * @param {string} locationId - TripAdvisor location ID
   * @param {string} language - Language code (default: 'en')
   * @param {string} currency - Currency code (default: 'USD')
   * @returns {Promise<Object>} Formatted location details
   */
  async getLocationDetails(locationId, language = 'en', currency = 'USD') {
    try {
      const cacheKey = `location_details_${locationId}_${language}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for location details: ${locationId}`);
        return cached;
      }

      console.log(`🔍 Fetching location details for: ${locationId}`);
      
      if (!this.contentApiKey) {
        console.warn('⚠️ No Content API key, returning mock data');
        return this.getMockLocationDetails(locationId);
      }

      const response = await this.fetchWithRetry(async () => {
        return await axios.get(
          `${this.contentApiBaseUrl}/location/${locationId}/details`,
          {
            params: {
              key: this.contentApiKey,
              language,
              currency
            },
            timeout: 10000 // 10 second timeout
          }
        );
      });

      const formatted = this.formatLocationDetails(response.data);
      this.setCachedData(cacheKey, formatted);
      
      console.log(`✅ Successfully fetched location details for: ${formatted.name}`);
      return formatted;

    } catch (error) {
      console.error('❌ TripAdvisor Content API error (location details):', error.message);
      
      if (error.response?.status === 404) {
        throw new Error(`Location ${locationId} not found`);
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      }
      
      // Return mock data as fallback
      return this.getMockLocationDetails(locationId);
    }
  }

  /**
   * Get location photos using TripAdvisor Content API
   * @param {string} locationId - TripAdvisor location ID
   * @param {number} limit - Number of photos to return (default: 5)
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Array>} Array of photo objects
   */
  async getLocationPhotos(locationId, limit = 5, language = 'en') {
    try {
      const cacheKey = `location_photos_${locationId}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for location photos: ${locationId}`);
        return cached;
      }

      console.log(`📸 Fetching photos for location: ${locationId}`);
      
      if (!this.contentApiKey) {
        console.warn('⚠️ No Content API key, returning mock photos');
        return this.getMockLocationPhotos(locationId);
      }

      const response = await this.fetchWithRetry(async () => {
        return await axios.get(
          `${this.contentApiBaseUrl}/location/${locationId}/photos`,
          {
            params: {
              key: this.contentApiKey,
              language,
              limit
            },
            timeout: 10000
          }
        );
      });

      const photos = this.formatLocationPhotos(response.data);
      this.setCachedData(cacheKey, photos);
      
      console.log(`✅ Successfully fetched ${photos.length} photos`);
      return photos;

    } catch (error) {
      console.error('❌ TripAdvisor Content API error (photos):', error.message);
      
      if (error.response?.status === 404) {
        console.warn(`⚠️ No photos found for location ${locationId}`);
        return [];
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      // Return empty array or mock photos as fallback
      return this.getMockLocationPhotos(locationId);
    }
  }

  /**
   * Format location details from Content API response
   * @param {Object} data - Raw API response
   * @returns {Object} Formatted location details
   */
  formatLocationDetails(data) {
    return {
      location_id: data.location_id,
      name: data.name || 'Unknown Location',
      description: data.description || '',
      rating: data.rating || 0,
      num_reviews: data.num_reviews || 0,
      review_rating_count: data.review_rating_count || {},
      address: data.address_obj?.address_string || '',
      address_obj: {
        street1: data.address_obj?.street1 || '',
        street2: data.address_obj?.street2 || '',
        city: data.address_obj?.city || '',
        state: data.address_obj?.state || '',
        country: data.address_obj?.country || '',
        postalcode: data.address_obj?.postalcode || ''
      },
      phone: data.phone || '',
      website: data.website || '',
      email: data.email || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      timezone: data.timezone || '',
      hours: data.hours || null,
      amenities: data.amenities || [],
      features: data.features || [],
      cuisine: data.cuisine?.map(c => ({
        name: c.name,
        localized_name: c.localized_name
      })) || [],
      price_level: data.price_level || '',
      ranking_data: data.ranking_data || null,
      awards: data.awards || [],
      category: data.category || {},
      subcategory: data.subcategory || [],
      groups: data.groups || [],
      styles: data.styles || [],
      neighborhood_info: data.neighborhood_info || [],
      trip_types: data.trip_types || [],
      web_url: data.web_url || '',
      write_review: data.write_review || '',
      ancestors: data.ancestors || [],
      parent_brand: data.parent_brand || '',
      brand: data.brand || ''
    };
  }

  /**
   * Format location photos from Content API response
   * @param {Object} data - Raw API response
   * @returns {Array} Formatted photo array
   */
  formatLocationPhotos(data) {
    if (!data || !data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map(photo => ({
      id: photo.id,
      is_blessed: photo.is_blessed || false,
      album: photo.album || '',
      caption: photo.caption || '',
      published_date: photo.published_date || '',
      images: {
        thumbnail: {
          url: photo.images?.thumbnail?.url || '',
          width: photo.images?.thumbnail?.width || 0,
          height: photo.images?.thumbnail?.height || 0
        },
        small: {
          url: photo.images?.small?.url || '',
          width: photo.images?.small?.width || 0,
          height: photo.images?.small?.height || 0
        },
        medium: {
          url: photo.images?.medium?.url || '',
          width: photo.images?.medium?.width || 0,
          height: photo.images?.medium?.height || 0
        },
        large: {
          url: photo.images?.large?.url || '',
          width: photo.images?.large?.width || 0,
          height: photo.images?.large?.height || 0
        },
        original: {
          url: photo.images?.original?.url || '',
          width: photo.images?.original?.width || 0,
          height: photo.images?.original?.height || 0
        }
      },
      source: photo.source || {},
      user: photo.user || {}
    }));
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

  /**
   * Mock location details for fallback
   */
  getMockLocationDetails(locationId) {
    return {
      location_id: locationId,
      name: 'Sample Location',
      description: 'A wonderful place to visit with rich history and culture. This location offers a unique experience for travelers.',
      rating: 4.5,
      num_reviews: 1250,
      review_rating_count: {
        '1': 25,
        '2': 50,
        '3': 150,
        '4': 400,
        '5': 625
      },
      address: '123 Sample Street, Sample City',
      address_obj: {
        street1: '123 Sample Street',
        street2: '',
        city: 'Sample City',
        state: 'Sample State',
        country: 'Sample Country',
        postalcode: '12345'
      },
      phone: '+1 234-567-8900',
      website: 'https://example.com',
      email: 'info@example.com',
      latitude: 48.8566,
      longitude: 2.3522,
      timezone: 'Europe/Paris',
      hours: {
        weekday_text: [
          'Monday: 9:00 AM – 6:00 PM',
          'Tuesday: 9:00 AM – 6:00 PM',
          'Wednesday: 9:00 AM – 6:00 PM',
          'Thursday: 9:00 AM – 6:00 PM',
          'Friday: 9:00 AM – 6:00 PM',
          'Saturday: 10:00 AM – 5:00 PM',
          'Sunday: Closed'
        ]
      },
      amenities: ['WiFi', 'Parking', 'Wheelchair Accessible'],
      features: ['Family Friendly', 'Good for Groups'],
      cuisine: [
        { name: 'French', localized_name: 'French' },
        { name: 'European', localized_name: 'European' }
      ],
      price_level: '$$',
      ranking_data: {
        geo_location_id: '187147',
        ranking_string: '#5 of 500 things to do in Sample City',
        geo_location_name: 'Sample City',
        ranking_out_of: 500,
        ranking: 5
      },
      awards: [],
      category: {
        name: 'attraction',
        localized_name: 'Attraction'
      },
      subcategory: [],
      groups: [],
      styles: [],
      neighborhood_info: [],
      trip_types: [],
      web_url: 'https://www.tripadvisor.com/sample',
      write_review: 'https://www.tripadvisor.com/sample/review',
      ancestors: [],
      parent_brand: '',
      brand: ''
    };
  }

  /**
   * Mock location photos for fallback
   */
  getMockLocationPhotos(locationId) {
    return [
      {
        id: 1,
        is_blessed: true,
        album: 'Sample Album',
        caption: 'Beautiful view of the location',
        published_date: '2024-01-15',
        images: {
          thumbnail: {
            url: 'https://via.placeholder.com/50x50',
            width: 50,
            height: 50
          },
          small: {
            url: 'https://via.placeholder.com/150x150',
            width: 150,
            height: 150
          },
          medium: {
            url: 'https://via.placeholder.com/250x250',
            width: 250,
            height: 250
          },
          large: {
            url: 'https://via.placeholder.com/550x550',
            width: 550,
            height: 550
          },
          original: {
            url: 'https://via.placeholder.com/1200x800',
            width: 1200,
            height: 800
          }
        },
        source: {
          name: 'Traveler',
          localized_name: 'Traveler'
        },
        user: {
          username: 'sample_user'
        }
      },
      {
        id: 2,
        is_blessed: false,
        album: 'Sample Album',
        caption: 'Interior view',
        published_date: '2024-01-10',
        images: {
          thumbnail: {
            url: 'https://via.placeholder.com/50x50',
            width: 50,
            height: 50
          },
          small: {
            url: 'https://via.placeholder.com/150x150',
            width: 150,
            height: 150
          },
          medium: {
            url: 'https://via.placeholder.com/250x250',
            width: 250,
            height: 250
          },
          large: {
            url: 'https://via.placeholder.com/550x550',
            width: 550,
            height: 550
          },
          original: {
            url: 'https://via.placeholder.com/1200x800',
            width: 1200,
            height: 800
          }
        },
        source: {
          name: 'Management',
          localized_name: 'Management'
        },
        user: {
          username: 'location_manager'
        }
      }
    ];
  }
}

module.exports = TripAdvisorRapidAPIService;
