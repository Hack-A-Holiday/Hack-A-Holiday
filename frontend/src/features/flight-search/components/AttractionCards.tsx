/**
 * Attraction Cards Component
 * 
 * Displays TripAdvisor attraction recommendations with photos,
 * ratings, tags, and booking links.
 */

import React from 'react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import type { Attraction, FilterType } from '../types';

interface AttractionCardsProps {
  attractions: Attraction[];
  destination: string;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onPhotoGalleryOpen: (attraction: Attraction) => void;
  isMobile?: boolean;
}

export default function AttractionCards({
  attractions,
  destination,
  activeFilter,
  onFilterChange,
  onPhotoGalleryOpen,
  isMobile = false
}: AttractionCardsProps) {
  const { isDarkMode } = useDarkMode();

  const getCategoryName = (category: any): string => {
    if (typeof category === 'object' && category?.name) {
      return category.name;
    }
    return category || 'Attraction';
  };

  const getTripAdvisorUrl = (location: Attraction, destination: string): string => {
    if (location.web_url) {
      return location.web_url;
    }
    const searchQuery = encodeURIComponent(`${location.name} ${destination}`);
    return `https://www.tripadvisor.com/Search?q=${searchQuery}`;
  };

  const filteredAttractions = attractions.filter(rec => {
    const rating = typeof rec.rating === 'number' ? rec.rating : parseFloat(rec.rating);
    const reviews = typeof rec.num_reviews === 'number' ? rec.num_reviews : parseInt(rec.num_reviews);
    
    switch (activeFilter) {
      case 'Top Rated':
        return rating >= 4.5;
      case 'Popular':
        return reviews >= 1000;
      case 'Hidden Gems':
        return rating >= 4.0 && reviews < 500;
      case 'All':
      default:
        return true;
    }
  });

  if (!attractions || attractions.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Header with Toggle Button */}
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
      </div>

      {/* Attraction Cards Grid */}
      <div style={{ marginTop: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {filteredAttractions.length > 0 ? (
            filteredAttractions.map((location, index) => (
              <div
                key={location.location_id || index}
                onClick={() => {
                  if (location.photos && location.photos.length > 0) {
                    onPhotoGalleryOpen(location);
                  }
                }}
                style={{
                  background: isDarkMode ? '#1a1f2e' : 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: location.photos && location.photos.length > 0 ? 'pointer' : 'default',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = isDarkMode 
                    ? '0 8px 24px rgba(0,0,0,0.6)' 
                    : '0 4px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDarkMode 
                    ? '0 4px 12px rgba(0,0,0,0.4)' 
                    : '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* Photo Badge */}
                {location.photos && location.photos.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    zIndex: 10,
                    backdropFilter: 'blur(4px)'
                  }}>
                    📸 {location.photos.length} Photos
                  </div>
                )}

                {/* Main Photo */}
                {location.photos && location.photos.length > 0 && location.photos[0]?.images ? (
                  <div style={{
                    width: '100%',
                    height: '220px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={location.photos[0].images.large?.url || 
                           location.photos[0].images.medium?.url || 
                           location.photos[0].images.original?.url}
                      alt={location.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '220px',
                    background: isDarkMode ? '#0f172a' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem'
                  }}>
                    🏛️
                  </div>
                )}

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  {/* Title and Rating Row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                    gap: '12px'
                  }}>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      margin: 0,
                      color: isDarkMode ? '#e8eaed' : '#1f2937',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {location.name}
                    </h3>
                    {location.rating && (
                      <div style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ⭐ {(typeof location.rating === 'number' ? location.rating : parseFloat(location.rating)).toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Reviews */}
                  {location.num_reviews && (
                    <p style={{
                      fontSize: '0.8rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      margin: '0 0 8px 0'
                    }}>
                      {(typeof location.num_reviews === 'number' ? location.num_reviews : parseInt(location.num_reviews)).toLocaleString()} reviews
                    </p>
                  )}

                  {/* Category */}
                  <p style={{
                    fontSize: '0.85rem',
                    color: isDarkMode ? '#60a5fa' : '#3b82f6',
                    fontWeight: '500',
                    margin: '0 0 12px 0',
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
                    {((typeof location.rating === 'number' ? location.rating : parseFloat(location.rating)) >= 4.5) && (
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
                    {((typeof location.num_reviews === 'number' ? location.num_reviews : parseInt(location.num_reviews)) > 1000) && (
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

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '12px'
                  }}>
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
                {activeFilter === 'Top Rated' && '⭐'}
                {activeFilter === 'Popular' && '🔥'}
                {activeFilter === 'Hidden Gems' && '💎'}
              </div>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                margin: '0 0 8px 0',
                color: isDarkMode ? '#e8eaed' : '#1f2937'
              }}>
                No {activeFilter.toLowerCase()} places found
              </h3>
              <p style={{ margin: '0 0 16px 0' }}>
                Try selecting a different filter to see more options.
              </p>
              <button
                onClick={() => onFilterChange('All')}
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
    </div>
  );
}
