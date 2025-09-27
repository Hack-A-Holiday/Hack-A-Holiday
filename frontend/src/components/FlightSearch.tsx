/**
 * Flight Search Component
 * 
 * Comprehensive flight search interface with advanced filtering,
 * sorting, and recommendation display. Integrates with the enhanced
 * flight search backend service.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { FlightOption, FlightSearchRequest, FlightSearchResponse, COMMON_AIRPORTS, FlightUtils } from '../types/flight';
import { KiwiApiService } from '../services/kiwi-api';

interface FlightSearchProps {
  onFlightSelect?: (flight: FlightOption) => void;
  initialSearch?: Partial<FlightSearchRequest>;
  className?: string;
}

interface FlightFilters {
  maxPrice?: number;
  maxStops?: number;
  preferredAirlines?: string[];
  departureTimeRange?: {
    earliest: string;
    latest: string;
  };
  directFlightsOnly?: boolean;
  refundable?: boolean;
  checkedBags?: number;
  includeBaggageCosts?: boolean;
}

interface FlightPreferences {
  prioritizePrice: boolean;
  prioritizeConvenience: boolean;
  prioritizeDuration: boolean;
  prioritizeDirectFlights: boolean;
  userTravelStyle: 'budget' | 'mid-range' | 'luxury';
  flexibility: 'strict' | 'moderate' | 'flexible';
  preferredDepartureTime?: 'morning' | 'afternoon' | 'evening' | 'any';
}

export default function FlightSearch({ onFlightSelect, initialSearch, className = '' }: Readonly<FlightSearchProps>) {
  const [searchRequest, setSearchRequest] = useState<FlightSearchRequest>({
    origin: initialSearch?.origin || 'JFK',
    destination: initialSearch?.destination || 'CDG',
    departureDate: initialSearch?.departureDate || new Date().toISOString().split('T')[0],
    returnDate: initialSearch?.returnDate,
    passengers: initialSearch?.passengers || { adults: 1, children: 0, infants: 0 },
    cabinClass: initialSearch?.cabinClass || 'economy',
    currency: initialSearch?.currency || 'USD',
    ...initialSearch
  });

  const [filters, setFilters] = useState<FlightFilters>({});
  const [preferences, setPreferences] = useState<FlightPreferences>({
    prioritizePrice: true,
    prioritizeConvenience: false,
    prioritizeDuration: false,
    prioritizeDirectFlights: false,
    userTravelStyle: 'mid-range',
    flexibility: 'moderate'
  });

  const [searchResults, setSearchResults] = useState<FlightSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'departure-asc' | 'recommended'>('recommended');
  const [useRealData, setUseRealData] = useState(false);
  const [kiwiApiService] = useState(() => new KiwiApiService());

  // Group airports by region for better organization
  const airportsByRegion = COMMON_AIRPORTS.reduce((acc, airport) => {
    if (!acc[airport.region]) {
      acc[airport.region] = [];
    }
    acc[airport.region].push(airport);
    return acc;
  }, {} as Record<string, typeof COMMON_AIRPORTS>);

  const handleSearch = async () => {
    try {
      const request: FlightSearchRequest = {
        ...searchRequest,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        preferences: preferences
      };

      if (useRealData) {
        // Use real Kiwi API data
        console.log('🛫 Searching with REAL Kiwi API data...');
        console.log('Request:', request);
        console.log('RapidAPI Key available:', !!process.env.NEXT_PUBLIC_RAPIDAPI_KEY);
        
        try {
          const kiwiResponse = await kiwiApiService.searchFlights(
            request.origin,
            request.destination,
            request.departureDate,
            request.passengers,
            filters.checkedBags || 0
          );
          console.log('Kiwi API Response:', kiwiResponse);

          if (kiwiResponse.itineraries && kiwiResponse.itineraries.length > 0) {
            const realFlights = kiwiResponse.itineraries
              .map((flight, index) => kiwiApiService.convertToFlightOption(flight, index))
              .filter(flight => flight !== null) as FlightOption[];

            // Check if bag configuration was adjusted
            let bagNote = '';
            if (kiwiResponse.bagConfigUsed !== undefined && kiwiResponse.requestedBags !== undefined) {
              if (kiwiResponse.bagConfigUsed < kiwiResponse.requestedBags) {
                bagNote = `Note: Search returned results with ${kiwiResponse.bagConfigUsed} checked bags (requested ${kiwiResponse.requestedBags}). You can add extra bags during booking.`;
              }
            }

            const realResponse: FlightSearchResponse = {
              success: true,
              flights: realFlights,
              totalResults: realFlights.length,
              searchId: `kiwi-search-${Date.now()}`,
              searchTime: Math.floor(Math.random() * 1000) + 500,
              filters: filters,
              recommendations: {
                bestPrice: realFlights.length > 0 ? realFlights.reduce((min, flight) => {
                  return flight.price < min.price ? flight : min;
                }, realFlights[0]) : null,
                bestValue: realFlights[0] || null,
                fastest: realFlights.length > 0 ? realFlights.reduce((min, flight) => {
                  return flight.durationMinutes < min.durationMinutes ? flight : min;
                }, realFlights[0]) : null,
                mostConvenient: realFlights.find(f => f.stops === 0) || realFlights[0] || null
              },
              fallbackUsed: false,
              fallbackReason: bagNote || 'Using real Kiwi API data'
            };

            setSearchResults(realResponse);
            console.log('✅ Real flight data loaded:', realFlights.length, 'flights');
            return;
          } else {
            throw new Error('No flights found from Kiwi API');
          }
        } catch (apiError: any) {
          console.error('Kiwi API Error:', apiError);
          throw new Error(`Real data search failed: ${apiError?.message || 'Unknown error'}`);
        }
      }

      // Fallback to mock data
      console.log('🔍 Using mock data (fallback)...');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/plan-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            destination: request.destination,
            budget: request.filters?.maxPrice || 2000,
            duration: 5,
            travelers: request.passengers.adults,
            startDate: request.departureDate,
            travelStyle: request.preferences?.userTravelStyle || 'mid-range',
            interests: ['culture', 'food']
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.itinerary?.flights) {
        // Convert the existing API response to our enhanced flight search format
        const mockFlights = data.itinerary.flights.map((flight: any, index: number) => ({
          id: `flight-${index}`,
          airline: flight.airline || 'Mock Airlines',
          flightNumber: flight.flightNumber || `MA${1000 + index}`,
          departure: {
            airport: request.origin,
            city: 'Origin City',
            time: flight.departureTime || '10:00',
            date: request.departureDate
          },
          arrival: {
            airport: request.destination,
            city: 'Destination City',
            time: flight.arrivalTime || '14:00',
            date: request.departureDate
          },
          duration: flight.duration || '4h 00m',
          durationMinutes: flight.durationMinutes || 240,
          price: flight.price || Math.floor(Math.random() * 800) + 200,
          currency: 'USD',
          stops: flight.stops || 0,
          baggage: {
            carry: true,
            checked: Math.random() > 0.3 ? 1 : 0,
            checkedBagCost: Math.floor(Math.random() * 50) + 25, // $25-$75 per bag
            maxCheckedBags: 3
          },
          refundable: Math.random() > 0.5,
          changeable: Math.random() > 0.3,
          source: 'mock' as const,
          score: Math.random() * 0.4 + 0.6 // Random score between 0.6-1.0
        }));

        const mockResponse: FlightSearchResponse = {
          success: true,
          flights: mockFlights as FlightOption[],
          totalResults: mockFlights.length,
          searchId: `search-${Date.now()}`,
          searchTime: Math.floor(Math.random() * 1000) + 500,
          filters: request.filters || {},
          recommendations: {
            bestPrice: (mockFlights as FlightOption[]).reduce((min: FlightOption, flight: FlightOption) => {
              const minPrice = FlightUtils.getTotalPrice(min, filters.checkedBags || 0);
              const flightPrice = FlightUtils.getTotalPrice(flight, filters.checkedBags || 0);
              return flightPrice < minPrice ? flight : min;
            }, mockFlights[0]),
            bestValue: null,
            fastest: null,
            mostConvenient: null
          },
          fallbackUsed: true,
          fallbackReason: 'Using trip planning API with mock flight data'
        };

        setSearchResults(mockResponse);
      } else {
        // If no flights in response, create some mock data
        const mockFlights = Array.from({ length: 5 }, (_, index) => ({
          id: `mock-flight-${index}`,
          airline: ['American Airlines', 'Delta Air Lines', 'United Airlines', 'British Airways', 'Lufthansa'][index],
          flightNumber: `AA${1000 + index}`,
          departure: {
            airport: request.origin,
            city: 'Origin City',
            time: `${8 + index * 2}:${index * 15}`,
            date: request.departureDate
          },
          arrival: {
            airport: request.destination,
            city: 'Destination City',
            time: `${12 + index * 2}:${index * 15}`,
            date: request.departureDate
          },
          duration: `${3 + index}h ${index * 15}m`,
          durationMinutes: 180 + index * 60,
          price: Math.floor(Math.random() * 800) + 200,
          currency: 'USD',
          stops: index % 3 === 0 ? 0 : 1,
          baggage: {
            carry: true,
            checked: Math.random() > 0.3 ? 1 : 0,
            checkedBagCost: Math.floor(Math.random() * 50) + 25, // $25-$75 per bag
            maxCheckedBags: 3
          },
          refundable: Math.random() > 0.5,
          changeable: Math.random() > 0.3,
          source: 'mock' as const,
          score: Math.random() * 0.4 + 0.6
        }));

        const mockResponse: FlightSearchResponse = {
          success: true,
          flights: mockFlights as FlightOption[],
          totalResults: mockFlights.length,
          searchId: `search-${Date.now()}`,
          searchTime: Math.floor(Math.random() * 1000) + 500,
          filters: request.filters || {},
          recommendations: {
            bestPrice: (mockFlights as FlightOption[]).reduce((min: FlightOption, flight: FlightOption) => {
              const minPrice = FlightUtils.getTotalPrice(min, filters.checkedBags || 0);
              const flightPrice = FlightUtils.getTotalPrice(flight, filters.checkedBags || 0);
              return flightPrice < minPrice ? flight : min;
            }, mockFlights[0]),
            bestValue: null,
            fastest: null,
            mostConvenient: null
          }
        };

        setSearchResults(mockResponse);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred during flight search');
      console.error('Flight search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    setSearchRequest(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const target = e.target as HTMLInputElement;
            const { name, value, type } = target;
            const checked = target.checked;
            // Handle preference change logic here
          };

  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const handleSortChange = (newSortBy: 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'departure-asc' | 'recommended') => {
    setSortBy(newSortBy);
  };

  const handleRealDataToggle = () => {
    setUseRealData(prev => !prev);
  };

  // Sort flights based on the selected criteria
  const sortedFlights = React.useMemo(() => {
    if (!searchResults?.flights) return [];

    const flights = [...searchResults.flights];

    switch (sortBy) {
      case 'price-asc':
        flights.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        flights.sort((a, b) => b.price - a.price);
        break;
      case 'duration-asc':
        flights.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case 'duration-desc':
        flights.sort((a, b) => b.durationMinutes - a.durationMinutes);
        break;
      case 'departure-asc':
        flights.sort((a, b) => {
          const timeA = new Date(`${a.departure.date}T${a.departure.time}`).getTime();
          const timeB = new Date(`${b.departure.date}T${b.departure.time}`).getTime();
          return timeA - timeB;
        });
        break;
      case 'recommended':
      default:
        flights.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
    }

    return flights;
  }, [searchResults?.flights, sortBy]);

  return (
    <div className={`flight-search ${className}`}>
      <div className="search-header">
        <h2>Flight Search</h2>
        <button onClick={toggleFilters} className="toggle-filters">
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-form">
        <div className="form-group">
          <label htmlFor="origin">Origin</label>
          <input type="text" id="origin" name="origin" value={searchRequest.origin} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="destination">Destination</label>
          <input type="text" id="destination" name="destination" value={searchRequest.destination} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="departureDate">Departure Date</label>
          <input type="date" id="departureDate" name="departureDate" value={searchRequest.departureDate} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="returnDate">Return Date</label>
          <input type="date" id="returnDate" name="returnDate" value={searchRequest.returnDate} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="passengers">Passengers</label>
          <input type="number" id="adults" name="adults" min="1" value={searchRequest.passengers.adults} onChange={handleInputChange} />
          <input type="number" id="children" name="children" min="0" value={searchRequest.passengers.children} onChange={handleInputChange} />
          <input type="number" id="infants" name="infants" min="0" value={searchRequest.passengers.infants} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="cabinClass">Cabin Class</label>
          <select id="cabinClass" name="cabinClass" value={searchRequest.cabinClass} onChange={handleInputChange}>
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="filter-section">
          <div className="form-group">
            <label htmlFor="directFlightsOnly">Direct Flights Only</label>
            <input type="checkbox" id="directFlightsOnly" name="directFlightsOnly" checked={filters.directFlightsOnly || false} onChange={handleFilterChange} />
          </div>
        </div>
      )}

      {searchResults && (
        <div className="results-section">
          {sortedFlights.map(flight => (
            <div key={flight.id} className="flight-option">
              <h3>{flight.airline}</h3>
              <p>{flight.price} {flight.currency}</p>
            </div>
          ))}

          {searchResults?.totalResults > sortedFlights.length && (
            <button onClick={() => setSearchResults(prev => prev ? {
              ...prev,
              flights: [...prev.flights, ...sortedFlights],
              totalResults: prev.totalResults + sortedFlights.length
            } : null)}>
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}
