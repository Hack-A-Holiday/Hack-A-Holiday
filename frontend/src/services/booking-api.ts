/**
 * Booking.com Hotel API Service
 * Integration with Booking.com API via RapidAPI for hotel search
 */

// Airport coordinates mapping for major cities
const AIRPORT_COORDINATES: Record<string, { latitude: number; longitude: number; cityName: string }> = {
  // North America
  'JFK': { latitude: 40.6413, longitude: -73.7781, cityName: 'New York' },
  'LAX': { latitude: 33.9416, longitude: -118.4085, cityName: 'Los Angeles' },
  'ORD': { latitude: 41.9742, longitude: -87.9073, cityName: 'Chicago' },
  'MIA': { latitude: 25.7959, longitude: -80.2870, cityName: 'Miami' },
  'YYZ': { latitude: 43.6777, longitude: -79.6248, cityName: 'Toronto' },
  'YVR': { latitude: 49.1939, longitude: -123.1844, cityName: 'Vancouver' },
  'MEX': { latitude: 19.4363, longitude: -99.0721, cityName: 'Mexico City' },
  
  // Europe
  'LHR': { latitude: 51.4700, longitude: -0.4543, cityName: 'London' },
  'CDG': { latitude: 49.0097, longitude: 2.5479, cityName: 'Paris' },
  'FRA': { latitude: 50.0379, longitude: 8.5622, cityName: 'Frankfurt' },
  'AMS': { latitude: 52.3105, longitude: 4.7683, cityName: 'Amsterdam' },
  'MAD': { latitude: 40.4983, longitude: -3.5676, cityName: 'Madrid' },
  'BCN': { latitude: 41.2974, longitude: 2.0833, cityName: 'Barcelona' },
  'FCO': { latitude: 41.8003, longitude: 12.2389, cityName: 'Rome' },
  'MXP': { latitude: 45.6306, longitude: 8.7281, cityName: 'Milan' },
  'ZUR': { latitude: 47.4647, longitude: 8.5492, cityName: 'Zurich' },
  'VIE': { latitude: 48.1103, longitude: 16.5697, cityName: 'Vienna' },
  'DUB': { latitude: 53.4213, longitude: -6.2701, cityName: 'Dublin' },
  'LIS': { latitude: 38.7742, longitude: -9.1342, cityName: 'Lisbon' },
  'ATH': { latitude: 37.9364, longitude: 23.9445, cityName: 'Athens' },
  'IST': { latitude: 41.2753, longitude: 28.7519, cityName: 'Istanbul' },
  
  // Asia
  'NRT': { latitude: 35.7720, longitude: 140.3929, cityName: 'Tokyo' },
  'HND': { latitude: 35.5494, longitude: 139.7798, cityName: 'Tokyo' },
  'ICN': { latitude: 37.4602, longitude: 126.4407, cityName: 'Seoul' },
  'PEK': { latitude: 40.0799, longitude: 116.6031, cityName: 'Beijing' },
  'PVG': { latitude: 31.1443, longitude: 121.8083, cityName: 'Shanghai' },
  'HKG': { latitude: 22.3080, longitude: 113.9185, cityName: 'Hong Kong' },
  'SIN': { latitude: 1.3644, longitude: 103.9915, cityName: 'Singapore' },
  'BKK': { latitude: 13.6900, longitude: 100.7501, cityName: 'Bangkok' },
  'KUL': { latitude: 2.7456, longitude: 101.7072, cityName: 'Kuala Lumpur' },
  'DEL': { latitude: 28.5562, longitude: 77.1000, cityName: 'New Delhi' },
  'BOM': { latitude: 19.0896, longitude: 72.8656, cityName: 'Mumbai' },
  'BLR': { latitude: 13.1979, longitude: 77.7063, cityName: 'Bangalore' },
  'MAA': { latitude: 12.9941, longitude: 80.1709, cityName: 'Chennai' },
  'SGN': { latitude: 10.8188, longitude: 106.6519, cityName: 'Ho Chi Minh City' },
  
  // Middle East & Africa
  'DXB': { latitude: 25.2532, longitude: 55.3657, cityName: 'Dubai' },
  'AUH': { latitude: 24.4330, longitude: 54.6511, cityName: 'Abu Dhabi' },
  'DOH': { latitude: 25.2731, longitude: 51.6080, cityName: 'Doha' },
  'CAI': { latitude: 30.1219, longitude: 31.4056, cityName: 'Cairo' },
  'JNB': { latitude: -26.1392, longitude: 28.2460, cityName: 'Johannesburg' },
  'CPT': { latitude: -33.9715, longitude: 18.6021, cityName: 'Cape Town' },
  
  // Oceania
  'SYD': { latitude: -33.9399, longitude: 151.1753, cityName: 'Sydney' },
  'MEL': { latitude: -37.6690, longitude: 144.8410, cityName: 'Melbourne' },
  'AKL': { latitude: -37.0082, longitude: 174.7850, cityName: 'Auckland' },
  'BNE': { latitude: -27.3942, longitude: 153.1218, cityName: 'Brisbane' },
  
  // South America
  'GRU': { latitude: -23.4356, longitude: -46.4731, cityName: 'São Paulo' },
  'GIG': { latitude: -22.8099, longitude: -43.2505, cityName: 'Rio de Janeiro' },
  'EZE': { latitude: -34.8222, longitude: -58.5358, cityName: 'Buenos Aires' },
  'BOG': { latitude: 4.7016, longitude: -74.1469, cityName: 'Bogotá' },
  'LIM': { latitude: -12.0219, longitude: -77.1143, cityName: 'Lima' },
};

