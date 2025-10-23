/**
 * Hotel Search Hook
 * 
 * Custom hook for managing hotel search functionality
 */

import { useState } from 'react';
import { HotelResult } from '../types';
import { popularDestinations } from '../utils';
import { buildApiUrl } from '../../../config/api';

export const useHotelSearch = () => {
  const [hotelDestination, setHotelDestination] = useState('');
  const [hotelCheckIn, setHotelCheckIn] = useState('');
  const [hotelCheckOut, setHotelCheckOut] = useState('');
  const [hotelGuests, setHotelGuests] = useState(2);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [showHotelResults, setShowHotelResults] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  /**
   * Handle destination input change with autocomplete
   */
  const handleDestinationChange = (value: string) => {
    setHotelDestination(value);

    if (value.trim().length >= 2) {
      const filtered = popularDestinations.filter(dest =>
        dest.toLowerCase().includes(value.toLowerCase())
      );
      setDestinationSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  /**
   * Handle hotel search - calls backend API
   */
  const handleHotelSearch = async () => {
    if (!hotelDestination.trim() || !hotelCheckIn || !hotelCheckOut) {
      alert('Please fill in all required fields: Destination, Check-in Date, and Check-out Date');
      return;
    }

    // Validate dates
    const checkIn = new Date(hotelCheckIn);
    const checkOut = new Date(hotelCheckOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      alert('Check-in date cannot be in the past');
      return;
    }

    if (checkOut <= checkIn) {
      alert('Check-out date must be after check-in date');
      return;
    }

    setLoadingHotels(true);
    setShowHotelResults(true);

    try {
      console.log('🏨 Searching hotels for:', {
        destination: hotelDestination,
        checkIn: hotelCheckIn,
        checkOut: hotelCheckOut,
        guests: hotelGuests
      });

      // Call the backend hotel search API using centralized configuration
      const apiUrl = buildApiUrl('/api/hotels/search');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: hotelDestination.trim(),
          checkIn: hotelCheckIn,
          checkOut: hotelCheckOut,
          adults: hotelGuests,
          rooms: 1
        })
      });

      if (!response.ok) {
        console.error('❌ Hotel API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🏨 Hotel search response:', data);

      if (data.success && data.hotels) {
        setHotelResults(data.hotels);
        console.log(`✅ Found ${data.hotels.length} hotels`);
      } else {
        console.error('❌ Hotel search failed:', data.message || 'Unknown error');
        alert('Failed to search hotels. Please try again.');
        setHotelResults([]);
      }
    } catch (error) {
      console.error('❌ Hotel search error:', error);
      
      // Provide more specific error feedback
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          alert('Hotel search service is not available. Please try again later.');
        } else if (error.message.includes('timeout')) {
          alert('Hotel search timed out. Please try again.');
        } else {
          alert('Failed to search hotels. Please check your connection and try again.');
        }
      } else {
        alert('Failed to search hotels. Please try again.');
      }
      
      setHotelResults([]);
    } finally {
      setLoadingHotels(false);
    }
  };

  /**
   * Handle booking redirect to Booking.com
   */
  const handleBookHotel = (hotel: HotelResult) => {
    const searchString = encodeURIComponent(hotelDestination.trim());
    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${searchString}&checkin=${hotelCheckIn}&checkout=${hotelCheckOut}&group_adults=${hotelGuests}&no_rooms=1&group_children=0`;
    
    console.log('🏨 Opening Booking.com for hotel:', hotel.name);
    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
  };

  return {
    // State
    hotelDestination,
    hotelCheckIn,
    hotelCheckOut,
    hotelGuests,
    hotelResults,
    loadingHotels,
    showHotelResults,
    destinationSuggestions,
    showSuggestions,
    
    // Setters
    setHotelDestination,
    setHotelCheckIn,
    setHotelCheckOut,
    setHotelGuests,
    setShowHotelResults,
    setShowSuggestions,
    
    // Functions
    handleDestinationChange,
    handleHotelSearch,
    handleBookHotel
  };
};
