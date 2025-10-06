const axios = require('axios');

/**
 * Hotel Search Service for Express Backend
 * Handles hotel API integration with intelligent fallback
 */
class HotelService {
  constructor(config) {
    this.bookingApiKey = config.bookingApiKey;
    this.bookingApiHost = config.bookingApiHost || 'booking-com15.p.rapidapi.com';
    this.rapidApiKey = config.rapidApiKey;
    this.mockDataEnabled = !this.bookingApiKey && !this.rapidApiKey;
    
    console.log('HotelService initialized:', {
      bookingApiAvailable: !!this.bookingApiKey,
      bookingApiHost: this.bookingApiHost,
      rapidApiAvailable: !!this.rapidApiKey,
      mockDataEnabled: this.mockDataEnabled
    });
  }

  /**
   * Search hotels with multiple providers and fallback
   */
  async searchHotelsEnhanced(searchRequest) {
    const searchStartTime = Date.now();
    
    try {
      // Try Booking.com API first (via RapidAPI)
      if (this.bookingApiKey || this.rapidApiKey) {
        try {
          const bookingResults = await this.searchBookingHotels(searchRequest);
          return {
            ...bookingResults,
            searchStartTime,
            provider: 'booking.com',
            fallbackUsed: false
          };
        } catch (error) {
          console.log('Booking API failed, using mock data...', error.message);
        }
      }

      // Use enhanced mock data as fallback
      const mockResults = await this.generateEnhancedMockData(searchRequest);
      return {
        ...mockResults,
        searchStartTime,
        provider: 'mock',
        fallbackUsed: true,
        fallbackReason: 'External APIs unavailable'
      };

    } catch (error) {
      console.error('All hotel search methods failed:', error);
      throw new Error('Hotel search service temporarily unavailable');
    }
  }

  /**
   * Search hotels using Booking.com API (via RapidAPI)
   */
  async searchBookingHotels(searchRequest) {
    const {
      destination,
      checkIn,
      checkOut,
      adults = 2,
      children = 0,
      rooms = 1,
      currency = 'USD'
    } = searchRequest;

    // Get destination coordinates
    const destCoords = this.getDestinationCoordinates(destination);

    const params = {
      latitude: destCoords.latitude,
      longitude: destCoords.longitude,
      checkin_date: checkIn,
      checkout_date: checkOut,
      adults_number: adults,
      children_number: children,
      room_number: rooms,
      units: 'metric',
      page_number: 0,
      filter_by_currency: currency,
      locale: 'en-us',
      order_by: 'popularity'
    };

    const apiKey = this.bookingApiKey || this.rapidApiKey;
    
    const response = await axios.get(`https://${this.bookingApiHost}/v1/hotels/search-by-coordinates`, {
      params,
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': this.bookingApiHost
      },
      timeout: 30000
    });

    const hotels = (response.data.result || []).map((hotel, index) => ({
      id: `booking-${hotel.hotel_id || index}`,
      name: hotel.hotel_name || 'Hotel',
      address: hotel.address || '',
      cityName: hotel.city || destination,
      rating: hotel.review_score ? hotel.review_score / 10 : 7.5,
      reviewScore: hotel.review_score || 75,
      reviewCount: hotel.review_nr || 100,
      pricePerNight: Math.round(hotel.min_total_price / this.calculateNights(checkIn, checkOut)),
      totalPrice: Math.round(hotel.min_total_price || 0),
      currency: hotel.currencycode || currency,
      imageUrl: hotel.main_photo_url || '',
      amenities: this.parseAmenities(hotel),
      distanceFromCenter: hotel.distance ? `${hotel.distance} km` : null,
      distanceValue: hotel.distance || null,
      freeCancellation: hotel.is_free_cancellable === 1,
      breakfastIncluded: hotel.is_breakfast_included === 1,
      roomType: hotel.accommodation_type_name || 'Room',
      coordinates: {
        latitude: hotel.latitude,
        longitude: hotel.longitude
      },
      bookingUrl: hotel.url || null,
      checkinTime: hotel.checkin?.from || '15:00',
      checkoutTime: hotel.checkout?.until || '11:00',
      propertyType: hotel.accommodation_type_name || 'Hotel'
    }));

