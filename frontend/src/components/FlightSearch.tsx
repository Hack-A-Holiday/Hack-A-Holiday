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
import { FlightOption, FlightSearchRequest, FlightSearchResponse, COMMON_AIRPORTS, FlightUtils } from '../types/flight';
import { KiwiApiService } from '../services/kiwi-api';

// Add CSS animation for spinner
const spinKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject the keyframes if not already present
if (typeof document !== 'undefined' && !document.querySelector('#spin-animation')) {
  const style = document.createElement('style');
  style.id = 'spin-animation';
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}

interface FlightSearchProps {
  onFlightSelect?: (flight: FlightOption) => void;
  initialSearch?: Partial<FlightSearchRequest>;
  className?: string;
}

interface FlightFilters {
  maxPrice?: number;
  minPrice?: number;
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
  maxDuration?: number;
  minDuration?: number;
  cabinClass?: string;
  searchText?: string;
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
    origin: initialSearch?.origin || '',
    destination: initialSearch?.destination || '',
    departureDate: initialSearch?.departureDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow as default
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
  const [returnFlights, setReturnFlights] = useState<FlightOption[] | null>(null);
  const [roundTripPackages, setRoundTripPackages] = useState<Array<{outbound: FlightOption, return: FlightOption, totalPrice: number, savings?: number}> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'departure-asc' | 'recommended'>('recommended');
  const [useRealData, setUseRealData] = useState(false);
  const [kiwiApiService] = useState(() => new KiwiApiService());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [autoSearch, setAutoSearch] = useState(true);
  
  // Autocomplete state for airport/country suggestions
  const [originSuggestions, setOriginSuggestions] = useState<typeof COMMON_AIRPORTS>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<typeof COMMON_AIRPORTS>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  // Group airports by region for better organization
  const airportsByRegion = COMMON_AIRPORTS.reduce((acc, airport) => {
    if (!acc[airport.region]) {
      acc[airport.region] = [];
    }
    acc[airport.region].push(airport);
    return acc;
  }, {} as Record<string, typeof COMMON_AIRPORTS>);

  // Filter airports by country name or airport code
  const filterAirports = (input: string): typeof COMMON_AIRPORTS => {
    if (!input || input.length < 2) return [];
    
    const searchTerm = input.toLowerCase().trim();
    
    // Check if input matches a country name
    const countryMatch = COMMON_AIRPORTS.filter(airport => 
      airport.country.toLowerCase().includes(searchTerm)
    );
    
    // If country matches found, return all airports from those countries
    if (countryMatch.length > 0) {
      return countryMatch;
    }
    
    // Otherwise, search by airport code, city, or airport name
    return COMMON_AIRPORTS.filter(airport => 
      airport.code.toLowerCase().includes(searchTerm) ||
      airport.city.toLowerCase().includes(searchTerm) ||
      airport.name.toLowerCase().includes(searchTerm)
    );
  };

