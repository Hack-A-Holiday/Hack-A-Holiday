const axios = require('axios');

/**
 * Enhanced Flight Service for Express Backend
 * Handles multiple flight APIs with intelligent fallback
 */
class FlightService {
  constructor(config) {
    this.rapidApiKey = config.rapidApiKey;
    this.rapidApiHost = config.rapidApiHost || 'kiwi-com-cheap-flights.p.rapidapi.com';
    this.amadeuApiKey = config.amadeuApiKey;
    this.amadeuApiSecret = config.amadeuApiSecret;
    this.mockDataEnabled = !this.rapidApiKey && !this.amadeuApiKey;
    
    // City name to IATA code mapping
    this.cityToIATA = {
      'delhi': 'DEL',
      'new delhi': 'DEL',
      'mumbai': 'BOM',
      'bangalore': 'BLR',
      'chennai': 'MAA',
      'kolkata': 'CCU',
      'hyderabad': 'HYD',
      'madrid': 'MAD',
      'barcelona': 'BCN',
      'paris': 'PAR',
      'london': 'LON',
      'new york': 'NYC',
      'los angeles': 'LAX',
      'tokyo': 'TYO',
      'dubai': 'DXB',
      'singapore': 'SIN',
      'bangkok': 'BKK',
      'rome': 'ROM',
      'amsterdam': 'AMS',
      'sydney': 'SYD',
      'berlin': 'BER',
      'vienna': 'VIE',
      'prague': 'PRG',
      'budapest': 'BUD',
      'istanbul': 'IST',
      'athens': 'ATH',
      'lisbon': 'LIS',
      'stockholm': 'STO',
      'copenhagen': 'CPH',
      'oslo': 'OSL',
      'helsinki': 'HEL',
      'zurich': 'ZRH',
      'geneva': 'GVA',
      'brussels': 'BRU',
      'dublin': 'DUB',
      'edinburgh': 'EDI',
      'manchester': 'MAN'
    };
    
    console.log('FlightService initialized:', {
      rapidApiAvailable: !!this.rapidApiKey,
      rapidApiHost: this.rapidApiHost,
      amadeusAvailable: !!this.amadeuApiKey,
      mockDataEnabled: this.mockDataEnabled
    });
  }

  /**
   * Convert city name to IATA code
   */
  getCityCode(cityName) {
    if (!cityName) return null;
    
    const normalized = cityName.toLowerCase().trim();
    const code = this.cityToIATA[normalized];
    
    if (code) {
      console.log(`   🔄 Converted "${cityName}" → ${code}`);
      return code;
    }
    
    // If already looks like an IATA code (3 letters), return as-is
    if (/^[A-Z]{3}$/.test(cityName.toUpperCase())) {
      return cityName.toUpperCase();
    }
    
    console.log(`   ⚠️ No IATA code found for "${cityName}", using as-is`);
    return cityName;
  }

  /**
   * Enhanced flight search with multiple providers and fallback
   */
  async searchFlightsEnhanced(searchRequest) {
    const searchStartTime = Date.now();
    
    try {
      // Try Kiwi API first (via RapidAPI)
      if (this.rapidApiKey) {
        try {
          const kiwiResults = await this.searchKiwiFlights(searchRequest);
          return {
            ...kiwiResults,
            searchStartTime,
            provider: 'kiwi',
            fallbackUsed: false
          };
        } catch (error) {
          console.log('Kiwi API failed, trying Amadeus...', error.message);
        }
      }

      // Try Amadeus API as fallback
      if (this.amadeuApiKey) {
        try {
          const amadeusResults = await this.searchAmadeusFlights(searchRequest);
          return {
            ...amadeusResults,
            searchStartTime,
            provider: 'amadeus',
            fallbackUsed: true,
            fallbackReason: 'Kiwi API unavailable'
          };
        } catch (error) {
          console.log('Amadeus API failed, using mock data...', error.message);
        }
      }

      // Use enhanced mock data as final fallback
      const mockResults = await this.generateEnhancedMockData(searchRequest);
      return {
        ...mockResults,
        searchStartTime,
        provider: 'mock',
        fallbackUsed: true,
        fallbackReason: 'External APIs unavailable'
      };

    } catch (error) {
      console.error('All flight search methods failed:', error);
      throw new Error('Flight search service temporarily unavailable');
    }
  }

  /**
   * Search flights using Kiwi API (via RapidAPI)
   */
  async searchKiwiFlights(searchRequest) {
    console.log('\n🔵 ===== KIWI API CALL START =====');
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass = 'economy',
      currency = 'USD',
      filters = {}
    } = searchRequest;

    console.log('   📥 Input Parameters:', JSON.stringify({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      currency
    }, null, 2));

    // Convert city names to IATA codes
    const originCode = this.getCityCode(origin);
    const destinationCode = this.getCityCode(destination);