    return {
      success: true,
      hotels,
      totalResults: hotels.length,
      searchId: `booking-search-${Date.now()}`,
      currency,
      destination: destCoords.cityName
    };
  }

  /**
   * Generate enhanced mock hotel data when APIs are unavailable
   */
  async generateEnhancedMockData(searchRequest) {
    const {
      destination,
      checkIn,
      checkOut,
      adults = 2,
      rooms = 1,
      currency = 'USD'
    } = searchRequest;

    const hotelNames = [
      'Grand Palace Hotel', 'Riverside Boutique', 'City Center Inn',
      'Luxury Suites', 'Harbor View Hotel', 'Mountain Lodge',
      'Downtown Residence', 'Garden Hotel & Spa', 'Royal Crown Hotel',
      'Oceanfront Resort', 'Historic Manor Hotel', 'Modern Sky Hotel',
      'Comfort Inn & Suites', 'Executive Plaza', 'Heritage Hotel'
    ];

    const amenitiesOptions = [
      ['Free WiFi', 'Parking', 'Restaurant', 'Bar'],
      ['Pool', 'Spa', 'Gym', 'Room Service'],
      ['Airport Shuttle', 'Business Center', 'Concierge'],
      ['Pet Friendly', '24hr Reception', 'Breakfast', 'Laundry']
    ];

    const nights = this.calculateNights(checkIn, checkOut);
    const hotels = [];
    
    // Generate price based on destination
    const basePrice = this.estimateBaseHotelPrice(destination);

    for (let i = 0; i < 15; i++) {
      const priceMultiplier = 0.6 + (Math.random() * 0.8);
      const pricePerNight = Math.round(basePrice * priceMultiplier);
      const rating = 6 + Math.random() * 4; // 6-10 rating

      hotels.push({
        id: `mock-hotel-${i}`,
        name: hotelNames[i] || `Hotel ${destination} ${i}`,
        address: `${100 + i * 10} Main Street, ${destination}`,
        cityName: destination,
        rating: parseFloat(rating.toFixed(1)),
        reviewScore: parseFloat((rating * 10).toFixed(1)),
        reviewCount: Math.floor(50 + Math.random() * 500),
        pricePerNight,
        totalPrice: pricePerNight * nights,
        currency,
        imageUrl: null,
        amenities: amenitiesOptions[i % amenitiesOptions.length],
        distanceFromCenter: `${(0.5 + Math.random() * 3).toFixed(1)} km`,
        distanceValue: parseFloat((0.5 + Math.random() * 3).toFixed(1)),
        freeCancellation: Math.random() < 0.7,
        breakfastIncluded: Math.random() < 0.5,
        roomType: ['Standard Room', 'Deluxe Room', 'Suite', 'Executive Room'][Math.floor(Math.random() * 4)],
        coordinates: null,
        bookingUrl: null,
        checkinTime: '15:00',
        checkoutTime: '11:00',
        propertyType: ['Hotel', 'Apartment', 'Resort', 'Boutique Hotel'][Math.floor(Math.random() * 4)]
      });
    }

    // Sort by rating
    hotels.sort((a, b) => b.rating - a.rating);

    return {
      success: true,
      hotels,
      totalResults: hotels.length,
      searchId: `mock-search-${Date.now()}`,
      currency,
      destination
    };
  }

  /**
   * Helper: Get destination coordinates
   */
  getDestinationCoordinates(destination) {
    const coordinates = {
      'london': { latitude: 51.5074, longitude: -0.1278, cityName: 'London' },
      'paris': { latitude: 48.8566, longitude: 2.3522, cityName: 'Paris' },
      'new york': { latitude: 40.7128, longitude: -74.0060, cityName: 'New York' },
      'tokyo': { latitude: 35.6762, longitude: 139.6503, cityName: 'Tokyo' },
      'dubai': { latitude: 25.2048, longitude: 55.2708, cityName: 'Dubai' },
      'sydney': { latitude: -33.8688, longitude: 151.2093, cityName: 'Sydney' },
      'singapore': { latitude: 1.3521, longitude: 103.8198, cityName: 'Singapore' },
      'rome': { latitude: 41.9028, longitude: 12.4964, cityName: 'Rome' },
      'barcelona': { latitude: 41.3851, longitude: 2.1734, cityName: 'Barcelona' },
      'amsterdam': { latitude: 52.3676, longitude: 4.9041, cityName: 'Amsterdam' },
      'istanbul': { latitude: 41.0082, longitude: 28.9784, cityName: 'Istanbul' },
      'bangkok': { latitude: 13.7563, longitude: 100.5018, cityName: 'Bangkok' }
    };

    const dest = destination.toLowerCase();
    const match = Object.keys(coordinates).find(key => dest.includes(key));
    
    return match ? coordinates[match] : {
      latitude: 40.7128,
      longitude: -74.0060,
      cityName: destination
    };
  }

  /**
   * Helper: Calculate nights between dates
   */
  calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  }

  /**
   * Helper: Estimate base hotel price by destination
   */
  estimateBaseHotelPrice(destination) {
    const priceMap = {
      'london': 180, 'paris': 160, 'new york': 200, 'tokyo': 150,
      'dubai': 140, 'sydney': 170, 'singapore': 130, 'rome': 140,
      'barcelona': 120, 'amsterdam': 150, 'istanbul': 90, 'bangkok': 60
    };

    const dest = destination.toLowerCase();
    const match = Object.keys(priceMap).find(key => dest.includes(key));
    return match ? priceMap[match] : 120;
  }

  /**
   * Helper: Parse amenities from hotel data
   */
  parseAmenities(hotel) {
    const amenities = [];
    if (hotel.has_free_parking) amenities.push('Free Parking');
    if (hotel.has_swimming_pool) amenities.push('Pool');
    if (hotel.is_genius_deal) amenities.push('Special Offer');
    if (hotel.has_free_wifi) amenities.push('Free WiFi');
    return amenities.length > 0 ? amenities : ['WiFi', 'Reception'];
  }
}

module.exports = HotelService;