  // Auto-search effect
  useEffect(() => {
    if (autoSearch && searchRequest.origin && searchRequest.destination && searchRequest.departureDate) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 1000); // Debounce for 1 second
      return () => clearTimeout(debounceTimer);
    }
  }, [searchRequest.origin, searchRequest.destination, searchRequest.departureDate, searchRequest.passengers, autoSearch]);

  // Generate more comprehensive mock data
  const generateEnhancedMockFlights = (count = 15, origin?: string, destination?: string, departureDate?: string) => {
    const airlines = ['American Airlines', 'Delta Air Lines', 'United Airlines', 'British Airways', 'Lufthansa', 'Emirates', 'Air France', 'KLM', 'Swiss International', 'Turkish Airlines', 'Qatar Airways', 'Singapore Airlines', 'Cathay Pacific', 'Japan Airlines', 'Korean Air'];
    const aircraftTypes = ['Boeing 737', 'Airbus A320', 'Boeing 777', 'Airbus A350', 'Boeing 787', 'Airbus A380'];
    
    // Use provided values or fall back to searchRequest
    const flightOrigin = origin || searchRequest.origin;
    const flightDestination = destination || searchRequest.destination;
    const flightDate = departureDate || searchRequest.departureDate;
    
    return Array.from({ length: count }, (_, index) => {
      const airline = airlines[index % airlines.length];
      const basePrice = Math.floor(Math.random() * 1200) + 200;
      const stops = Math.floor(Math.random() * 3);
      const durationMinutes = 180 + (stops * 120) + Math.floor(Math.random() * 300);
      const departureHour = 6 + Math.floor(Math.random() * 16);
      const departureMinute = Math.floor(Math.random() * 60);
      const arrivalTime = new Date();
      arrivalTime.setHours(departureHour);
      arrivalTime.setMinutes(departureMinute + durationMinutes);
      
      return {
        id: `enhanced-flight-${index}`,
        airline,
        flightNumber: `${airline.split(' ')[0].substring(0, 2).toUpperCase()}${1000 + index}`,
        aircraft: aircraftTypes[index % aircraftTypes.length],
        departure: {
          airport: flightOrigin,
          city: 'Origin City',
          time: `${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}`,
          date: flightDate,
          terminal: `Terminal ${Math.floor(Math.random() * 5) + 1}`
        },
        arrival: {
          airport: flightDestination,
          city: 'Destination City',
          time: `${arrivalTime.getHours().toString().padStart(2, '0')}:${arrivalTime.getMinutes().toString().padStart(2, '0')}`,
          date: flightDate,
          terminal: `Terminal ${Math.floor(Math.random() * 5) + 1}`
        },
        duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        durationMinutes,
        price: basePrice + (stops * 50),
        currency: 'USD',
        stops,
        layovers: stops > 0 ? Array.from({ length: stops }, (_, i) => ({
          airport: `LAY${i + 1}`,
          duration: `${Math.floor(Math.random() * 180) + 30}m`
        })) : [],
        baggage: {
          carry: true,
          checked: Math.random() > 0.3 ? 1 : 0,
          checkedBagCost: Math.floor(Math.random() * 75) + 25,
          maxCheckedBags: 3
        },
        refundable: Math.random() > 0.4,
        changeable: Math.random() > 0.2,
        source: 'mock' as const,
        score: Math.random() * 0.4 + 0.6,
        seatAvailability: {
          economy: Math.floor(Math.random() * 50) + 10,
          business: Math.floor(Math.random() * 20) + 5,
          first: Math.floor(Math.random() * 8) + 2
        },
        onTimePerformance: Math.floor(Math.random() * 30) + 70,
        carbonEmission: Math.floor(Math.random() * 500) + 200
      } as FlightOption & {
        aircraft: string;
        layovers: Array<{ airport: string; duration: string }>;
        seatAvailability: { economy: number; business: number; first: number };
        onTimePerformance: number;
        carbonEmission: number;
      };
    });
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSearchResults(null);
    
    // Validate required fields before proceeding
    if (!searchRequest.origin || !searchRequest.destination || !searchRequest.departureDate) {
      setError('Please fill in all required fields: Origin, Destination, and Departure Date');
      setLoading(false);
      return;
    }

    // Ensure departure date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (searchRequest.departureDate < today) {
      setError('Departure date cannot be in the past');
      setLoading(false);
      return;
    }

    // Validate return date if provided
    if (searchRequest.returnDate && searchRequest.returnDate < searchRequest.departureDate) {
      setError('Return date cannot be before departure date');
      setLoading(false);
      return;
    }
    
    try {
      const request: FlightSearchRequest = {
        ...searchRequest,
        // Ensure all required fields are present
        origin: searchRequest.origin.trim().toUpperCase(),
        destination: searchRequest.destination.trim().toUpperCase(),
        departureDate: searchRequest.departureDate,
        passengers: {
          adults: searchRequest.passengers.adults || 1,
          children: searchRequest.passengers.children || 0,
          infants: searchRequest.passengers.infants || 0
        },
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
            
            // If return date is provided, search for return flights and create packages
            if (searchRequest.returnDate) {
              await searchReturnFlightsAndCreatePackages(realResponse.flights, request);
            } else {
              setReturnFlights(null);
              setRoundTripPackages(null);
            }
            return;
          } else {
            throw new Error('No flights found from Kiwi API');
          }
        } catch (apiError: any) {
          console.error('Kiwi API Error:', apiError);
          throw new Error(`Real data search failed: ${apiError?.message || 'Unknown error'}`);
        }
      }

      // Use Express backend for flight search
      console.log('✈️ Searching flights with Express backend...');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      
      try {
        const response = await fetch(`${backendUrl}/flights/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('authToken') || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            origin: request.origin.trim().toUpperCase(),
            destination: request.destination.trim().toUpperCase(),
            departureDate: request.departureDate,
            returnDate: request.returnDate,
            passengers: {
              adults: request.passengers.adults || 1,
              children: request.passengers.children || 0,
              infants: request.passengers.infants || 0
            },
            cabinClass: request.cabinClass,
            currency: request.currency || 'USD',
            filters: filters,
            preferences: preferences,
            userContext: {
              sessionId: localStorage.getItem('sessionId') || `session_${Date.now()}`,
              userId: localStorage.getItem('userId'),
              flightPreferences: preferences
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const expressResponse = await response.json();
        console.log('Express Backend Response:', expressResponse);

        if (expressResponse.success && expressResponse.flights) {
          // Convert Express response to expected format
          const convertedResponse: FlightSearchResponse = {
            success: true,
            flights: expressResponse.flights.map((flight: any) => ({
              id: flight.id || `flight-${Math.random()}`,
              airline: flight.airline || 'Unknown Airline',
              flightNumber: flight.flightNumber || 'N/A',
              departure: {
                airport: flight.origin || request.origin,
                city: flight.originCity || 'Origin City',
                time: flight.departureTime ? new Date(flight.departureTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '00:00',
                date: flight.departureDate || request.departureDate
              },
              arrival: {
                airport: flight.destination || request.destination,
                city: flight.destinationCity || 'Destination City', 
                time: flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '00:00',
                date: flight.arrivalDate || request.departureDate
              },
              duration: flight.duration || '4h 00m',
              durationMinutes: flight.durationMinutes || 240,
              price: flight.price || 500,
              currency: flight.currency || 'USD',
              stops: flight.stops || 0,
              baggage: {
                carry: true,
                checked: flight.baggage?.checked !== 'Not included' ? 1 : 0,
                checkedBagCost: flight.baggage?.checkedBagCost || 50,
                maxCheckedBags: 3
              },
              refundable: flight.refundable || false,
              changeable: flight.changeable || false,
              source: 'express' as const,
              score: flight.personalizedScore || 0.7
            })),
            totalResults: expressResponse.totalResults || expressResponse.flights.length,
            searchId: expressResponse.searchId || `search-${Date.now()}`,
            searchTime: expressResponse.searchTime || 1000,
            filters: request.filters || {},
            recommendations: expressResponse.recommendations || {
              bestPrice: null,
              bestValue: null,
              fastest: null,
              mostConvenient: null
            },
            fallbackUsed: expressResponse.fallbackUsed || false,
            fallbackReason: expressResponse.fallbackReason || 'Express backend search'
          };

          setSearchResults(convertedResponse);
          console.log('✅ Express backend search completed:', convertedResponse.flights.length, 'flights');
          
          // If return date is provided, search for return flights and create packages
          if (searchRequest.returnDate) {
            await searchReturnFlightsAndCreatePackages(convertedResponse.flights, request);
          } else {
            setReturnFlights(null);
            setRoundTripPackages(null);
          }
          return;
        }
      } catch (expressError: any) {
        console.error('Express backend error:', expressError);
        // Continue to fallback mock data
      }

      // Fallback to enhanced mock data
      console.log('📝 Using enhanced mock flight data as fallback...');
      const mockFlights = generateEnhancedMockFlights(20);

      const mockResponse: FlightSearchResponse = {
        success: true,
        flights: mockFlights as FlightOption[],
        totalResults: mockFlights.length,
        searchId: `search-${Date.now()}`,
        searchTime: Math.floor(Math.random() * 1000) + 500,
        filters: request.filters || {},
        recommendations: {
          bestPrice: mockFlights.reduce((min, flight) => flight.price < min.price ? flight : min, mockFlights[0]) as FlightOption,
          bestValue: mockFlights.sort((a, b) => (a.price / a.durationMinutes) - (b.price / b.durationMinutes))[0] as FlightOption,
          fastest: mockFlights.reduce((min, flight) => flight.durationMinutes < min.durationMinutes ? flight : min, mockFlights[0]) as FlightOption,
          mostConvenient: mockFlights.find(f => f.stops === 0) || mockFlights[0] as FlightOption
        },
        fallbackUsed: true,
        fallbackReason: 'Using enhanced mock flight data as fallback'
      };

      setSearchResults(mockResponse);
      
      // If return date is provided, search for return flights and create packages
      if (searchRequest.returnDate) {
        await searchReturnFlightsAndCreatePackages(mockResponse.flights, request);
      } else {
        // Clear round-trip data for one-way flights
        setReturnFlights(null);
        setRoundTripPackages(null);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred during flight search');
      console.error('Flight search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search for return flights and create round-trip packages
  const searchReturnFlightsAndCreatePackages = async (outboundFlights: FlightOption[], originalRequest: FlightSearchRequest) => {
    if (!searchRequest.returnDate) return;

    console.log('🔄 Searching return flights for round-trip packages...');
    console.log('Return flight: FROM', originalRequest.destination, 'TO', originalRequest.origin, 'on', searchRequest.returnDate);
    
    try {
      let returnFlightsData: FlightOption[] = [];

      // Check if using real data from Kiwi API
      if (useRealData) {
        console.log('🌐 Fetching REAL return flights from Kiwi API...');
        try {
          const kiwiResponse = await kiwiApiService.searchFlights(
            originalRequest.destination,  // FROM destination
            originalRequest.origin,       // TO origin
            searchRequest.returnDate,     // On return date
            originalRequest.passengers,
            filters.checkedBags || 0
          );
          
          if (kiwiResponse.itineraries && kiwiResponse.itineraries.length > 0) {
            returnFlightsData = kiwiResponse.itineraries
              .map((flight, index) => kiwiApiService.convertToFlightOption(flight, index))
              .filter(flight => flight !== null) as FlightOption[];
            console.log(`✅ Found ${returnFlightsData.length} real return flights from Kiwi API`);
          } else {
            console.log('⚠️ No real return flights found, falling back to mock data');
            returnFlightsData = generateEnhancedMockFlights(
              15, 
              originalRequest.destination,
              originalRequest.origin,
              searchRequest.returnDate
            ) as FlightOption[];
          }
        } catch (apiError) {
          console.error('❌ Kiwi API error for return flights:', apiError);
          console.log('📝 Using mock return flights as fallback');
          returnFlightsData = generateEnhancedMockFlights(
            15, 
            originalRequest.destination,
            originalRequest.origin,
            searchRequest.returnDate
          ) as FlightOption[];
        }
      } else {
        // Try Express backend first
        console.log('🖥️ Attempting to fetch return flights from Express backend...');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        
        try {
          const response = await fetch(`${backendUrl}/flights/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': localStorage.getItem('authToken') || ''
            },
            credentials: 'include',
            body: JSON.stringify({
              origin: originalRequest.destination,
              destination: originalRequest.origin,
              departureDate: searchRequest.returnDate,
              passengers: originalRequest.passengers,
              cabinClass: originalRequest.cabinClass,
              currency: originalRequest.currency || 'USD',
              filters: filters,
              preferences: preferences
            })
          });

          if (response.ok) {
            const expressResponse = await response.json();
            if (expressResponse.success && expressResponse.flights) {
              returnFlightsData = expressResponse.flights.map((flight: any) => ({
                id: flight.id || `return-flight-${Math.random()}`,
                airline: flight.airline || 'Unknown Airline',
                flightNumber: flight.flightNumber || 'N/A',
                departure: {
                  airport: flight.origin || originalRequest.destination,
                  city: flight.originCity || 'Origin City',
                  time: flight.departureTime ? new Date(flight.departureTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '00:00',
                  date: flight.departureDate || searchRequest.returnDate
                },
                arrival: {
                  airport: flight.destination || originalRequest.origin,
                  city: flight.destinationCity || 'Destination City',
                  time: flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '00:00',
                  date: flight.arrivalDate || searchRequest.returnDate
                },
                duration: flight.duration || '4h 00m',
                durationMinutes: flight.durationMinutes || 240,
                price: flight.price || 500,
                currency: flight.currency || 'USD',
                stops: flight.stops || 0,
                baggage: {
                  carry: true,
                  checked: flight.baggage?.checked !== 'Not included' ? 1 : 0,
                  checkedBagCost: flight.baggage?.checkedBagCost || 50,
                  maxCheckedBags: 3
                },
                refundable: flight.refundable || false,
                changeable: flight.changeable || false,
                source: 'express' as const,
                score: flight.personalizedScore || 0.7
              }));
              console.log(`✅ Found ${returnFlightsData.length} return flights from Express backend`);
            } else {
              throw new Error('Invalid backend response');
            }
          } else {
            throw new Error('Backend request failed');
          }
        } catch (backendError) {
          console.log('⚠️ Express backend unavailable, using mock return flights');
          returnFlightsData = generateEnhancedMockFlights(
            15, 
            originalRequest.destination,
            originalRequest.origin,
            searchRequest.returnDate
          ) as FlightOption[];
        }
      }
      
      setReturnFlights(returnFlightsData);

      // Create round-trip packages by combining outbound and return flights
      const packages = [];
      const maxPackages = Math.min(outboundFlights.length, returnFlightsData.length, 10);
      
      for (let i = 0; i < maxPackages; i++) {
        const outbound = outboundFlights[i];
        const returnFlight = returnFlightsData[i];
        
        const totalPrice = outbound.price + returnFlight.price;
        
        // Calculate potential savings (could be based on real booking engine data)
        const individualBookingFee = 30; // Typical booking fee per flight
        const savings = individualBookingFee; // Save one booking fee by bundling
        
        packages.push({
          outbound: outbound,
          return: returnFlight,
          totalPrice: totalPrice,
          savings: savings
        });
      }

      // Sort packages by total price
      packages.sort((a, b) => a.totalPrice - b.totalPrice);
      
      setRoundTripPackages(packages);
      console.log(`✅ Created ${packages.length} round-trip packages`);
      console.log(`Sample package: ${packages[0]?.outbound.departure.airport} → ${packages[0]?.outbound.arrival.airport} (outbound), ${packages[0]?.return.departure.airport} → ${packages[0]?.return.arrival.airport} (return)`);
    } catch (error) {
      console.error('Error creating round-trip packages:', error);
      setReturnFlights(null);
      setRoundTripPackages(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    
    // Handle airport autocomplete for origin and destination
    if (name === 'origin') {
      const suggestions = filterAirports(value);
      setOriginSuggestions(suggestions);
      setShowOriginSuggestions(suggestions.length > 0);
    } else if (name === 'destination') {
      const suggestions = filterAirports(value);
      setDestinationSuggestions(suggestions);
      setShowDestinationSuggestions(suggestions.length > 0);
    }
    
    setSearchRequest(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle selecting an airport from suggestions
  const handleAirportSelect = (airportCode: string, field: 'origin' | 'destination') => {
    setSearchRequest(prev => ({
      ...prev,
      [field]: airportCode
    }));
    
    if (field === 'origin') {
      setShowOriginSuggestions(false);
    } else {
      setShowDestinationSuggestions(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  // Enhanced filtering and sorting with Excel-like capabilities
  const filteredAndSortedFlights = React.useMemo(() => {
    if (!searchResults?.flights) return [];

    let flights = [...searchResults.flights];

    // Apply column filters (Excel-like)
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (!filterValue) return;
      
      const searchTerm = filterValue.toLowerCase();
      flights = flights.filter(flight => {
        switch (column) {
          case 'airline':
            return flight.airline.toLowerCase().includes(searchTerm);
          case 'flightNumber':
            return flight.flightNumber.toLowerCase().includes(searchTerm);
          case 'price':
            return flight.price.toString().includes(searchTerm);
          case 'duration':
            return flight.duration.toLowerCase().includes(searchTerm);
          case 'stops':
            return flight.stops.toString().includes(searchTerm);
          case 'departure':
            return flight.departure.time.includes(searchTerm) || flight.departure.airport.toLowerCase().includes(searchTerm);
          case 'arrival':
            return flight.arrival.time.includes(searchTerm) || flight.arrival.airport.toLowerCase().includes(searchTerm);
          default:
            return true;
        }
      });
    });

    // Apply advanced filters
    if (filters.minPrice) flights = flights.filter(f => f.price >= filters.minPrice!);
    if (filters.maxPrice) flights = flights.filter(f => f.price <= filters.maxPrice!);
    if (filters.maxStops !== undefined) flights = flights.filter(f => f.stops <= filters.maxStops!);
    if (filters.directFlightsOnly) flights = flights.filter(f => f.stops === 0);
    if (filters.refundable) flights = flights.filter(f => f.refundable);
    if (filters.cabinClass) flights = flights.filter(f => f.cabinClass?.toLowerCase() === filters.cabinClass?.toLowerCase());
    if (filters.searchText) {
      const searchTerm = filters.searchText.toLowerCase();
      flights = flights.filter(f => 
        f.airline.toLowerCase().includes(searchTerm) ||
        f.flightNumber.toLowerCase().includes(searchTerm) ||
        f.departure.airport.toLowerCase().includes(searchTerm) ||
        f.arrival.airport.toLowerCase().includes(searchTerm)
      );
    }

    // Sort flights
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
  }, [searchResults?.flights, sortBy, columnFilters, filters]);

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setFilters({});
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }} className={className}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px',
        padding: '20px',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e5e9'
      }}>
        <h2 style={{
          margin: 0,
          color: '#495057',
          fontSize: '2rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          ✈️ Flight Search
        </h2>
        <button 
          onClick={toggleFilters}
          style={{
            padding: '10px 20px',
            background: showFilters ? '#28a745' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => (e.target as HTMLElement).style.background = showFilters ? '#218838' : '#0056b3'}
          onMouseOut={(e) => (e.target as HTMLElement).style.background = showFilters ? '#28a745' : '#007bff'}
        >
          {showFilters ? '🔍 Hide Filters' : '🔧 Show Filters'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '15px 20px',
          borderRadius: '10px',
          margin: '20px 0',
          border: '1px solid #f5c6cb',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: '15px',
        padding: '30px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
        marginBottom: '25px',
        border: '1px solid #e1e5e9'
      }}>
        {/* Popular Airport Codes Helper */}
        <div className="airport-helper" style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
            Popular Airport Codes:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            <div><strong>New York:</strong> JFK, LGA, EWR</div>
            <div><strong>London:</strong> LHR, LGW, STN</div>
            <div><strong>Paris:</strong> CDG, ORY</div>
            <div><strong>Tokyo:</strong> NRT, HND</div>
            <div><strong>Los Angeles:</strong> LAX</div>
            <div><strong>Chicago:</strong> ORD, MDW</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label htmlFor="origin" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#495057',
            fontSize: '14px'
          }}>
            ✈️ Origin Airport Code * 
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6c757d', marginLeft: '8px' }}>
              (Type country name to see all airports)
            </span>
          </label>
          <input 
            type="text" 
            id="origin" 
            name="origin" 
            value={searchRequest.origin} 
            onChange={handleInputChange}
            onFocus={() => {
              if (searchRequest.origin) {
                const suggestions = filterAirports(searchRequest.origin);
                setOriginSuggestions(suggestions);
                setShowOriginSuggestions(suggestions.length > 0);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowOriginSuggestions(false), 200);
            }}
            placeholder="e.g., JFK, India, United States"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${!searchRequest.origin ? '#ff6b6b' : '#e1e5e9'}`,
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: '#fafbfc'
            }}
          />
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'white',
              border: '2px solid #007bff',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              marginTop: '-10px'
            }}>
              {originSuggestions.map((airport) => (
                <div
                  key={airport.code}
                  onClick={() => handleAirportSelect(airport.code, 'origin')}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <div style={{ fontWeight: '600', color: '#007bff', marginBottom: '4px' }}>
                    {airport.code} - {airport.city}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    {airport.name} • {airport.country}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label htmlFor="destination" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#495057',
            fontSize: '14px'
          }}>
            🛬 Destination Airport Code *
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6c757d', marginLeft: '8px' }}>
              (Type country name to see all airports)
            </span>
          </label>
          <input 
            type="text" 
            id="destination" 
            name="destination" 
            value={searchRequest.destination} 
            onChange={handleInputChange}
            onFocus={() => {
              if (searchRequest.destination) {
                const suggestions = filterAirports(searchRequest.destination);
                setDestinationSuggestions(suggestions);
                setShowDestinationSuggestions(suggestions.length > 0);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowDestinationSuggestions(false), 200);
            }}
            placeholder="e.g., CDG, Japan, France"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${!searchRequest.destination ? '#ff6b6b' : '#e1e5e9'}`,
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: '#fafbfc'
            }}
          />
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'white',
              border: '2px solid #007bff',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              marginTop: '-10px'
            }}>
              {destinationSuggestions.map((airport) => (
                <div
                  key={airport.code}
                  onClick={() => handleAirportSelect(airport.code, 'destination')}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <div style={{ fontWeight: '600', color: '#007bff', marginBottom: '4px' }}>
                    {airport.code} - {airport.city}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    {airport.name} • {airport.country}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="departureDate" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#495057',
            fontSize: '14px'
          }}>
            📅 Departure Date *
          </label>
          <input 
            type="date" 
            id="departureDate" 
            name="departureDate" 
            value={searchRequest.departureDate} 
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${!searchRequest.departureDate ? '#ff6b6b' : '#e1e5e9'}`,
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: '#fafbfc'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = !searchRequest.departureDate ? '#ff6b6b' : '#e1e5e9'}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="returnDate" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#495057',
            fontSize: '14px'
          }}>
            🔁 Return Date
          </label>
          <input 
            type="date" 
            id="returnDate" 
            name="returnDate" 
            value={searchRequest.returnDate || ''} 
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e1e5e9',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: '#fafbfc'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          />
        </div>

        <div className="form-group">
          <label htmlFor="adults">Adults</label>
          <input 
            type="number" 
            id="adults" 
            name="adults" 
            min="1" 
            value={searchRequest.passengers.adults} 
            onChange={(e) => setSearchRequest(prev => ({
              ...prev,
              passengers: { ...prev.passengers, adults: parseInt(e.target.value) }
            }))} 
          />
        </div>

        <div className="form-group">
          <label htmlFor="children">Children</label>
          <input 
            type="number" 
            id="children" 
            name="children" 
            min="0" 
            value={searchRequest.passengers.children || 0} 
            onChange={(e) => setSearchRequest(prev => ({
              ...prev,
              passengers: { ...prev.passengers, children: parseInt(e.target.value) }
            }))} 
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label htmlFor="cabinClass" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#495057',
            fontSize: '14px'
          }}>
            💺 Cabin Class
          </label>
          <select 
            id="cabinClass" 
            name="cabinClass" 
            value={searchRequest.cabinClass} 
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e1e5e9',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: '#fafbfc',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          >
            <option value="economy">Economy Class</option>
            <option value="business">Business Class</option>
            <option value="first">First Class</option>
          </select>
        </div>

        <button 
          onClick={handleSearch} 
          disabled={loading || !searchRequest.origin || !searchRequest.destination || !searchRequest.departureDate} 
          style={{
            width: '100%',
            padding: '16px 24px',
            background: loading || (!searchRequest.origin || !searchRequest.destination || !searchRequest.departureDate) 
              ? 'linear-gradient(135deg, #ccc 0%, #999 100%)' 
              : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: (!searchRequest.origin || !searchRequest.destination || !searchRequest.departureDate) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading || (!searchRequest.origin || !searchRequest.destination || !searchRequest.departureDate) 
              ? 'none' 
              : '0 4px 15px rgba(0, 123, 255, 0.3)',
            transform: 'translateY(0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            if (!loading && searchRequest.origin && searchRequest.destination && searchRequest.departureDate) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(0, 123, 255, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            (e.target as HTMLElement).style.boxShadow = loading || (!searchRequest.origin || !searchRequest.destination || !searchRequest.departureDate) 
              ? 'none' 
              : '0 4px 15px rgba(0, 123, 255, 0.3)';
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff30',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Searching Flights...
            </>
          ) : (
            <>
              ✈️ Search Flights
            </>
          )}
        </button>

        {/* Real-Time Data Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: useRealData ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : '#f8f9fa',
          borderRadius: '12px',
          marginTop: '20px',
          border: useRealData ? '2px solid #28a745' : '2px solid #e1e5e9',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: '600',
              color: useRealData ? 'white' : '#495057',
              marginBottom: '4px',
              fontSize: '16px'
            }}>
              {useRealData ? '🌐 Real-Time Flight Data' : '📝 Mock Flight Data'}
            </div>
            <div style={{
              fontSize: '13px',
              color: useRealData ? 'rgba(255,255,255,0.9)' : '#6c757d',
              lineHeight: '1.4'
            }}>
              {useRealData 
                ? 'Searching live flights from Kiwi.com API with real pricing and availability'
                : 'Using simulated flight data for testing purposes'}
            </div>
          </div>
          <button
            onClick={handleRealDataToggle}
            style={{
              padding: '10px 20px',
              background: useRealData ? 'white' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: useRealData ? '#28a745' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {useRealData ? '📝 Use Mock Data' : '🌐 Use Real Data'}
          </button>
        </div>

        {useRealData && (
          <div style={{
            padding: '12px 16px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginTop: '15px',
            fontSize: '13px',
            color: '#856404'
          }}>
            ⚠️ <strong>Note:</strong> Real-time data requires a valid RapidAPI key for Kiwi.com API. 
            {!process.env.NEXT_PUBLIC_RAPIDAPI_KEY && ' (API key not configured)'}
          </div>
        )}
      </div>

      {showFilters && (
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '25px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
          marginBottom: '25px',
          border: '1px solid #e1e5e9'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            color: '#495057', 
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}>
            🔧 Advanced Filters
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {/* Price Range */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057', fontSize: '14px' }}>
                💰 Price Range
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? parseInt(e.target.value) : undefined }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <span style={{ color: '#6c757d' }}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? parseInt(e.target.value) : undefined }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Max Stops */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057', fontSize: '14px' }}>
                🔄 Maximum Stops
              </label>
              <select
                value={filters.maxStops ?? ''}
                onChange={(e) => setFilters(prev => ({ ...prev, maxStops: e.target.value ? parseInt(e.target.value) : undefined }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="">Any number of stops</option>
                <option value="0">Direct flights only</option>
                <option value="1">Maximum 1 stop</option>
                <option value="2">Maximum 2 stops</option>
              </select>
            </div>

            {/* Cabin Class Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057', fontSize: '14px' }}>
                💺 Cabin Class
              </label>
              <select
                value={filters.cabinClass || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, cabinClass: e.target.value || undefined }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="">Any class</option>
                <option value="economy">Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
              </select>
            </div>
          </div>

          {/* Checkbox Filters */}
          <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={filters.directFlightsOnly || false} 
                onChange={(e) => setFilters(prev => ({ ...prev, directFlightsOnly: e.target.checked }))}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '500', color: '#495057' }}>✈️ Direct Flights Only</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={filters.refundable || false} 
                onChange={(e) => setFilters(prev => ({ ...prev, refundable: e.target.checked }))}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '500', color: '#495057' }}>💰 Refundable Only</span>
            </label>
            
            {/* Clear Filters Button */}
            <button
              onClick={() => setFilters({})}
              style={{
                padding: '8px 16px',
                background: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => (e.target as HTMLElement).style.background = '#ff5252'}
              onMouseOut={(e) => (e.target as HTMLElement).style.background = '#ff6b6b'}
            >
              🗑️ Clear All Filters
            </button>
          </div>
        </div>
      )}

      {searchResults && (
        <div style={{ marginTop: '30px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            padding: '20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#495057', fontSize: '1.3rem' }}>
                ✅ Found {searchResults.totalResults} flights
              </h3>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                Search completed in {searchResults.searchTime}ms
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              {/* View Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '600', color: '#495057', fontSize: '14px' }}>📊 View:</span>
                <div style={{ display: 'flex', background: '#f8f9fa', borderRadius: '8px', padding: '2px' }}>
                  <button
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      background: viewMode === 'cards' ? '#667eea' : 'transparent',
                      color: viewMode === 'cards' ? 'white' : '#6c757d',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🃏 Cards
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      background: viewMode === 'table' ? '#667eea' : 'transparent',
                      color: viewMode === 'table' ? 'white' : '#6c757d',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📋 Table
                  </button>
                </div>
              </div>

              {/* Global Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '600', color: '#495057', fontSize: '14px' }}>🔍 Search:</span>
                <input
                  type="text"
                  placeholder="Search flights..."
                  value={filters.searchText || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  style={{
                    padding: '6px 12px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    width: '150px'
                  }}
                />
              </div>

              {/* Sort Control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="sortBy" style={{ fontWeight: '600', color: '#495057', fontSize: '14px' }}>🔄 Sort:</label>
                <select 
                  id="sortBy" 
                  value={sortBy} 
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  style={{
                    padding: '6px 12px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  <option value="recommended">⭐ Recommended</option>
                  <option value="price-asc">💰 Price ↑</option>
                  <option value="price-desc">💸 Price ↓</option>
                  <option value="duration-asc">⚡ Duration ↑</option>
                  <option value="duration-desc">🐌 Duration ↓</option>
                  <option value="departure-asc">🕐 Departure ↑</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {(Object.values(columnFilters).some(v => v) || Object.keys(filters).some(k => filters[k as keyof typeof filters])) && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #dc3545',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: 'white',
                    color: '#dc3545',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#dc3545';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#dc3545';
                  }}
                >
                  🗑️ Clear All
                </button>
              )}
            </div>
          </div>

          {/* Round-Trip Packages Section */}
          {roundTripPackages && roundTripPackages.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px',
                borderRadius: '15px 15px 0 0',
                color: 'white',
                boxShadow: '0 5px 20px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  🔄 Round-Trip Packages
                </h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                  Save time and money with combined departure and return flights
                </p>
              </div>
              
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '0 0 15px 15px',
                boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
                border: '1px solid #e1e5e9',
                borderTop: 'none'
              }}>
                {roundTripPackages.slice(0, 5).map((pkg, index) => (
                  <div
                    key={`package-${index}`}
                    style={{
                      background: '#f8f9fa',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: index < 4 ? '15px' : '0',
                      border: '2px solid #e1e5e9',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#667eea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e1e5e9';
                    }}
                  >
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '20px',
                        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        color: 'white',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
                      }}>
                        ⭐ Best Deal
                      </div>
                    )}
                    
                    {/* Outbound Flight */}
                    <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px dashed #dee2e6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#667eea', marginRight: '10px' }}>
                          ✈️ OUTBOUND
                        </span>
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>
                          {pkg.outbound.departure.date}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#495057' }}>
                            {pkg.outbound.departure.time}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                            {pkg.outbound.departure.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: '#adb5bd' }}>
                            {pkg.outbound.airline}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                            {pkg.outbound.duration}
                          </div>
                          <div style={{ fontSize: '20px', color: '#667eea' }}>→</div>
                          <div style={{ fontSize: '11px', color: '#adb5bd', marginTop: '4px' }}>
                            {pkg.outbound.stops === 0 ? 'Direct' : `${pkg.outbound.stops} stop${pkg.outbound.stops > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#495057' }}>
                            {pkg.outbound.arrival.time}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                            {pkg.outbound.arrival.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: '#28a745', fontWeight: '600' }}>
                            ${pkg.outbound.price}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Return Flight */}
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#764ba2', marginRight: '10px' }}>
                          🔙 RETURN
                        </span>
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>
                          {pkg.return.departure.date}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#495057' }}>
                            {pkg.return.departure.time}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                            {pkg.return.departure.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: '#adb5bd' }}>
                            {pkg.return.airline}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                            {pkg.return.duration}
                          </div>
                          <div style={{ fontSize: '20px', color: '#764ba2' }}>→</div>
                          <div style={{ fontSize: '11px', color: '#adb5bd', marginTop: '4px' }}>
                            {pkg.return.stops === 0 ? 'Direct' : `${pkg.return.stops} stop${pkg.return.stops > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#495057' }}>
                            {pkg.return.arrival.time}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                            {pkg.return.arrival.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: '#28a745', fontWeight: '600' }}>
                            ${pkg.return.price}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Package Total */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                          Total Package Price
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                          ${pkg.totalPrice.toFixed(2)}
                        </div>
                        {pkg.savings && pkg.savings > 0 && (
                          <div style={{ fontSize: '12px', color: '#28a745', fontWeight: '600', marginTop: '4px' }}>
                            💰 Save ${pkg.savings} vs separate booking
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          console.log('Selected package:', pkg);
                          // Handle package selection
                        }}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                          (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.transform = 'translateY(0)';
                          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                        }}
                      >
                        🎫 Book Package
                      </button>
                    </div>
                  </div>
                ))}
                
                {roundTripPackages.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: '15px', color: '#6c757d', fontSize: '14px' }}>
                    Showing 5 of {roundTripPackages.length} packages
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'table' ? (
            /* Table View */
            <div style={{
              background: 'white',
              borderRadius: '15px',
              overflow: 'hidden',
              boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e1e5e9'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', minWidth: '140px' }}>
                        <div>✈️ Airline</div>
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={columnFilters.airline || ''}
                          onChange={(e) => handleColumnFilter('airline', e.target.value)}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', minWidth: '100px' }}>
                        <div>🔢 Flight #</div>
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={columnFilters.flightNumber || ''}
                          onChange={(e) => handleColumnFilter('flightNumber', e.target.value)}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', minWidth: '120px' }}>
                        <div>🛫 Departure</div>
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={columnFilters.departure || ''}
                          onChange={(e) => handleColumnFilter('departure', e.target.value)}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', minWidth: '120px' }}>
                        <div>🛬 Arrival</div>
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={columnFilters.arrival || ''}
                          onChange={(e) => handleColumnFilter('arrival', e.target.value)}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', minWidth: '100px' }}>
                        <div>⏱️ Duration</div>
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={columnFilters.duration || ''}
                          onChange={(e) => handleColumnFilter('duration', e.target.value)}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', minWidth: '80px' }}>
                        <div>🔄 Stops</div>
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={columnFilters.stops || ''}
                          onChange={(e) => handleColumnFilter('stops', e.target.value)}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ padding: '15px 12px', textAlign: 'right', fontWeight: '600', minWidth: '100px' }}>
                        <div>💰 Price</div>
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={columnFilters.price || ''}
                          onChange={(e) => handleColumnFilter('price', e.target.value)}
                          style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', minWidth: '120px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedFlights.map((flight: any, index: number) => (
                      <tr 
                        key={flight.id}
                        style={{
                          borderBottom: '1px solid #e9ecef',
                          transition: 'background-color 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        onClick={() => onFlightSelect?.(flight)}
                      >
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: '#495057' }}>{flight.airline}</div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {flight.aircraft || 'Aircraft N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: '#667eea' }}>{flight.flightNumber}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600' }}>{flight.departure.time}</div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>{flight.departure.airport}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600' }}>{flight.arrival.time}</div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>{flight.arrival.airport}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600' }}>{flight.duration}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: flight.stops === 0 ? '#d4edda' : '#fff3cd',
                            color: flight.stops === 0 ? '#155724' : '#856404'
                          }}>
                            {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#667eea' }}>
                            ${flight.price}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>{flight.currency}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFlightSelect?.(flight);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredAndSortedFlights.map((flight: any, index: number) => (
              <div 
                key={flight.id} 
                onClick={() => onFlightSelect?.(flight)}
                style={{
                  background: 'white',
                  borderRadius: '15px',
                  padding: '25px',
                  boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
                  border: '1px solid #e1e5e9',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 5px 20px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#e1e5e9';
                }}
              >
                {index === 0 && sortBy === 'recommended' && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '8px 15px',
                    borderBottomLeftRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    ⭐ RECOMMENDED
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: 'bold', color: '#495057' }}>
                      {flight.airline} {flight.flightNumber}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#6c757d' }}>
                      <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '12px' }}>
                        {flight.stops === 0 ? '✈️ Direct' : `🔄 ${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                      </span>
                      <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '12px' }}>
                        📍 {flight.source}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
                      ${flight.price}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {flight.currency} per person
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>
                        {flight.departure.time}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        {flight.departure.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: '#adb5bd' }}>
                        {flight.departure.city}
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                      <div style={{ 
                        height: '2px', 
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', 
                        position: 'relative',
                        margin: '10px 0'
                      }}>
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '-3px',
                          width: 0,
                          height: 0,
                          borderLeft: '8px solid #764ba2',
                          borderTop: '4px solid transparent',
                          borderBottom: '4px solid transparent'
                        }}></div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>
                        {flight.duration}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>
                        {flight.arrival.time}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        {flight.arrival.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: '#adb5bd' }}>
                        {flight.arrival.city}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '20px' }}>
                    <button style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      Select Flight
                    </button>
                  </div>
                </div>
                
                {flight.baggage && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    background: '#f8f9fa', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#6c757d'
                  }}>
                    <span style={{ marginRight: '15px' }}>🎒 Carry-on: Included</span>
                    <span style={{ marginRight: '15px' }}>
                      🧳 Checked: {flight.baggage.checked > 0 ? `${flight.baggage.checked} bag included` : `+$${flight.baggage.checkedBagCost}`}
                    </span>
                    {flight.refundable && <span style={{ marginRight: '15px' }}>💰 Refundable</span>}
                    {flight.changeable && <span>🔄 Changeable</span>}
                  </div>
                )}
              </div>
            ))}
            </div>
          )}

          {searchResults.fallbackUsed && (
            <div style={{
              background: '#fff3cd',
              color: '#856404',
              padding: '15px 20px',
              borderRadius: '10px',
              marginTop: '20px',
              border: '1px solid #ffeaa7',
              fontSize: '14px'
            }}>
              ℹ️ <strong>Note:</strong> {searchResults.fallbackReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
