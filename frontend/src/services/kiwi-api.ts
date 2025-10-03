/**
 * Kiwi.com Flight API Service
 * Direct integration with Kiwi API for real flight data
 */

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
  private readonly apiKey = 'dc260b79a1mshf60901d122bb384p183ba0jsn9093522cbb9b';
  private readonly baseUrl = 'https://kiwi-com-cheap-flights.p.rapidapi.com';

  async searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    passengers: { adults: number; children?: number; infants?: number },
    checkedBags: number = 0
  ): Promise<KiwiApiResponse> {
    // Try different bag configurations if the initial search fails
    const bagConfigs = [checkedBags, Math.min(checkedBags, 2), Math.min(checkedBags, 1), 0];
    
    for (let i = 0; i < bagConfigs.length; i++) {
      const currentBags = bagConfigs[i];
      
      try {
        const params = new URLSearchParams({
          source: `City:${origin}`,
          destination: `City:${destination}`,
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
        });

        const url = `${this.baseUrl}/round-trip?${params.toString()}`;

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
    throw new Error(`No flights found for ${origin} to ${destination} with any bag configuration`);
  }

  convertToFlightOption(kiwiFlight: KiwiFlight, index: number) {
    const segment = kiwiFlight.outbound?.sectorSegments?.[0]?.segment;
    if (!segment) {
      console.warn('No segment data found in Kiwi flight:', kiwiFlight);
      return null;
    }
    
    const departureTime = new Date(segment.source?.localTime || new Date());
    const arrivalTime = new Date(segment.destination?.localTime || new Date());
    
    return {
      id: `kiwi-${index}`,
      airline: segment.carrier?.name || 'Unknown Airline',
      flightNumber: `${segment.carrier?.code || 'XX'}${segment.code || '0000'}`,
      departure: {
        airport: segment.source?.station?.code || 'XXX',
        city: segment.source?.station?.city?.name || 'Unknown',
        time: departureTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        date: departureTime.toISOString().split('T')[0]
      },
      arrival: {
        airport: segment.destination?.station?.code || 'XXX',
        city: segment.destination?.station?.city?.name || 'Unknown',
        time: arrivalTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        date: arrivalTime.toISOString().split('T')[0]
      },
      duration: this.formatDuration(segment.duration),
      durationMinutes: Math.floor(segment.duration / 60),
      price: parseFloat(kiwiFlight.price.amount),
      currency: (kiwiFlight.price.currency || 'USD').toUpperCase(),
      stops: kiwiFlight.outbound.sectorSegments.length - 1,
      baggage: {
        carry: true,
        checked: kiwiFlight.bagsInfo?.includedCheckedBags || 0,
        checkedBagCost: kiwiFlight.bagsInfo?.checkedBagTiers?.[0]?.tierPrice ? 
          parseFloat(kiwiFlight.bagsInfo.checkedBagTiers[0].tierPrice.amount) : 50,
        maxCheckedBags: 3
      },
      refundable: false,
      changeable: false,
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
