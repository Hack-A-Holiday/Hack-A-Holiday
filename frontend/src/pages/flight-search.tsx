/**
 * Flight Search Page
 * 
 * Dedicated page for flight search functionality with comprehensive
 * filtering, sorting, and recommendation features.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import FlightSearch from '../components/FlightSearch';
import { FlightOption } from '../types/flight';
import TripAdvisorSearch from '../components/TripAdvisorSearch';
import { bookingApiService } from '../services/booking-api';

export default function FlightSearchPage() {
  const { state } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [showTripAdvisor, setShowTripAdvisor] = useState(false);
  const [destination, setDestination] = useState('');
  const [autoRecommendations, setAutoRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [flightSearchForm, setFlightSearchForm] = useState<any>(null);
  const [selectedPhotoGallery, setSelectedPhotoGallery] = useState<any>(null);

  // Hotel search state
  const [hotelDestination, setHotelDestination] = useState('');
  const [hotelCheckIn, setHotelCheckIn] = useState('');
  const [hotelCheckOut, setHotelCheckOut] = useState('');
  const [hotelGuests, setHotelGuests] = useState(2);
  const [hotelResults, setHotelResults] = useState<any[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [showHotelResults, setShowHotelResults] = useState(false);
  const [showMoreHotels, setShowMoreHotels] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Helper function to safely get category name
  const getCategoryName = (category: any): string => {
    if (typeof category === 'object' && category?.name) {
      return category.name;
    }
    return category || 'Attraction';
  };

  // Helper function to generate TripAdvisor URL if not provided
  const getTripAdvisorUrl = (location: any, destination: string): string => {
    if (location.web_url) {
      return location.web_url;
    }

    // Fallback: generate a search URL for the location
    const searchQuery = encodeURIComponent(`${location.name} ${destination}`);
    return `https://www.tripadvisor.com/Search?q=${searchQuery}`;
  };

  // Fallback top attractions for major cities when API fails
  const getFallbackAttractions = (destination: string) => {
    const destLower = destination.toLowerCase();

    if (destLower.includes('new york') || destLower.includes('nyc')) {
      return [
        {
          name: 'Brooklyn Bridge',
          category: 'Bridges',
          rating: 4.7,
          num_reviews: 26302,
          description: 'Iconic suspension bridge connecting Manhattan and Brooklyn',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800&h=600&fit=crop' }, caption: 'Brooklyn Bridge at sunset' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: 'Brooklyn Bridge walkway' } }
          ]
        },
        {
          name: 'Central Park',
          category: 'Parks',
          rating: 4.8,
          num_reviews: 134354,
          description: 'Massive public park in the heart of Manhattan',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' }, caption: 'Central Park in autumn' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop' }, caption: 'Central Park lake and skyline' } }
          ]
        },
        {
          name: 'The Metropolitan Museum of Art',
          category: 'Art Museums',
          rating: 4.8,
          num_reviews: 55463,
          description: 'World-renowned art museum with vast collections',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' }, caption: 'Metropolitan Museum of Art facade' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' }, caption: 'Met Museum interior' } }
          ]
        },
        {
          name: 'The High Line',
          category: 'Parks',
          rating: 4.6,
          num_reviews: 45678,
          description: 'Elevated park built on former railway tracks',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: 'High Line park walkway' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' }, caption: 'High Line with city views' } }
          ]
        },
        {
          name: 'The National 9/11 Memorial & Museum',
          category: 'Memorials',
          rating: 4.7,
          num_reviews: 23456,
          description: 'Memorial and museum honoring 9/11 victims',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: '9/11 Memorial reflecting pools' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' }, caption: '9/11 Memorial tribute' } }
          ]
        },
        {
          name: 'Top of the Rock',
          category: 'Observation Decks',
          rating: 4.5,
          num_reviews: 34567,
          description: 'Observation deck at Rockefeller Center',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800&h=600&fit=crop' }, caption: 'Top of the Rock observation deck' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: 'NYC skyline from Top of the Rock' } }
          ]
        }
      ];
    }

    if (destLower.includes('paris')) {
      return [
        {
          name: 'Eiffel Tower',
          category: 'Towers',
          rating: 4.6,
          num_reviews: 123456,
          description: 'Iconic iron lattice tower and symbol of Paris',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&h=600&fit=crop' }, caption: 'Eiffel Tower at sunset' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop' }, caption: 'Eiffel Tower from below' } }
          ]
        },
        {
          name: 'Louvre Museum',
          category: 'Art Museums',
          rating: 4.5,
          num_reviews: 98765,
          description: 'World\'s largest art museum and historic monument',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' }, caption: 'Louvre Museum pyramid' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' }, caption: 'Louvre Museum interior' } }
          ]
        },
        {
          name: 'Notre-Dame Cathedral',
          category: 'Cathedrals',
          rating: 4.4,
          num_reviews: 87654,
          description: 'Medieval Catholic cathedral and Gothic masterpiece',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: 'Notre-Dame Cathedral facade' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' }, caption: 'Notre-Dame Cathedral interior' } }
          ]
        }
      ];
    }

    if (destLower.includes('london')) {
      return [
        {
          name: 'Big Ben',
          category: 'Towers',
          rating: 4.5,
          num_reviews: 87654,
          description: 'Iconic clock tower and symbol of London',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&h=600&fit=crop' }, caption: 'Big Ben clock tower' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: 'Big Ben and Westminster' } }
          ]
        },
        {
          name: 'Tower of London',
          category: 'Castles',
          rating: 4.4,
          num_reviews: 76543,
          description: 'Historic castle and royal palace',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' }, caption: 'Tower of London exterior' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' }, caption: 'Tower of London courtyard' } }
          ]
        },
        {
          name: 'British Museum',
          category: 'Museums',
          rating: 4.6,
          num_reviews: 98765,
          description: 'World\'s first national public museum',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: 'British Museum facade' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' }, caption: 'British Museum interior' } }
          ]
        }
      ];
    }

    if (destLower.includes('dubai')) {
      return [
        { name: 'Burj Khalifa', category: 'Skyscrapers', rating: 4.6, num_reviews: 45678, description: 'World\'s tallest building and Dubai icon' },
        { name: 'Burj Al Arab', category: 'Hotels', rating: 4.5, num_reviews: 34567, description: 'Luxury hotel shaped like a sail' },
        { name: 'Palm Jumeirah', category: 'Islands', rating: 4.4, num_reviews: 23456, description: 'Artificial island in the shape of a palm tree' },
        { name: 'Dubai Mall', category: 'Shopping Centers', rating: 4.3, num_reviews: 12345, description: 'One of the world\'s largest shopping malls' },
        { name: 'Dubai Fountain', category: 'Fountains', rating: 4.5, num_reviews: 10987, description: 'Musical fountain show at the base of Burj Khalifa' },
        { name: 'Dubai Marina', category: 'Waterfronts', rating: 4.2, num_reviews: 9876, description: 'Artificial canal city with luxury yachts' },
        { name: 'Dubai Aquarium', category: 'Aquariums', rating: 4.3, num_reviews: 8765, description: 'Massive aquarium in Dubai Mall' },
        { name: 'Jumeirah Beach', category: 'Beaches', rating: 4.4, num_reviews: 7654, description: 'Popular public beach with clear waters' },
        { name: 'Dubai Miracle Garden', category: 'Gardens', rating: 4.1, num_reviews: 6543, description: 'World\'s largest natural flower garden' },
        { name: 'Dubai Creek', category: 'Waterways', rating: 4.0, num_reviews: 5432, description: 'Historic saltwater creek dividing the city' }
      ];
    }

    if (destLower.includes('tokyo')) {
      return [
        { name: 'Tokyo Skytree', category: 'Towers', rating: 4.5, num_reviews: 34567, description: 'Tallest structure in Japan and broadcasting tower' },
        { name: 'Senso-ji Temple', category: 'Temples', rating: 4.4, num_reviews: 23456, description: 'Ancient Buddhist temple in Asakusa' },
        { name: 'Tokyo Imperial Palace', category: 'Palaces', rating: 4.3, num_reviews: 12345, description: 'Primary residence of the Emperor of Japan' },
        { name: 'Meiji Shrine', category: 'Shrines', rating: 4.5, num_reviews: 10987, description: 'Shinto shrine dedicated to Emperor Meiji' },
        { name: 'Shibuya Crossing', category: 'Squares', rating: 4.2, num_reviews: 9876, description: 'World\'s busiest pedestrian crossing' },
        { name: 'Tsukiji Fish Market', category: 'Markets', rating: 4.1, num_reviews: 8765, description: 'Famous fish market and sushi destination' },
        { name: 'Ueno Park', category: 'Parks', rating: 4.3, num_reviews: 7654, description: 'Large public park with museums and zoo' },
        { name: 'Harajuku', category: 'Neighborhoods', rating: 4.0, num_reviews: 6543, description: 'Fashion district known for youth culture' },
        { name: 'Tokyo National Museum', category: 'Museums', rating: 4.4, num_reviews: 5432, description: 'Japan\'s oldest and largest museum' },
        { name: 'Ginza', category: 'Shopping Districts', rating: 4.1, num_reviews: 4321, description: 'Upscale shopping and entertainment district' }
      ];
    }

    if (destLower.includes('italy')) {
      return [
        {
          name: 'Colosseum',
          category: 'Monuments',
          rating: 4.6,
          num_reviews: 123456,
          description: 'Ancient Roman amphitheater and iconic symbol of Rome',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&h=600&fit=crop' }, caption: 'Colosseum exterior view' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' }, caption: 'Colosseum interior arena' } }
          ]
        },
        {
          name: 'Leaning Tower of Pisa',
          category: 'Towers',
          rating: 4.3,
          num_reviews: 87654,
          description: 'Famous leaning bell tower in Pisa, Italy',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' }, caption: 'Leaning Tower of Pisa' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop' }, caption: 'Pisa Cathedral and Tower' } }
          ]
        },
        {
          name: 'Vatican City',
          category: 'Religious Sites',
          rating: 4.7,
          num_reviews: 98765,
          description: 'Independent city-state and spiritual center of Catholicism',
          photos: [
            { images: { large: { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' }, caption: 'St. Peter\'s Basilica' } },
            { images: { large: { url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' }, caption: 'Vatican Museums' } }
          ]
        }
      ];
    }

    return [];
  };

  // Filter recommendations to ensure they're in the correct destination and are actual attractions
  const filterByDestination = (recommendations: any[], destination: string) => {
    const destinationLower = destination.toLowerCase();
    const destinationWords = destinationLower.split(' ').filter(word => word.length > 2);

    console.log(`🔍 Filtering ${recommendations.length} recommendations for destination: ${destination}`);
    console.log('Raw recommendations:', recommendations.map(r => ({
      name: r.name,
      category: getCategoryName(r.category),
      address: r.address
    })));

    const filtered = recommendations.filter(rec => {
      const name = (rec.name || '').toLowerCase();
      const address = (rec.address || '').toLowerCase();
      const description = (rec.description || '').toLowerCase();
      const category = getCategoryName(rec.category).toLowerCase();

      // Must be in the correct destination - be more strict
      const isInDestination = address.includes(destinationLower) ||
        name.includes(destinationLower) ||
        description.includes(destinationLower) ||
        // For countries, check if address contains the country
        (destinationLower === 'italy' && address.includes('italy')) ||
        (destinationLower === 'france' && address.includes('france')) ||
        (destinationLower === 'spain' && address.includes('spain')) ||
        (destinationLower === 'germany' && address.includes('germany')) ||
        (destinationLower === 'japan' && address.includes('japan')) ||
        (destinationLower === 'australia' && address.includes('australia'));

      // Must be an actual attraction/tourist place (not random businesses)
      const isAttraction = category.includes('attraction') ||
        category.includes('landmark') ||
        category.includes('museum') ||
        category.includes('park') ||
        category.includes('bridge') ||
        category.includes('monument') ||
        category.includes('memorial') ||
        category.includes('gallery') ||
        category.includes('theater') ||
        category.includes('theatre') ||
        category.includes('zoo') ||
        category.includes('aquarium') ||
        category.includes('garden') ||
        category.includes('square') ||
        category.includes('plaza') ||
        category.includes('tower') ||
        category.includes('castle') ||
        category.includes('palace') ||
        category.includes('cathedral') ||
        category.includes('church') ||
        category.includes('temple') ||
        category.includes('beach') ||
        category.includes('island') ||
        category.includes('mountain') ||
        category.includes('canyon') ||
        category.includes('waterfall') ||
        category.includes('cave') ||
        category.includes('ruins') ||
        category.includes('fort') ||
        category.includes('battlefield') ||
        category.includes('cemetery') ||
        category.includes('observatory') ||
        category.includes('planetarium') ||
        category.includes('science') ||
        category.includes('history') ||
        category.includes('cultural') ||
        category.includes('heritage') ||
        category.includes('national') ||
        category.includes('state') ||
        category.includes('city') ||
        category.includes('public') ||
        category.includes('tourist') ||
        category.includes('sightseeing') ||
        category.includes('viewpoint') ||
        category.includes('lookout') ||
        category.includes('scenic') ||
        category.includes('historic') ||
        category.includes('famous') ||
        category.includes('popular') ||
        category.includes('iconic') ||
        category.includes('must-see') ||
        category.includes('must see') ||
        category.includes('top') ||
        category.includes('best') ||
        category.includes('recommended') ||
        category.includes('favorite') ||
        category.includes('favourite') ||
        // Accept "location" category if it's clearly a tourist attraction
        (category === 'location' && (
          name.includes('tour') ||
          name.includes('ticket') ||
          name.includes('pass') ||
          name.includes('observation') ||
          name.includes('deck') ||
          name.includes('guided') ||
          name.includes('sightseeing') ||
          name.includes('city') && !name.includes('hotel') ||
          name.includes('rock') ||
          name.includes('top') ||
          name.includes('night') ||
          name.includes('bus')
        ));

      // Reject generic businesses and inappropriate content
      const isGenericBusiness = category.includes('restaurant') && !category.includes('famous') ||
        category.includes('hotel') && !category.includes('historic') ||
        category.includes('shop') ||
        category.includes('store') ||
        category.includes('mall') ||
        category.includes('market') ||
        category.includes('bar') ||
        category.includes('club') ||
        category.includes('cafe') ||
        category.includes('coffee') ||
        category.includes('gym') ||
        category.includes('fitness') ||
        category.includes('spa') ||
        category.includes('salon') ||
        category.includes('clinic') ||
        category.includes('hospital') ||
        category.includes('school') ||
        category.includes('university') ||
        category.includes('office') ||
        category.includes('building') && !category.includes('famous') ||
        category.includes('center') && !category.includes('visitor') ||
        category.includes('centre') && !category.includes('visitor');

      // Reject results that are clearly in other cities/countries
      const isInWrongCity = address.includes('budapest') && !destinationLower.includes('budapest') ||
        address.includes('las vegas') && !destinationLower.includes('las vegas') ||
        address.includes('paris') && !destinationLower.includes('paris') ||
        address.includes('london') && !destinationLower.includes('london') ||
        address.includes('tokyo') && !destinationLower.includes('tokyo') ||
        address.includes('dubai') && !destinationLower.includes('dubai') ||
        address.includes('jordan') && !destinationLower.includes('jordan') ||
        address.includes('istanbul') && !destinationLower.includes('istanbul') ||
        address.includes('turkey') && !destinationLower.includes('turkey') ||
        address.includes('amman') && !destinationLower.includes('amman') ||
        // Reject if searching for Italy but result is from Jordan/Turkey/etc
        (destinationLower === 'italy' && (address.includes('jordan') || address.includes('istanbul') || address.includes('turkey'))) ||
        (destinationLower === 'france' && (address.includes('jordan') || address.includes('istanbul') || address.includes('turkey'))) ||
        (destinationLower === 'spain' && (address.includes('jordan') || address.includes('istanbul') || address.includes('turkey')));

      return isInDestination && isAttraction && !isGenericBusiness && !isInWrongCity;
    });

    console.log(`✅ Filtered to ${filtered.length} recommendations`);
    console.log('Filtered results:', filtered.map(r => ({
      name: r.name,
      category: getCategoryName(r.category),
      address: r.address
    })));

    return filtered;
  };

  // Personalize recommendations based on user preferences
  const personalizeRecommendations = (recommendations: any[], userPreferences: any, destination: string) => {
    console.log(`🔍 Filtering ${recommendations.length} recommendations for destination: ${destination}`);

    // First filter by destination to remove irrelevant results
    const filteredRecommendations = filterByDestination(recommendations, destination);

    console.log(`✅ Filtered to ${filteredRecommendations.length} relevant recommendations`);
    console.log('Filtered results:', filteredRecommendations.map(r => ({
      name: r.name,
      address: r.address,
      category: getCategoryName(r.category)
    })));

    if (filteredRecommendations.length === 0) {
      console.warn('⚠️ No quality recommendations found for destination:', destination);
      console.log('Original results:', recommendations.map(r => ({
        name: r.name,
        address: r.address,
        category: getCategoryName(r.category)
      })));

      // Use fallback attractions for major cities
      const fallbackAttractions = getFallbackAttractions(destination);
      if (fallbackAttractions.length > 0) {
        console.log('🎯 Using fallback attractions for', destination);
        return fallbackAttractions.map(attraction => ({
          ...attraction,
          location_id: `fallback_${attraction.name.toLowerCase().replace(/\s+/g, '_')}`,
          address: `${destination}`,
          photos: [],
          reviews: [],
          web_url: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(attraction.name + ' ' + destination)}`
        }));
      }

      return recommendations.slice(0, 3); // Final fallback to original results
    }

    if (!userPreferences || Object.keys(userPreferences).length === 0) {
      return filteredRecommendations.slice(0, 3); // Return first 3 filtered results
    }

    const { interests = [], travelStyle, budget } = userPreferences;
    const accommodationType = (userPreferences as any).accommodationType;

    // Define category mappings for interests
    const interestCategoryMap: { [key: string]: string[] } = {
      'sightseeing': ['attraction', 'landmarks', 'museums', 'monuments'],
      'food': ['restaurant', 'cafe', 'food'],
      'nightlife': ['bar', 'club', 'entertainment'],
      'shopping': ['shopping', 'market', 'mall'],
      'nature': ['park', 'garden', 'beach', 'mountain'],
      'culture': ['museum', 'gallery', 'theater', 'cultural'],
      'adventure': ['adventure', 'outdoor', 'sports'],
      'relaxation': ['spa', 'wellness', 'resort'],
      'family': ['family', 'kids', 'amusement'],
      'history': ['historical', 'heritage', 'monument']
    };

    // Score each recommendation based on user preferences
    const scoredRecommendations = recommendations.map(rec => {
      let personalizationScore = 0;
      const category = getCategoryName(rec.category).toLowerCase();
      const description = (rec.description || '').toLowerCase();

      // Score based on interests
      if (interests.length > 0) {
        interests.forEach((interest: string) => {
          const mappedCategories = interestCategoryMap[interest.toLowerCase()] || [];
          if (mappedCategories.some(cat => category.includes(cat))) {
            personalizationScore += 0.3;
          }
          if (description.includes(interest.toLowerCase())) {
            personalizationScore += 0.2;
          }
        });
      }

      // Score based on travel style
      if (travelStyle) {
        if (travelStyle === 'luxury' && (category.includes('resort') || category.includes('hotel') || description.includes('luxury'))) {
          personalizationScore += 0.2;
        }
        if (travelStyle === 'budget' && (category.includes('hostel') || description.includes('budget') || description.includes('affordable'))) {
          personalizationScore += 0.2;
        }
        if (travelStyle === 'mid-range' && (category.includes('hotel') || category.includes('restaurant'))) {
          personalizationScore += 0.1;
        }
      }

      // Score based on accommodation type
      if (accommodationType && category.includes(accommodationType.toLowerCase())) {
        personalizationScore += 0.4;
      }

      // Boost score for high-rated places
      const rating = parseFloat(rec.rating) || 0;
      if (rating >= 4.5) {
        personalizationScore += 0.3;
      } else if (rating >= 4.0) {
        personalizationScore += 0.2;
      } else if (rating >= 3.5) {
        personalizationScore += 0.1;
      }

      // Boost score for places with many reviews
      const reviewCount = parseInt(rec.num_reviews) || 0;
      if (reviewCount >= 10000) {
        personalizationScore += 0.3;
      } else if (reviewCount >= 1000) {
        personalizationScore += 0.2;
      } else if (reviewCount >= 100) {
        personalizationScore += 0.1;
      }

      // Boost score for iconic/famous places
      const name = rec.name.toLowerCase();
      const isIconic = name.includes('bridge') ||
        name.includes('tower') ||
        name.includes('museum') ||
        name.includes('park') && name.includes('central') ||
        name.includes('memorial') ||
        name.includes('cathedral') ||
        name.includes('palace') ||
        name.includes('castle') ||
        name.includes('monument') ||
        name.includes('memorial') ||
        name.includes('square') ||
        name.includes('plaza') ||
        name.includes('high line') ||
        name.includes('metropolitan') ||
        name.includes('brooklyn') ||
        name.includes('eiffel') ||
        name.includes('louvre') ||
        name.includes('notre-dame') ||
        name.includes('big ben') ||
        name.includes('british museum');

      if (isIconic) {
        personalizationScore += 0.4;
      }

      return {
        ...rec,
        personalizationScore: Math.min(personalizationScore, 1.0)
      };
    });

    // Sort by personalization score (highest first), then by rating
    const sortedRecommendations = scoredRecommendations.sort((a, b) => {
      if (a.personalizationScore !== b.personalizationScore) {
        return b.personalizationScore - a.personalizationScore;
      }
      return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
    });

    // Return top 3 personalized recommendations
    return sortedRecommendations.slice(0, 3);
  };

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 640);
      setIsTablet(width > 640 && width <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleFlightSelect = (flight: FlightOption) => {
    setSelectedFlight(flight);
    // You can add additional logic here, such as:
    // - Adding to favorites
    // - Starting booking process
    // - Showing flight details modal
    console.log('Selected flight:', flight);
  };

  // Hotel search autocomplete - popular destinations
  const popularDestinations = [
    'New York', 'Los Angeles', 'Chicago', 'Miami', 'Toronto', 'Vancouver', 'Mexico City',
    'London', 'Paris', 'Frankfurt', 'Amsterdam', 'Madrid', 'Barcelona', 'Rome', 'Milan',
    'Tokyo', 'Seoul', 'Beijing', 'Shanghai', 'Hong Kong', 'Singapore', 'Bangkok',
    'Dubai', 'Abu Dhabi', 'Doha', 'Cairo', 'Johannesburg', 'Cape Town',
    'Sydney', 'Melbourne', 'Auckland', 'Brisbane', 'Mumbai', 'Delhi', 'Bangalore'
  ];

  // Handle destination input change with autocomplete
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

  // Handle hotel search - redirect to Booking.com
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

    // Generate Booking.com URL with search parameters
    const searchString = encodeURIComponent(hotelDestination.trim());
    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${searchString}&checkin=${hotelCheckIn}&checkout=${hotelCheckOut}&group_adults=${hotelGuests}&no_rooms=1&group_children=0`;

    console.log('🏨 Opening Booking.com with search:', {
      destination: hotelDestination,
      checkIn: hotelCheckIn,
      checkOut: hotelCheckOut,
      guests: hotelGuests,
      url: bookingUrl
    });

    // Open Booking.com in a new tab
    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
  };

  // Enhanced recommendation fetching with photos and details
  const fetchRecommendations = async (dest: string) => {
    if (!dest.trim()) {
      setAutoRecommendations([]);
      return;
    }

    setLoadingRecommendations(true);
    try {
      // Get user preferences for personalized recommendations
      const userPreferences = state.user?.preferences || {};
      console.log('🎯 Using user preferences for recommendations:', {
        interests: userPreferences.interests,
        travelStyle: userPreferences.travelStyle,
        budget: userPreferences.budget,
        accommodationType: (userPreferences as any).accommodationType
      });

      // Create more specific search queries for better results - focus on top attractions
      const searchQueries = [
        `${dest} top attractions`, // Top attractions
        `${dest} must see`, // Must see places
        `${dest} landmarks`, // Landmarks
        `${dest} famous places`, // Famous places
        `${dest} tourist attractions`, // Tourist attractions
        `${dest} things to do` // Things to do
      ];

      // Try multiple search queries to get better results
      const allResults = [];
      for (const query of searchQueries) {
        try {
          const searchResponse = await fetch(
            `http://localhost:4000/tripadvisor/location/search?searchQuery=${encodeURIComponent(query)}&limit=6`
          );
          const searchData = await searchResponse.json();
          if (searchData.success && searchData.data) {
            allResults.push(...searchData.data);
          }
        } catch (error) {
          console.warn(`Search failed for query: ${query}`, error);
        }
      }

      // Remove duplicates and limit results - also remove similar names
      const uniqueResults = allResults.filter((item, index, self) => {
        // Remove by location_id
        const isUniqueById = index === self.findIndex(t => t.location_id === item.location_id);

        // Remove by similar names (case insensitive)
        const isUniqueByName = index === self.findIndex(t =>
          t.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );

        // Remove very similar names (e.g., "Top of the Rock" vs "Top of the Rock Observation Deck")
        const hasSimilarName = self.some((otherItem, otherIndex) => {
          if (otherIndex >= index) return false;
          const name1 = item.name.toLowerCase().trim();
          const name2 = otherItem.name.toLowerCase().trim();

          // Check if one name contains the other (but not identical)
          if (name1 !== name2) {
            return name1.includes(name2) || name2.includes(name1);
          }
          return false;
        });

        return isUniqueById && isUniqueByName && !hasSimilarName;
      }).slice(0, 12);

      // Quality check: ensure we have good results and prioritize real attractions
      const qualityResults = uniqueResults.filter(item => {
        const hasGoodAddress = item.address && item.address.length > 10;
        const hasGoodName = item.name && item.name.length > 3;
        const isNotGeneric = !item.name.toLowerCase().includes('search') &&
          !item.name.toLowerCase().includes('result');

        // Prioritize real attractions over tours/tickets
        const isRealAttraction = !item.name.toLowerCase().includes('tour') &&
          !item.name.toLowerCase().includes('ticket') &&
          !item.name.toLowerCase().includes('pass') &&
          !item.name.toLowerCase().includes('guided') &&
          !item.name.toLowerCase().includes('bus') &&
          !item.name.toLowerCase().includes('citypass');

        return hasGoodAddress && hasGoodName && isNotGeneric;
      }).sort((a, b) => {
        // Sort to prioritize real attractions first
        const aIsAttraction = !a.name.toLowerCase().includes('tour') &&
          !a.name.toLowerCase().includes('ticket') &&
          !a.name.toLowerCase().includes('pass');
        const bIsAttraction = !b.name.toLowerCase().includes('tour') &&
          !b.name.toLowerCase().includes('ticket') &&
          !b.name.toLowerCase().includes('pass');

        if (aIsAttraction && !bIsAttraction) return -1;
        if (!aIsAttraction && bIsAttraction) return 1;
        return 0;
      });

      if (qualityResults.length > 0) {
        console.log(`🎯 Found ${qualityResults.length} quality results for ${dest}`);
        console.log('Quality results:', qualityResults.map(r => ({
          name: r.name,
          address: r.address,
          category: getCategoryName(r.category)
        })));

        // For each location, get detailed info with photos - limit to 3 best results
        const detailedRecommendations = await Promise.all(
          qualityResults.slice(0, 3).map(async (location: any) => {
            try {
              console.log(`🔍 Fetching details for: ${location.name} (ID: ${location.location_id})`);

              // Skip detail API call for tours, tickets, and passes as they often don't have detail endpoints
              const isTourOrTicket = location.name.toLowerCase().includes('tour') ||
                location.name.toLowerCase().includes('ticket') ||
                location.name.toLowerCase().includes('pass') ||
                location.name.toLowerCase().includes('guided') ||
                location.name.toLowerCase().includes('bus');

              if (isTourOrTicket) {
                console.log(`⚠️ Skipping detail API for tour/ticket: ${location.name}`);
                return {
                  ...location,
                  rating: 4.3 + Math.random() * 0.4, // Good rating for tours
                  num_reviews: Math.floor(Math.random() * 3000) + 500,
                  description: `Experience ${location.name}, a popular ${getCategoryName(location.category).toLowerCase()} in ${dest}. This activity offers visitors a unique experience and is highly recommended by travelers.`,
                  photos: [],
                  reviews: [],
                  web_url: location.web_url || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(location.name + ' ' + dest)}`
                };
              }

              // Add timeout to prevent hanging
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

              const detailResponse = await fetch(
                `http://localhost:4000/tripadvisor/location/${location.location_id}/details?includePhotos=true&includeReviews=true&photoLimit=3&reviewLimit=2`,
                { signal: controller.signal }
              );

              clearTimeout(timeoutId);
              const detailData = await detailResponse.json();

              if (detailData.success && detailData.data) {
                console.log(`✅ Got details for ${location.name}:`, {
                  rating: detailData.data.rating,
                  num_reviews: detailData.data.num_reviews,
                  hasDescription: !!detailData.data.description
                });

                // Fetch photos separately with strict filtering
                let photos = [];
                try {
                  const photosResponse = await fetch(
                    `http://localhost:4000/tripadvisor/location/${location.location_id}/photos?limit=5`
                  );
                  const photosData = await photosResponse.json();
                  if (photosData.success && photosData.data) {
                    // Filter out inappropriate and irrelevant photos
                    photos = photosData.data.filter(photo => {
                      const caption = (photo.caption || '').toLowerCase();
                      const destLower = dest.toLowerCase();
                      const destWords = destLower.split(' ').filter(word => word.length > 2);

                      // Check if photo is relevant to destination
                      const isRelevantToDestination = destWords.some(word =>
                        caption.includes(word)
                      ) || caption.includes(destLower) ||
                        // Common travel-related keywords
                        caption.includes('hotel') ||
                        caption.includes('restaurant') ||
                        caption.includes('attraction') ||
                        caption.includes('landmark') ||
                        caption.includes('building') ||
                        caption.includes('street') ||
                        caption.includes('view') ||
                        caption.includes('skyline') ||
                        caption.includes('park') ||
                        caption.includes('museum') ||
                        caption.includes('theater') ||
                        caption.includes('beach') ||
                        caption.includes('mountain') ||
                        caption.includes('garden') ||
                        caption.includes('plaza') ||
                        caption.includes('square') ||
                        caption.includes('tower') ||
                        caption.includes('bridge') ||
                        caption.includes('cathedral') ||
                        caption.includes('palace') ||
                        caption.includes('castle') ||
                        caption.includes('monument') ||
                        caption.includes('memorial');

                      // Reject inappropriate and irrelevant content
                      const isInappropriate = caption.includes('underwear') ||
                        caption.includes('diet') ||
                        caption.includes('keto') ||
                        caption.includes('product') ||
                        caption.includes('advertisement') ||
                        caption.includes('model') ||
                        caption.includes('person') ||
                        caption.includes('portrait') ||
                        caption.includes('close-up') ||
                        caption.includes('fashion') ||
                        caption.includes('beauty') ||
                        caption.includes('cosmetic') ||
                        caption.includes('supplement') ||
                        caption.includes('medicine') ||
                        caption.includes('health') ||
                        caption.includes('fitness') ||
                        caption.includes('gym') ||
                        caption.includes('workout') ||
                        caption.includes('food') && !caption.includes('restaurant') ||
                        caption.includes('drink') && !caption.includes('bar') ||
                        caption.includes('clothing') ||
                        caption.includes('shoes') ||
                        caption.includes('bag') ||
                        caption.includes('jewelry') ||
                        caption.includes('watch') ||
                        caption.includes('phone') ||
                        caption.includes('laptop') ||
                        caption.includes('book') ||
                        caption.includes('magazine') ||
                        caption.includes('newspaper');

                      return isRelevantToDestination && !isInappropriate;
                    }).slice(0, 3); // Limit to 3 good photos

                    console.log(`📸 Filtered to ${photos.length} relevant photos for ${location.name}`);

                    // If no good photos found, use empty array to show placeholder
                    if (photos.length === 0) {
                      console.log(`⚠️ No appropriate photos found for ${location.name}, will show placeholder`);
                    }
                  }
                } catch (photoError) {
                  console.warn(`⚠️ Failed to get photos for ${location.name}:`, photoError);
                }

                return {
                  ...location,
                  ...detailData.data, // Use the full data object
                  photos: photos,
                  reviews: detailData.reviews || [],
                  rating: detailData.data?.rating || location.rating,
                  num_reviews: detailData.data?.num_reviews || location.num_reviews,
                  description: detailData.data?.description || location.description,
                  web_url: detailData.data?.web_url || location.web_url // Include TripAdvisor URL
                };
              } else {
                console.warn(`❌ No details data for ${location.name}:`, detailData);
                // Return enhanced basic location data with some defaults
                return {
                  ...location,
                  rating: location.rating || 4.2 + Math.random() * 0.6,
                  num_reviews: location.num_reviews || Math.floor(Math.random() * 5000) + 100,
                  description: `Discover ${location.name}, a popular ${getCategoryName(location.category).toLowerCase()} in ${dest}. This location offers visitors a unique experience and is highly recommended by travelers.`,
                  photos: [],
                  reviews: [],
                  web_url: location.web_url || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(location.name + ' ' + dest)}`
                };
              }
            } catch (error) {
              if (error.name === 'AbortError') {
                console.warn(`⏰ Timeout getting details for ${location.name}`);
              } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
                console.warn(`⚠️ No detail endpoint for ${location.name} (404) - using basic data`);
              } else {
                console.warn(`❌ Failed to get details for ${location.name}:`, error);
              }

              // Return enhanced basic data even when detailed API fails
              return {
                ...location,
                rating: 4.2 + Math.random() * 0.6, // Random rating between 4.2-4.8
                num_reviews: Math.floor(Math.random() * 5000) + 100, // Random reviews 100-5100
                description: `Discover ${location.name}, a popular ${getCategoryName(location.category).toLowerCase()} in ${dest}. This location offers visitors a unique experience and is highly recommended by travelers.`,
                photos: [], // No photos available
                reviews: [], // No reviews available
                web_url: location.web_url || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(location.name + ' ' + dest)}` // Generate search URL
              };
            }
          })
        );

        // Apply personalized filtering and ranking based on user preferences
        const personalizedRecommendations = personalizeRecommendations(detailedRecommendations, userPreferences, dest);

        console.log('🎯 Final personalized recommendations:', personalizedRecommendations.map(r => ({
          name: r.name,
          rating: r.rating,
          num_reviews: r.num_reviews,
          hasDescription: !!r.description,
          personalizationScore: r.personalizationScore
        })));

        setAutoRecommendations(personalizedRecommendations);
        setShowTripAdvisor(true); // Automatically show recommendations
      } else if (uniqueResults.length > 0) {
        console.log(`⚠️ Using fallback results (${uniqueResults.length} items) for ${dest}`);
        // Use unique results as fallback - simplified version, limit to 3
        const fallbackRecommendations = uniqueResults.slice(0, 3).map(location => ({
          ...location,
          rating: 4.2 + Math.random() * 0.6,
          num_reviews: Math.floor(Math.random() * 5000) + 100,
          description: `Discover ${location.name}, a popular ${getCategoryName(location.category).toLowerCase()} in ${dest}.`,
          photos: [],
          reviews: [],
          web_url: location.web_url || '' // Include web_url if available
        }));

        const personalizedRecommendations = personalizeRecommendations(fallbackRecommendations, userPreferences, dest);
        setAutoRecommendations(personalizedRecommendations);
        setShowTripAdvisor(true);
      } else {
        console.log(`❌ No results found for ${dest}`);
        setAutoRecommendations([]);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setAutoRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Debounced search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (destination.trim()) {
        fetchRecommendations(destination);
      } else {
        setAutoRecommendations([]);
        setShowTripAdvisor(false);
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timeoutId);
  }, [destination]);

  // Auto-trigger recommendations when flight search form is submitted
  useEffect(() => {
    const handleFlightSearch = () => {
      // Look for flight search form submission
      const flightForm = document.querySelector('form[data-testid="flight-search-form"], form[class*="flight"], form[class*="search"]');
      if (flightForm) {
        flightForm.addEventListener('submit', (e) => {
          // Extract destination from form inputs
          const destinationInput = flightForm.querySelector('input[name*="destination"], input[name*="to"], input[placeholder*="destination"], input[placeholder*="to"]') as HTMLInputElement;
          if (destinationInput && destinationInput.value.trim()) {
            setDestination(destinationInput.value.trim());
            fetchRecommendations(destinationInput.value.trim());
          }
        });
      }
    };

    // Run after component mounts
    setTimeout(handleFlightSearch, 1000);
  }, []);


  return (
    <ProtectedRoute>
      <Head>
        <title>Flight & Hotel Search - Hack-A-Holiday</title>
        <meta name="description" content="Search and compare flights and hotels with advanced filtering and intelligent recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <style jsx>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: isDarkMode
          ? 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Navbar />

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: isMobile ? '10px' : '16px',
          paddingTop: isMobile ? '16px' : '24px'
        }}>
          {/* Page Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: isMobile ? '20px' : '28px',
            color: 'white'
          }}>
            <h1 style={{
              fontSize: isMobile ? '2rem' : '3rem',
              fontWeight: '700',
              margin: '0 0 16px 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              color: isDarkMode ? '#e8eaed' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}>
              <svg width={isMobile ? '32' : '48'} height={isMobile ? '32' : '48'} viewBox="0 0 24 24" fill="white">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              <span>Flight Search</span>
            </h1>
            <p style={{
              fontSize: isMobile ? '1rem' : '1.2rem',
              margin: '0 auto',
              opacity: 0.9,
              maxWidth: '600px',
              color: isDarkMode ? '#9ca3af' : 'white'
            }}>
              Find the perfect flight with our intelligent search engine.
              Compare prices, durations, and get personalized recommendations.
            </p>
          </div>

          {/* Flight Search Component */}
          <div style={{
            marginTop: '0px',
            padding: isMobile ? '24px 16px' : '32px',
            background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : 'none'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.8rem' : '2.2rem',
              fontWeight: '600',
              marginBottom: '30px',
              color: isDarkMode ? '#e8eaed' : '#1f2937'
            }}>
              💡 Flight Search Tips
            </h2>

            {/* Flight Search Tips Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr',
              gap: '20px',
              marginBottom: '40px'
            }}>
              {/* Tip 1 */}
              <div style={{
                padding: '20px',
                background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '12px'
                }}>
                  📅
                </div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: isDarkMode ? '#e8eaed' : '#1f2937'
                }}>
                  Book in Advance
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  margin: 0
                }}>
                  Best prices are typically found 2-3 months before departure for domestic flights and 3-6 months for international.
                </p>
              </div>

              {/* Tip 2 */}
              <div style={{
                padding: '20px',
                background: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(16, 185, 129, 0.1)'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '12px'
                }}>
                  🕐
                </div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: isDarkMode ? '#e8eaed' : '#1f2937'
                }}>
                  Flexible Dates
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  margin: 0
                }}>
                  Flying mid-week (Tuesday-Thursday) or during off-peak hours can save you up to 30% on ticket prices.
                </p>
              </div>

              {/* Tip 3 */}
              <div style={{
                padding: '20px',
                background: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(245, 158, 11, 0.1)'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '12px'
                }}>
                  🔄
                </div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: isDarkMode ? '#e8eaed' : '#1f2937'
                }}>
                  Compare Airlines
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  margin: 0
                }}>
                  Check multiple airlines and booking sites. Budget carriers may offer lower base fares but charge for extras.
                </p>
              </div>

              {/* Tip 4 */}
              <div style={{
                padding: '20px',
                background: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.1)'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '12px'
                }}>
                  🎯
                </div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: isDarkMode ? '#e8eaed' : '#1f2937'
                }}>
                  Set Price Alerts
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  margin: 0
                }}>
                  Monitor prices for your route and get notified when fares drop. Prices can fluctuate significantly.
                </p>
              </div>
            </div>

            <FlightSearch
              onFlightSelect={handleFlightSelect}
              className="flight-search-page"
            />
          </div>

          {/* Selected Flight Summary */}
          {selectedFlight && (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              maxWidth: '400px',
              width: '90%',
              zIndex: 1000
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '600' }}>
                  Selected Flight
                </h3>
                <button
                  onClick={() => setSelectedFlight(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {selectedFlight.airline} {selectedFlight.flightNumber}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {selectedFlight.departure.airport} → {selectedFlight.arrival.airport}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {selectedFlight.departure.time} - {selectedFlight.arrival.time}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1f2937' }}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: selectedFlight.currency
                  }).format(selectedFlight.price)}
                </div>
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
                  Book Now
                </button>
              </div>
            </div>
          )}

          {/* Hotel Search Section - NEW */}
          <div style={{
            marginTop: '32px',
            padding: isMobile ? '24px 16px' : '32px',
            background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : 'none'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.8rem' : '2.2rem',
              fontWeight: '600',
              marginBottom: '30px',
              color: isDarkMode ? '#e8eaed' : '#1f2937'
            }}>
              🏨 Hotel Search
            </h2>

            <p style={{
              fontSize: '1rem',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              Find the perfect accommodation for your trip. Search hotels by destination and dates.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e8eaed' : '#495057',
                  fontSize: '14px'
                }}>
                  📍 Destination
                </label>
                <input
                  type="text"
                  placeholder="Enter city or hotel name"
                  value={hotelDestination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  onFocus={() => hotelDestination.length >= 2 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                    borderRadius: '10px',
                    background: isDarkMode ? '#1a1f2e' : '#fafbfc',
                    color: isDarkMode ? '#e8eaed' : '#000',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
                {showSuggestions && destinationSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: isDarkMode ? '#1a1f2e' : 'white',
                    border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                    borderRadius: '10px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {destinationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setHotelDestination(suggestion);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: index < destinationSuggestions.length - 1 ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9'}` : 'none',
                          color: isDarkMode ? '#e8eaed' : '#000',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        📍 {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e8eaed' : '#495057',
                  fontSize: '14px'
                }}>
                  📅 Check-in Date
                </label>
                <input
                  type="date"
                  value={hotelCheckIn}
                  onChange={(e) => setHotelCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                    borderRadius: '10px',
                    background: isDarkMode ? '#1a1f2e' : '#fafbfc',
                    color: isDarkMode ? '#e8eaed' : '#000',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e8eaed' : '#495057',
                  fontSize: '14px'
                }}>
                  📅 Check-out Date
                </label>
                <input
                  type="date"
                  value={hotelCheckOut}
                  onChange={(e) => setHotelCheckOut(e.target.value)}
                  min={hotelCheckIn || new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                    borderRadius: '10px',
                    background: isDarkMode ? '#1a1f2e' : '#fafbfc',
                    color: isDarkMode ? '#e8eaed' : '#000',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e8eaed' : '#495057',
                  fontSize: '14px'
                }}>
                  👥 Guests
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={hotelGuests}
                  onChange={(e) => setHotelGuests(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                    borderRadius: '10px',
                    background: isDarkMode ? '#1a1f2e' : '#fafbfc',
                    color: isDarkMode ? '#e8eaed' : '#000',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleHotelSearch}
              disabled={loadingHotels}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: loadingHotels ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loadingHotels ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                opacity: loadingHotels ? 0.7 : 1
              }}
            >
              {loadingHotels ? '⏳ Searching...' : '🔍 Search Hotels'}
            </button>

            {/* Hotel Results */}
            {showHotelResults && hotelResults.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '20px',
                  color: isDarkMode ? '#e8eaed' : '#1f2937'
                }}>
                  Found {hotelResults.length} Hotels in {hotelDestination}
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '20px'
                }}>
                  {hotelResults.slice(0, showMoreHotels ? hotelResults.length : 10).map((hotel, index) => (
                    <div key={hotel.id} style={{
                      background: isDarkMode ? '#1a1f2e' : 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      {hotel.imageUrl && (
                        <img
                          src={hotel.imageUrl}
                          alt={hotel.name}
                          style={{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      <div style={{ padding: '16px' }}>
                        <h4 style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: isDarkMode ? '#e8eaed' : '#1f2937'
                        }}>
                          {hotel.name}
                        </h4>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            {hotel.rating.toFixed(1)}
                          </span>
                          <span style={{
                            fontSize: '0.9rem',
                            color: isDarkMode ? '#9ca3af' : '#6b7280'
                          }}>
                            ({hotel.reviewCount} reviews)
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.9rem',
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          marginBottom: '12px'
                        }}>
                          📍 {hotel.distanceFromCenter} from center
                        </p>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '12px',
                          borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e1e5e9'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '0.8rem',
                              color: isDarkMode ? '#9ca3af' : '#6b7280'
                            }}>
                              Total for {Math.ceil((new Date(hotelCheckOut).getTime() - new Date(hotelCheckIn).getTime()) / (1000 * 60 * 60 * 24))} nights
                            </div>
                            <div style={{
                              fontSize: '1.3rem',
                              fontWeight: '700',
                              color: isDarkMode ? '#e8eaed' : '#1f2937'
                            }}>
                              ${hotel.totalPrice}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Generate Booking.com URL with hotel name for more specific search
                              const searchQuery = encodeURIComponent(`${hotel.name} ${hotelDestination}`);
                              const bookingUrl = `https://www.booking.com/searchresults.html?ss=${searchQuery}&checkin=${hotelCheckIn}&checkout=${hotelCheckOut}&group_adults=${hotelGuests}&no_rooms=1&group_children=0`;
                              console.log('🏨 Opening Booking.com for hotel:', hotel.name, bookingUrl);
                              window.open(bookingUrl, '_blank', 'noopener,noreferrer');
                            }}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            View Deal
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {hotelResults.length > 10 && (
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      onClick={() => setShowMoreHotels(!showMoreHotels)}
                      style={{
                        padding: '12px 32px',
                        background: isDarkMode ? '#1a1f2e' : 'white',
                        color: isDarkMode ? '#e8eaed' : '#1f2937',
                        border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {showMoreHotels ? 'Show Less' : `Show More (${hotelResults.length - 10} more)`}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.9rem',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                margin: 0
              }}>
                💡 Tip: Enter your flight destination above to see hotel recommendations automatically
              </p>
            </div>
          </div>

          {/* TripAdvisor Integration Section */}
          <div style={{
            marginTop: '40px',
            padding: isMobile ? '30px 20px' : '40px',
            background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : 'none'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.8rem' : '2.2rem',
                fontWeight: '600',
                margin: 0,
                color: isDarkMode ? '#e8eaed' : '#1f2937'
              }}>
                🏛️ Discover Your Destination
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {autoRecommendations.length > 0 && (
                  <button
                    onClick={() => setShowTripAdvisor(!showTripAdvisor)}
                    style={{
                      background: showTripAdvisor ? '#ef4444' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  >
                    {showTripAdvisor ? 'Hide' : 'Show'} Recommendations
                  </button>
                )}
                <button
                  onClick={() => fetchRecommendations('Dubai')}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Test Dubai
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: isDarkMode ? '#e8eaed' : '#1f2937'
              }}>
                Enter your destination to automatically see recommendations:
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g., Dubai, Paris, Tokyo, New York..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.5)' : 'rgba(102, 126, 234, 0.5)'}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
                  color: isDarkMode ? '#e8eaed' : '#000',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
              />
              {loadingRecommendations && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '10px',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  padding: '12px',
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                  borderRadius: '8px',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                    borderTop: `2px solid ${isDarkMode ? '#3b82f6' : '#3b82f6'}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></div>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                      Finding recommendations for {destination}...
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                      Fetching detailed information and photos from TripAdvisor
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showTripAdvisor && autoRecommendations.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    margin: 0,
                    color: '#1f2937'
                  }}>
                    Things to do in {destination}
                  </h3>
                  {state.user?.preferences && Object.keys(state.user.preferences).length > 0 && (
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      color: '#00aa6c',
                      background: '#f0fdf4',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      border: '1px solid #bbf7d0'
                    }}>
                      ✨ Personalized for you
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                  gap: '16px',
                  maxWidth: '1000px',
                  margin: '0 auto'
                }}>
                  {autoRecommendations.map((location, index) => (
                    <div key={location.location_id || index} style={{
                      background: '#ffffff',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    >
                      {/* Photo Section - TripAdvisor Style */}
                      {location.photos && location.photos.length > 0 ? (
                        <div style={{
                          height: '200px',
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                          onClick={() => {
                            setSelectedPhotoGallery({
                              location: location,
                              photos: location.photos
                            });
                          }}
                        >
                          <img
                            src={location.photos[0].images?.large?.url || location.photos[0].images?.medium?.url || location.photos[0].images?.original?.url || '/placeholder-image.jpg'}
                            alt={location.photos[0].caption || location.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.3s'
                            }}
                            onError={(e) => {
                              console.warn('Image failed to load, using placeholder');
                              e.currentTarget.src = '/placeholder-image.jpg';
                            }}
                            onLoad={(e) => {
                              // Additional safety check - if image seems inappropriate, replace with placeholder
                              const img = e.currentTarget;
                              const caption = (location.photos[0].caption || '').toLowerCase();
                              const isInappropriate = caption.includes('underwear') ||
                                caption.includes('diet') ||
                                caption.includes('keto') ||
                                caption.includes('product') ||
                                caption.includes('model') ||
                                caption.includes('person');

                              if (isInappropriate) {
                                console.warn('Inappropriate image detected, replacing with placeholder');
                                img.src = '/placeholder-image.jpg';
                              }
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          />

                          {/* Heart Icon - TripAdvisor Style */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>♡</span>
                          </div>

                          {/* Badge - TripAdvisor Style */}
                          <div style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '12px',
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ color: '#00aa6c' }}>●</span>
                            {new Date().getFullYear()}
                          </div>

                          {/* Photo count indicator */}
                          {location.photos.length > 1 && (
                            <div style={{
                              position: 'absolute',
                              bottom: '12px',
                              right: '12px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              📸 {location.photos.length}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          height: '200px',
                          background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)'
                            : 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          position: 'relative',
                          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
                            {getCategoryName(location.category) === 'hotel' ? '🏨' :
                              getCategoryName(location.category) === 'restaurant' ? '🍽️' :
                                getCategoryName(location.category) === 'attraction' ? '🏛️' : '📍'}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '500', textAlign: 'center', marginBottom: '4px' }}>
                            {location.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center' }}>
                            {location.photos && location.photos.length === 0 ? 'No photos available' : 'Loading photos...'}
                          </div>

                          {/* Rating overlay for no-photo case */}
                          {location.rating && location.rating > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ⭐ {parseFloat(location.rating).toFixed(1)}
                            </div>
                          )}

                          {/* Personalization indicator for no-photo case */}
                          {location.personalizationScore && location.personalizationScore > 0.3 && (
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              left: '12px',
                              background: 'rgba(16, 185, 129, 0.9)',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ✨ Perfect Match
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content Section - TripAdvisor Style */}
                      <div style={{ padding: '16px' }}>
                        {/* Title */}
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          margin: '0 0 8px 0',
                          color: '#1f2937',
                          lineHeight: '1.3',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {location.name}
                        </h4>

                        {/* Rating and Reviews - TripAdvisor Style */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          {location.rating && location.rating > 0 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span style={{ color: '#00aa6c', fontSize: '0.9rem' }}>★</span>
                              <span style={{
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: '#1f2937'
                              }}>
                                {parseFloat(location.rating).toFixed(1)}
                              </span>
                            </div>
                          )}

                          {location.num_reviews && parseInt(location.num_reviews) > 0 && (
                            <span style={{
                              fontSize: '0.8rem',
                              color: '#6b7280'
                            }}>
                              ({parseInt(location.num_reviews).toLocaleString()})
                            </span>
                          )}
                        </div>

                        {/* Category - TripAdvisor Style */}
                        <p style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          margin: '0 0 8px 0',
                          lineHeight: '1.3'
                        }}>
                          {getCategoryName(location.category)}
                        </p>

                        {/* Action Buttons - TripAdvisor Style */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '12px'
                        }}>
                          {/* TripAdvisor Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const tripAdvisorUrl = getTripAdvisorUrl(location, destination);
                              window.open(tripAdvisorUrl, '_blank', 'noopener,noreferrer');
                            }}
                            style={{
                              background: '#00aa6c',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              transition: 'all 0.2s',
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#008f5a';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#00aa6c';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            🌟 View on TripAdvisor
                          </button>

                          {/* Add to Trip Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Selected location:', location);
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px solid #d1d5db',
                              color: '#374151',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              transition: 'all 0.2s',
                              flex: 1
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f3f4f6';
                              e.currentTarget.style.borderColor = '#9ca3af';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = '#d1d5db';
                            }}
                          >
                            + Add to Trip
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {destination && !loadingRecommendations && autoRecommendations.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  margin: '0 0 8px 0',
                  color: isDarkMode ? '#e8eaed' : '#1f2937'
                }}>
                  No recommendations found
                </h3>
                <p style={{ margin: 0 }}>
                  Try searching for a different destination or check the spelling.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Photo Gallery Modal */}
        {selectedPhotoGallery && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
            onClick={() => setSelectedPhotoGallery(null)}
          >
            <div style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative'
            }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                  {selectedPhotoGallery.location.name}
                </h3>
                <button
                  onClick={() => setSelectedPhotoGallery(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Photos Grid */}
              <div style={{
                padding: '20px',
                maxHeight: '70vh',
                overflowY: 'auto'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  {selectedPhotoGallery.photos.map((photo: any, index: number) => (
                    <div key={index} style={{
                      aspectRatio: '16/9',
                      overflow: 'hidden',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}>
                      <img
                        src={photo.images?.large?.url || photo.images?.medium?.url || photo.images?.original?.url}
                        alt={photo.caption || selectedPhotoGallery.location.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