    console.log('   🔄 Code Conversion:', {
      originalOrigin: origin,
      convertedOrigin: originCode,
      originalDestination: destination,
      convertedDestination: destinationCode
    });

    // Use the SAME parameters as the working frontend implementation
    const params = {
      source: `City:${originCode}`,
      destination: `City:${destinationCode}`,
      departureDate: departureDate,
      currency: currency.toLowerCase(),
      locale: 'en',
      adults: (passengers.adults || 1).toString(),
      children: (passengers.children || 0).toString(),
      infants: (passengers.infants || 0).toString(),
      handbags: '1',
      holdbags: '0',
      cabinClass: cabinClass.toUpperCase(),
      sortBy: 'QUALITY',
      sortOrder: 'ASCENDING',
      limit: (filters.limit || 20).toString()
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    if (filters.maxPrice) {
      params.price_to = filters.maxPrice;
    }

    if (filters.maxStops !== undefined) {
      params.max_stopovers = filters.maxStops;
    }

    // Use RapidAPI proxy if host is configured, otherwise direct Kiwi API
    // Use /round-trip endpoint (same as working frontend implementation)
    let apiUrl;
    if (this.rapidApiHost && this.rapidApiHost.includes('rapidapi')) {
      apiUrl = `https://${this.rapidApiHost}/round-trip`;
    } else {
      apiUrl = 'https://tequila-api.kiwi.com/v2/search';
    }
    
    const headers = this.rapidApiHost && this.rapidApiHost.includes('rapidapi')
      ? {
          'x-rapidapi-key': this.rapidApiKey,
          'x-rapidapi-host': this.rapidApiHost
        }
      : {
          'apikey': this.rapidApiKey
        };

    console.log('   🌐 API Request Details:', {
      url: apiUrl,
      params: params,
      hasApiKey: !!this.rapidApiKey,
      apiKeyPrefix: this.rapidApiKey?.substring(0, 10) + '...',
      headers: { ...headers, 'X-RapidAPI-Key': '***hidden***' }
    });

    // Use the single working endpoint (matches frontend)
    try {
      console.log(`   🔄 Calling endpoint: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        params,
        headers,
        timeout: 30000
      });

      console.log('   ✅ API Response Status:', response.status);
      console.log('   📊 Raw Response Data Structure:', {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasItineraries: Array.isArray(response.data?.itineraries),
        itinerariesLength: response.data?.itineraries?.length || 0
      });

      // New API format uses 'itineraries' array
      const itineraries = response.data?.itineraries || [];
      
      if (!response.data || itineraries.length === 0) {
        console.log('   ⚠️ No flights found in API response');
        console.log('   📄 Response metadata:', JSON.stringify(response.data?.metadata, null, 2));
        console.log('🔵 ===== KIWI API CALL END (NO RESULTS) =====\n');
        return { success: true, flights: [], totalResults: 0 };
      }

      console.log(`   ✈️ Found ${itineraries.length} flight itineraries`);

      // Parse new itinerary format
      const flights = itineraries.map((itinerary, index) => {
        const outbound = itinerary.outbound;
        const firstSegment = outbound?.sectorSegments?.[0]?.segment;
        const lastSegment = outbound?.sectorSegments?.[outbound.sectorSegments.length - 1]?.segment;
        const carrier = firstSegment?.carrier || {};
        
        return {
          id: itinerary.id || `kiwi-${index}`,
          airline: carrier.name || 'Unknown',
          flightNumber: `${carrier.code || 'XX'}${firstSegment?.code || '000'}`,
          origin: firstSegment?.source?.station?.code || originCode,
          destination: lastSegment?.destination?.station?.code || destinationCode,
          departureTime: firstSegment?.source?.localTime,
          arrivalTime: lastSegment?.destination?.localTime,
          duration: `${Math.floor(outbound.duration / 3600)}h ${Math.floor((outbound.duration % 3600) / 60)}m`,
          durationMinutes: Math.floor(outbound.duration / 60),
          stops: (outbound?.sectorSegments?.length || 1) - 1,
          stopDetails: outbound?.sectorSegments?.slice(1).map(seg => ({
            airport: seg.segment?.source?.station?.code,
            city: seg.segment?.source?.station?.city?.name,
            duration: seg.layover ? `${Math.floor(seg.layover.duration / 3600)}h ${Math.floor((seg.layover.duration % 3600) / 60)}m` : '0h'
          })) || [],
          price: parseFloat(itinerary.price?.amount) || 0,
          currency: currency,
          cabinClass: firstSegment?.cabinClass?.toLowerCase() || cabinClass,
          baggage: {
            carry_on: itinerary.bagsInfo?.includedHandBags ? `${itinerary.bagsInfo.includedHandBags} bag` : 'Not included',
            checked: itinerary.bagsInfo?.includedCheckedBags ? `${itinerary.bagsInfo.includedCheckedBags} bag` : 'Not included'
          },
          bookingUrl: itinerary.bookingOptions?.edges?.[0]?.node?.bookingUrl || null,
          aircraft: 'Aircraft',
          operatingAirline: carrier.name,
          marketingAirline: carrier.name,
          fareType: itinerary.provider?.code || 'Basic',
          refundable: false,
          changeable: true,
          seatSelection: false,
          mealIncluded: cabinClass !== 'economy',
          wifiAvailable: false,
          powerOutlets: cabinClass !== 'economy',
          entertainment: cabinClass !== 'economy'
        };
      });

      console.log('   ✅ Successfully parsed flights');
      console.log('🔵 ===== KIWI API CALL END (SUCCESS) =====\n');

      return {
        success: true,
        flights,
        totalResults: flights.length,
        searchId: `kiwi-search-${Date.now()}`,
        currency,
        recommendations: this.generateRecommendations(flights)
      };
    } catch (error) {
      console.error('\n   ❌ KIWI API ERROR:');
      console.error('   Error Message:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Response Status:', error.response?.status);
      console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('   Request URL:', error.config?.url);
      console.log('🔵 ===== KIWI API CALL END (ERROR) =====\n');
      throw error;
    }
  }

  /**
   * Search flights using Amadeus API
   */
  async searchAmadeusFlights(searchRequest) {
    // First get access token
    const tokenResponse = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      'grant_type=client_credentials&client_id=' + this.amadeuApiKey + '&client_secret=' + this.amadeuApiSecret,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Search flights
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass = 'ECONOMY',
      currency = 'USD'
    } = searchRequest;

    const params = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: passengers.adults || 1,
      travelClass: cabinClass.toUpperCase(),
      currencyCode: currency,
      max: 50
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    if (passengers.children) {
      params.children = passengers.children;
    }

    if (passengers.infants) {
      params.infants = passengers.infants;
    }

    const response = await axios.get(
      'https://test.api.amadeus.com/v2/shopping/flight-offers',
      {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 30000
      }
    );

    const flights = response.data.data.map((offer, index) => {
      const outbound = offer.itineraries[0];
      const segments = outbound.segments;
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];

      return {
        id: `amadeus-${offer.id || index}`,
        airline: firstSegment.carrierCode,
        flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
        origin: firstSegment.departure.iataCode,
        destination: lastSegment.arrival.iataCode,
        departureTime: firstSegment.departure.at,
        arrivalTime: lastSegment.arrival.at,
        duration: outbound.duration,
        durationMinutes: this.parseDurationToMinutes(outbound.duration),
        stops: segments.length - 1,
        stopDetails: segments.slice(1, -1).map(segment => ({
          airport: segment.departure.iataCode,
          duration: '1h 30m' // Amadeus doesn't provide layover duration
        })),
        price: parseFloat(offer.price.total),
        currency: offer.price.currency,
        cabinClass: firstSegment.cabin,
        baggage: {
          carry_on: '10kg',
          checked: 'Varies by fare'
        },
        bookingUrl: null,
        aircraft: firstSegment.aircraft?.code || 'Unknown',
        operatingAirline: firstSegment.operating?.carrierCode || firstSegment.carrierCode,
        marketingAirline: firstSegment.carrierCode,
        fareType: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.fareBasis || 'Standard',
        refundable: false,
        changeable: true,
        seatSelection: false,
        mealIncluded: cabinClass !== 'ECONOMY',
        wifiAvailable: false,
        powerOutlets: cabinClass !== 'ECONOMY',
        entertainment: cabinClass !== 'ECONOMY'
      };
    });

    return {
      success: true,
      flights,
      totalResults: flights.length,
      searchId: `amadeus-search-${Date.now()}`,
      currency,
      recommendations: this.generateRecommendations(flights)
    };
  }

  /**
   * Generate enhanced mock data when APIs are unavailable
   */
  async generateEnhancedMockData(searchRequest) {
    const {
      origin,
      destination,
      departureDate,
      passengers,
      currency = 'USD'
    } = searchRequest;

    // Generate realistic flight data
    const airlines = ['AA', 'DL', 'UA', 'LH', 'BA', 'AF', 'KL', 'VS'];
    const aircraft = ['Boeing 737', 'Boeing 777', 'Airbus A320', 'Airbus A330', 'Boeing 787'];
    
    const flights = [];
    const basePrice = this.estimateBasePrice(origin, destination);

    for (let i = 0; i < 20; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const stops = Math.random() < 0.6 ? 0 : Math.random() < 0.8 ? 1 : 2;
      const durationMultiplier = 1 + (stops * 0.4) + (Math.random() * 0.3);
      const baseDuration = this.estimateFlightDuration(origin, destination);
      const totalDuration = Math.floor(baseDuration * durationMultiplier);
      
      const departureHour = 6 + Math.floor(Math.random() * 18);
      const departureTime = new Date(departureDate);
      departureTime.setHours(departureHour, Math.floor(Math.random() * 60));
      
      const arrivalTime = new Date(departureTime);
      arrivalTime.setMinutes(arrivalTime.getMinutes() + totalDuration);

      const priceVariation = 0.7 + (Math.random() * 0.6);
      const stopsMultiplier = stops === 0 ? 1.2 : stops === 1 ? 1.0 : 0.8;
      const price = Math.round(basePrice * priceVariation * stopsMultiplier);

      flights.push({
        id: `mock-${i}`,
        airline,
        flightNumber: `${airline}${1000 + Math.floor(Math.random() * 8999)}`,
        origin,
        destination,
        departureTime: departureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString(),
        duration: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`,
        durationMinutes: totalDuration,
        stops,
        stopDetails: this.generateStopDetails(stops, origin, destination),
        price,
        currency,
        cabinClass: 'economy',
        baggage: {
          carry_on: '10kg',
          checked: stops === 0 ? 'Not included' : '23kg'
        },
        bookingUrl: null,
        aircraft: aircraft[Math.floor(Math.random() * aircraft.length)],
        operatingAirline: airline,
        marketingAirline: airline,
        fareType: ['Basic', 'Standard', 'Flexible'][Math.floor(Math.random() * 3)],
        refundable: Math.random() < 0.3,
        changeable: Math.random() < 0.7,
        seatSelection: Math.random() < 0.5,
        mealIncluded: Math.random() < 0.4,
        wifiAvailable: Math.random() < 0.6,
        powerOutlets: Math.random() < 0.7,
        entertainment: Math.random() < 0.8
      });
    }

