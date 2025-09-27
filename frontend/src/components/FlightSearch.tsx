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

import React, { useState, useEffect } from 'react';
import { FlightOption, FlightSearchRequest, FlightSearchResponse, COMMON_AIRPORTS, FlightUtils } from '../types/trip';
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

export default function FlightSearch({ onFlightSelect, initialSearch, className = '' }: FlightSearchProps) {
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

  const airlines = [
    'American Airlines', 'Delta Air Lines', 'United Airlines',
    'British Airways', 'Lufthansa', 'Air France', 'KLM',
    'Virgin Atlantic', 'Emirates', 'Qatar Airways'
  ];

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

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
                const priceA = filters.includeBaggageCosts && filters.checkedBags ? 
                  FlightUtils.getTotalPrice(flight, filters.checkedBags) : flight.price;
                const priceB = filters.includeBaggageCosts && filters.checkedBags ? 
                  FlightUtils.getTotalPrice(min, filters.checkedBags) : min.price;
                return priceA < priceB ? flight : min;
              }) : null,
              bestValue: realFlights[0] || null,
              fastest: realFlights.length > 0 ? realFlights.reduce((min, flight) => flight.durationMinutes < min.durationMinutes ? flight : min) : null,
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/plan-trip`, {
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
              const priceA = filters.includeBaggageCosts && filters.checkedBags ? 
                FlightUtils.getTotalPrice(flight, filters.checkedBags) : flight.price;
              const priceB = filters.includeBaggageCosts && filters.checkedBags ? 
                FlightUtils.getTotalPrice(min, filters.checkedBags) : min.price;
              return priceA < priceB ? flight : min;
            }),
            bestValue: mockFlights[0],
            fastest: (mockFlights as FlightOption[]).reduce((min: FlightOption, flight: FlightOption) => flight.durationMinutes < min.durationMinutes ? flight : min),
            mostConvenient: (mockFlights as FlightOption[]).find((f: FlightOption) => f.stops === 0) || mockFlights[0]
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
              const priceA = filters.includeBaggageCosts && filters.checkedBags ? 
                FlightUtils.getTotalPrice(flight, filters.checkedBags) : flight.price;
              const priceB = filters.includeBaggageCosts && filters.checkedBags ? 
                FlightUtils.getTotalPrice(min, filters.checkedBags) : min.price;
              return priceA < priceB ? flight : min;
            }),
            bestValue: mockFlights[0],
            fastest: (mockFlights as FlightOption[]).reduce((min: FlightOption, flight: FlightOption) => flight.durationMinutes < min.durationMinutes ? flight : min),
            mostConvenient: (mockFlights as FlightOption[]).find((f: FlightOption) => f.stops === 0) || mockFlights[0]
          },
          fallbackUsed: true,
          fallbackReason: 'No flights found in trip planning response, using mock data'
        };

        setSearchResults(mockResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Flight search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortFlights = (flights: FlightOption[]) => {
    const sorted = [...flights];
    
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => {
          const priceA = filters.includeBaggageCosts && filters.checkedBags ? 
            FlightUtils.getTotalPrice(a, filters.checkedBags) : a.price;
          const priceB = filters.includeBaggageCosts && filters.checkedBags ? 
            FlightUtils.getTotalPrice(b, filters.checkedBags) : b.price;
          return priceA - priceB;
        });
      case 'price-desc':
        return sorted.sort((a, b) => {
          const priceA = filters.includeBaggageCosts && filters.checkedBags ? 
            FlightUtils.getTotalPrice(a, filters.checkedBags) : a.price;
          const priceB = filters.includeBaggageCosts && filters.checkedBags ? 
            FlightUtils.getTotalPrice(b, filters.checkedBags) : b.price;
          return priceB - priceA;
        });
      case 'duration-asc':
        return sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
      case 'duration-desc':
        return sorted.sort((a, b) => b.durationMinutes - a.durationMinutes);
      case 'departure-asc':
        return sorted.sort((a, b) => a.departure.time.localeCompare(b.departure.time));
      case 'recommended':
        return sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      default:
        return sorted;
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDetailedDuration = (flight: FlightOption): string => {
    const departure = new Date(`2024-01-01 ${flight.departure.time}`);
    const arrival = new Date(`2024-01-01 ${flight.arrival.time}`);
    
    // Handle overnight flights
    if (arrival < departure) {
      arrival.setDate(arrival.getDate() + 1);
    }
    
    const diffMs = arrival.getTime() - departure.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const getTimeOfDay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return '🌅 Morning';
    if (hour >= 12 && hour < 18) return '☀️ Afternoon';
    return '🌙 Evening';
  };

  const getStopsText = (stops: number) => {
    if (stops === 0) return 'Direct';
    if (stops === 1) return '1 stop';
    return `${stops} stops`;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return '#666';
    if (score >= 0.8) return '#22c55e';
    if (score >= 0.6) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className={`flight-search ${className}`} style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Search Form */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: '600' }}>
          ✈️ Flight Search
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Origin */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>From</label>
            <select
              value={searchRequest.origin}
              onChange={(e) => setSearchRequest({ ...searchRequest, origin: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {Object.entries(airportsByRegion).map(([region, airports]) => (
                <optgroup key={region} label={region}>
                  {airports.map(airport => (
                    <option key={airport.code} value={airport.code}>
                      {airport.code} - {airport.name} ({airport.city}, {airport.country})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>To</label>
            <select
              value={searchRequest.destination}
              onChange={(e) => setSearchRequest({ ...searchRequest, destination: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {Object.entries(airportsByRegion).map(([region, airports]) => (
                <optgroup key={region} label={region}>
                  {airports.map(airport => (
                    <option key={airport.code} value={airport.code}>
                      {airport.code} - {airport.name} ({airport.city}, {airport.country})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Departure Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Departure</label>
            <input
              type="date"
              value={searchRequest.departureDate}
              onChange={(e) => setSearchRequest({ ...searchRequest, departureDate: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Return Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Return (Optional)</label>
            <input
              type="date"
              value={searchRequest.returnDate || ''}
              onChange={(e) => setSearchRequest({ ...searchRequest, returnDate: e.target.value || undefined })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Passengers */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Passengers</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Adults (12+)</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={searchRequest.passengers.adults}
                  onChange={(e) => setSearchRequest({
                    ...searchRequest,
                    passengers: { ...searchRequest.passengers, adults: parseInt(e.target.value) }
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Children (2-11)</label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={searchRequest.passengers.children || 0}
                  onChange={(e) => setSearchRequest({
                    ...searchRequest,
                    passengers: { ...searchRequest.passengers, children: parseInt(e.target.value) }
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Infants (0-1)</label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={searchRequest.passengers.infants || 0}
                  onChange={(e) => setSearchRequest({
                    ...searchRequest,
                    passengers: { ...searchRequest.passengers, infants: parseInt(e.target.value) }
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              Total: {searchRequest.passengers.adults + (searchRequest.passengers.children || 0) + (searchRequest.passengers.infants || 0)} passengers
            </div>
          </div>

          {/* Cabin Class */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Class</label>
            <select
              value={searchRequest.cabinClass}
              onChange={(e) => setSearchRequest({ ...searchRequest, cabinClass: e.target.value as any })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="economy">Economy</option>
              <option value="premium-economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
        </div>

        {/* Search Button and Filters Toggle */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={useRealData}
                onChange={(e) => setUseRealData(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              🛫 Use Real Flight Data (Kiwi API)
            </label>
            {useRealData && (
              <div style={{ 
                fontSize: '12px', 
                color: '#059669', 
                marginTop: '4px',
                fontWeight: '500'
              }}>
                ✅ Real-time prices and schedules from Kiwi.com
              </div>
            )}
          </div>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : useRealData ? 
                'linear-gradient(135deg, #059669 0%, #047857 100%)' : 
                '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                {useRealData ? 'Loading Real Data...' : 'Searching...'}
              </>
            ) : (
              <>
                {useRealData ? '🛫 Search Real Flights' : '🔍 Search Flights'}
              </>
            )}
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? '#6b7280' : '#f3f4f6',
              color: showFilters ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ⚙️ Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '600' }}>Advanced Filters</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Max Price */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Max Price</label>
                <input
                  type="number"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="No limit"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Max Stops */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Max Stops</label>
                <select
                  value={filters.maxStops || ''}
                  onChange={(e) => setFilters({ ...filters, maxStops: e.target.value ? parseInt(e.target.value) : undefined })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Any</option>
                  <option value="0">Direct only</option>
                  <option value="1">1 stop max</option>
                  <option value="2">2 stops max</option>
                </select>
              </div>

              {/* Direct Flights Only */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="directOnly"
                  checked={filters.directFlightsOnly || false}
                  onChange={(e) => setFilters({ ...filters, directFlightsOnly: e.target.checked })}
                />
                <label htmlFor="directOnly" style={{ fontSize: '14px', cursor: 'pointer' }}>Direct flights only</label>
              </div>

              {/* Refundable */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="refundable"
                  checked={filters.refundable || false}
                  onChange={(e) => setFilters({ ...filters, refundable: e.target.checked })}
                />
                <label htmlFor="refundable" style={{ fontSize: '14px', cursor: 'pointer' }}>Refundable only</label>
              </div>

              {/* Checked Bags */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Checked Bags</label>
                <select
                  value={filters.checkedBags || ''}
                  onChange={(e) => setFilters({ ...filters, checkedBags: e.target.value ? parseInt(e.target.value) : undefined })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Any</option>
                  <option value="0">No checked bags</option>
                  <option value="1">1 checked bag</option>
                  <option value="2">2 checked bags</option>
                  <option value="3">3 checked bags</option>
                  <option value="4">4+ checked bags</option>
                </select>
              </div>

              {/* Include Baggage Costs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="includeBaggageCosts"
                  checked={filters.includeBaggageCosts || false}
                  onChange={(e) => setFilters({ ...filters, includeBaggageCosts: e.target.checked })}
                />
                <label htmlFor="includeBaggageCosts" style={{ fontSize: '14px', cursor: 'pointer' }}>Include baggage costs in total price</label>
              </div>
            </div>

            {/* Travel Preferences */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: '600' }}>Travel Preferences</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Travel Style</label>
                  <select
                    value={preferences.userTravelStyle}
                    onChange={(e) => setPreferences({ ...preferences, userTravelStyle: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="budget">Budget</option>
                    <option value="mid-range">Mid-range</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Flexibility</label>
                  <select
                    value={preferences.flexibility}
                    onChange={(e) => setPreferences({ ...preferences, flexibility: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="strict">Strict</option>
                    <option value="moderate">Moderate</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.prioritizePrice}
                    onChange={(e) => setPreferences({ ...preferences, prioritizePrice: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px' }}>Prioritize Price</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.prioritizeDuration}
                    onChange={(e) => setPreferences({ ...preferences, prioritizeDuration: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px' }}>Prioritize Duration</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.prioritizeDirectFlights}
                    onChange={(e) => setPreferences({ ...preferences, prioritizeDirectFlights: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px' }}>Prioritize Direct Flights</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Search Results */}
      {searchResults && (
        <div>
          {/* Results Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            padding: '16px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '600' }}>
                {searchResults.totalResults} flights found
              </h3>
              <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                Search completed in {searchResults.searchTime}ms
                {searchResults.fallbackUsed && ' (using fallback data)'}
              </p>
              {searchResults.fallbackReason && searchResults.fallbackReason.includes('checked bags') && (
                <p style={{ margin: '4px 0 0 0', color: '#059669', fontSize: '13px', fontWeight: '500' }}>
                  ℹ️ {searchResults.fallbackReason}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
                <option value="duration-asc">Duration (Short to Long)</option>
                <option value="duration-desc">Duration (Long to Short)</option>
                <option value="departure-asc">Departure Time</option>
              </select>
            </div>
          </div>

          {/* Recommendations */}
          {searchResults.recommendations && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '600' }}>💡 Recommendations</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {searchResults.recommendations.bestPrice && (
                  <div style={{
                    padding: '16px',
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>💰 Best Price</div>
                    <div style={{ fontSize: '14px' }}>
                      {searchResults.recommendations.bestPrice.airline} - {filters.includeBaggageCosts && filters.checkedBags ? 
                        formatPrice(FlightUtils.getTotalPrice(searchResults.recommendations.bestPrice, filters.checkedBags)) :
                        formatPrice(searchResults.recommendations.bestPrice.price)
                      }
                    </div>
                  </div>
                )}
                {searchResults.recommendations.fastest && (
                  <div style={{
                    padding: '16px',
                    background: '#f0fdf4',
                    border: '1px solid #22c55e',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#15803d', marginBottom: '8px' }}>⚡ Fastest</div>
                    <div style={{ fontSize: '14px' }}>
                      {searchResults.recommendations.fastest.airline} - {formatDuration(searchResults.recommendations.fastest.durationMinutes)}
                    </div>
                  </div>
                )}
                {searchResults.recommendations.bestValue && (
                  <div style={{
                    padding: '16px',
                    background: '#fefce8',
                    border: '1px solid #eab308',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#a16207', marginBottom: '8px' }}>⭐ Best Value</div>
                    <div style={{ fontSize: '14px' }}>
                      {searchResults.recommendations.bestValue.airline} - {filters.includeBaggageCosts && filters.checkedBags ? 
                        formatPrice(FlightUtils.getTotalPrice(searchResults.recommendations.bestValue, filters.checkedBags)) :
                        formatPrice(searchResults.recommendations.bestValue.price)
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flight List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sortFlights(searchResults.flights).map((flight) => (
              <div
                key={flight.id}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                }}
                onClick={() => onFlightSelect?.(flight)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{flight.airline}</div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{flight.flightNumber}</div>
                      {flight.score && (
                        <div style={{
                          background: getScoreColor(flight.score),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          {Math.round(flight.score * 100)}% match
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{flight.departure.time}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{flight.departure.airport}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{getTimeOfDay(flight.departure.time)}</div>
                      </div>
                      
                      <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '4px' }}>
                          {formatDetailedDuration(flight)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>
                          {flight.departure.time} → {flight.arrival.time}
                        </div>
                        <div style={{
                          height: '1px',
                          background: '#d1d5db',
                          position: 'relative',
                          margin: '8px 0'
                        }}>
                          <div style={{
                            position: 'absolute',
                            right: '50%',
                            top: '-4px',
                            transform: 'translateX(50%)',
                            background: '#6b7280',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {getStopsText(flight.stops)}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{flight.arrival.time}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{flight.arrival.airport}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{getTimeOfDay(flight.arrival.time)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
                      {filters.includeBaggageCosts && filters.checkedBags ? 
                        formatPrice(FlightUtils.getTotalPrice(flight, filters.checkedBags), flight.currency) :
                        formatPrice(flight.price, flight.currency)
                      }
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>
                      per person
                    </div>
                    {filters.includeBaggageCosts && filters.checkedBags && FlightUtils.calculateBaggageCost(flight, filters.checkedBags) > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#059669', marginBottom: '8px' }}>
                        +{formatPrice(FlightUtils.calculateBaggageCost(flight, filters.checkedBags), flight.currency)} baggage
                      </div>
                    )}
                    <button
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Select
                    </button>
                  </div>
                </div>
                
                {/* Flight Details */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6',
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  flexWrap: 'wrap'
                }}>
                  <div>✈️ {flight.aircraft || 'Boeing 737'}</div>
                  <div>🎒 {flight.baggage.carry ? 'Carry-on included' : 'No carry-on'}</div>
                  <div>🧳 {FlightUtils.formatBaggageInfo(flight)}</div>
                  {filters.checkedBags && filters.checkedBags > flight.baggage.checked && (
                    <div style={{ color: '#059669' }}>
                      💰 +{formatPrice(FlightUtils.calculateBaggageCost(flight, filters.checkedBags), flight.currency)} for {filters.checkedBags - flight.baggage.checked} extra bag{filters.checkedBags - flight.baggage.checked > 1 ? 's' : ''}
                    </div>
                  )}
                  {flight.refundable && <div>↩️ Refundable</div>}
                  {flight.changeable && <div>🔄 Changeable</div>}
                  <div>🏷️ {flight.source}</div>
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {searchResults.flights.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✈️</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '600' }}>No flights found</h3>
              <p style={{ margin: '0', color: '#6b7280' }}>
                Try adjusting your search criteria or filters to find more options.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CSS for loading animation */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
