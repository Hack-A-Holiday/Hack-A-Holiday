/**
 * Helper Utilities
 * 
 * Common helper functions for flight search feature
 */

import { COMMON_AIRPORTS } from '@/types/flight';
import { Attraction } from '../types';

/**
 * Safely get category name from category object or string
 */
export const getCategoryName = (category: any): string => {
  if (typeof category === 'object' && category?.name) {
    return category.name;
  }
  return category || 'Attraction';
};

/**
 * Convert airport code to city name for better search results
 */
export const getDestinationCityName = (destination: string): string => {
  const trimmedDest = destination.trim();
  
  // If it's a 3-letter airport code, try to convert to city name
  if (trimmedDest.length === 3 && trimmedDest === trimmedDest.toUpperCase()) {
    const airport = COMMON_AIRPORTS.find(a => a.code === trimmedDest);
    if (airport) {
      console.log(`🔄 Converting airport code ${trimmedDest} to city name: ${airport.city}`);
      return airport.city;
    }
  }
  
  return trimmedDest;
};

/**
 * Generate TripAdvisor URL if not provided
 */
export const getTripAdvisorUrl = (location: any, destination: string): string => {
  if (location.web_url) {
    return location.web_url;
  }

  // Fallback: generate a search URL for the location
  const searchQuery = encodeURIComponent(`${location.name} ${destination}`);
  return `https://www.tripadvisor.com/Search?q=${searchQuery}`;
};

/**
 * Airport code to city name mapping
 */
export const getCityNameFromAirportCode = (code: string): string => {
  const airportMap: { [key: string]: string } = {
    'BOM': 'Mumbai',
    'DEL': 'Delhi',
    'BLR': 'Bangalore',
    'MAA': 'Chennai',
    'CCU': 'Kolkata',
    'HYD': 'Hyderabad',
    'AMD': 'Ahmedabad',
    'PNQ': 'Pune',
    'COK': 'Kochi',
    'GOI': 'Goa',
    'JFK': 'New York',
    'LGA': 'New York',
    'EWR': 'New York',
    'LAX': 'Los Angeles',
    'SFO': 'San Francisco',
    'ORD': 'Chicago',
    'DFW': 'Dallas',
    'MIA': 'Miami',
    'ATL': 'Atlanta',
    'LHR': 'London',
    'LGW': 'London',
    'STN': 'London',
    'CDG': 'Paris',
    'ORY': 'Paris',
    'FCO': 'Rome',
    'MAD': 'Madrid',
    'BCN': 'Barcelona',
    'FRA': 'Frankfurt',
    'MUC': 'Munich',
    'AMS': 'Amsterdam',
    'ZUR': 'Zurich',
    'VIE': 'Vienna',
    'NRT': 'Tokyo',
    'HND': 'Tokyo',
    'ICN': 'Seoul',
    'PEK': 'Beijing',
    'PVG': 'Shanghai',
    'HKG': 'Hong Kong',
    'SIN': 'Singapore',
    'BKK': 'Bangkok',
    'KUL': 'Kuala Lumpur',
    'DXB': 'Dubai',
    'DOH': 'Doha',
    'AUH': 'Abu Dhabi',
    'SYD': 'Sydney',
    'MEL': 'Melbourne',
    'BNE': 'Brisbane',
    'AKL': 'Auckland',
    'YYZ': 'Toronto',
    'YVR': 'Vancouver',
    'YUL': 'Montreal'
  };
  
  const upperCode = code.toUpperCase();
  return airportMap[upperCode] || code;
};

/**
 * Popular destinations for autocomplete
 */
export const popularDestinations = [
  'New York', 'Los Angeles', 'Chicago', 'Miami', 'Toronto', 'Vancouver', 'Mexico City',
  'London', 'Paris', 'Frankfurt', 'Amsterdam', 'Madrid', 'Barcelona', 'Rome', 'Milan',
  'Tokyo', 'Seoul', 'Beijing', 'Shanghai', 'Hong Kong', 'Singapore', 'Bangkok',
  'Dubai', 'Abu Dhabi', 'Doha', 'Cairo', 'Johannesburg', 'Cape Town',
  'Sydney', 'Melbourne', 'Auckland', 'Brisbane', 'Mumbai', 'Delhi', 'Bangalore'
];