    // Sort by price
    flights.sort((a, b) => a.price - b.price);

    return {
      success: true,
      flights,
      totalResults: flights.length,
      searchId: `mock-search-${Date.now()}`,
      currency,
      recommendations: this.generateRecommendations(flights)
    };
  }

  /**
   * Generate flight recommendations
   */
  generateRecommendations(flights) {
    if (flights.length === 0) return {};

    const sortedByPrice = [...flights].sort((a, b) => a.price - b.price);
    const sortedByDuration = [...flights].sort((a, b) => a.durationMinutes - b.durationMinutes);
    const directFlights = flights.filter(f => f.stops === 0);

    return {
      bestPrice: sortedByPrice[0],
      fastest: sortedByDuration[0],
      bestValue: this.calculateBestValue(flights),
      mostConvenient: directFlights.length > 0 ? directFlights[0] : sortedByDuration[0]
    };
  }

  /**
   * Calculate best value flight (price vs convenience)
   */
  calculateBestValue(flights) {
    return flights
      .map(flight => ({
        ...flight,
        score: (1000 - flight.price) + (600 - flight.durationMinutes) + (flight.stops === 0 ? 200 : 0)
      }))
      .sort((a, b) => b.score - a.score)[0];
  }

  /**
   * Helper methods
   */
  estimateBasePrice(origin, destination) {
    const distances = {
      'JFK-LHR': 800, 'LAX-NRT': 1200, 'DFW-CDG': 900,
      'MIA-LHR': 700, 'SFO-FRA': 1000, 'ORD-AMS': 850
    };
    
    const key = `${origin}-${destination}`;
    return distances[key] || distances[`${destination}-${origin}`] || 600;
  }

  estimateFlightDuration(origin, destination) {
    // Rough estimates in minutes
    const durations = {
      'JFK-LHR': 420, 'LAX-NRT': 660, 'DFW-CDG': 540,
      'MIA-LHR': 480, 'SFO-FRA': 600, 'ORD-AMS': 480
    };
    
    const key = `${origin}-${destination}`;
    return durations[key] || durations[`${destination}-${origin}`] || 360;
  }

  generateStopDetails(stops, origin, destination) {
    if (stops === 0) return [];
    
    const commonStops = ['DXB', 'DOH', 'IST', 'AMS', 'FRA', 'CDG', 'LHR'];
    const stopDetails = [];
    
    for (let i = 0; i < stops; i++) {
      stopDetails.push({
        airport: commonStops[Math.floor(Math.random() * commonStops.length)],
        duration: ['1h 30m', '2h 15m', '1h 45m', '3h 00m'][Math.floor(Math.random() * 4)]
      });
    }
    
    return stopDetails;
  }

  parseDurationToMinutes(duration) {
    // Parse ISO 8601 duration (PT4H30M) to minutes
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    return hours * 60 + minutes;
  }
}

module.exports = FlightService;