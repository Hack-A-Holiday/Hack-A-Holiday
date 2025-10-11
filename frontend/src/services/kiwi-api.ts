/**
 * Kiwi.com Flight API Service
 * Direct integration with Kiwi API for real flight data
 * With Google Flights fallback integration
 */

import { GoogleFlightsFallbackService, GoogleFlightsParams } from './google-flights-fallback';

export interface KiwiFlight {
  id: string;
  price: {
    amount: string;
    currency: string;
  };
  outbound: {
    sectorSegments: Array<{
      segment: {
        code: string;
        carrier: {
          name: string;
          code: string;
        };
        source: {
          localTime: string;
          station: {
            code: string;
            name: string;
            city: {
              name: string;
            };
          };
        };
        destination: {
          localTime: string;
          station: {
            code: string;
            name: string;
            city: {
              name: string;
            };
          };
        };
        duration: number;
      };
    }>;
  };
  bagsInfo: {
    includedHandBags: number;
    includedCheckedBags: number;
    checkedBagTiers: Array<{
      tierPrice: {
        amount: string;
      };
    }>;
  };
  deepLink?: string; // Direct booking link from Kiwi API
  bookingUrl?: string; // Alternative booking URL field
}

export interface KiwiApiResponse {
  itineraries: KiwiFlight[];
  metadata: {
    carriers: Array<{
      id: string;
      code: string;
      name: string;
    }>;
  };
  bagConfigUsed?: number;
  requestedBags?: number;
  note?: string;
}

export class KiwiApiService {
  private readonly apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20';
  private readonly baseUrl = 'https://kiwi-com-cheap-flights.p.rapidapi.com';

