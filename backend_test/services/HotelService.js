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
      mockDataEnabled: this.mockDataEnabled,
      envBookingApiHost: process.env.BOOKING_API_HOST
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
          
          // Check if we got actual hotel results
          if (bookingResults && bookingResults.hotels && bookingResults.hotels.length > 0) {
            return {
              ...bookingResults,
              searchStartTime,
              provider: 'booking.com',
              fallbackUsed: false
            };
          } else {
            console.log('⚠️ Booking API returned no hotels, returning empty results...');
            return {
              success: false,
              hotels: [],
              totalResults: 0,
              searchId: `booking-search-${Date.now()}`,
              currency: searchRequest.currency || 'USD',
              destination: searchRequest.destination,
              provider: 'booking.com',
              fallbackUsed: false,
              searchStartTime,
              message: 'No hotels found. Please try a different search or visit Booking.com directly.'
            };
          }
        } catch (error) {
          console.log('❌ Booking API failed, returning empty results...', error.message);
          return {
            success: false,
            hotels: [],
            totalResults: 0,
            searchId: `booking-search-${Date.now()}`,
            currency: searchRequest.currency || 'USD',
            destination: searchRequest.destination,
            provider: 'booking.com',
            fallbackUsed: false,
            searchStartTime,
            message: 'Hotel search failed. Please try again or visit Booking.com directly.'
          };
        }
      }

      // No API keys available - return empty results
      console.log('⚠️ No hotel API keys available, returning empty results');
      return {
        success: false,
        hotels: [],
        totalResults: 0,
        searchId: `booking-search-${Date.now()}`,
        currency: searchRequest.currency || 'USD',
        destination: searchRequest.destination,
        provider: 'no-api',
        fallbackUsed: false,
        searchStartTime,
        message: 'Hotel search not available. Please visit Booking.com directly.'
      };

    } catch (error) {
      console.error('❌ All hotel search methods failed:', error);
      // Final fallback - return empty results
      return {
        success: false,
        hotels: [],
        totalResults: 0,
        searchId: `booking-search-${Date.now()}`,
        currency: searchRequest.currency || 'USD',
        destination: searchRequest.destination,
        provider: 'error',
        fallbackUsed: false,
        searchStartTime,
        message: 'Hotel search encountered an error. Please try again or visit Booking.com directly.'
      };
    }
  }

  /**
   * Search hotels using Booking.com API (via RapidAPI) - booking-com15 API
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

    // Get destination ID for the booking-com15 API
    const destId = await this.getDestinationId(destination);
    
    const params = {
      dest_id: destId,
      search_type: 'CITY',
      arrival_date: checkIn,
      departure_date: checkOut,
      adults: adults,
      children_age: children > 0 ? Array(children).fill(17).join(',') : '0',
      room_qty: rooms,
      page_number: 1,
      units: 'metric',
      temperature_unit: 'c',
      languagecode: 'en-us',
      currency_code: currency,
      location: 'US'
    };

    const apiKey = this.bookingApiKey || this.rapidApiKey;
    
    console.log('\n🟣 ===== BOOKING API CALL START =====');
    console.log('   📥 Input Parameters:', JSON.stringify({ destination, checkIn, checkOut, adults, children, rooms }, null, 2));
    console.log('   📍 Destination:', destination);
    console.log('   🔑 Destination ID:', destId);
    console.log('   🌐 API Request Details:', {
      url: `https://${this.bookingApiHost}/api/v1/hotels/searchHotels`,
      params: params,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      host: this.bookingApiHost
    });

    try {
      const response = await axios.get(`https://${this.bookingApiHost}/api/v1/hotels/searchHotels`, {
        params,
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': this.bookingApiHost
        },
        timeout: 30000
      });

      console.log('   ✅ API Response Status:', response.status);
      console.log('   📊 Raw Response Data Structure:', {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasResult: !!response.data?.result,
        resultIsArray: Array.isArray(response.data?.result),
        resultLength: response.data?.result?.length || 0
      });
      
      // Debug: Log the actual response structure
      console.log('   🔍 DEBUG: Full response.data keys:', response.data ? Object.keys(response.data) : 'No data');
      if (response.data && response.data.result) {
        console.log('   🔍 DEBUG: result is array:', Array.isArray(response.data.result));
        console.log('   🔍 DEBUG: result length:', response.data.result.length);
        if (response.data.result.length > 0) {
          console.log('   🔍 DEBUG: First result keys:', Object.keys(response.data.result[0]));
        }
      }

      // Check if API returned an error or no results
      // The API response structure has hotels in response.data.data.hotels array
      const hotels = response.data?.data?.hotels || [];
      if (!response.data || response.data.status === false || !hotels || hotels.length === 0) {
        console.log('   ⚠️ No hotels found in API response or API error');
        console.log('   📄 Full Response:', JSON.stringify(response.data, null, 2));
        console.log('   🔄 No fallback - returning empty results');
        console.log('🟣 ===== BOOKING API CALL END (NO RESULTS) =====\n');
        
        // Return empty results instead of mock data
        return {
          success: false,
          hotels: [],
          totalResults: 0,
          searchId: `booking-search-${Date.now()}`,
          currency: currency,
          destination: destination,
          provider: 'booking.com',
          fallbackUsed: false,
          message: 'No hotels found. Please try a different search or visit Booking.com directly.'
        };
      }

      console.log(`   🏨 Found ${hotels.length} hotels`);

      const processedHotels = hotels.map((hotel, index) => {
        // Handle the new API structure where hotel data is nested under 'property'
        const hotelData = hotel.property || hotel;
        const priceData = hotelData.priceBreakdown || {};
        const grossPrice = priceData.grossPrice || {};
        
        return {
          id: `booking-${hotelData.id || hotel.hotel_id || index}`,
          name: hotelData.name || hotel.hotel_name || 'Hotel',
          address: hotelData.address || hotel.address || destination,
          cityName: hotelData.cityName || hotel.city_name || destination,
          rating: hotelData.propertyClass || hotelData.accuratePropertyClass || hotel.class || 3,
          reviewScore: hotelData.reviewScore || hotel.review_score || 8.0,
          reviewCount: hotelData.reviewCount || hotel.review_nr || 100,
          pricePerNight: grossPrice.value || hotel.min_total_price || 100,
          totalPrice: grossPrice.value || this.calculateTotalPrice(hotel, checkIn, checkOut),
          currency: grossPrice.currency || hotelData.currency || hotel.currency_code || currency,
          imageUrl: hotelData.photoUrls?.[0] || hotel.main_photo_url || '',
          amenities: this.parseBookingAmenities(hotelData),
          distanceFromCenter: hotelData.distanceFromCenter || hotel.distance_to_cc ? `${hotel.distance_to_cc} km` : null,
          distanceValue: hotelData.distanceValue || hotel.distance_to_cc || null,
          freeCancellation: hotelData.freeCancellation || hotel.is_free_cancellable || false,
          breakfastIncluded: hotelData.breakfastIncluded || hotel.is_breakfast_included || false,
          roomType: 'Standard Room',
          coordinates: {
            latitude: hotelData.latitude || hotel.latitude || null,
            longitude: hotelData.longitude || hotel.longitude || null
          },
          bookingUrl: hotelData.bookingUrl || hotel.url || null,
          checkinTime: hotelData.checkin?.fromTime || '15:00',
          checkoutTime: hotelData.checkout?.untilTime || '11:00',
          propertyType: this.getPropertyTypeFromClass(hotelData.propertyClass || hotel.class),
          isPreferred: hotelData.isPreferred || false,
          reviewScoreWord: hotelData.reviewScoreWord || 'Good'
        };
      });

      console.log('   ✅ Successfully parsed hotels');
      console.log('🟣 ===== BOOKING API CALL END (SUCCESS) =====\n');

      return {
        success: true,
        hotels: processedHotels,
        totalResults: processedHotels.length,
        searchId: `booking-search-${Date.now()}`,
        currency,
        destination: destination
      };
    } catch (error) {
      console.error('\n   ❌ BOOKING API ERROR:');
      console.error('   Error Message:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Response Status:', error.response?.status);
      console.error('   Response Status Text:', error.response?.statusText);
      console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('   Request URL:', error.config?.url);
      console.error('   Request Params:', JSON.stringify(error.config?.params, null, 2));
      console.log('🟣 ===== BOOKING API CALL END (ERROR) =====\n');
      throw error;
    }
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
   * Helper: Get destination ID for booking-com15 API
   */
  async getDestinationId(destination) {
    const apiKey = this.bookingApiKey || this.rapidApiKey;
    
    try {
      console.log(`   🔍 Searching destination ID for: ${destination}`);
      
      const response = await axios.get(`https://${this.bookingApiHost}/api/v1/hotels/searchDestination`, {
        params: {
          query: destination
        },
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': this.bookingApiHost
        },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const firstResult = response.data[0];
        const destId = firstResult.dest_id || firstResult.id;
        console.log(`   ✅ Found destination ID: ${destId} for ${destination}`);
        return destId;
      }
    } catch (error) {
      console.warn(`   ⚠️ Failed to get destination ID for ${destination}:`, error.message);
    }

    // Fallback to hardcoded map for common destinations
    const destMap = {
      'mumbai': '-2092174',
      'new york': '20088325', 
      'london': '-2601889',
      'paris': '-1456928',
      'tokyo': '-246227',
      'dubai': '-782831',
      'sydney': '-1603135',
      'singapore': '-73635',
      'rome': '-126693',
      'barcelona': '-372490',
      'amsterdam': '-2140479',
      'istanbul': '-755070',
      'bangkok': '-3414440'
    };

    const dest = destination.toLowerCase();
    const match = Object.keys(destMap).find(key => dest.includes(key));
    
    const fallbackId = match ? destMap[match] : destMap['tokyo']; // Default to Tokyo
    console.log(`   🔄 Using fallback destination ID: ${fallbackId} for ${destination}`);
    return fallbackId;
  }

  /**
   * Helper: Calculate price per night from hotel data
   */
  calculatePricePerNight(hotel, checkIn, checkOut) {
    if (hotel.priceBreakdown && hotel.priceBreakdown.length > 0) {
      const totalPrice = hotel.priceBreakdown.reduce((sum, breakdown) => sum + (breakdown.price || 0), 0);
      const nights = this.calculateNights(checkIn, checkOut);
      return Math.round(totalPrice / nights);
    }
    return 150; // Default price
  }

  /**
   * Helper: Calculate total price from hotel data
   */
  calculateTotalPrice(hotel, checkIn, checkOut) {
    if (hotel.min_total_price) {
      return hotel.min_total_price;
    }
    const nights = this.calculateNights(checkIn, checkOut);
    const pricePerNight = hotel.min_total_price || 100;
    return pricePerNight * nights;
  }

  /**
   * Helper: Parse amenities from booking-com15 hotel data
   */
  parseBookingAmenities(hotel) {
    const amenities = [];
    if (hotel.is_free_cancellable) amenities.push('Free Cancellation');
    if (hotel.is_breakfast_included) amenities.push('Breakfast Included');
    if (hotel.has_swimming_pool) amenities.push('Pool');
    if (hotel.has_free_wifi) amenities.push('Free WiFi');
    if (hotel.has_parking) amenities.push('Parking');
    return amenities.length > 0 ? amenities : ['WiFi', 'Reception'];
  }

  /**
   * Helper: Get property type from hotel class
   */
  getPropertyTypeFromClass(hotelClass) {
    const typeMap = {
      1: 'Budget Hotel',
      2: 'Standard Hotel', 
      3: 'Comfort Hotel',
      4: 'Superior Hotel',
      5: 'Luxury Hotel'
    };
    return typeMap[hotelClass] || 'Hotel';
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
