const axios = require('axios');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

/**
 * Enhanced Flight Service for Express Backend
 * Handles multiple flight APIs with intelligent fallback
 * Uses AWS Bedrock Nova Lite for dynamic airport code lookup
 */
class FlightService {
  constructor(config) {
    this.rapidApiKey = config.rapidApiKey;
    this.rapidApiHost = config.rapidApiHost || 'kiwi-com-cheap-flights.p.rapidapi.com';
    this.amadeuApiKey = config.amadeuApiKey;
    this.amadeuApiSecret = config.amadeuApiSecret;
    this.mockDataEnabled = !this.rapidApiKey && !this.amadeuApiKey;
    
    // Initialize Bedrock client for airport code lookup
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    // Use Nova Lite for fast airport code lookups
    this.fastModel = process.env.FAST_MODEL || 'us.amazon.nova-lite-v1:0';
    
    // Cache for airport codes to avoid repeated API calls
    this.airportCodeCache = new Map();
    
    console.log('FlightService initialized:', {
      rapidApiAvailable: !!this.rapidApiKey,
      rapidApiHost: this.rapidApiHost,
      amadeusAvailable: !!this.amadeuApiKey,
      mockDataEnabled: this.mockDataEnabled,
      bedrockModel: this.fastModel,
      dynamicAirportLookup: true
    });
  }

  /**
   * Use Nova Lite to intelligently get IATA airport code for any city
   */
  /**
   * Detect currency based on origin city/country using Nova Lite
   */
  async detectCurrency(originCity) {
    if (!originCity) return 'USD'; // Default
    
    const normalized = originCity.toLowerCase().trim();
    
    // Check cache first
    const cacheKey = `currency_${normalized}`;
    if (this.airportCodeCache.has(cacheKey)) {
      const cached = this.airportCodeCache.get(cacheKey);
      console.log(`   💰 Cache hit: "${originCity}" → ${cached}`);
      return cached;
    }
    
    try {
      console.log(`   🤖 Asking Nova Lite for currency: "${originCity}"`);
      
      const command = new ConverseCommand({
        modelId: this.fastModel,
        messages: [{
          role: 'user',
          content: [{
            text: `What is the main currency code for ${originCity}?

Rules:
- Return ONLY the 3-letter ISO currency code, nothing else
- Examples: Mumbai/India → INR, New York/USA → USD, London/UK → GBP, Paris/France → EUR, Tokyo/Japan → JPY
- Use the currency of the country where the city is located
- If unsure, return USD

Response format: Just the 3-letter code (e.g., "INR")`
          }]
        }],
        inferenceConfig: {
          maxTokens: 10,
          temperature: 0.1,
          topP: 0.9
        }
      });
      
      const response = await this.bedrockClient.send(command);
      const currency = response.output.message.content[0].text.trim().toUpperCase();
      
      // Validate it's a 3-letter code
      if (/^[A-Z]{3}$/.test(currency)) {
        console.log(`   ✅ Nova Lite found currency: "${originCity}" → ${currency}`);
        this.airportCodeCache.set(cacheKey, currency);
        return currency;
      }
      
      console.log(`   ⚠️ Invalid currency format, using USD`);
      return 'USD';
    } catch (error) {
      console.error(`   ❌ Error detecting currency: ${error.message}`);
      return 'USD';
    }
  }