  /**
   * Search flights with automatic Google Flights fallback
   * @param useGoogleFallback - If true, automatically opens Google Flights if Kiwi API fails
   */
  async searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    passengers: { adults: number; children?: number; infants?: number },
    checkedBags: number = 0,
    returnDate?: string,
    useGoogleFallback: boolean = true
  ): Promise<KiwiApiResponse | null> {
    // Try different bag configurations if the initial search fails
    // Start with requested bags, then try progressively fewer bags
    const allConfigs = [checkedBags, 2, 1, 0];
    const uniqueConfigs = allConfigs.filter((value, index, self) => self.indexOf(value) === index);
    const bagConfigs = uniqueConfigs.filter(b => b <= checkedBags || checkedBags === 0).sort((a, b) => b - a);
    
    for (let i = 0; i < bagConfigs.length; i++) {
      const currentBags = bagConfigs[i];
      
      try {
        const params: Record<string, string> = {
          source: `City:${origin}`,
          destination: `City:${destination}`,
          departureDate: departureDate,
          currency: 'usd',
          locale: 'en',
          adults: passengers.adults.toString(),
          children: (passengers.children || 0).toString(),
          infants: (passengers.infants || 0).toString(),
          handbags: '1',
          holdbags: currentBags.toString(),
          cabinClass: 'ECONOMY',
          sortBy: 'QUALITY',
          sortOrder: 'ASCENDING',
          limit: '20'
        };
        
        // Add return date if provided (for round-trip searches)
        if (returnDate) {
          params.returnDate = returnDate;
        }
        
        const urlParams = new URLSearchParams(params);
        const url = `${this.baseUrl}/round-trip?${urlParams.toString()}`;

        console.log(`🛫 Trying Kiwi API search with ${currentBags} checked bags...`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'kiwi-com-cheap-flights.p.rapidapi.com',
            'x-rapidapi-key': this.apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // DEBUG: Log the actual API response structure
        console.log('🔍 Kiwi API Response Structure:', {
          hasData: !!data,
          hasItineraries: !!data.itineraries,
          itinerariesCount: data.itineraries?.length || 0,
          firstItinerary: data.itineraries?.[0],
          fullResponse: data
        });
        
        // Check if we got results
        if (data.itineraries && data.itineraries.length > 0) {
          console.log(`✅ Found ${data.itineraries.length} flights with ${currentBags} checked bags`);
          
          // Add metadata about bag configuration used
          if (currentBags !== checkedBags) {
            data.bagConfigUsed = currentBags;
            data.requestedBags = checkedBags;
            data.note = `Search returned results with ${currentBags} checked bags (requested ${checkedBags})`;
          }
          
          return data;
        } else {
          console.log(`❌ No flights found with ${currentBags} checked bags`);
          console.log('Data structure:', data);
          if (i < bagConfigs.length - 1) {
            console.log(`🔄 Trying with fewer bags...`);
            continue;
          }
        }
      } catch (error) {
        console.error(`❌ Kiwi API search error with ${currentBags} bags:`, error);
        if (i < bagConfigs.length - 1) {
          console.log(`🔄 Trying with fewer bags...`);
          continue;
        }
        throw error;
      }
    }
    
    // If we get here, no configuration worked
    if (useGoogleFallback) {
      console.log('🔄 No Kiwi results found, triggering Google Flights fallback...');
      
      // Prepare Google Flights parameters
      const googleParams: GoogleFlightsParams = {
        origin,
        destination,
        departureDate,
        returnDate,
        passengers,
        cabinClass: 'economy'
      };
      
      // Open Google Flights in new tab
      await GoogleFlightsFallbackService.openGoogleFlights(googleParams);
      
      // Return null to indicate fallback was used
      return null;
    }
    
    throw new Error(`No flights found for ${origin} to ${destination} with any bag configuration`);
  }

  convertToFlightOption(kiwiFlight: KiwiFlight, index: number) {
    const segments = kiwiFlight.outbound?.sectorSegments;
    if (!segments || segments.length === 0) {
      console.warn('No segment data found in Kiwi flight:', kiwiFlight);
      return null;
    }
    
    // Get first segment for departure info and last segment for arrival info
    const firstSegment = segments[0].segment;
    const lastSegment = segments[segments.length - 1].segment;
    
    // Calculate total duration across all segments
    const totalDuration = segments.reduce((sum, seg) => sum + (seg.segment?.duration || 0), 0);
    
    const departureTime = new Date(firstSegment.source?.localTime || new Date());
    const arrivalTime = new Date(lastSegment.destination?.localTime || new Date());
    
    return {
      id: `kiwi-${index}`,
      airline: firstSegment.carrier?.name || 'Unknown Airline',
      flightNumber: `${firstSegment.carrier?.code || 'XX'}${firstSegment.code || '0000'}`,
      departure: {
        airport: firstSegment.source?.station?.code || 'XXX',
        city: firstSegment.source?.station?.city?.name || 'Unknown',
        time: departureTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        date: departureTime.toISOString().split('T')[0]
      },
      arrival: {
        airport: lastSegment.destination?.station?.code || 'XXX',
        city: lastSegment.destination?.station?.city?.name || 'Unknown',
        time: arrivalTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        date: arrivalTime.toISOString().split('T')[0]
      },
      duration: this.formatDuration(totalDuration),
      durationMinutes: Math.floor(totalDuration / 60),
      price: Math.round(parseFloat(kiwiFlight.price.amount)),
      currency: (kiwiFlight.price.currency || 'USD').toUpperCase(),
      stops: segments.length - 1,
      baggage: {
        carry: true,
        checked: kiwiFlight.bagsInfo?.includedCheckedBags || 0,
        checkedBagCost: kiwiFlight.bagsInfo?.checkedBagTiers?.[0]?.tierPrice ? 
          Math.round(parseFloat(kiwiFlight.bagsInfo.checkedBagTiers[0].tierPrice.amount)) : 50,
        maxCheckedBags: 3
      },
      refundable: false,
      changeable: false,
      bookingUrl: kiwiFlight.deepLink || kiwiFlight.bookingUrl || undefined, // Use deep_link from Kiwi API
      source: 'kiwi' as const,
      metadata: {
        lastUpdated: new Date().toISOString(),
        availability: 9
      }
    };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
