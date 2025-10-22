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

  return (
    <ProtectedRoute>
      <Head>
        <title>Flight & Hotel Search - Hack Travel</title>
        <meta name="description" content="Search and compare flights and hotels with advanced filtering and intelligent recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e293b 100%)'
          : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
        paddingTop: '80px',
        paddingBottom: '40px',
        position: 'relative'
      }}>
        <AnimatedBackground isDarkMode={isDarkMode} variant="flight-search" />
        <Navbar />

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: isMobile ? '20px' : '40px',
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

          {/* Attraction Recommendations Section */}
          {showTripAdvisor && (
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
                🎯 Recommended Attractions in {attractionRecs.destination}
              </h2>

              {attractionRecs.loadingRecommendations ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    Loading recommendations...
                  </p>
                </div>
              ) : filteredRecommendations.length > 0 ? (
                <>
                  <FilterBar
                    activeFilter={attractionRecs.activeFilter}
                    setActiveFilter={attractionRecs.setActiveFilter}
                    isDarkMode={isDarkMode}
                    isMobile={isMobile}
                  />

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                    gap: '16px'
                  }}>
                    {filteredRecommendations.map((location, index) => (
                      <div
                        key={location.location_id || index}
                        onClick={() => {
                          if (location.web_url) {
                            window.open(location.web_url, '_blank');
                          }
                        }}
                        style={{
                          background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                          boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = isDarkMode 
                            ? '0 12px 30px rgba(0,0,0,0.5)' 
                            : '0 8px 25px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = isDarkMode 
                            ? '0 4px 12px rgba(0,0,0,0.3)' 
                            : '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                      >
                        {location.photos && location.photos.length > 0 && (
                          <div
                            style={{
                              height: '200px',
                              overflow: 'hidden'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              attractionRecs.setSelectedPhotoGallery({
                                location,
                                photos: location.photos || []
                              });
                            }}
                          >
                            <img
                              src={
                                location.photos[0].images?.large?.url ||
                                location.photos[0].images?.medium?.url ||
                                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
                              }
                              alt={location.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                        )}

                        <div style={{ padding: '16px' }}>
                          <h3 style={{
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            marginBottom: '8px',
                            color: isDarkMode ? '#e8eaed' : '#1f2937'
                          }}>
                            {location.name}
                          </h3>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                          }}>
                            <span style={{
                              background: '#10b981',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}>
                              ★ {typeof location.rating === 'number' ? location.rating.toFixed(1) : location.rating}
                            </span>
                            <span style={{
                              fontSize: '0.85rem',
                              color: isDarkMode ? '#9ca3af' : '#6b7280'
                            }}>
                              {location.num_reviews} reviews
                            </span>
                          </div>

                          <p style={{
                            fontSize: '0.85rem',
                            color: isDarkMode ? '#9ca3af' : '#6b7280',
                            marginBottom: '8px'
                          }}>
                            {getCategoryName(location.category)}
                          </p>

                          {location.description && (
                            <p style={{
                              fontSize: '0.9rem',
                              color: isDarkMode ? '#cbd5e1' : '#4b5563',
                              lineHeight: '1.4',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {location.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: isDarkMode ? '#9ca3af' : '#6b7280'
                }}>
                  No recommendations available for this destination.
                </p>
              )}
            </div>
          )}

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