  async getCityCode(cityName) {
    if (!cityName) return null;
    
    const normalized = cityName.toLowerCase().trim();
    
    // Check cache first
    if (this.airportCodeCache.has(normalized)) {
      const cached = this.airportCodeCache.get(normalized);
      console.log(`   💾 Cache hit: "${cityName}" → ${cached}`);
      return cached;
    }
    
    // If already looks like an IATA code (3 letters), return as-is
    if (/^[A-Z]{3}$/i.test(cityName)) {
      const code = cityName.toUpperCase();
      this.airportCodeCache.set(normalized, code);
      return code;
    }
    
    // Special handling for countries (use ANY airport in that country)
    const countryHandling = {
      'japan': 'TYO',  // TYO = Any Tokyo airport (NRT/HND)
      'thailand': 'BKK',
      'singapore': 'SIN',
      'malaysia': 'KUL',
      'indonesia': 'CGK',
      'philippines': 'MNL',
      'vietnam': 'SGN',
      'south korea': 'ICN',
      'korea': 'ICN'
    };
    
    if (countryHandling[normalized]) {
      const code = countryHandling[normalized];
      console.log(`   🌏 Country detected: "${cityName}" → Using ${code} (any airport)`);
      this.airportCodeCache.set(normalized, code);
      return code;
    }
    
    try {
      console.log(`   🤖 Asking Nova Lite for airport code: "${cityName}"`);
      
      const command = new ConverseCommand({
        modelId: this.fastModel,
        messages: [{
          role: 'user',
          content: [{
            text: `What is the 3-letter IATA airport code for ${cityName}? 
            
Rules:
- Return ONLY the 3-letter code, nothing else
- For cities with multiple airports, return the main international airport
- For countries (like "Japan"), use the metropolitan area code (TYO for Tokyo area)
- Examples: Mumbai → BOM, Bali → DPS, Goa → GOI, Phu Quoc Island → PQC, Japan → TYO
- If unsure, return the most common code

Response format: Just the 3-letter code (e.g., "BOM")`
          }]
        }],
        inferenceConfig: {
          maxTokens: 10,
          temperature: 0.1,
          topP: 0.9
        }
      });
      
      const response = await this.bedrockClient.send(command);
      const code = response.output.message.content[0].text.trim().toUpperCase();
      
      // Validate it's a 3-letter code
      if (/^[A-Z]{3}$/.test(code)) {
        console.log(`   ✅ Nova Lite found: "${cityName}" → ${code}`);
        this.airportCodeCache.set(normalized, code);
        return code;
      } else {
        console.log(`   ⚠️ Nova Lite returned invalid code: "${code}", using city name`);
        return cityName;
      }
      
    } catch (error) {
      console.error(`   ❌ Error getting airport code from Nova Lite:`, error.message);
      // Fallback to using city name as-is
      return cityName;
    }
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

    // Convert city names to IATA codes using Nova Lite
    console.log('   🤖 Using Nova Lite to get airport codes...');
    const originCode = await this.getCityCode(origin);
    const destinationCode = await this.getCityCode(destination);
    
    // Detect currency based on origin city if not explicitly provided
    let detectedCurrency = currency;
    if (!currency || currency === 'USD') {
      detectedCurrency = await this.detectCurrency(origin);
      console.log(`   💰 Auto-detected currency: ${detectedCurrency}`);
    }

    console.log('   🔄 Code Conversion:', {
      originalOrigin: origin,
      convertedOrigin: originCode,
      originalDestination: destination,
      convertedDestination: destinationCode,
      currency: detectedCurrency
    });

    // Use the SAME parameters as the working frontend implementation
    const params = {
      source: `City:${originCode}`,
      destination: `City:${destinationCode}`,
      departureDate: departureDate,
      currency: detectedCurrency.toLowerCase(),
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
        
        // Generate Google Flights fallback URL
        const googleFlightsUrl = await this.buildGoogleFlightsUrl(searchRequest);
        console.log('   🌐 Generated Google Flights fallback URL:', googleFlightsUrl);
        console.log('🔵 ===== KIWI API CALL END (NO RESULTS) =====\n');
        
        return { 
          success: true, 
          flights: [], 
          totalResults: 0,
          googleFlightsFallback: {
            url: googleFlightsUrl,
            reason: 'no_results',
            message: 'No flights found in our database. You can search on Google Flights instead.'
          }
        };
      }

      console.log(`   ✈️ Found ${itineraries.length} flight itineraries`);

      // Parse new itinerary format
      const flights = itineraries.map((itinerary, index) => {
        const outbound = itinerary.outbound;
        const firstSegment = outbound?.sectorSegments?.[0]?.segment;
        const lastSegment = outbound?.sectorSegments?.[outbound.sectorSegments.length - 1]?.segment;
        const carrier = firstSegment?.carrier || {};
        
        // Extract departure date from localDateTime (format: "2025-10-20T11:10:00")
        const departureDateTimeStr = firstSegment?.source?.localDateTime || '';
        console.log(`   🔍 DEBUG: localDateTime = "${departureDateTimeStr}"`);
        const flightDepartureDate = departureDateTimeStr ? departureDateTimeStr.split('T')[0] : searchRequest.departureDate; // Extract "2025-10-20"
        console.log(`   📅 DEBUG: Extracted date = "${flightDepartureDate}" (fallback: ${searchRequest.departureDate})`);
        const departureTime = firstSegment?.source?.localTime;
        
        return {
          id: itinerary.id || `kiwi-${index}`,
          airline: carrier.name || 'Unknown',
          flightNumber: `${carrier.code || 'XX'}${firstSegment?.code || '000'}`,
          origin: firstSegment?.source?.station?.code || originCode,
          destination: lastSegment?.destination?.station?.code || destinationCode,
          departureDate: flightDepartureDate, // Add departure date
          departureTime: departureTime,
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
      
      // Deduplicate flights
      const deduplicatedFlights = this.deduplicateFlights(flights);
      console.log(`   🔄 Deduplication: ${flights.length} → ${deduplicatedFlights.length} flights (removed ${flights.length - deduplicatedFlights.length} duplicates)`);
      
      console.log('🔵 ===== KIWI API CALL END (SUCCESS) =====\n');

      return {
        success: true,
        flights: deduplicatedFlights,
        totalResults: deduplicatedFlights.length,
        searchId: `kiwi-search-${Date.now()}`,
        currency: detectedCurrency,  // Use detected currency
        recommendations: this.generateRecommendations(deduplicatedFlights)
      };
    } catch (error) {
      console.error('\n   ❌ KIWI API ERROR:');
      console.error('   Error Message:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Response Status:', error.response?.status);
      console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('   Request URL:', error.config?.url);
      
      // Generate Google Flights fallback URL for API errors
      const googleFlightsUrl = await this.buildGoogleFlightsUrl(searchRequest);
      console.log('   🌐 Generated Google Flights fallback URL:', googleFlightsUrl);
      console.log('🔵 ===== KIWI API CALL END (ERROR) =====\n');
      
      // Instead of throwing, return error with fallback
      return {
        success: false,
        flights: [],
        totalResults: 0,
        error: error.message,
        googleFlightsFallback: {
          url: googleFlightsUrl,
          reason: 'api_error',
          message: 'Flight search API encountered an error. You can search on Google Flights instead.'
        }
      };
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
   * Deduplicate flights based on key attributes
   * Groups flights by route and flight number, keeps cheapest per date/time
   * Returns grouped format for better frontend display
   */
  deduplicateFlights(flights) {
    const flightGroups = new Map();

    // Step 1: Group by exact flight (same date + time + route)
    for (const flight of flights) {
      const exactKey = `${flight.airline}-${flight.flightNumber}-${flight.departureDate}-${flight.departureTime}-${flight.origin}-${flight.destination}`;
      
      if (!flightGroups.has(exactKey)) {
        flightGroups.set(exactKey, [flight]);
      } else {
        flightGroups.get(exactKey).push(flight);
      }
    }

    // Step 2: For each exact flight, keep only the CHEAPEST price
    const uniqueFlights = [];
    for (const [key, group] of flightGroups.entries()) {
      group.sort((a, b) => a.price - b.price);
      uniqueFlights.push(group[0]); // Keep cheapest
      
      if (group.length > 1) {
        console.log(`   🔀 Merged ${group.length} duplicates of ${group[0].flightNumber} (${group[0].departureDate} ${group[0].departureTime}): Kept $${group[0].price}, removed prices: ${group.slice(1).map(f => '$' + f.price).join(', ')}`);
      }
    }

    // Step 3: Sort by price and return individual flights (no route grouping)
    // This ensures users see all unique flight options
    const sortedFlights = uniqueFlights.sort((a, b) => a.price - b.price);
    
    console.log(`   ✅ Returning ${sortedFlights.length} unique flight options`);
    
    return sortedFlights;
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
   * Improved scoring algorithm that prioritizes:
   * - Direct flights (major bonus)
   * - Reasonable prices (not necessarily cheapest)
   * - Short durations
   * - Fewer stops
   */
  calculateBestValue(flights) {
    const scores = flights.map(flight => {
      let score = 0;
      
      // Price scoring (normalized): cheaper is better, but with diminishing returns
      const avgPrice = flights.reduce((sum, f) => sum + f.price, 0) / flights.length;
      const priceScore = Math.max(0, 500 - (flight.price - avgPrice));
      score += priceScore;
      
      // Duration scoring: shorter is better
      const avgDuration = flights.reduce((sum, f) => sum + f.durationMinutes, 0) / flights.length;
      const durationScore = Math.max(0, 300 - (flight.durationMinutes - avgDuration));
      score += durationScore;
      
      // Stops scoring: huge penalty for stops
      if (flight.stops === 0) {
        score += 400; // Major bonus for direct flights
      } else if (flight.stops === 1) {
        score += 100; // Small bonus for 1-stop
      } else {
        score -= flight.stops * 150; // Penalty for multiple stops
      }
      
      // Airline quality bonus (prefer known airlines)
      const goodAirlines = ['Air India', 'Emirates', 'Qatar Airways', 'Singapore Airlines', 'Lufthansa', 'British Airways', 'United', 'Delta', 'American Airlines'];
      if (goodAirlines.some(airline => flight.airline.includes(airline))) {
        score += 100;
      }
      
      return { ...flight, score };
    });
    
    return scores.sort((a, b) => b.score - a.score)[0];
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

  /**
   * Generate Google Flights URL for fallback
   */
  async buildGoogleFlightsUrl(searchRequest) {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = {},
      cabinClass = 'economy'
    } = searchRequest;

    // Convert to IATA codes using Nova Lite
    const originCode = await this.getCityCode(origin);
    const destCode = await this.getCityCode(destination);

    // Format dates: YYYY-MM-DD
    const depDate = departureDate;
    const retDate = returnDate || '';

    // Build Google Flights URL with route format
    let url = `https://www.google.com/travel/flights`;
    
    if (retDate) {
      // Round-trip: /flights/ORIGIN.DESTINATION.DEPDATE.RETDATE
      url += `/flights/${originCode}.${destCode}.${depDate}.${retDate}`;
    } else {
      // One-way: /flights/ORIGIN.DESTINATION.DEPDATE
      url += `/flights/${originCode}.${destCode}.${depDate}`;
    }

    // Add query parameters
    const params = new URLSearchParams();
    params.append('hl', 'en');
    params.append('curr', 'USD');

    // Add passengers
    const adults = passengers.adults || 1;
    const children = passengers.children || 0;
    const infants = passengers.infants || 0;
    
    if (adults > 1) params.append('adults', adults.toString());
    if (children > 0) params.append('children', children.toString());
    if (infants > 0) params.append('infants', infants.toString());

    // Add cabin class
    const cabinMap = {
      'economy': '2',
      'premium_economy': '3',
      'business': '4',
      'first': '5'
    };
    const cabinCode = cabinMap[cabinClass.toLowerCase()] || '2';
    params.append('tfs', `f.CABIN.c.${cabinCode}`);

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }
}

module.exports = FlightService;