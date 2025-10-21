/**
 * Flight Search Feature
 * 
 * Main page component for flight search with hotel search and attraction recommendations
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import FlightSearch from '@/components/FlightSearch';
import { FlightOption } from '@/types/flight';

// Feature-specific imports
import { TravelTips, FilterBar } from './components';
import { useHotelSearch, useAttractionRecommendations } from './hooks';
import { getCategoryName } from './utils';
import { PhotoGallery } from './types';

export default function FlightSearchPage() {
  const { state } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [showTripAdvisor, setShowTripAdvisor] = useState(false);
  const [showMoreHotels, setShowMoreHotels] = useState(false);

  // Use custom hooks
  const hotelSearch = useHotelSearch();
  const attractionRecs = useAttractionRecommendations({
    userPreferences: state.user?.preferences || null
  });

  // Screen size detection
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

  // Auto-sync destination from hotel search
  useEffect(() => {
    if (hotelSearch.hotelDestination && hotelSearch.hotelDestination.trim().length >= 3) {
      attractionRecs.setDestination(hotelSearch.hotelDestination);
    }
  }, [hotelSearch.hotelDestination]);

  // Debounced search for recommendations
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (attractionRecs.destination.trim()) {
        attractionRecs.fetchRecommendations(attractionRecs.destination);
        setShowTripAdvisor(true);
      } else {
        setShowTripAdvisor(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [attractionRecs.destination]);

  const handleFlightSelect = (flight: FlightOption) => {
    setSelectedFlight(flight);
    console.log('Selected flight:', flight);
  };

  const filteredRecommendations = attractionRecs.getFilteredResults();

  // Helper functions for type-safe conversions
  const safeParseFloat = (value: string | number): number => {
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
  };

  const safeParseInt = (value: string | number): number => {
    if (typeof value === 'number') return value;
    return parseInt(value) || 0;
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Flight & Hotel Search - Hack-A-Holiday</title>
        <meta name="description" content="Search and compare flights and hotels with advanced filtering and intelligent recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e293b 100%)'
          : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
        position: 'relative'
      }}>
        <AnimatedBackground isDarkMode={isDarkMode} variant="flight-search" />
        <Navbar />

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: isMobile ? '20px' : '40px',
          paddingTop: isMobile ? '20px' : '40px',
          paddingBottom: '40px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px',
            color: 'white'
          }}>
            <h1 style={{
              fontSize: isMobile ? '2rem' : '3rem',
              fontWeight: '700',
              marginBottom: '16px',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              ✈️ Find Your Perfect Flight
            </h1>
            <p style={{
              fontSize: isMobile ? '1rem' : '1.2rem',
              opacity: 0.95,
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              Find the perfect flight with our intelligent search engine.
              Compare prices, durations, and get personalized recommendations.
            </p>
          </div>

          {/* Main Content */}
          <div style={{
            padding: isMobile ? '24px 16px' : '32px',
            background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : 'none'
          }}>
            {/* Travel Tips */}
            <TravelTips isDarkMode={isDarkMode} isMobile={isMobile} isTablet={isTablet} />

            {/* Flight Search Component */}
            <FlightSearch
              onFlightSelect={handleFlightSelect}
              onDestinationChange={(dest: string) => {
                if (dest && dest.trim().length >= 3) {
                  attractionRecs.setDestination(dest);
                }
              }}
              className="flight-search-page"
            />
          </div>

          {/* Hotel Search Section */}
          <div style={{
            marginTop: '40px',
            padding: isMobile ? '24px 16px' : '32px',
            background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.8rem' : '2.2rem',
              fontWeight: '600',
              marginBottom: '24px',
              color: isDarkMode ? '#e8eaed' : '#1f2937'
            }}>
              🏨 Find Hotels
            </h2>

            {/* Hotel Search Form */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Destination"
                  value={hotelSearch.hotelDestination}
                  onChange={(e) => hotelSearch.handleDestinationChange(e.target.value)}
                  onFocus={() => hotelSearch.setShowSuggestions(true)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                    background: isDarkMode ? '#1a1f2e' : 'white',
                    color: isDarkMode ? '#e8eaed' : '#1f2937',
                    fontSize: '1rem'
                  }}
                />
                {hotelSearch.showSuggestions && hotelSearch.destinationSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: isDarkMode ? '#1a1f2e' : 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb'
                  }}>
                    {hotelSearch.destinationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          hotelSearch.setHotelDestination(suggestion);
                          hotelSearch.setShowSuggestions(false);
                        }}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          borderBottom: index < hotelSearch.destinationSuggestions.length - 1
                            ? isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f3f4f6'
                            : 'none',
                          color: isDarkMode ? '#e8eaed' : '#1f2937'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="date"
                value={hotelSearch.hotelCheckIn}
                onChange={(e) => hotelSearch.setHotelCheckIn(e.target.value)}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                  background: isDarkMode ? '#1a1f2e' : 'white',
                  color: isDarkMode ? '#e8eaed' : '#1f2937',
                  fontSize: '1rem'
                }}
              />

              <input
                type="date"
                value={hotelSearch.hotelCheckOut}
                onChange={(e) => hotelSearch.setHotelCheckOut(e.target.value)}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                  background: isDarkMode ? '#1a1f2e' : 'white',
                  color: isDarkMode ? '#e8eaed' : '#1f2937',
                  fontSize: '1rem'
                }}
              />

              <input
                type="number"
                min="1"
                max="10"
                value={hotelSearch.hotelGuests}
                onChange={(e) => hotelSearch.setHotelGuests(parseInt(e.target.value))}
                placeholder="Guests"
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                  background: isDarkMode ? '#1a1f2e' : 'white',
                  color: isDarkMode ? '#e8eaed' : '#1f2937',
                  fontSize: '1rem'
                }}
              />

              <button
                onClick={hotelSearch.handleHotelSearch}
                disabled={hotelSearch.loadingHotels}
                style={{
                  padding: '14px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hotelSearch.loadingHotels ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: hotelSearch.loadingHotels ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!hotelSearch.loadingHotels) {
                    e.currentTarget.style.background = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hotelSearch.loadingHotels) {
                    e.currentTarget.style.background = '#3b82f6';
                  }
                }}
              >
                {hotelSearch.loadingHotels ? 'Searching...' : 'Search Hotels'}
              </button>
            </div>

            {/* Hotel Results */}
            {hotelSearch.showHotelResults && hotelSearch.hotelResults.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '20px',
                  color: isDarkMode ? '#e8eaed' : '#1f2937'
                }}>
                  Available Hotels
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '20px'
                }}>
                  {hotelSearch.hotelResults.slice(0, showMoreHotels ? hotelSearch.hotelResults.length : 6).map((hotel, index) => {
                    const nights = Math.ceil(
                      (new Date(hotelSearch.hotelCheckOut).getTime() - new Date(hotelSearch.hotelCheckIn).getTime()) / 
                      (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={hotel.id || index}
                        onClick={() => hotelSearch.handleBookHotel(hotel)}
                        style={{
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
                              {hotel.reviewScore ? hotel.reviewScore.toFixed(1) : 'N/A'}
                            </span>
                            <span style={{
                              fontSize: '0.9rem',
                              color: isDarkMode ? '#9ca3af' : '#6b7280'
                            }}>
                              ({hotel.reviewCount || 0} reviews)
                            </span>
                            {hotel.rating && (
                              <span style={{
                                fontSize: '0.8rem',
                                color: isDarkMode ? '#9ca3af' : '#6b7280',
                                background: isDarkMode ? '#374151' : '#f3f4f6',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {'★'.repeat(hotel.rating)}
                              </span>
                            )}
                          </div>
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
                                Total for {nights} nights
                              </div>
                              <div style={{
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                color: isDarkMode ? '#e8eaed' : '#1f2937'
                              }}>
                                ${Math.round(hotel.totalPrice || 0)}
                              </div>
                            </div>
                            <button style={{
                              padding: '10px 20px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}>
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hotelSearch.hotelResults.length > 6 && (
                  <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <button
                      onClick={() => setShowMoreHotels(!showMoreHotels)}
                      style={{
                        padding: '12px 24px',
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6',
                        color: isDarkMode ? '#e8eaed' : '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {showMoreHotels ? 'Show Less' : `Show More (${hotelSearch.hotelResults.length - 6} more)`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discover Your Destination Section - TripAdvisor Integration */}
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
              {attractionRecs.autoRecommendations.length > 0 && (
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
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: isDarkMode ? '#e8eaed' : '#1f2937'
              }}>
                {attractionRecs.destination ? `Showing recommendations for: ${attractionRecs.destination}` : 'Destination will auto-populate from Flight or Hotel search above'}
              </label>
              <input
                type="text"
                value={attractionRecs.destination}
                onChange={(e) => attractionRecs.setDestination(e.target.value)}
                placeholder="Or enter destination manually: e.g., Dubai, Paris, Tokyo..."
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
              {attractionRecs.loadingRecommendations && (
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
                      Finding recommendations for {attractionRecs.destination}...
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                      Fetching detailed information and photos from TripAdvisor
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showTripAdvisor && attractionRecs.autoRecommendations.length > 0 && (
              <div>
                {/* Header Section */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      color: isDarkMode ? '#e8eaed' : '#1f2937'
                    }}>
                      Explore {attractionRecs.destination}
                    </h3>
                    <p style={{
                      fontSize: '0.95rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      margin: 0
                    }}>
                      {attractionRecs.autoRecommendations.length} top-rated places curated from TripAdvisor
                    </p>
                  </div>
                  {state.user?.preferences && Object.keys(state.user.preferences).length > 0 && (
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      color: '#00aa6c',
                      background: '#f0fdf4',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      ✨ Personalized for you
                    </span>
                  )}
                </div>

                {/* Quick Stats Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '32px'
                }}>
                  <div style={{
                    background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid #dbeafe'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: isDarkMode ? '#60a5fa' : '#3b82f6',
                      marginBottom: '4px'
                    }}>
                      {attractionRecs.autoRecommendations.filter(r => safeParseFloat(r.rating) >= 4.5).length}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      fontWeight: '500'
                    }}>
                      Top Rated (4.5+)
                    </div>
                  </div>

                  <div style={{
                    background: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isDarkMode ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #bbf7d0'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: isDarkMode ? '#34d399' : '#10b981',
                      marginBottom: '4px'
                    }}>
                      {attractionRecs.autoRecommendations.filter(r => r.photos && r.photos.length > 0).length}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      fontWeight: '500'
                    }}>
                      With Photos
                    </div>
                  </div>

                  <div style={{
                    background: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isDarkMode ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid #fde68a'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: isDarkMode ? '#fbbf24' : '#f59e0b',
                      marginBottom: '4px'
                    }}>
                      {Math.round(attractionRecs.autoRecommendations.reduce((sum, r) => sum + (safeParseFloat(r.rating) || 0), 0) / attractionRecs.autoRecommendations.length * 10) / 10}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      fontWeight: '500'
                    }}>
                      Avg Rating
                    </div>
                  </div>

                  <div style={{
                    background: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#faf5ff',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isDarkMode ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid #e9d5ff'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: isDarkMode ? '#a78bfa' : '#8b5cf6',
                      marginBottom: '4px'
                    }}>
                      {attractionRecs.autoRecommendations.reduce((sum, r) => sum + (safeParseInt(r.num_reviews) || 0), 0).toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      fontWeight: '500'
                    }}>
                      Total Reviews
                    </div>
                  </div>
                </div>

                {/* Category Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '24px',
                  flexWrap: 'wrap'
                }}>
                  {(['All', 'Top Rated', 'Popular', 'Hidden Gems'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => attractionRecs.setActiveFilter(tab)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '24px',
                        border: isDarkMode ? '2px solid rgba(102, 126, 234, 0.3)' : '2px solid #e5e7eb',
                        background: tab === attractionRecs.activeFilter
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                        color: tab === attractionRecs.activeFilter ? '#ffffff' : isDarkMode ? '#e8eaed' : '#1f2937',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: tab === attractionRecs.activeFilter ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (tab !== attractionRecs.activeFilter) {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (tab !== attractionRecs.activeFilter) {
                          e.currentTarget.style.borderColor = isDarkMode ? 'rgba(102, 126, 234, 0.3)' : '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {tab === 'Top Rated' && '⭐ '}
                      {tab === 'Popular' && '🔥 '}
                      {tab === 'Hidden Gems' && '💎 '}
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Filtered Results Info */}
                {attractionRecs.activeFilter !== 'All' && (
                  <div style={{
                    padding: '12px 20px',
                    background: isDarkMode ? 'rgba(102, 126, 234, 0.1)' : '#eff6ff',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: isDarkMode ? '1px solid rgba(102, 126, 234, 0.2)' : '1px solid #dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '0.9rem',
                      color: isDarkMode ? '#93c5fd' : '#1e40af',
                      fontWeight: '500'
                    }}>
                      Showing {filteredRecommendations.length} {attractionRecs.activeFilter.toLowerCase()} places
                    </span>
                    <button
                      onClick={() => attractionRecs.setActiveFilter('All')}
                      style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: 'none',
                        color: isDarkMode ? '#93c5fd' : '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        textDecoration: 'underline'
                      }}
                    >
                      Clear filter
                    </button>
                  </div>
                )}

                {/* Attraction Cards Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                  gap: '16px',
                  maxWidth: '1200px',
                  margin: '0 auto'
                }}>
                  {filteredRecommendations.length > 0 ? (
                    filteredRecommendations.map((location, index) => (
                      <div key={location.location_id || index} style={{
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                        boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease-in-out',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = isDarkMode ? '0 12px 30px rgba(0,0,0,0.5)' : '0 8px 25px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)';
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
                              attractionRecs.setSelectedPhotoGallery({
                                location: location,
                                photos: location.photos
                              });
                            }}
                          >
                            <img
                              src={location.photos[0].images?.large?.url || location.photos[0].images?.medium?.url || location.photos[0].images?.original?.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}
                              alt={location.photos[0].caption || location.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.3s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            />

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
                          </div>
                        )}

                        {/* Content Section - TripAdvisor Style */}
                        <div style={{ padding: '16px' }}>
                          {/* Title */}
                          <h4 style={{
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            margin: '0 0 10px 0',
                            color: isDarkMode ? '#e8eaed' : '#1f2937',
                            lineHeight: '1.4',
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
                            marginBottom: '10px'
                          }}>
                            {location.rating && safeParseFloat(location.rating) > 0 && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4',
                                padding: '4px 8px',
                                borderRadius: '8px'
                              }}>
                                <span style={{ color: '#00aa6c', fontSize: '0.95rem' }}>★</span>
                                <span style={{
                                  fontSize: '0.95rem',
                                  fontWeight: '700',
                                  color: isDarkMode ? '#34d399' : '#059669'
                                }}>
                                  {safeParseFloat(location.rating).toFixed(1)}
                                </span>
                              </div>
                            )}

                            {location.num_reviews && safeParseInt(location.num_reviews) > 0 && (
                              <span style={{
                                fontSize: '0.85rem',
                                color: isDarkMode ? '#9ca3af' : '#6b7280',
                                fontWeight: '500'
                              }}>
                                {safeParseInt(location.num_reviews).toLocaleString()} reviews
                              </span>
                            )}
                          </div>

                          {/* Category - TripAdvisor Style */}
                          <p style={{
                            fontSize: '0.8rem',
                            color: isDarkMode ? '#9ca3af' : '#6b7280',
                            margin: '0 0 8px 0',
                            lineHeight: '1.3'
                          }}>
                            {getCategoryName(location.category)}
                          </p>

                          {/* Description */}
                          {location.description && (
                            <p style={{
                              fontSize: '0.85rem',
                              color: isDarkMode ? '#d1d5db' : '#4b5563',
                              margin: '0 0 12px 0',
                              lineHeight: '1.5',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {location.description}
                            </p>
                          )}

                          {/* Quick Info Tags */}
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginBottom: '12px'
                          }}>
                            {safeParseFloat(location.rating) >= 4.5 && (
                              <span style={{
                                background: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
                                color: isDarkMode ? '#34d399' : '#166534',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: '600'
                              }}>
                                ⭐ Top Rated
                              </span>
                            )}
                            {safeParseInt(location.num_reviews) > 1000 && (
                              <span style={{
                                background: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                                color: isDarkMode ? '#fbbf24' : '#92400e',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: '600'
                              }}>
                                🔥 Popular
                              </span>
                            )}
                            {location.personalizationScore && location.personalizationScore > 0.5 && (
                              <span style={{
                                background: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#f3e8ff',
                                color: isDarkMode ? '#a78bfa' : '#6b21a8',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: '600'
                              }}>
                                ✨ For You
                              </span>
                            )}
                            {location.photos && location.photos.length > 5 && (
                              <span style={{
                                background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
                                color: isDarkMode ? '#60a5fa' : '#1e40af',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: '600'
                              }}>
                                📸 {location.photos.length} Photos
                              </span>
                            )}
                          </div>

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
                                const tripAdvisorUrl = location.web_url || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(location.name + ' ' + attractionRecs.destination)}`;
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
                                width: '100%',
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
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '60px 20px',
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                        {attractionRecs.activeFilter === 'Top Rated' && '⭐'}
                        {attractionRecs.activeFilter === 'Popular' && '🔥'}
                        {attractionRecs.activeFilter === 'Hidden Gems' && '💎'}
                      </div>
                      <h3 style={{
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        margin: '0 0 8px 0',
                        color: isDarkMode ? '#e8eaed' : '#1f2937'
                      }}>
                        No {attractionRecs.activeFilter.toLowerCase()} places found
                      </h3>
                      <p style={{ margin: '0 0 16px 0' }}>
                        Try selecting a different filter to see more options.
                      </p>
                      <button
                        onClick={() => attractionRecs.setActiveFilter('All')}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 24px',
                          borderRadius: '24px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                        }}
                      >
                        View All Places
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {attractionRecs.destination && !attractionRecs.loadingRecommendations && attractionRecs.autoRecommendations.length === 0 && (
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

          {/* Photo Gallery Modal */}
          {attractionRecs.selectedPhotoGallery && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
              }}
              onClick={() => attractionRecs.setSelectedPhotoGallery(null)}
            >
              <div
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                    {attractionRecs.selectedPhotoGallery.location.name}
                  </h3>
                  <button
                    onClick={() => attractionRecs.setSelectedPhotoGallery(null)}
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
                    {attractionRecs.selectedPhotoGallery.photos.map((photo, index) => (
                      <div key={index} style={{
                        aspectRatio: '16/9',
                        overflow: 'hidden',
                        borderRadius: '8px'
                      }}>
                        <img
                          src={photo.images?.large?.url || photo.images?.medium?.url || photo.images?.original?.url}
                          alt={photo.caption || attractionRecs.selectedPhotoGallery?.location.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
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
      </div>
    </ProtectedRoute>
  );
}
