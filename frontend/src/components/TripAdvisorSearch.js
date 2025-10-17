import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, MapPinIcon, StarIcon } from '@heroicons/react/24/outline';
import TripAdvisorCard from './TripAdvisorCard';
import tripadvisorService from '../services/tripadvisorService';

const TripAdvisorSearch = ({ 
  location, 
  category = 'all', // 'attractions', 'restaurants', 'all'
  onLocationSelect,
  className = "" 
}) => {
  const [searchQuery, setSearchQuery] = useState(location || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(category);

  const categories = [
    { id: 'all', name: 'All', icon: '🔍' },
    { id: 'attractions', name: 'Attractions', icon: '🏛️' },
    { id: 'restaurants', name: 'Restaurants', icon: '🍽️' }
  ];

  const searchLocations = async (query, cat = selectedCategory) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let response;
      if (cat === 'attractions') {
        response = await tripadvisorService.searchAttractions(query, 10);
      } else if (cat === 'restaurants') {
        response = await tripadvisorService.searchRestaurants(query, 10);
      } else {
        response = await tripadvisorService.searchLocations(query, 10);
      }

      if (response.success) {
        setResults(response.data || []);
      } else {
        setError(response.error || 'No results found');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search locations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchLocations(searchQuery, selectedCategory);
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    if (searchQuery.trim()) {
      searchLocations(searchQuery, newCategory);
    }
  };

  const handleLocationSelect = (location) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  // Auto-search when location prop changes
  useEffect(() => {
    if (location && location !== searchQuery) {
      setSearchQuery(location);
      searchLocations(location, selectedCategory);
    }
  }, [location]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for attractions, restaurants, or places..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex space-x-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Search Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Found {results.length} {selectedCategory === 'all' ? 'places' : selectedCategory}
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <MapPinIcon className="h-4 w-4 mr-1" />
              {searchQuery}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((location, index) => (
              <TripAdvisorCard
                key={location.contentId || index}
                location={location}
                onSelect={handleLocationSelect}
                showPhotos={true}
                showReviews={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && results.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try searching for a different location or category.
          </p>
        </div>
      )}
    </div>
  );
};

export default TripAdvisorSearch;
