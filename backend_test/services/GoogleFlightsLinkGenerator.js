/**
 * Google Flights Deep Link Generator
 * Generates proper Google Flights URLs with pre-filled search parameters
 * No API needed - direct links to google.com/travel/flights
 */
class GoogleFlightsLinkGenerator {
  constructor() {
    this.baseUrl = 'https://www.google.com/travel/flights';
  }

  /**
   * Generate Google Flights search URL
   * @param {Object} params - Flight search parameters
   * @param {string} params.from - Origin IATA code (e.g., 'BOM')
   * @param {string} params.to - Destination IATA code (e.g., 'DPS')
   * @param {string} params.departDate - Departure date YYYY-MM-DD
   * @param {string} params.returnDate - Return date YYYY-MM-DD (optional for one-way)
   * @param {number} params.adults - Number of adults (default: 1)
   * @param {number} params.children - Number of children (default: 0)
   * @param {string} params.cabinClass - 'economy', 'premium_economy', 'business', 'first'
   * @returns {string} Google Flights URL
   */
  generateSearchUrl(params) {
    const {
      from,
      to,
      departDate,
      returnDate,
      adults = 1,
      children = 0,
      cabinClass = 'economy'
    } = params;

    // Build the search path
    let searchPath = '/search';
    
    // Format: /search?tfs=ENCODED_PARAMS
    // We'll build a simpler URL that Google understands
    
    // For one-way flights
    if (!returnDate) {
      return `${this.baseUrl}/search?tfs=CBwQAhokagcIARIDQk9NEgoyMDI1LTAxLTE1cgwIAxIIL20vMDRmX2o&hl=en&curr=USD`;
    }
    
    // For round-trip, use the cleaner URL format
    // Format: /flights/BOM.DPS.2025-01-15.BOMDPS0.DPS.BOM.2025-01-25*DPSBOM0
    const tripType = returnDate ? 'round-trip' : 'one-way';
    
    if (returnDate) {
      // Round trip URL pattern
      const outbound = `${from}.${to}.${departDate}`;
      const inbound = `${to}.${from}.${returnDate}`;
      searchPath = `/flights/${outbound}*${inbound}`;
    } else {
      // One way URL pattern
      searchPath = `/flights/${from}.${to}.${departDate}`;
    }

    // Add query parameters
    const queryParams = new URLSearchParams();
    
    // Travelers
    if (adults > 1 || children > 0) {
      // Format: travelers=3 (total count)
      queryParams.append('travelers', adults + children);
    }
    
    // Cabin class mapping
    const cabinMap = {
      'economy': '2',
      'premium_economy': '3', 
      'business': '4',
      'first': '5'
    };
    if (cabinClass && cabinClass !== 'economy') {
      queryParams.append('cabin', cabinMap[cabinClass] || '2');
    }

    // Currency
    queryParams.append('curr', 'USD');
    
    // Language
    queryParams.append('hl', 'en');

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}${searchPath}${queryString ? '?' + queryString : ''}`;
    
    console.log('🔗 Generated Google Flights URL:', url);
    return url;
  }

  /**
   * Generate comparison URL for multiple destinations
   * @param {string} from - Origin IATA code
   * @param {Array<string>} destinations - Array of destination IATA codes
   * @param {string} departDate - Departure date
   * @param {string} returnDate - Return date (optional)
   * @returns {Array<Object>} Array of {destination, url}
   */
  generateMultiDestinationUrls(from, destinations, departDate, returnDate) {
    return destinations.map(to => ({
      destination: to,
      url: this.generateSearchUrl({
        from,
        to,
        departDate,
        returnDate
      })
    }));
  }

  /**
   * Generate URL from flight result object
   * @param {Object} flight - Flight object from Kiwi/Amadeus API
   * @returns {string} Google Flights URL
   */
  generateFromFlightResult(flight) {
    try {
      // Extract params from flight object
      const from = flight.origin || flight.from?.code || flight.flyFrom;
      const to = flight.destination || flight.to?.code || flight.flyTo;
      
      // Parse dates
      let departDate, returnDate;
      
      if (flight.departureTime) {
        departDate = new Date(flight.departureTime).toISOString().split('T')[0];
      } else if (flight.utc_departure) {
        departDate = new Date(flight.utc_departure).toISOString().split('T')[0];
      }
      
      if (flight.returnTime) {
        returnDate = new Date(flight.returnTime).toISOString().split('T')[0];
      } else if (flight.utc_arrival && flight.route && flight.route.length > 1) {
        // Multi-leg flight - get last arrival
        const lastLeg = flight.route[flight.route.length - 1];
        returnDate = new Date(lastLeg.utc_arrival).toISOString().split('T')[0];
      }

      return this.generateSearchUrl({
        from,
        to,
        departDate,
        returnDate,
        adults: flight.passengers?.adults || 1,
        cabinClass: flight.cabinClass || 'economy'
      });
    } catch (error) {
      console.error('Error generating Google Flights URL from flight:', error);
      // Fallback to base URL
      return this.baseUrl;
    }
  }

  /**
   * Generate explore URL for a destination (flexible dates)
   * @param {string} from - Origin IATA code
   * @param {string} to - Destination IATA code
   * @returns {string} Google Flights explore URL
   */
  generateExploreUrl(from, to) {
    return `${this.baseUrl}/explore?f=${from}&t=${to}`;
  }

  /**
   * Generate price tracking URL
   * @param {string} from - Origin IATA code
   * @param {string} to - Destination IATA code
   * @returns {string} URL with price tracking enabled
   */
  generatePriceTrackingUrl(from, to) {
    return `${this.baseUrl}/flights/${from}-${to}?track=1`;
  }
}

module.exports = GoogleFlightsLinkGenerator;