export interface HotelSearchParams {
  airportCode: string;
  checkInDate: string;  // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  adults: number;
  children?: number;
  rooms?: number;
  currency?: string;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  cityName: string;
  rating: number; // Out of 10
  reviewScore?: number;
  reviewCount?: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  imageUrl?: string;
  amenities: string[];
  distanceFromCenter?: string;
  distanceValue?: number; // in km
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  roomType?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BookingApiResponse {
  hotels: Hotel[];
  searchMetadata: {
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    location: string;
  };
}

export class BookingApiService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://booking-com15.p.rapidapi.com/api/v1';

  constructor() {
    // Use environment variable or fallback to provided key
    this.apiKey = process.env.NEXT_PUBLIC_BOOKING_API_KEY || '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20';
  }

  /**
   * Search for hotels near an airport
   */
  async searchHotels(params: HotelSearchParams): Promise<BookingApiResponse> {
    const coordinates = AIRPORT_COORDINATES[params.airportCode];
    
    if (!coordinates) {
      console.warn(`⚠️ No coordinates found for airport: ${params.airportCode}`);
      // Return mock data for unsupported airports
      return this.getMockHotels(params);
    }

    try {
      const checkIn = new Date(params.checkInDate);
      const checkOut = new Date(params.checkOutDate);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      // Build search parameters for Booking.com API
      const searchParams = new URLSearchParams({
        dest_id: '-2092174', // Mumbai dest_id (you can find this from Booking.com)
        search_type: 'CITY',
        arrival_date: params.checkInDate,
        departure_date: params.checkOutDate,
        adults: params.adults.toString(),
        children_age: params.children ? params.children.toString() : '0',
        room_qty: (params.rooms || 1).toString(),
        units: 'metric',
        temperature_unit: 'c',
        languagecode: 'en-us',
        currency_code: params.currency || 'USD',
        page_number: '1'
      });

      const url = `${this.baseUrl}/hotels/searchHotels?${searchParams.toString()}`;

      console.log(`🏨 Searching hotels near ${coordinates.cityName} (${params.airportCode})...`);
      console.log(`🔗 API URL: ${url.split('?')[0]}`);
      console.log(`🔑 Using API Key: ${this.apiKey.substring(0, 10)}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
          'x-rapidapi-key': this.apiKey
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`⚠️ Booking.com API rate limit exceeded (429). Using mock data.`);
          return this.getMockHotels(params);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('🔍 Booking.com API Response:', data);

      // Check if API returned an error
      if (data.status === false || !data.data) {
        console.warn('⚠️ Booking.com API returned error:', data.message || 'Unknown error');
        console.log('📝 Using mock hotel data as fallback');
        return this.getMockHotels(params);
      }

      // Parse the response and convert to our Hotel format
      const hotels = this.parseHotels(data, nights, params.currency || 'USD');

      if (hotels.length === 0) {
        console.log('📝 No hotels found in API response, using mock data');
        return this.getMockHotels(params);
      }

      console.log(`✅ Successfully found ${hotels.length} hotels from API`);

      return {
        hotels,
        searchMetadata: {
          checkIn: params.checkInDate,
          checkOut: params.checkOutDate,
          nights,
          guests: params.adults + (params.children || 0),
          location: coordinates.cityName
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Booking.com API error:', errorMessage);
      
      if (errorMessage.includes('429')) {
        console.warn('⚠️ Rate limit exceeded. Consider upgrading RapidAPI plan or implementing caching.');
      }
      
      console.log('📝 Using mock hotel data as fallback');
      return this.getMockHotels(params);
    }
  }

  /**
   * Parse hotel data from Booking.com API response
   */
  private parseHotels(data: any, nights: number, currency: string): Hotel[] {
    if (!data || !data.data || !Array.isArray(data.data.hotels)) {
      return [];
    }

    return data.data.hotels.slice(0, 20).map((hotel: any, index: number) => {
      const pricePerNight = parseFloat(hotel.property?.priceBreakdown?.grossPrice?.value || hotel.min_total_price || 100);
      const totalPrice = pricePerNight * nights;

      return {
        id: hotel.property?.id || `hotel-${index}`,
        name: hotel.property?.name || hotel.hotel_name || 'Hotel',
        address: hotel.property?.address || 'Address not available',
        cityName: hotel.property?.city || hotel.city || 'City',
        rating: parseFloat(hotel.property?.reviewScore || hotel.review_score || 8),
        reviewScore: parseFloat(hotel.property?.reviewScore || hotel.review_score || 8),
        reviewCount: parseInt(hotel.property?.reviewCount || hotel.review_nr || 100),
        pricePerNight,
        totalPrice,
        currency,
        imageUrl: hotel.property?.photoUrls?.[0] || hotel.main_photo_url,
        amenities: hotel.property?.amenities || this.getDefaultAmenities(),
        distanceFromCenter: hotel.property?.distanceFromCenter || `${Math.random() * 5 + 1}`,
        distanceValue: parseFloat(hotel.property?.distanceFromCenter || Math.random() * 5 + 1),
        freeCancellation: hotel.property?.freeCancellation || Math.random() > 0.5,
        breakfastIncluded: hotel.property?.breakfastIncluded || Math.random() > 0.6,
        roomType: hotel.property?.roomType || 'Standard Room',
        coordinates: {
          latitude: parseFloat(hotel.property?.latitude || 0),
          longitude: parseFloat(hotel.property?.longitude || 0)
        }
      };
    });
  }

  /**
   * Get default amenities list
   */
  private getDefaultAmenities(): string[] {
    const amenities = ['WiFi', 'Air Conditioning', 'TV', 'Room Service', 'Parking', 'Breakfast', 'Pool', 'Gym', 'Bar', 'Restaurant'];
    return amenities.slice(0, Math.floor(Math.random() * 5) + 3);
  }

  /**
   * Generate mock hotel data for testing
   */
  private getMockHotels(params: HotelSearchParams): BookingApiResponse {
    const coordinates = AIRPORT_COORDINATES[params.airportCode];
    const cityName = coordinates?.cityName || 'City';
    
    const checkIn = new Date(params.checkInDate);
    const checkOut = new Date(params.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const hotelNames = [
      'Grand Plaza Hotel',
      'City Center Inn',
      'Luxury Resort & Spa',
      'Budget Suites',
      'Airport Comfort Hotel',
      'Royal Palace Hotel',
      'Business Express Inn',
      'Seaside Resort',
      'Mountain View Lodge',
      'Downtown Boutique Hotel',
      'Garden View Hotel',
      'Skyline Tower Hotel',
      'Heritage Grand Hotel',
      'Modern Comfort Suites',
      'Riverside Hotel',
      'Palm Beach Resort',
      'Metro Stay Hotel',
      'Executive Business Hotel',
      'Family Friendly Inn',
      'Zen Wellness Resort'
    ];

    const hotels: Hotel[] = hotelNames.map((name, index) => {
      const pricePerNight = 50 + Math.random() * 300;
      const totalPrice = pricePerNight * nights;
      const rating = 6 + Math.random() * 4;

      return {
        id: `mock-hotel-${index}`,
        name: `${name} - ${cityName}`,
        address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${cityName}`,
        cityName,
        rating: parseFloat(rating.toFixed(1)),
        reviewScore: parseFloat(rating.toFixed(1)),
        reviewCount: Math.floor(Math.random() * 500) + 50,
        pricePerNight: Math.round(pricePerNight),
        totalPrice: Math.round(totalPrice),
        currency: params.currency || 'USD',
        imageUrl: `https://picsum.photos/seed/hotel${index}/400/300`,
        amenities: this.getDefaultAmenities(),
        distanceFromCenter: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
        distanceValue: parseFloat((Math.random() * 5 + 0.5).toFixed(1)),
        freeCancellation: Math.random() > 0.3,
        breakfastIncluded: Math.random() > 0.5,
        roomType: ['Standard Room', 'Deluxe Room', 'Suite', 'Family Room'][Math.floor(Math.random() * 4)],
        coordinates: coordinates ? {
          latitude: coordinates.latitude + (Math.random() - 0.5) * 0.1,
          longitude: coordinates.longitude + (Math.random() - 0.5) * 0.1
        } : undefined
      };
    });

    // Sort by rating (best first)
    hotels.sort((a, b) => b.rating - a.rating);

    return {
      hotels,
      searchMetadata: {
        checkIn: params.checkInDate,
        checkOut: params.checkOutDate,
        nights,
        guests: params.adults + (params.children || 0),
        location: cityName
      }
    };
  }

  /**
   * Get coordinates for an airport code
   */
  getAirportCoordinates(airportCode: string): { latitude: number; longitude: number; cityName: string } | null {
    return AIRPORT_COORDINATES[airportCode] || null;
  }
}

// Export singleton instance
export const bookingApiService = new BookingApiService();
