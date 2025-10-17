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
import { bookingApiService } from '../services/booking-api';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '../contexts/AuthContext';
import { tripTrackingService } from '../services/trip-tracking';
import { tripApiService } from '../services/trip-api';
import { BookingConfirmationModal } from './BookingConfirmationModal';
import Swal from 'sweetalert2';
import Image from 'next/image';

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
  departureDateStart?: string; // Filter flights by departure date range
  departureDateEnd?: string;   // Filter flights by departure date range
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
  const { isDarkMode } = useDarkMode();
  const { state } = useAuth();
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
  const [hotelResults, setHotelResults] = useState<any>(null);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [vacationPackages, setVacationPackages] = useState<Array<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'departure-asc' | 'recommended'>('recommended');
  const [useRealData, setUseRealData] = useState(true); // Always use real data
  const [kiwiApiService] = useState(() => new KiwiApiService());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [autoSearch, setAutoSearch] = useState(true);
  
  // Autocomplete state for airport/country suggestions
  const [originSuggestions, setOriginSuggestions] = useState<typeof COMMON_AIRPORTS>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<typeof COMMON_AIRPORTS>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{
    type: 'single' | 'package';
    outbound?: FlightOption;
    return?: FlightOption;
    totalPrice?: number;
    savings?: number;
  } | null>(null);

  // Trip tracking confirmation state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);

  // Helper function to generate Google Flights URL with pre-filled search
  const generateGoogleFlightsUrl = (flight: FlightOption): string => {
    // Use the most reliable Google Flights format that works consistently
    const origin = flight.departure.airport;
    const destination = flight.arrival.airport;
    const date = flight.departure.date;
    
    // Format: /travel/flights with query parameter
    // This is the most reliable format that actually works
    const query = `${origin} to ${destination} ${date}`;
    return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
  };

  // Helper function to generate airline booking URLs with specific flight details
  const getAirlineBookingUrl = (flight: FlightOption): string => {
    // PRIORITY 1: If flight has a direct booking URL from the API, use that FIRST
    if (flight.bookingUrl) {
      console.log(`✅ Using direct booking link from API: ${flight.bookingUrl}`);
      return flight.bookingUrl;
    }

    const origin = flight.departure.airport;
    const destination = flight.arrival.airport;
    const date = flight.departure.date;
    
    // Use Google Flights WITHOUT airline details - Google doesn't parse them well
    // Simple format works better: "Flights from YYZ to BOM on 2025-10-20"
    const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${destination}%20on%20${date}`;
    
    console.log('🔗 Google Flights URL:', googleFlightsUrl);
    console.log('📍 Look for:', flight.airline, flight.flightNumber, 'departing at', flight.departure.time);
    console.log('💰 Price should be around $' + flight.price);
    
    return googleFlightsUrl;
  };

  // Helper function to generate round-trip booking URL for packages
  const getRoundTripBookingUrl = (outbound: FlightOption, returnFlight: FlightOption): string => {
    // Check if both flights have direct booking URLs
    if (outbound.bookingUrl && returnFlight.bookingUrl) {
      // Open both tabs for direct booking
      window.open(returnFlight.bookingUrl, '_blank', 'noopener,noreferrer');
      return outbound.bookingUrl;
    }

    // Build comprehensive search URL for Kiwi.com using their deep link format
    const origin = outbound.departure.airport;
    const destination = outbound.arrival.airport;
    const originCity = outbound.departure.city?.replace(/\s+/g, '-').toLowerCase() || origin.toLowerCase();
    const destCity = outbound.arrival.city?.replace(/\s+/g, '-').toLowerCase() || destination.toLowerCase();
    
    // Format dates for Kiwi (YYYY-MM-DD)
    const departureDate = outbound.departure.date;
    const returnDate = returnFlight.departure.date;
    
    const passengers = searchRequest.passengers.adults + (searchRequest.passengers.children || 0);
    
    // Try multiple URL formats for better compatibility
    
    // Option 1: Use Google Flights WITHOUT airline details (Google doesn't parse flight numbers well)
    // Simple format: "Flights from YYZ to BOM on 2025-10-20 return 2025-11-05"
    const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${destination}%20on%20${departureDate}%20return%20${returnDate}`;
    
    // Option 2: Kiwi.com deep link (current best attempt)
    const kiwiDeepLink = `https://www.kiwi.com/deep?affilid=hackholiday&currency=USD&departure=${origin}&destination=${destination}&from=${departureDate}&to=${returnDate}&flightsId=&price=&passengers=${passengers}&lang=en&return_from=${returnDate}&return_to=${returnDate}`;
    
    // Option 3: Direct Kiwi search (most reliable)
    const kiwiDirectSearch = `https://www.kiwi.com/en/search/tiles/${origin}/${destination}/${departureDate}/${returnDate}?sortBy=price&adults=${passengers}`;
    
    console.log('🔗 Booking URLs Generated:');
    console.log('1. Google Flights:', googleFlightsUrl);
    console.log('2. Kiwi Deep Link:', kiwiDeepLink);
    console.log('3. Kiwi Direct:', kiwiDirectSearch);
    console.log('🛫 Outbound:', outbound.airline, outbound.flightNumber, 'on', departureDate);
    console.log('🛬 Return:', returnFlight.airline, returnFlight.flightNumber, 'on', returnDate);
    
    // Use Google Flights as it's most reliable for pre-filled searches
    return googleFlightsUrl;
  };

  // Helper function to generate hotel booking URL
  const getHotelBookingUrl = (hotel: any, checkIn: string, checkOut: string): string => {
    const hotelName = hotel.name;
    const cityName = hotel.cityName || hotel.address || '';
    
    // Parse dates to calculate nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Use Booking.com with hotel name + city for specific search
    // Format: ss=Hotel+Name+City (search string includes both hotel name and city)
    const searchString = encodeURIComponent(`${hotelName} ${cityName}`);
    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${searchString}&checkin=${checkIn}&checkout=${checkOut}&group_adults=1&no_rooms=1&group_children=0`;
    
    console.log('🏨 Booking.com URL:', bookingUrl);
    console.log('📍 Hotel:', hotelName, 'in', cityName);
    console.log('📅 Check-in:', checkIn, '• Check-out:', checkOut, `(${nights} nights)`);
    
    return bookingUrl;
  };

  // Helper function to open booking URLs sequentially
  const openBookingLinks = async (urls: string[]) => {
    console.log('Opening booking links:', urls);
    
    if (urls.length === 0) return;
    
    // Open each URL one at a time with user confirmation
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const flightType = i === 0 ? '🛫 Outbound Flight' : (i === 1 ? '🛬 Return Flight' : '🏨 Hotel');
      
      // Extract flight details from URL for better display
      const urlParams = new URL(url).searchParams;
      const searchQuery = urlParams.get('q') || '';
      const displayInfo = searchQuery ? searchQuery.replace(/\+/g, ' ') : url;
      
      if (i === 0) {
        // Open first link immediately
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          alert('⚠️ Please allow popups for this site to open booking pages.');
          return;
        }
      } else {
        // For subsequent links, show confirmation dialog (creates user interaction)
        const confirmed = confirm(
          `${flightType}\n\n${displayInfo}\n\n` +
          `Click OK to open booking page ${i + 1} of ${urls.length}`
        );
        
        if (confirmed) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          // If user cancels, ask if they want to copy remaining URLs
          const copyUrls = confirm('Would you like to copy the remaining URLs to open manually?');
          if (copyUrls) {
            const remaining = urls.slice(i).join('\n');
            navigator.clipboard.writeText(remaining)
              .then(() => alert('✅ URLs copied to clipboard!'))
              .catch(() => alert('URLs:\n' + remaining));
          }
          break;
        }
      }
    }
  };

  // Handle single flight booking
  const handleBookFlight = (flight: FlightOption) => {
    // Save pending booking for trip tracking
    tripTrackingService.savePendingBooking({
      type: 'flight',
      origin: flight.departure.airport,
      destination: flight.arrival.airport,
      departureDate: flight.departure.date,
      details: {
        flights: {
          outbound: flight
        },
        totalPrice: flight.price
      }
    });

    setBookingDetails({
      type: 'single',
      outbound: flight,
      totalPrice: flight.price
    });
    setShowBookingModal(true);
  };

  // Handle round-trip package booking
  const handleBookPackage = (pkg: { outbound: FlightOption; return: FlightOption; totalPrice: number; savings?: number }) => {
    // Save pending booking for trip tracking
    tripTrackingService.savePendingBooking({
      type: 'package',
      origin: pkg.outbound.departure.airport,
      destination: pkg.outbound.arrival.airport,
      departureDate: pkg.outbound.departure.date,
      returnDate: pkg.return.departure.date,
      details: {
        flights: {
          outbound: pkg.outbound,
          return: pkg.return
        },
        totalPrice: pkg.totalPrice
      }
    });

    setBookingDetails({
      type: 'package',
      outbound: pkg.outbound,
      return: pkg.return,
      totalPrice: pkg.totalPrice,
      savings: pkg.savings
    });
    setShowBookingModal(true);
  };

  // Confirm and open booking links
  const confirmBooking = () => {
    if (!bookingDetails) return;

    if (bookingDetails.type === 'single' && bookingDetails.outbound) {
      const bookingUrl = getAirlineBookingUrl(bookingDetails.outbound);
      window.open(bookingUrl, '_blank', 'noopener,noreferrer');
    } else if (bookingDetails.type === 'package' && bookingDetails.outbound && bookingDetails.return) {
      // Check if both flights have direct booking URLs
      if (bookingDetails.outbound.bookingUrl && bookingDetails.return.bookingUrl) {
        // Open both direct booking links in separate tabs
        window.open(bookingDetails.outbound.bookingUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => {
          window.open(bookingDetails.return.bookingUrl, '_blank', 'noopener,noreferrer');
        }, 100);
      } else {
        // Open Google Flights for round-trip search (combined)
        const roundTripUrl = getRoundTripBookingUrl(bookingDetails.outbound, bookingDetails.return);
        window.open(roundTripUrl, '_blank', 'noopener,noreferrer');
        
        // Open second Google Flights tab for return flight search WITHOUT airline details
        setTimeout(() => {
          const returnGoogleUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${bookingDetails.return.departure.airport}%20to%20${bookingDetails.return.arrival.airport}%20on%20${bookingDetails.return.departure.date}`;
          window.open(returnGoogleUrl, '_blank', 'noopener,noreferrer');
        }, 500);
      }
    }

    setShowBookingModal(false);
    setBookingDetails(null);
  };

  // Handle trip confirmation when user returns from booking tabs
  const handleTripConfirmation = async () => {
    if (!pendingBookingData) return;

    try {
      // Get user ID from auth context or use email as fallback
      const userId = state.user?.email || 'guest';

      // Create trip in DynamoDB via API
      await tripApiService.createTrip({
        userId,
        origin: pendingBookingData.origin,
        destination: pendingBookingData.destination,
        departureDate: pendingBookingData.departureDate,
        returnDate: pendingBookingData.returnDate,
        type: pendingBookingData.type,
        details: pendingBookingData.details
      });

      // Clear localStorage pending booking (for backward compatibility)
      tripTrackingService.clearPendingBooking();

      // Close modal
      setShowConfirmationModal(false);
      setPendingBookingData(null);

      // Show success notification
      await Swal.fire({
        icon: 'success',
        title: '🎉 Trip Confirmed!',
        text: 'Check your profile to see your upcoming trips.',
        timer: 3000,
        showConfirmButton: false
      });

      // Browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 Trip Confirmed!', {
          body: 'Check your profile to see your upcoming trips.',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('❌ Error confirming trip:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to Confirm Trip',
        text: 'Please try again later.',
        confirmButtonText: 'OK'
      });
    }
  };

  // Handle trip cancellation
  const handleTripCancellation = () => {
    // Just clear the pending booking and close modal
    tripTrackingService.clearPendingBooking();
    setShowConfirmationModal(false);
    setPendingBookingData(null);
  };

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

  // Trip tracking: Listen for when user returns from booking tabs
  useEffect(() => {
    const handleBookingReturn = (event: Event) => {
      const customEvent = event as CustomEvent;
      const bookingData = customEvent.detail;
      
      if (bookingData) {
        setPendingBookingData(bookingData);
        setShowConfirmationModal(true);
      }
    };

    window.addEventListener('bookingTabReturned', handleBookingReturn as EventListener);

    return () => {
      window.removeEventListener('bookingTabReturned', handleBookingReturn as EventListener);
    };
  }, []);

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
            filters.checkedBags || 0,
            request.returnDate // Pass return date for round-trip searches
          );
          console.log('Kiwi API Response:', kiwiResponse);

          // Check if Google Flights fallback was used (returns null)
          if (kiwiResponse === null) {
            console.log('🌐 Google Flights fallback was triggered');
            Swal.fire({
              title: 'Opening Google Flights',
              html: `
                <p>We couldn't find flights in our database for this route.</p>
                <p><strong>We've opened Google Flights in a new tab</strong> with your search details pre-filled.</p>
                <p>Route: ${request.origin} → ${request.destination}</p>
                <p>Date: ${request.departureDate}${request.returnDate ? ` - ${request.returnDate}` : ''}</p>
              `,
              icon: 'info',
              confirmButtonText: 'OK',
              timer: 6000
            });
            setLoading(false);
            return;
          }

          if (kiwiResponse.itineraries && kiwiResponse.itineraries.length > 0) {
            const realFlights = kiwiResponse.itineraries
              .map((flight, index) => kiwiApiService.convertToFlightOption(flight, index))
              .filter(flight => {
                if (!flight) return false;
                
                // Ensure flight matches the requested origin and destination
                const matchesOrigin = flight.departure.airport === request.origin;
                const matchesDestination = flight.arrival.airport === request.destination;
                if (!matchesOrigin || !matchesDestination) {
                  console.warn(`⚠️ Filtered out flight: ${flight.departure.airport} → ${flight.arrival.airport} (expected ${request.origin} → ${request.destination})`);
                  return false;
                }
                
                // ✅ IMPROVED: Smart date filtering with flexibility and no past flights
                const flightDate = flight.departure.date;
                const departureDate = request.departureDate;
                const returnDate = request.returnDate;
                
                // Get today's date (no time component)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString().split('T')[0];
                
                // Filter out flights in the past
                if (flightDate < todayStr) {
                  console.warn(`⚠️ Filtered out past flight: ${flightDate} (today is ${todayStr})`);
                  return false;
                }
                
                // For outbound flights (origin → destination), allow ±14 days flexibility
                // (Kiwi API has limited availability, so we need more flexibility)
                if (returnDate) {
                  // Round-trip: Allow flights ±14 days from departure date
                  const requestedDate = new Date(departureDate);
                  const actualDate = new Date(flightDate);
                  const daysDifference = (actualDate.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24);
                  
                  // Accept flights from 14 days before to 14 days after departure date
                  if (daysDifference < -14 || daysDifference > 14) {
                    console.warn(`⚠️ Filtered out flight outside ±14 day window: ${flightDate} (requested: ${departureDate}, difference: ${Math.floor(daysDifference)} days)`);
                    return false;
                  }
                  
                  // Accept the flight if it's within ±14 days
                  if (flightDate !== departureDate) {
                    console.log(`✈️ Accepting flight on ${flightDate} (within ±14 days of ${departureDate})`);
                  }
                } else {
                  // One-way: Allow flights within ±14 days of requested date
                  const requestedDate = new Date(departureDate);
                  const actualDate = new Date(flightDate);
                  const daysDifference = (actualDate.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24);
                  
                  if (Math.abs(daysDifference) > 14) {
                    console.warn(`⚠️ Filtered out one-way flight outside ±14 day window: ${flightDate} (expected ${departureDate}, ${Math.floor(Math.abs(daysDifference))} days difference)`);
                    return false;
                  }
                  
                  if (flightDate !== departureDate) {
                    console.log(`✈️ Accepting one-way flight on ${flightDate} (within ±14 days of ${departureDate})`);
                  }
                }
                
                return true;
              }) as FlightOption[];

            // Check if bag configuration was adjusted
            let bagNote = '';
            if (kiwiResponse.bagConfigUsed !== undefined && kiwiResponse.requestedBags !== undefined) {
              if (kiwiResponse.bagConfigUsed < kiwiResponse.requestedBags) {
                bagNote = `Note: Search returned results with ${kiwiResponse.bagConfigUsed} checked bags (requested ${kiwiResponse.requestedBags}). You can add extra bags during booking.`;
              }
            }

            // Debug: Check if any flights have booking URLs
            console.log('📋 Flight booking URLs:', realFlights.map(f => ({
              flight: f.flightNumber,
              hasBookingUrl: !!f.bookingUrl,
              bookingUrl: f.bookingUrl || 'N/A'
            })));

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

            // Only use Kiwi results if we actually got flights with correct dates
            if (realFlights.length > 0) {
              setSearchResults(realResponse);
              console.log('✅ Real flight data loaded:', realFlights.length, 'flights');
              
              // If return date is provided, search for return flights and create packages
              if (searchRequest.returnDate) {
                const packages = await searchReturnFlightsAndCreatePackages(realResponse.flights, request);
                // After flights, search for hotels and pass the packages directly
                await searchHotels(searchRequest.destination, searchRequest.departureDate, searchRequest.returnDate, request, packages);
              } else {
                setReturnFlights(null);
                setRoundTripPackages(null);
                setHotelResults(null);
                setVacationPackages(null);
              }
              return;
            } else {
              console.warn('⚠️ Kiwi API returned flights but all were filtered out (wrong dates). Will try Express backend next');
            }
          } else {
            console.warn('⚠️ No flights found from Kiwi API, will try Express backend next');
          }
        } catch (apiError: any) {
          console.warn('⚠️ Kiwi API Error:', apiError.message);
          console.log('📝 Will try Express backend as fallback');
        }
      }

      // Use Express backend for flight search (if real data not found or not requested)
      if (!searchResults) {
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
            const packages = await searchReturnFlightsAndCreatePackages(convertedResponse.flights, request);
            // After flights, search for hotels and pass the packages directly
            await searchHotels(searchRequest.destination, searchRequest.departureDate, searchRequest.returnDate, request, packages);
          } else {
            setReturnFlights(null);
            setRoundTripPackages(null);
            setHotelResults(null);
            setVacationPackages(null);
          }
          return;
        }
        } catch (expressError: any) {
          console.error('Express backend error:', expressError);
          // Continue to fallback mock data
        }
      }

      // Fallback to enhanced mock data (if still no results)
      if (!searchResults) {
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
          const packages = await searchReturnFlightsAndCreatePackages(mockResponse.flights, request);
          // After flights, search for hotels and pass the packages directly
          await searchHotels(searchRequest.destination, searchRequest.departureDate, searchRequest.returnDate, request, packages);
        } else {
          // Clear round-trip data for one-way flights
          setReturnFlights(null);
          setRoundTripPackages(null);
          setHotelResults(null);
          setVacationPackages(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred during flight search');
      console.error('Flight search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search for hotels at destination
  const searchHotels = async (airportCode: string, checkIn: string, checkOut: string, flightRequest: FlightSearchRequest, packages?: Array<{outbound: FlightOption, return: FlightOption, totalPrice: number, savings?: number}>) => {
    setHotelLoading(true);
    try {
      // Use provided packages parameter if available, otherwise fall back to state
      const packagesToUse = packages || roundTripPackages;
      
      // Optimize hotel API calls: fetch max 10 hotels if flights found are less than 10
      const flightsCount = packagesToUse?.length || searchResults?.flights.length || 0;
      const maxHotels = flightsCount < 10 ? 10 : 20;
      
      console.log(`🏨 Searching hotels near ${airportCode} from ${checkIn} to ${checkOut}... (max: ${maxHotels} hotels for ${flightsCount} flights)`);
      
      const hotelSearch = await bookingApiService.searchHotels({
        airportCode,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: flightRequest.passengers.adults,
        children: flightRequest.passengers.children || 0,
        rooms: 1,
        currency: 'USD'
      });

      // Limit hotels based on flights found
      const limitedHotels = hotelSearch.hotels.slice(0, maxHotels);
      const optimizedHotelSearch = {
        ...hotelSearch,
        hotels: limitedHotels
      };

      console.log(`✅ Found ${hotelSearch.hotels.length} hotels, using ${limitedHotels.length} (optimized for ${flightsCount} flights)`);
      setHotelResults(optimizedHotelSearch);

      // If we have both flights and hotels, create vacation packages
      console.log('🔍 Checking vacation package conditions:', {
        hasPackages: !!packagesToUse,
        packagesCount: packagesToUse?.length || 0,
        hotelsCount: limitedHotels.length
      });
      
      if (packagesToUse && packagesToUse.length > 0 && limitedHotels.length > 0) {
        console.log('🎁 Creating vacation packages...');
        createVacationPackages(packagesToUse, limitedHotels);
      } else {
        console.warn('❌ Cannot create vacation packages - missing data:', {
          packages: packagesToUse?.length || 0,
          hotels: limitedHotels.length
        });
      }

    } catch (error) {
      console.error('❌ Hotel search error:', error);
    } finally {
      setHotelLoading(false);
    }
  };

  // Create vacation packages (flight + hotel combos)
  const createVacationPackages = (flightPackages: Array<{outbound: FlightOption, return: FlightOption, totalPrice: number, savings?: number}>, hotels: any[]) => {
    console.log('🎁 Creating vacation packages...');
    
    const packages = [];
    const maxPackages = Math.min(flightPackages.length, hotels.length, 10);

    for (let i = 0; i < maxPackages; i++) {
      const flightPackage = flightPackages[i];
      const hotel = hotels[i];

      const flightPrice = Math.round(flightPackage.totalPrice);
      const hotelPrice = Math.round(hotel.totalPrice);
      const totalPrice = Math.round(flightPrice + hotelPrice);

      // Calculate savings (bundle discount)
      const bundleDiscount = 50; // Fixed $50 bundle discount
      const flightSavings = flightPackage.savings || 0;
      const totalSavings = bundleDiscount + flightSavings;

      packages.push({
        id: `vacation-${i}`,
        flight: flightPackage,
        hotel: hotel,
        flightPrice,
        hotelPrice,
        totalPrice,
        savings: totalSavings,
        priceWithDiscount: Math.round(totalPrice - totalSavings)
      });
    }

    // Sort by best value (price with discount)
    packages.sort((a, b) => a.priceWithDiscount - b.priceWithDiscount);

    setVacationPackages(packages);
    console.log(`✅ Created ${packages.length} vacation packages`);
  };

  // Search for return flights and create round-trip packages
  const searchReturnFlightsAndCreatePackages = async (outboundFlights: FlightOption[], originalRequest: FlightSearchRequest) => {
    if (!searchRequest.returnDate) return;

    console.log('🔄 Searching return flights for round-trip packages...');
    console.log('Return flight: FROM', originalRequest.destination, 'TO', originalRequest.origin, 'on', searchRequest.returnDate);
    
    try {
      let returnFlightsData: FlightOption[] = [];

      // Try Express backend first (skip Kiwi API to avoid CORS issues with return flights)
      if (!returnFlightsData.length) {
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
            if (expressResponse.success && expressResponse.flights && expressResponse.flights.length > 0) {
              console.log('✅ Found', expressResponse.flights.length, 'return flights from Express backend');
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
              })) as FlightOption[];
            }
          }
        } catch (expressError) {
          console.error('Express backend error for return flights:', expressError);
        }
      }

      // Fallback to mock data if still no return flights
      if (!returnFlightsData.length) {
        console.log('📝 Using mock return flights as fallback');
        returnFlightsData = generateEnhancedMockFlights(
          15, 
          originalRequest.destination,
          originalRequest.origin,
          searchRequest.returnDate
        ) as FlightOption[];
      }

      setReturnFlights(returnFlightsData);

      // Create round-trip packages by combining outbound and return flights
      const packages = [];
      const maxPackages = Math.min(outboundFlights.length, returnFlightsData.length, 10);
      
      for (let i = 0; i < maxPackages; i++) {
        const outbound = outboundFlights[i];
        const returnFlight = returnFlightsData[i];
        
        // Validate that outbound and return match the requested route
        const outboundMatches = outbound.departure.airport === originalRequest.origin && 
                                outbound.arrival.airport === originalRequest.destination;
        const returnMatches = returnFlight.departure.airport === originalRequest.destination && 
                             returnFlight.arrival.airport === originalRequest.origin;
        
        if (!outboundMatches || !returnMatches) {
          console.warn(`⚠️ Skipping invalid package: Outbound ${outbound.departure.airport}→${outbound.arrival.airport}, Return ${returnFlight.departure.airport}→${returnFlight.arrival.airport}`);
          continue;
        }
        
        const totalPrice = Math.round(outbound.price + returnFlight.price);
        
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
      
      return packages; // Return packages so they can be used immediately
    } catch (error) {
      console.error('Error creating round-trip packages:', error);
      setReturnFlights(null);
      setRoundTripPackages(null);
      return []; // Return empty array on error
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
    
    // Apply date range filters
    if (filters.departureDateStart) {
      flights = flights.filter(f => f.departure.date >= filters.departureDateStart!);
    }
    if (filters.departureDateEnd) {
      flights = flights.filter(f => f.departure.date <= filters.departureDateEnd!);
    }
    
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

  // Sort round-trip packages based on sortBy
  const sortedRoundTripPackages = React.useMemo(() => {
    if (!roundTripPackages) return null;
    
    const packages = [...roundTripPackages];
    
    switch (sortBy) {
      case 'price-asc':
        packages.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
      case 'price-desc':
        packages.sort((a, b) => b.totalPrice - a.totalPrice);
        break;
      case 'duration-asc':
        packages.sort((a, b) => {
          const durationA = a.outbound.durationMinutes + a.return.durationMinutes;
          const durationB = b.outbound.durationMinutes + b.return.durationMinutes;
          return durationA - durationB;
        });
        break;
      case 'duration-desc':
        packages.sort((a, b) => {
          const durationA = a.outbound.durationMinutes + a.return.durationMinutes;
          const durationB = b.outbound.durationMinutes + b.return.durationMinutes;
          return durationB - durationA;
        });
        break;
      case 'departure-asc':
        packages.sort((a, b) => {
          const timeA = new Date(`${a.outbound.departure.date}T${a.outbound.departure.time}`).getTime();
          const timeB = new Date(`${b.outbound.departure.date}T${b.outbound.departure.time}`).getTime();
          return timeA - timeB;
        });
        break;
      case 'recommended':
      default:
        // Sort by price (ascending) for best deals
        packages.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
    }
    
    return packages;
  }, [roundTripPackages, sortBy]);

  // Sort vacation packages based on sortBy
  const sortedVacationPackages = React.useMemo(() => {
    if (!vacationPackages) return null;
    
    const packages = [...vacationPackages];
    
    switch (sortBy) {
      case 'price-asc':
        packages.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
      case 'price-desc':
        packages.sort((a, b) => b.totalPrice - a.totalPrice);
        break;
      case 'duration-asc':
        packages.sort((a, b) => {
          const durationA = a.flight.outbound.durationMinutes + a.flight.return.durationMinutes;
          const durationB = b.flight.outbound.durationMinutes + b.flight.return.durationMinutes;
          return durationA - durationB;
        });
        break;
      case 'duration-desc':
        packages.sort((a, b) => {
          const durationA = a.flight.outbound.durationMinutes + a.flight.return.durationMinutes;
          const durationB = b.flight.outbound.durationMinutes + b.flight.return.durationMinutes;
          return durationB - durationA;
        });
        break;
      case 'departure-asc':
        packages.sort((a, b) => {
          const timeA = new Date(`${a.flight.outbound.departure.date}T${a.flight.outbound.departure.time}`).getTime();
          const timeB = new Date(`${b.flight.outbound.departure.date}T${b.flight.outbound.departure.time}`).getTime();
          return timeA - timeB;
        });
        break;
      case 'recommended':
      default:
        // Sort by total price (ascending) for best deals
        packages.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
    }
    
    return packages;
  }, [vacationPackages, sortBy]);

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
        background: isDarkMode ? '#252d3d' : 'white',
        borderRadius: '15px',
        boxShadow: isDarkMode ? '0 2px 10px rgba(0,0,0,0.6)' : '0 2px 10px rgba(0,0,0,0.05)',
        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9'
      }}>
        <h2 style={{
          margin: 0,
          color: isDarkMode ? '#e8eaed' : '#495057',
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
          background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#f8d7da',
          color: isDarkMode ? '#f87171' : '#721c24',
          padding: '15px 20px',
          borderRadius: '10px',
          margin: '20px 0',
          border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #f5c6cb',
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
        background: isDarkMode ? '#252d3d' : 'white',
        borderRadius: '15px',
        padding: '30px',
        boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : '0 5px 20px rgba(0,0,0,0.08)',
        marginBottom: '25px',
        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9'
      }}>
        {/* Popular Airport Codes Helper */}
        <div className="airport-helper" style={{ 
          background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          fontSize: '14px',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: isDarkMode ? '#8b9cff' : '#333' }}>
            Popular Airport Codes:
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '8px',
            color: isDarkMode ? '#9ca3af' : '#333'
          }}>
            <div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>New York:</strong> JFK, LGA, EWR</div>
            <div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>London:</strong> LHR, LGW, STN</div>
            <div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Paris:</strong> CDG, ORY</div>
            <div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Tokyo:</strong> NRT, HND</div>
            <div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Los Angeles:</strong> LAX</div>
            <div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Chicago:</strong> ORD, MDW</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label htmlFor="origin" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
            fontSize: '14px'
          }}>
            ✈️ Origin Airport Code * 
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: isDarkMode ? '#9ca3af' : '#6c757d', marginLeft: '8px' }}>
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
              border: `2px solid ${!searchRequest.origin ? '#ff6b6b' : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9')}`,
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000'
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
              background: isDarkMode ? '#2d3548' : 'white',
              border: `2px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.5)' : '#007bff'}`,
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.15)',
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
                    borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #f0f0f0',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isDarkMode ? '#3a4255' : '#f8f9fa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isDarkMode ? '#2d3548' : 'white')}
                >
                  <div style={{ fontWeight: '600', color: isDarkMode ? '#8b9cff' : '#007bff', marginBottom: '4px' }}>
                    {airport.code} - {airport.city}
                  </div>
                  <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
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
            color: isDarkMode ? '#e8eaed' : '#495057',
            fontSize: '14px'
          }}>
            🛬 Destination Airport Code *
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: isDarkMode ? '#9ca3af' : '#6c757d', marginLeft: '8px' }}>
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
              border: `2px solid ${!searchRequest.destination ? '#ff6b6b' : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9')}`,
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000'
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
              background: isDarkMode ? '#2d3548' : 'white',
              border: `2px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.5)' : '#007bff'}`,
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.15)',
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
                    borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #f0f0f0',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isDarkMode ? '#3a4255' : '#f8f9fa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isDarkMode ? '#2d3548' : 'white')}
                >
                  <div style={{ fontWeight: '600', color: isDarkMode ? '#8b9cff' : '#007bff', marginBottom: '4px' }}>
                    {airport.code} - {airport.city}
                  </div>
                  <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
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
            color: isDarkMode ? '#e8eaed' : '#495057',
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
              border: `2px solid ${!searchRequest.departureDate ? '#ff6b6b' : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9')}`,
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000',
              colorScheme: isDarkMode ? 'dark' : 'light'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#667eea' : '#007bff'}
            onBlur={(e) => e.target.style.borderColor = !searchRequest.departureDate ? '#ff6b6b' : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9')}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="returnDate" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
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
              border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000',
              colorScheme: isDarkMode ? 'dark' : 'light'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#667eea' : '#007bff'}
            onBlur={(e) => e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9'}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
            fontSize: '14px'
          }}>
            👥 Passengers
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <div>
              <label htmlFor="adults" style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                fontWeight: '500'
              }}>
                Adults (18+)
              </label>
              <input 
                type="number" 
                id="adults" 
                name="adults" 
                min="1" 
                max="9"
                value={searchRequest.passengers.adults} 
                onChange={(e) => setSearchRequest(prev => ({
                  ...prev,
                  passengers: { ...prev.passengers, adults: parseInt(e.target.value) || 1 }
                }))} 
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                  borderRadius: '10px',
                  background: isDarkMode ? '#1a1f2e' : '#fafbfc',
                  color: isDarkMode ? '#e8eaed' : '#000',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  colorScheme: isDarkMode ? 'dark' : 'light'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#667eea' : '#007bff'}
                onBlur={(e) => e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9'}
              />
            </div>
            <div>
              <label htmlFor="children" style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                fontWeight: '500'
              }}>
                Children (0-17)
              </label>
              <input 
                type="number" 
                id="children" 
                name="children" 
                min="0" 
                max="9"
                value={searchRequest.passengers.children || 0} 
                onChange={(e) => setSearchRequest(prev => ({
                  ...prev,
                  passengers: { ...prev.passengers, children: parseInt(e.target.value) || 0 }
                }))} 
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                  borderRadius: '10px',
                  background: isDarkMode ? '#1a1f2e' : '#fafbfc',
                  color: isDarkMode ? '#e8eaed' : '#000',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  colorScheme: isDarkMode ? 'dark' : 'light'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#667eea' : '#007bff'}
                onBlur={(e) => e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9'}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label htmlFor="cabinClass" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
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
              border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
              borderRadius: '10px',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#667eea' : '#007bff'}
            onBlur={(e) => e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9'}
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
      </div>

      {showFilters && (
        <div style={{
          background: isDarkMode ? '#252d3d' : 'white',
          borderRadius: '15px',
          padding: '25px',
          boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : '0 5px 20px rgba(0,0,0,0.08)',
          marginBottom: '25px',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            color: isDarkMode ? '#8b9cff' : '#495057', 
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

            {/* Checked Bags Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057', fontSize: '14px' }}>
                🧳 Checked Bags
              </label>
              <select
                value={filters.checkedBags ?? ''}
                onChange={(e) => setFilters(prev => ({ ...prev, checkedBags: e.target.value ? parseInt(e.target.value) : undefined }))}
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
                <option value="">Any baggage</option>
                <option value="0">No checked bags (carry-on only)</option>
                <option value="1">1 checked bag</option>
                <option value="2">2 checked bags</option>
                <option value="3">3+ checked bags</option>
              </select>
            </div>

            {/* Departure Date Range Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057', fontSize: '14px' }}>
                📅 Departure Date Range
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="date"
                  placeholder="From"
                  value={filters.departureDateStart || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, departureDateStart: e.target.value || undefined }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <span style={{ color: '#6c757d' }}>to</span>
                <input
                  type="date"
                  placeholder="To"
                  value={filters.departureDateEnd || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, departureDateEnd: e.target.value || undefined }))}
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
          {sortedRoundTripPackages && sortedRoundTripPackages.length > 0 && (
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
                background: isDarkMode ? '#252d3d' : 'white',
                padding: '20px',
                borderRadius: '0 0 15px 15px',
                boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : '0 5px 20px rgba(0,0,0,0.08)',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9',
                borderTop: 'none'
              }}>
                {sortedRoundTripPackages.slice(0, 5).map((pkg, index) => (
                  <div
                    key={`package-${index}`}
                    style={{
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: index < 4 ? '15px' : '0',
                      border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = isDarkMode ? '0 8px 20px rgba(0,0,0,0.8)' : '0 8px 20px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#667eea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9';
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
                        <span style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                          {pkg.outbound.departure.date}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: isDarkMode ? '#e8eaed' : '#495057' }}>
                            {pkg.outbound.departure.time}
                          </div>
                          <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '4px' }}>
                            {pkg.outbound.departure.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                            {pkg.outbound.airline}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '4px' }}>
                            {pkg.outbound.duration}
                          </div>
                          <div style={{ fontSize: '20px', color: '#667eea' }}>→</div>
                          <div style={{ fontSize: '11px', color: isDarkMode ? '#6b7280' : '#adb5bd', marginTop: '4px' }}>
                            {pkg.outbound.stops === 0 ? 'Direct' : `${pkg.outbound.stops} stop${pkg.outbound.stops > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: isDarkMode ? '#e8eaed' : '#495057' }}>
                            {pkg.outbound.arrival.time}
                          </div>
                          <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '4px' }}>
                            {pkg.outbound.arrival.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                            ${Math.round(pkg.outbound.price)}
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
                        <span style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                          {pkg.return.departure.date}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: isDarkMode ? '#e8eaed' : '#495057' }}>
                            {pkg.return.departure.time}
                          </div>
                          <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '4px' }}>
                            {pkg.return.departure.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                            {pkg.return.airline}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '4px' }}>
                            {pkg.return.duration}
                          </div>
                          <div style={{ fontSize: '20px', color: '#764ba2' }}>→</div>
                          <div style={{ fontSize: '11px', color: isDarkMode ? '#6b7280' : '#adb5bd', marginTop: '4px' }}>
                            {pkg.return.stops === 0 ? 'Direct' : `${pkg.return.stops} stop${pkg.return.stops > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '18px', color: isDarkMode ? '#e8eaed' : '#495057' }}>
                            {pkg.return.arrival.time}
                          </div>
                          <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '4px' }}>
                            {pkg.return.arrival.airport}
                          </div>
                          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                            ${Math.round(pkg.return.price)}
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
                      background: isDarkMode ? '#1a1f2e' : 'white',
                      borderRadius: '8px',
                      border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #dee2e6'
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '4px' }}>
                          Total Package Price
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                          ${Math.round(pkg.totalPrice)}
                        </div>
                        {pkg.savings && pkg.savings > 0 && (
                          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginTop: '4px' }}>
                            💰 Save ${Math.round(pkg.savings)} vs separate booking
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleBookPackage(pkg)}
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
                
                {sortedRoundTripPackages.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: '15px', color: '#6c757d', fontSize: '14px' }}>
                    Showing 5 of {sortedRoundTripPackages.length} packages
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
                          borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'transparent' : 'white'}
                      >
                        <td style={{ padding: '12px', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#495057' }}>{flight.airline}</div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                            {flight.aircraft || 'Aircraft N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: '#667eea' }}>{flight.flightNumber}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : 'inherit' }}>{flight.departure.time}</div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>{flight.departure.airport}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : 'inherit' }}>{flight.arrival.time}</div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>{flight.arrival.airport}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : 'inherit' }}>{flight.duration}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: flight.stops === 0 ? (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d4edda') : (isDarkMode ? 'rgba(251, 191, 36, 0.2)' : '#fff3cd'),
                            color: flight.stops === 0 ? (isDarkMode ? '#10b981' : '#155724') : (isDarkMode ? '#fbbf24' : '#856404')
                          }}>
                            {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td style={{ padding: '12px', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef', textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#10b981' }}>
                            ${Math.round(flight.price)}
                          </div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>{flight.currency}</div>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookFlight(flight);
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
                style={{
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
                  borderRadius: '15px',
                  padding: '25px',
                  boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : '0 5px 20px rgba(0,0,0,0.08)',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = isDarkMode ? '0 10px 30px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : '0 5px 20px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9';
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
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: 'bold', color: isDarkMode ? '#e8eaed' : '#495057' }}>
                      {flight.airline} {flight.flightNumber}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                      <span style={{ background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e9ecef', padding: '4px 8px', borderRadius: '12px' }}>
                        {flight.stops === 0 ? '✈️ Direct' : `🔄 ${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                      </span>
                      <span style={{ background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e9ecef', padding: '4px 8px', borderRadius: '12px' }}>
                        📍 {flight.source}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                      ${Math.round(flight.price)}
                    </div>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                      {flight.currency} per person
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: isDarkMode ? '#e8eaed' : '#495057' }}>
                        {flight.departure.time}
                      </div>
                      <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                        {flight.departure.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
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
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', fontWeight: '500' }}>
                        {flight.duration}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: isDarkMode ? '#e8eaed' : '#495057' }}>
                        {flight.arrival.time}
                      </div>
                      <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                        {flight.arrival.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                        {flight.arrival.city}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '20px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                    <button 
                      onClick={() => handleBookFlight(flight)}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.transform = 'translateY(0)';
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      🎫 Book Flight
                    </button>
                    <button 
                      onClick={() => window.open(generateGoogleFlightsUrl(flight), '_blank', 'noopener,noreferrer')}
                      style={{
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'white',
                        color: isDarkMode ? 'white' : '#667eea',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '2px solid #667eea',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.transform = 'translateY(0)';
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      🔍 Google Flights
                    </button>
                  </div>
                </div>
                
                {flight.baggage && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: isDarkMode ? '#9ca3af' : '#6c757d',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                  }}>
                    <span style={{ marginRight: '15px' }}>🎒 Carry-on: Included</span>
                    <span style={{ marginRight: '15px' }}>
                      🧳 Checked: {flight.baggage.checked > 0 ? `${flight.baggage.checked} bag included` : `+$${flight.baggage.checkedBagCost}`}
                    </span>
                    {flight.refundable && <span style={{ marginRight: '15px' }}>💰 Refundable</span>}
                    {flight.changeable && <span>🔄 Changeable</span>}
                  </div>
                )}
                
                {/* Grouped Dates Display */}
                {flight.availableDates && flight.availableDates.length > 1 && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    background: isDarkMode ? 'rgba(102, 126, 234, 0.08)' : 'rgba(102, 126, 234, 0.05)', 
                    borderRadius: '10px',
                    border: isDarkMode ? '1px solid rgba(102, 126, 234, 0.2)' : '1px solid rgba(102, 126, 234, 0.15)'
                  }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: isDarkMode ? '#8b9cff' : '#667eea',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📅 Multiple Dates Available
                      {flight.priceRange && (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '500', 
                          color: isDarkMode ? '#9ca3af' : '#6c757d',
                          marginLeft: 'auto'
                        }}>
                          ${flight.priceRange.min} - ${flight.priceRange.max}
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                      gap: '8px'
                    }}>
                      {flight.availableDates.map((dateOption: any, idx: number) => (
                        <div key={idx} style={{ 
                          padding: '8px 10px', 
                          background: idx === 0 
                            ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                            : (isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'white'),
                          borderRadius: '6px',
                          border: idx === 0 
                            ? '1px solid #10b981'
                            : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e9ecef'),
                          fontSize: '11px',
                          position: 'relative'
                        }}>
                          {idx === 0 && (
                            <div style={{ 
                              position: 'absolute', 
                              top: '-6px', 
                              right: '4px', 
                              background: '#10b981', 
                              color: 'white',
                              fontSize: '9px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              BEST
                            </div>
                          )}
                          <div style={{ color: isDarkMode ? '#e8eaed' : '#495057', fontWeight: '600' }}>
                            {new Date(dateOption.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div style={{ color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '2px' }}>
                            {dateOption.time} • {dateOption.duration}
                          </div>
                          <div style={{ color: '#10b981', fontWeight: '700', marginTop: '4px' }}>
                            ${dateOption.price}
                          </div>
                        </div>
                      ))}
                    </div>
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

      {/* Hotel Results Section */}
      {hotelLoading && (
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '30px',
          marginTop: '30px',
          textAlign: 'center',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)'
        }}>
          <div className="spinner" style={{ display: 'inline-block' }}></div>
          <p style={{ marginTop: '15px', color: '#6c757d' }}>🏨 Searching hotels at your destination...</p>
        </div>
      )}

      {hotelResults && hotelResults.hotels && hotelResults.hotels.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '25px',
            borderRadius: '15px 15px 0 0',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
                  🏨 Hotels in {hotelResults.searchMetadata.location}
                </h2>
                <p style={{ margin: 0, opacity: 0.95, fontSize: '14px' }}>
                  {hotelResults.hotels.length} hotels available • {hotelResults.searchMetadata.nights} night{hotelResults.searchMetadata.nights > 1 ? 's' : ''} • {hotelResults.searchMetadata.guests} guest{hotelResults.searchMetadata.guests > 1 ? 's' : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Check-in</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{hotelResults.searchMetadata.checkIn}</div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '8px' }}>Check-out</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{hotelResults.searchMetadata.checkOut}</div>
              </div>
            </div>
          </div>

          <div style={{
            background: isDarkMode ? '#252d3d' : 'white',
            padding: '25px',
            borderRadius: '0 0 15px 15px',
            boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : '0 5px 20px rgba(0,0,0,0.08)',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {hotelResults.hotels.slice(0, 12).map((hotel: any, index: number) => (
                <div
                  key={hotel.id}
                  style={{
                    border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = isDarkMode ? '0 8px 25px rgba(0,0,0,0.8)' : '0 8px 25px rgba(0,0,0,0.15)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#f5576c';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9';
                  }}
                >
                  {/* Hotel Image */}
                  <div style={{ 
                    height: '180px', 
                    background: hotel.imageUrl ? `url(${hotel.imageUrl}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    position: 'relative'
                  }}>
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: '#ffd700',
                        color: '#000',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}>
                        ⭐ Best Deal
                      </div>
                    )}
                    {hotel.freeCancellation && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#28a745',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '15px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        ✓ Free Cancellation
                      </div>
                    )}
                  </div>

                  {/* Hotel Details */}
                  <div style={{ padding: '15px' }}>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      color: isDarkMode ? '#e8eaed' : '#2c3e50',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {hotel.name}
                    </h3>

                    {/* Rating */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{
                        background: '#667eea',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        marginRight: '8px'
                      }}>
                        {hotel.rating.toFixed(1)}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                        ({hotel.reviewCount} reviews)
                      </div>
                    </div>

                    {/* Location */}
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '10px' }}>
                      📍 {hotel.distanceFromCenter} from center
                    </div>

                    {/* Amenities */}
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '5px', 
                      marginBottom: '12px',
                      minHeight: '50px'
                    }}>
                      {hotel.amenities.slice(0, 4).map((amenity: string, i: number) => (
                        <span
                          key={i}
                          style={{
                            background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#f8f9fa',
                            color: isDarkMode ? '#9ca3af' : '#495057',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9'
                          }}
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>

                    {/* Breakfast Badge */}
                    {hotel.breakfastIncluded && (
                      <div style={{
                        background: '#fff3cd',
                        color: '#856404',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        display: 'inline-block'
                      }}>
                        🍳 Breakfast Included
                      </div>
                    )}

                    {/* Pricing */}
                    <div style={{ 
                      borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9', 
                      paddingTop: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                          ${Math.round(hotel.pricePerNight)}/night
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                          ${Math.round(hotel.totalPrice)}
                        </div>
                        <div style={{ fontSize: '10px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                          total for {hotelResults.searchMetadata.nights} night{hotelResults.searchMetadata.nights > 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const checkIn = hotelResults.searchMetadata.checkIn;
                          const checkOut = hotelResults.searchMetadata.checkOut;
                          
                          // Save pending booking for trip tracking
                          tripTrackingService.savePendingBooking({
                            type: 'hotel',
                            origin: searchRequest.origin || 'Unknown',
                            destination: hotel.cityName || 'Unknown',
                            departureDate: checkIn,
                            returnDate: checkOut,
                            details: {
                              hotel: hotel,
                              totalPrice: hotel.totalPrice
                            }
                          });
                          
                          const hotelUrl = getHotelBookingUrl(hotel, checkIn, checkOut);
                          window.open(hotelUrl, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.transform = 'scale(1)';
                        }}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vacation Packages Section (Flight + Hotel Combos) */}
      {sortedVacationPackages && sortedVacationPackages.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
            color: 'white',
            padding: '25px',
            borderRadius: '15px 15px 0 0',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
                  🎁 Complete Vacation Packages
                </h2>
                <p style={{ margin: 0, opacity: 0.95, fontSize: '14px' }}>
                  Save big by bundling flights + hotels • Best value combinations
                </p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                💰 Up to ${sortedVacationPackages[0]?.savings || 0} savings
              </div>
            </div>
          </div>

          <div style={{
            background: isDarkMode ? '#252d3d' : 'white',
            padding: '25px',
            borderRadius: '0 0 15px 15px',
            boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : '0 5px 20px rgba(0,0,0,0.08)',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
          }}>
            {sortedVacationPackages.slice(0, 5).map((pkg: any, index: number) => (
              <div
                key={pkg.id}
                style={{
                  border: index === 0 ? '3px solid #ffd700' : isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                  borderRadius: '15px',
                  padding: '20px',
                  marginBottom: '20px',
                  background: index === 0 
                    ? (isDarkMode ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' : 'linear-gradient(135deg, #fff9e6 0%, #ffffff 100%)')
                    : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white'),
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = isDarkMode ? '0 8px 25px rgba(0,0,0,0.8)' : '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {index === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '20px',
                    background: '#ffd700',
                    color: '#000',
                    padding: '6px 15px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
                  }}>
                    ⭐ BEST VALUE
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '25px' }}>
                  {/* Left Side: Flight + Hotel Details */}
                  <div>
                    {/* Flight Section */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: '#667eea',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        ✈️ Round-Trip Flights
                      </div>
                      
                      {/* Outbound */}
                      <div style={{ 
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', 
                        padding: '12px', 
                        borderRadius: '8px',
                        marginBottom: '10px',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                      }}>
                        <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '6px' }}>
                          Outbound: {pkg.flight.outbound.departure.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                          <span style={{ fontWeight: 'bold', color: isDarkMode ? '#e8eaed' : 'inherit' }}>{pkg.flight.outbound.departure.airport}</span>
                          <span style={{ color: isDarkMode ? '#9ca3af' : 'inherit' }}>→</span>
                          <span style={{ fontWeight: 'bold', color: isDarkMode ? '#e8eaed' : 'inherit' }}>{pkg.flight.outbound.arrival.airport}</span>
                          <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d', fontSize: '12px' }}>
                            ({pkg.flight.outbound.duration})
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd', marginTop: '4px' }}>
                          {pkg.flight.outbound.airline} • {pkg.flight.outbound.stops === 0 ? 'Direct' : `${pkg.flight.outbound.stops} stop${pkg.flight.outbound.stops > 1 ? 's' : ''}`}
                        </div>
                      </div>

                      {/* Return */}
                      <div style={{ 
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', 
                        padding: '12px', 
                        borderRadius: '8px',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                      }}>
                        <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '6px' }}>
                          Return: {pkg.flight.return.departure.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                          <span style={{ fontWeight: 'bold', color: isDarkMode ? '#e8eaed' : 'inherit' }}>{pkg.flight.return.departure.airport}</span>
                          <span style={{ color: isDarkMode ? '#9ca3af' : 'inherit' }}>→</span>
                          <span style={{ fontWeight: 'bold', color: isDarkMode ? '#e8eaed' : 'inherit' }}>{pkg.flight.return.arrival.airport}</span>
                          <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d', fontSize: '12px' }}>
                            ({pkg.flight.return.duration})
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd', marginTop: '4px' }}>
                          {pkg.flight.return.airline} • {pkg.flight.return.stops === 0 ? 'Direct' : `${pkg.flight.return.stops} stop${pkg.flight.return.stops > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </div>

                    {/* Hotel Section */}
                    <div>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: '#f5576c',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        🏨 Hotel Accommodation
                      </div>
                      <div style={{ 
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#fff5f7', 
                        padding: '12px', 
                        borderRadius: '8px',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '6px', color: isDarkMode ? '#e8eaed' : 'inherit' }}>
                          {pkg.hotel.name}
                        </div>
                        <div style={{ fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '4px' }}>
                          📍 {pkg.hotel.cityName} • {pkg.hotel.distanceFromCenter} from center
                        </div>
                        <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: '#667eea',
                            color: 'white',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {pkg.hotel.rating.toFixed(1)}
                          </span>
                          <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                            ({pkg.hotel.reviewCount} reviews)
                          </span>
                          {pkg.hotel.breakfastIncluded && (
                            <span style={{
                              background: '#fff3cd',
                              color: '#856404',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              🍳 Breakfast
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Pricing */}
                  <div style={{
                    minWidth: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: isDarkMode ? '#9ca3af' : '#6c757d',
                        marginBottom: '8px',
                        textAlign: 'right'
                      }}>
                        Pricing Breakdown
                      </div>
                      
                      <div style={{ 
                        background: isDarkMode ? '#1a1f2e' : '#f8f9fa',
                        padding: '15px',
                        borderRadius: '10px',
                        marginBottom: '15px',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Flights:</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : 'inherit' }}>${Math.round(pkg.flightPrice)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Hotel:</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : 'inherit' }}>${Math.round(pkg.hotelPrice)}</span>
                        </div>
                        <div style={{ 
                          borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #dee2e6',
                          paddingTop: '8px',
                          marginTop: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Subtotal:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : 'inherit' }}>${Math.round(pkg.totalPrice)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                              Bundle Savings:
                            </span>
                            <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>
                              -${Math.round(pkg.savings)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        textAlign: 'right',
                        marginBottom: '15px'
                      }}>
                        <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginBottom: '4px' }}>
                          Total Package Price
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: isDarkMode ? '#8b9cff' : '#19547b', lineHeight: '1' }}>
                          ${Math.round(pkg.priceWithDiscount)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', marginTop: '4px' }}>
                          💰 Save ${Math.round(pkg.savings)} vs separate booking
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Open 3 tabs: outbound flight, return flight, and hotel
                        const outbound = pkg.flight.outbound;
                        const returnFlight = pkg.flight.return;
                        const hotel = pkg.hotel;
                        const checkIn = outbound.departure.date;
                        const checkOut = returnFlight.departure.date;
                        
                        // Save pending booking for trip tracking
                        tripTrackingService.savePendingBooking({
                          type: 'vacation',
                          origin: outbound.departure.airport,
                          destination: outbound.arrival.airport,
                          departureDate: checkIn,
                          returnDate: checkOut,
                          details: {
                            flights: {
                              outbound: outbound,
                              return: returnFlight
                            },
                            hotel: hotel,
                            totalPrice: pkg.priceWithDiscount
                          }
                        });
                        
                        // Tab 1: Outbound flight on Google Flights (simple format)
                        const outboundUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${outbound.departure.airport}%20to%20${outbound.arrival.airport}%20on%20${checkIn}`;
                        window.open(outboundUrl, '_blank', 'noopener,noreferrer');
                        
                        // Tab 2: Return flight on Google Flights (simple format, staggered to avoid popup blocker)
                        setTimeout(() => {
                          const returnUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${returnFlight.departure.airport}%20to%20${returnFlight.arrival.airport}%20on%20${checkOut}`;
                          window.open(returnUrl, '_blank', 'noopener,noreferrer');
                        }, 500);
                        
                        // Tab 3: Hotel on Booking.com with hotel name + city (staggered to avoid popup blocker)
                        setTimeout(() => {
                          const hotelName = hotel.name;
                          const cityName = hotel.cityName || '';
                          const searchString = encodeURIComponent(`${hotelName} ${cityName}`);
                          const hotelUrl = `https://www.booking.com/searchresults.html?ss=${searchString}&checkin=${checkIn}&checkout=${checkOut}&group_adults=1&no_rooms=1&group_children=0`;
                          window.open(hotelUrl, '_blank', 'noopener,noreferrer');
                        }, 1000);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '15px',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.transform = 'scale(1.03)';
                        (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(25, 84, 123, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.transform = 'scale(1)';
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      🎫 Book Complete Package
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {sortedVacationPackages.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '20px', color: '#6c757d', fontSize: '14px' }}>
                Showing 5 of {sortedVacationPackages.length} vacation packages
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {showBookingModal && bookingDetails && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => {
            setShowBookingModal(false);
            setBookingDetails(null);
          }}
        >
          <div
            style={{
              background: isDarkMode ? '#1e2532' : 'white',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              animation: 'slideUp 0.3s ease',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>✈️</div>
              <h2 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '700',
                color: isDarkMode ? '#e8eaed' : '#2c3e50',
                marginBottom: '10px'
              }}>
                Confirm Your Booking
              </h2>
              <p style={{
                margin: 0,
                color: isDarkMode ? '#9ca3af' : '#6c757d',
                fontSize: '14px'
              }}>
                {bookingDetails.type === 'package' 
                  ? 'Review your round-trip flight package details'
                  : 'Review your flight details'}
              </p>
            </div>

            {/* Outbound Flight Details */}
            {bookingDetails.outbound && (
              <div style={{
                background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: bookingDetails.return ? '20px' : '30px',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '15px',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '24px' }}>🛫</span>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: isDarkMode ? '#e8eaed' : '#2c3e50'
                  }}>
                    {bookingDetails.type === 'package' ? 'Outbound Flight' : 'Flight Details'}
                  </h3>
                </div>
                
                <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Airline:</span>
                    <span style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      {bookingDetails.outbound.airline}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Flight:</span>
                    <span style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      {bookingDetails.outbound.flightNumber}
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '15px',
                    marginTop: '10px',
                    paddingTop: '15px',
                    borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #dee2e6'
                  }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        {bookingDetails.outbound.departure.time}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '5px' }}>
                        {bookingDetails.outbound.departure.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                        {bookingDetails.outbound.departure.city}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                      <div style={{ fontSize: '24px' }}>→</div>
                      <div style={{ fontSize: '11px', marginTop: '5px' }}>
                        {bookingDetails.outbound.duration}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        {bookingDetails.outbound.arrival.time}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '5px' }}>
                        {bookingDetails.outbound.arrival.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                        {bookingDetails.outbound.arrival.city}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    paddingTop: '15px',
                    borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #dee2e6'
                  }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Price:</span>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#667eea'
                    }}>
                      ${Math.round(bookingDetails.outbound.price)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Return Flight Details */}
            {bookingDetails.return && (
              <div style={{
                background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: '30px',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e9ecef'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '15px',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '24px' }}>🛬</span>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: isDarkMode ? '#e8eaed' : '#2c3e50'
                  }}>
                    Return Flight
                  </h3>
                </div>
                
                <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Airline:</span>
                    <span style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      {bookingDetails.return.airline}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Flight:</span>
                    <span style={{ fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                      {bookingDetails.return.flightNumber}
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '15px',
                    marginTop: '10px',
                    paddingTop: '15px',
                    borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #dee2e6'
                  }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        {bookingDetails.return.departure.time}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '5px' }}>
                        {bookingDetails.return.departure.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                        {bookingDetails.return.departure.city}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                      <div style={{ fontSize: '24px' }}>→</div>
                      <div style={{ fontSize: '11px', marginTop: '5px' }}>
                        {bookingDetails.return.duration}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: isDarkMode ? '#e8eaed' : '#2c3e50' }}>
                        {bookingDetails.return.arrival.time}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6c757d', marginTop: '5px' }}>
                        {bookingDetails.return.arrival.airport}
                      </div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#adb5bd' }}>
                        {bookingDetails.return.arrival.city}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    paddingTop: '15px',
                    borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #dee2e6'
                  }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6c757d' }}>Price:</span>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#667eea'
                    }}>
                      ${Math.round(bookingDetails.return.price)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Price */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '15px',
              padding: '20px',
              marginBottom: '25px',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                Total Package Price
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                ${Math.round(bookingDetails.totalPrice || 0)}
              </div>
              {bookingDetails.savings && bookingDetails.savings > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 15px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  💰 Save ${Math.round(bookingDetails.savings)} vs separate booking
                </div>
              )}
            </div>

            {/* Important Notice */}
            <div style={{
              background: isDarkMode ? 'rgba(251, 191, 36, 0.1)' : '#fff3cd',
              border: `1px solid ${isDarkMode ? 'rgba(251, 191, 36, 0.3)' : '#ffc107'}`,
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '25px',
              fontSize: '13px',
              color: isDarkMode ? '#fbbf24' : '#856404'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>ℹ️</span>
                Important Information
              </div>
              <div style={{ lineHeight: '1.6' }}>
                {bookingDetails.type === 'package' ? (
                  <>
                    • <strong>2 Google Flights tabs</strong> will open:<br/>
                    &nbsp;&nbsp;1. Round-trip search ({bookingDetails.outbound?.departure.airport} ⇄ {bookingDetails.outbound?.arrival.airport})<br/>
                    &nbsp;&nbsp;2. Return flight options ({bookingDetails.return?.departure.airport} → {bookingDetails.return?.arrival.airport})<br/>
                    • Compare prices and select your preferred flights<br/>
                    • Make sure popups are enabled for this site
                  </>
                ) : (
                  <>
                    • Google Flights will open with your search pre-filled<br/>
                    • Look for {bookingDetails.outbound?.airline} flight {bookingDetails.outbound?.flightNumber}<br/>
                    • Departing at {bookingDetails.outbound?.departure.time} on {bookingDetails.outbound?.departure.date}<br/>
                    • Compare prices across multiple booking sites
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px'
            }}>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingDetails(null);
                }}
                style={{
                  padding: '15px',
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e9ecef',
                  color: isDarkMode ? '#e8eaed' : '#495057',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#dee2e6';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e9ecef';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBooking}
                style={{
                  padding: '15px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                  (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }}
              >
                {bookingDetails.type === 'package' ? 'Search on Google Flights' : 'Proceed to Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Confirmation Modal */}
      {showConfirmationModal && pendingBookingData && (
        <BookingConfirmationModal
          bookingData={pendingBookingData}
          onConfirm={handleTripConfirmation}
          onCancel={handleTripCancellation}
        />
      )}

      {/* Add animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
