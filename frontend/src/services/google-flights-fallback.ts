/**
 * Google Flights Fallback Service
 * 
 * Opens Google Flights in a new tab when Kiwi API fails or returns no results.
 * Provides seamless fallback experience for flight searches.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

export interface GoogleFlightsParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export class GoogleFlightsFallbackService {
  private static readonly BASE_URL = 'https://www.google.com/travel/flights';

  /**
   * Constructs Google Flights URL with search parameters
   */
  static buildGoogleFlightsUrl(params: GoogleFlightsParams): string {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass = 'economy'
    } = params;

    // Format dates for Google Flights (YYYY-MM-DD)
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };

    const depDate = formatDate(departureDate);
    const retDate = returnDate ? formatDate(returnDate) : null;

    // Build passenger string
    const totalPassengers = passengers.adults + (passengers.children || 0);
    
    // Construct the flight search URL
    // Format: /flights?f=0 (round trip) or /flights?f=1 (one way)
    const tripType = retDate ? '0' : '1'; // 0 = round trip, 1 = one way
    
    // Build URL parts
    const urlParts = [
      this.BASE_URL,
      `?f=${tripType}`,
      `&tfs=CBwQAhopEgoyMDI1LTEwLTE3agcIARIDQk9NcgcIARIDQkNOMgEBQAFIAXABggELCP///////////wE`,
      `&curr=USD`
    ];

    // Simpler approach: Use the search form URL
    const searchUrl = new URL(this.BASE_URL);
    
    // Add route information as query parameters
    // Google Flights uses a complex URL structure, but we can use their search interface
    const travelParams = new URLSearchParams({
      hl: 'en',
      curr: 'USD'
    });

    // Build the route part of the URL
    // Format: /flights/ORIGIN.DESTINATION.DEPARTURE_DATE[.RETURN_DATE]
    let routePart = `/${origin}.${destination}.${depDate}`;
    if (retDate) {
      routePart += `.${retDate}`;
    }

    const fullUrl = `${this.BASE_URL}${routePart}?${travelParams.toString()}`;
    
    return fullUrl;
  }

  /**
   * Opens Google Flights in a new tab with pre-filled search parameters
   * @returns Promise that resolves when the tab is opened
   */
  static async openGoogleFlights(params: GoogleFlightsParams): Promise<void> {
    try {
      const url = this.buildGoogleFlightsUrl(params);
      
      console.log('🔄 Opening Google Flights fallback:', {
        origin: params.origin,
        destination: params.destination,
        url
      });

      // Open in new tab
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
      }

      // Return a promise that resolves immediately
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error opening Google Flights:', error);
      throw error;
    }
  }

  /**
   * Generates a user-friendly message explaining the Google Flights fallback
   */
  static getFallbackMessage(
    origin: string,
    destination: string,
    reason: 'no_results' | 'api_error' | 'rate_limit'
  ): string {
    const messages = {
      no_results: `We couldn't find any available flights from ${origin} to ${destination} in our database. We'll open Google Flights in a new tab where you can search for more options.`,
      api_error: `We're experiencing technical difficulties with our flight search. Opening Google Flights as an alternative to help you find flights from ${origin} to ${destination}.`,
      rate_limit: `We've reached our search limit. Opening Google Flights in a new tab to continue your search from ${origin} to ${destination}.`
    };

    return messages[reason] || messages.api_error;
  }

  /**
   * Check if Google Flights should be used as fallback
   * Returns true if we should use Google Flights based on the error or response
   */
  static shouldUseFallback(error: any, results?: any): boolean {
    // Use fallback if there's an error
    if (error) {
      console.log('🔍 Checking if should use Google Flights fallback:', error);
      return true;
    }

    // Use fallback if no results
    if (!results || (Array.isArray(results) && results.length === 0)) {
      console.log('🔍 No results found, using Google Flights fallback');
      return true;
    }

    return false;
  }

  /**
   * Combined method: Try Kiwi API first, fallback to Google Flights if needed
   */
  static async searchWithFallback(
    kiwiSearchFn: () => Promise<any>,
    params: GoogleFlightsParams,
    onFallback?: (reason: string) => void
  ): Promise<{ success: boolean; results?: any; usedFallback: boolean; fallbackReason?: string }> {
    try {
      // Try Kiwi API first
      console.log('🔍 Attempting Kiwi API search...');
      const results = await kiwiSearchFn();
      
      // Check if we got valid results
      if (this.shouldUseFallback(null, results)) {
        const reason = 'No flights available in our database';
        console.log('📢 ' + reason);
        
        if (onFallback) {
          onFallback(reason);
        }
        
        // Open Google Flights
        await this.openGoogleFlights(params);
        
        return {
          success: true,
          usedFallback: true,
          fallbackReason: 'no_results'
        };
      }
      
      // Success with Kiwi results
      return {
        success: true,
        results,
        usedFallback: false
      };
      
    } catch (error: any) {
      console.error('❌ Kiwi API search failed:', error);
      
      const reason = error.message || 'Flight search encountered an error';
      console.log('📢 ' + reason);
      
      if (onFallback) {
        onFallback(reason);
      }
      
      // Open Google Flights as fallback
      try {
        await this.openGoogleFlights(params);
        
        return {
          success: true,
          usedFallback: true,
          fallbackReason: 'api_error'
        };
      } catch (fallbackError) {
        console.error('❌ Google Flights fallback also failed:', fallbackError);
        throw new Error('Both Kiwi API and Google Flights fallback failed');
      }
    }
  }
}
