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
    
    console.log('FlightService initialized:', {
      rapidApiAvailable: !!this.rapidApiKey,
      rapidApiHost: this.rapidApiHost,
      amadeusAvailable: !!this.amadeuApiKey,
      mockDataEnabled: this.mockDataEnabled
    });
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

    const params = {
      fly_from: origin,
      fly_to: destination,
      date_from: departureDate,
      date_to: departureDate,
      adults: passengers.adults || 1,
      children: passengers.children || 0,
      infants: passengers.infants || 0,
      selected_cabins: cabinClass.charAt(0).toUpperCase(),
      curr: currency,
      limit: filters.limit || 50,
      sort: 'price'
    };

    if (returnDate) {
      params.return_from = returnDate;
      params.return_to = returnDate;
    }

    if (filters.maxPrice) {
      params.price_to = filters.maxPrice;
    }

    if (filters.maxStops !== undefined) {
      params.max_stopovers = filters.maxStops;
    }

    // Use RapidAPI proxy if host is configured, otherwise direct Kiwi API
    const apiUrl = this.rapidApiHost && this.rapidApiHost.includes('rapidapi') 
      ? `https://${this.rapidApiHost}/v2/search`
      : 'https://tequila-api.kiwi.com/v2/search';
    
    const headers = this.rapidApiHost && this.rapidApiHost.includes('rapidapi')
      ? {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': this.rapidApiHost
        }
      : {
          'apikey': this.rapidApiKey
        };

    const response = await axios.get(apiUrl, {
      params,
      headers,
      timeout: 30000
    });

    const flights = response.data.data.map((flight, index) => ({
      id: `kiwi-${flight.id || index}`,
      airline: flight.airlines?.[0] || 'Unknown',
      flightNumber: `${flight.airlines?.[0] || 'XX'}${flight.route?.[0]?.flight_no || '000'}`,
      origin: flight.flyFrom,
      destination: flight.flyTo,
      departureTime: flight.local_departure,
      arrivalTime: flight.local_arrival,
      duration: `${Math.floor(flight.duration.total / 3600)}h ${Math.floor((flight.duration.total % 3600) / 60)}m`,
      durationMinutes: Math.floor(flight.duration.total / 60),
      stops: flight.route.length - 1,
      stopDetails: flight.route.slice(1, -1).map(stop => ({
        airport: stop.flyTo,
        duration: `${Math.floor(stop.duration.total / 3600)}h ${Math.floor((stop.duration.total % 3600) / 60)}m`
      })),
      price: flight.price,
      currency: currency,
      cabinClass: cabinClass,
      baggage: {
        carry_on: flight.baglimit?.hand_weight ? `${flight.baglimit.hand_weight}kg` : '10kg',
        checked: flight.baglimit?.hold_weight ? `${flight.baglimit.hold_weight}kg` : 'Not included'
      },
      bookingUrl: flight.deep_link,
      aircraft: flight.route?.[0]?.vehicle_type || 'Unknown',
      operatingAirline: flight.operating_carrier || flight.airlines?.[0],
      marketingAirline: flight.airlines?.[0],
      fareType: 'Basic',
      refundable: false,
      changeable: true,
      seatSelection: false,
      mealIncluded: cabinClass !== 'economy',
      wifiAvailable: false,
      powerOutlets: cabinClass !== 'economy',
      entertainment: cabinClass !== 'economy'
    }));

    return {
      success: true,
      flights,
      totalResults: flights.length,
      searchId: `kiwi-search-${Date.now()}`,
      currency,
      recommendations: this.generateRecommendations(flights)
    };
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