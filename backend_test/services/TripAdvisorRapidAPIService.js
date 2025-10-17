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
   * Get location reviews using TripAdvisor Content API
   * @param {string} locationId - TripAdvisor location ID
   * @param {number} limit - Number of reviews to return (default: 5)
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Array>} Array of review objects
   */
  async getLocationReviews(locationId, limit = 5, language = 'en') {
    try {
      const cacheKey = `location_reviews_${locationId}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for location reviews: ${locationId}`);
        return cached;
      }

      console.log(`📝 Fetching reviews for location: ${locationId}`);
      
      if (!this.contentApiKey) {
        console.warn('⚠️ No Content API key, returning mock reviews');
        return this.getMockLocationReviews(locationId);
      }

      const response = await this.fetchWithRetry(async () => {
        return await axios.get(
          `${this.contentApiBaseUrl}/location/${locationId}/reviews`,
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

      const reviews = this.formatLocationReviews(response.data);
      this.setCachedData(cacheKey, reviews);
      
      console.log(`✅ Successfully fetched ${reviews.length} reviews`);
      return reviews;

    } catch (error) {
      console.error('❌ TripAdvisor Content API error (reviews):', error.message);
      
      if (error.response?.status === 404) {
        console.warn(`⚠️ No reviews found for location ${locationId}`);
        return [];
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      // Return empty array or mock reviews as fallback
      return this.getMockLocationReviews(locationId);
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
   * Format location reviews from Content API response
   * @param {Object} data - Raw API response
   * @returns {Array} Formatted review array
   */
  formatLocationReviews(data) {
    if (!data || !data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map(review => ({
      id: review.id,
      rating: review.rating || 0,
      title: review.title || '',
      text: review.text || '',
      author: {
        username: review.author?.username || 'Anonymous',
        localized_name: review.author?.localized_name || 'Anonymous',
        avatar: review.author?.avatar || null
      },
      published_date: review.published_date || '',
      helpful_votes: review.helpful_votes || 0,
      total_votes: review.total_votes || 0,
      is_machine_translated: review.is_machine_translated || false,
      language: review.language || 'en',
      trip_type: review.trip_type || '',
      rating_date: review.rating_date || '',
      review_url: review.review_url || '',
      is_anonymous: review.is_anonymous || false,
      user_contribution: review.user_contribution || 0,
      photos: review.photos || [],
      awards: review.awards || []
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
      'india': '293860',
      'delhi': '304555',
      'mumbai': '304554',
      'bangalore': '304556',
      'goa': '304557',
      'kerala': '304558',
      'agra': '304559',
      'jaipur': '304560',
      'varanasi': '304561',
      'kolkata': '304562'
    };
    
    const normalizedLocation = location.toLowerCase().trim();
    
    // Direct match first
    if (locationMap[normalizedLocation]) {
      return locationMap[normalizedLocation];
    }
    
    // Partial match for common patterns
    for (const [key, geoId] of Object.entries(locationMap)) {
      if (normalizedLocation.includes(key) || key.includes(normalizedLocation)) {
        return geoId;
      }
    }
    
    // Default to India for unknown locations
    return '293860';
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
    // Mumbai/Bombay specific attractions
    if (geoId === '1954828' || geoId === '304554') {
      return [
        {
          contentId: '3436969',
          name: 'Gateway of India',
          rating: 4.1,
          review_count: 55000,
          category: 'Monument',
          price_level: 'Free',
          address: 'Apollo Bunder, Colaba, Mumbai',
          description: 'Historic arch monument overlooking the Arabian Sea, built to commemorate the visit of King George V and Queen Mary',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319507-Reviews-Gateway_of_India-Mumbai_Maharashtra.html'
        },
        {
          contentId: '3436970',
          name: 'Elephanta Caves',
          rating: 4.2,
          review_count: 32000,
          category: 'UNESCO World Heritage Site',
          price_level: '$$',
          address: 'Elephanta Island, Mumbai',
          description: 'Ancient rock-cut cave temples dedicated to Lord Shiva, accessible by ferry from Gateway of India',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319508-Reviews-Elephanta_Caves-Mumbai_Maharashtra.html'
        },
        {
          contentId: '3436971',
          name: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya',
          rating: 4.3,
          review_count: 28000,
          category: 'Museum',
          price_level: '$',
          address: '159-161, Mahatma Gandhi Road, Fort, Mumbai',
          description: 'Formerly Prince of Wales Museum, houses extensive collection of Indian art and artifacts',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319509-Reviews-Chhatrapati_Shivaji_Maharaj_Vastu_Sangrahalaya-Mumbai_Maharashtra.html'
        },
        {
          contentId: '3436972',
          name: 'Marine Drive',
          rating: 4.0,
          review_count: 45000,
          category: 'Scenic Walkway',
          price_level: 'Free',
          address: 'Marine Drive, Mumbai',
          description: 'Famous 3.6km long boulevard along the Arabian Sea, known as the "Queen\'s Necklace"',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319510-Reviews-Marine_Drive-Mumbai_Maharashtra.html'
        },
        {
          contentId: '3436973',
          name: 'Haji Ali Dargah',
          rating: 4.1,
          review_count: 18000,
          category: 'Religious Site',
          price_level: 'Free',
          address: 'Dargah Road, Haji Ali, Mumbai',
          description: 'Famous mosque and dargah located on an islet off the coast of Worli',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319511-Reviews-Haji_Ali_Dargah-Mumbai_Maharashtra.html'
        }
      ];
    }
    
    // India-specific attractions
    if (geoId === '293860' || geoId.startsWith('304')) {
      return [
        {
          contentId: '3436969',
          name: 'Taj Mahal',
          rating: 4.7,
          review_count: 125000,
          category: 'Monument',
          price_level: '$$',
          address: 'Agra, Uttar Pradesh, India',
          description: 'Iconic white marble mausoleum, one of the Seven Wonders of the World',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g297683-d319504-Reviews-Taj_Mahal-Agra_Uttar_Pradesh.html'
        },
        {
          contentId: '3436970',
          name: 'Red Fort',
          rating: 4.3,
          review_count: 45000,
          category: 'Historic Site',
          price_level: '$',
          address: 'Old Delhi, Delhi, India',
          description: 'Historic fort complex, UNESCO World Heritage Site',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304551-d319505-Reviews-Red_Fort-Delhi.html'
        },
        {
          contentId: '3436971',
          name: 'Qutub Minar',
          rating: 4.2,
          review_count: 38000,
          category: 'Monument',
          price_level: '$',
          address: 'Mehrauli, Delhi, India',
          description: 'Tallest brick minaret in the world, UNESCO World Heritage Site',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304551-d319506-Reviews-Qutub_Minar-Delhi.html'
        },
        {
          contentId: '3436972',
          name: 'Gateway of India',
          rating: 4.1,
          review_count: 55000,
          category: 'Monument',
          price_level: 'Free',
          address: 'Mumbai, Maharashtra, India',
          description: 'Historic arch monument overlooking the Arabian Sea',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319507-Reviews-Gateway_of_India-Mumbai_Maharashtra.html'
        },
        {
          contentId: '3436973',
          name: 'Hawa Mahal',
          rating: 4.0,
          review_count: 28000,
          category: 'Palace',
          price_level: '$',
          address: 'Jaipur, Rajasthan, India',
          description: 'Palace of Winds, famous for its intricate lattice windows',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304560-d319508-Reviews-Hawa_Mahal-Jaipur_Rajasthan.html'
        }
      ];
    }
    
    // Default Paris attractions
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
    // Mumbai/Bombay specific restaurants
    if (geoId === '1954828' || geoId === '304554') {
      return [
        {
          contentId: '27717696',
          name: 'Trishna',
          rating: 4.4,
          review_count: 6800,
          cuisine: ['Indian', 'Seafood', 'Coastal'],
          price_level: '$$',
          address: '7, Sai Baba Marg, Kala Ghoda, Mumbai',
          description: 'Famous for coastal Indian seafood and spicy curries, a Mumbai institution since 1960s',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304554-d1234569-Reviews-Trishna-Mumbai_Maharashtra.html'
        },
        {
          contentId: '27717697',
          name: 'Bademiya',
          rating: 4.2,
          review_count: 4200,
          cuisine: ['Indian', 'Mughlai', 'Street Food'],
          price_level: '$',
          address: 'Tulloch Road, Apollo Bunder, Mumbai',
          description: 'Legendary street food joint famous for kebabs and rolls, open late night',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304554-d1234570-Reviews-Bademiya-Mumbai_Maharashtra.html'
        },
        {
          contentId: '27717698',
          name: 'Cafe Leopold',
          rating: 4.1,
          review_count: 3200,
          cuisine: ['Indian', 'Continental', 'Cafe'],
          price_level: '$$',
          address: 'Shahid Bhagat Singh Road, Colaba, Mumbai',
          description: 'Historic cafe from 1871, famous for its old-world charm and diverse menu',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304554-d1234571-Reviews-Cafe_Leopold-Mumbai_Maharashtra.html'
        },
        {
          contentId: '27717699',
          name: 'Britannia & Co.',
          rating: 4.3,
          review_count: 1800,
          cuisine: ['Parsi', 'Indian', 'Traditional'],
          price_level: '$$',
          address: 'Wakefield House, 16, Ballard Estate, Mumbai',
          description: 'Iconic Parsi restaurant serving authentic berry pulao and dhansak',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304554-d1234572-Reviews-Britannia_Co-Mumbai_Maharashtra.html'
        },
        {
          contentId: '27717700',
          name: 'Gajalee',
          rating: 4.2,
          review_count: 2500,
          cuisine: ['Indian', 'Seafood', 'Maharashtrian'],
          price_level: '$$',
          address: 'Juhu Beach, Mumbai',
          description: 'Beachside restaurant famous for fresh seafood and traditional Maharashtrian dishes',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304554-d1234573-Reviews-Gajalee-Mumbai_Maharashtra.html'
        }
      ];
    }
    
    // India-specific restaurants
    if (geoId === '293860' || geoId.startsWith('304')) {
      return [
        {
          contentId: '27717696',
          name: 'Karim\'s',
          rating: 4.3,
          review_count: 8500,
          cuisine: ['Indian', 'Mughlai', 'Halal'],
          price_level: '$$',
          address: '16, Gali Kababian, Jama Masjid, Delhi',
          description: 'Famous for authentic Mughlai cuisine and kebabs since 1913',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304551-d1234567-Reviews-Karim_s-Delhi.html'
        },
        {
          contentId: '27717697',
          name: 'Bukhara',
          rating: 4.6,
          review_count: 12000,
          cuisine: ['Indian', 'North Indian', 'Tandoor'],
          price_level: '$$$',
          address: 'ITC Maurya, Sardar Patel Marg, Delhi',
          description: 'Award-winning restaurant known for its tandoor specialties',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304551-d1234568-Reviews-Bukhara-Delhi.html'
        },
        {
          contentId: '27717698',
          name: 'Trishna',
          rating: 4.4,
          review_count: 6800,
          cuisine: ['Indian', 'Seafood', 'Coastal'],
          price_level: '$$',
          address: '7, Sai Baba Marg, Kala Ghoda, Mumbai',
          description: 'Famous for coastal Indian seafood and spicy curries',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304554-d1234569-Reviews-Trishna-Mumbai_Maharashtra.html'
        },
        {
          contentId: '27717699',
          name: 'Laxmi Vilas Palace',
          rating: 4.2,
          review_count: 4200,
          cuisine: ['Indian', 'Rajasthani', 'Royal'],
          price_level: '$$$',
          address: 'Udaipur, Rajasthan',
          description: 'Royal dining experience with traditional Rajasthani cuisine',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304560-d1234570-Reviews-Laxmi_Vilas_Palace-Jaipur_Rajasthan.html'
        },
        {
          contentId: '27717700',
          name: 'Paragon Restaurant',
          rating: 4.1,
          review_count: 5600,
          cuisine: ['Indian', 'Kerala', 'South Indian'],
          price_level: '$$',
          address: 'Kochi, Kerala',
          description: 'Authentic Kerala cuisine with traditional flavors and spices',
          web_url: 'https://www.tripadvisor.com/Restaurant_Review-g304558-d1234571-Reviews-Paragon_Restaurant-Kochi_Kerala.html'
        }
      ];
    }
    
    // Default Paris restaurants
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

  /**
   * Mock location reviews for fallback
   */
  getMockLocationReviews(locationId) {
    return [
      {
        id: 1,
        rating: 5,
        title: 'Absolutely Amazing Experience!',
        text: 'This place exceeded all my expectations. The staff was incredibly friendly and the atmosphere was perfect. I would definitely recommend this to anyone visiting the area.',
        author: {
          username: 'traveler123',
          localized_name: 'Sarah M.',
          avatar: null
        },
        published_date: '2024-01-15',
        helpful_votes: 12,
        total_votes: 15,
        is_machine_translated: false,
        language: 'en',
        trip_type: 'Couples',
        rating_date: '2024-01-15',
        review_url: 'https://www.tripadvisor.com/sample-review-1',
        is_anonymous: false,
        user_contribution: 5,
        photos: [],
        awards: []
      },
      {
        id: 2,
        rating: 4,
        title: 'Great place with minor issues',
        text: 'Overall a wonderful experience. The food was excellent and the service was good. The only downside was the wait time, but it was worth it in the end.',
        author: {
          username: 'foodie456',
          localized_name: 'Mike R.',
          avatar: null
        },
        published_date: '2024-01-12',
        helpful_votes: 8,
        total_votes: 10,
        is_machine_translated: false,
        language: 'en',
        trip_type: 'Friends',
        rating_date: '2024-01-12',
        review_url: 'https://www.tripadvisor.com/sample-review-2',
        is_anonymous: false,
        user_contribution: 3,
        photos: [],
        awards: []
      },
      {
        id: 3,
        rating: 5,
        title: 'Perfect for families',
        text: 'Took my family here and everyone loved it. The kids had a great time and the adults enjoyed the experience as well. Highly recommended for family outings.',
        author: {
          username: 'family_traveler',
          localized_name: 'Jennifer L.',
          avatar: null
        },
        published_date: '2024-01-10',
        helpful_votes: 15,
        total_votes: 18,
        is_machine_translated: false,
        language: 'en',
        trip_type: 'Family',
        rating_date: '2024-01-10',
        review_url: 'https://www.tripadvisor.com/sample-review-3',
        is_anonymous: false,
        user_contribution: 7,
        photos: [],
        awards: []
      }
    ];
  }

  /**
   * Search for locations using TripAdvisor Content API
   * @param {string} searchQuery - Search query
   * @param {number} limit - Maximum number of results
   * @param {string} language - Language code
   * @returns {Array} Array of location objects
   */
  async searchLocations(searchQuery, limit = 10, language = 'en') {
    try {
      const cacheKey = `location_search_${searchQuery}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for location search: ${searchQuery}`);
        return cached;
      }

      console.log(`🔍 Searching locations for: ${searchQuery}`);

      if (!this.contentApiKey) {
        console.warn('⚠️ No Content API key, returning mock search results');
        return this.getMockLocationSearch(searchQuery);
      }

      const response = await this.fetchWithRetry(async () => {
        return await axios.get(
          `${this.contentApiBaseUrl}/location/search`,
          {
            params: {
              key: this.contentApiKey,
              searchQuery,
              language,
              limit
            },
            timeout: 10000
          }
        );
      });

      const locations = this.formatLocationSearch(response.data);
      this.setCachedData(cacheKey, locations);

      console.log(`✅ Successfully found ${locations.length} locations`);
      return locations;

    } catch (error) {
      console.error('❌ TripAdvisor Content API error (search):', error.message);

      if (error.response?.status === 404) {
        console.warn(`⚠️ No locations found for: ${searchQuery}`);
        return [];
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Return mock data as fallback
      return this.getMockLocationSearch(searchQuery);
    }
  }

  /**
   * Format location search results from Content API response
   * @param {Object} data - Raw API response
   * @returns {Array} Formatted location search results
   */
  formatLocationSearch(data) {
    if (!data || !data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map(location => ({
      location_id: location.location_id,
      name: location.name || 'Unknown Location',
      address: location.address_obj?.address_string || '',
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
      category: location.category?.name || 'location',
      rating: location.rating || 0,
      num_reviews: location.num_reviews || 0,
      price_level: location.price_level || '',
      distance: location.distance || null,
      distance_string: location.distance_string || null
    }));
  }

  /**
   * Get mock location search results
   * @param {string} searchQuery - Search query
   * @returns {Array} Mock location search results
   */
  getMockLocationSearch(searchQuery) {
    const mockLocations = {
      'paris': [
        {
          location_id: '187147',
          name: 'Paris',
          address: 'Paris, France',
          latitude: 48.8566,
          longitude: 2.3522,
          category: 'city',
          rating: 4.5,
          num_reviews: 50000,
          price_level: '$$',
          distance: null,
          distance_string: null
        }
      ],
      'tokyo': [
        {
          location_id: '298184',
          name: 'Tokyo',
          address: 'Tokyo, Japan',
          latitude: 35.6762,
          longitude: 139.6503,
          category: 'city',
          rating: 4.6,
          num_reviews: 45000,
          price_level: '$$$',
          distance: null,
          distance_string: null
        }
      ],
      'new york': [
        {
          location_id: '60763',
          name: 'New York City',
          address: 'New York, NY, USA',
          latitude: 40.7128,
          longitude: -74.0060,
          category: 'city',
          rating: 4.4,
          num_reviews: 60000,
          price_level: '$$$',
          distance: null,
          distance_string: null
        }
      ]
    };

    const query = searchQuery.toLowerCase();
    for (const [key, locations] of Object.entries(mockLocations)) {
      if (query.includes(key)) {
        return locations;
      }
    }

    // Default mock result
    return [
      {
        location_id: '123456',
        name: searchQuery,
        address: `${searchQuery}`,
        latitude: 0,
        longitude: 0,
        category: 'location',
        rating: 4.0,
        num_reviews: 100,
        price_level: '$$',
        distance: null,
        distance_string: null
      }
    ];
  }
}

module.exports = TripAdvisorRapidAPIService;
