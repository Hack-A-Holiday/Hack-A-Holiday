/**
 * Hotel Results Display Component
 * 
 * Displays hotel search results with photos, ratings, amenities,
 * and booking links to Booking.com.
 */

import React from 'react';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface HotelResult {
  id: string;
  name: string;
  photoMainUrl?: string;
  reviewScore?: number;
  reviewScoreWord?: string;
  reviewCount?: number;
  priceBreakdown?: {
    grossPrice?: { value: number; currency: string };
  };
  address?: string;
  amenities?: string[];
  checkInTime?: string;
  checkOutTime?: string;
}

interface HotelResultsDisplayProps {
  hotels: HotelResult[];
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  onBookHotel: (hotel: HotelResult) => void;
  isMobile?: boolean;
}

export default function HotelResultsDisplay({
  hotels,
  destination,
  checkIn,
  checkOut,
  guests,
  onBookHotel,
  isMobile = false
}: HotelResultsDisplayProps) {
  const { isDarkMode } = useDarkMode();

  if (!hotels || hotels.length === 0) {
    return null;
  }

  // Calculate number of nights
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const nights = calculateNights();

  return (
    <div style={{
      marginTop: '30px'
    }}>
      <h3 style={{
        fontSize: isMobile ? '1.5rem' : '1.8rem',
        fontWeight: '600',
        marginBottom: '20px',
        color: isDarkMode ? '#e8eaed' : '#1f2937'
      }}>
        Found {hotels.length} Hotels in {destination}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '24px'
      }}>
        {hotels.slice(0, 6).map((hotel, index) => {
          const pricePerNight = hotel.priceBreakdown?.grossPrice?.value || 0;
          const totalPrice = pricePerNight * nights;

          return (
            <div
              key={hotel.id || index}
              style={{
                background: isDarkMode ? '#1a1f2e' : 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb'
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
              {/* Hotel Image */}
              {hotel.photoMainUrl && (
                <div style={{
                  width: '100%',
                  height: '200px',
                  overflow: 'hidden'
                }}>
                  <img
                    src={hotel.photoMainUrl}
                    alt={hotel.name}
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
              )}

              <div style={{ padding: '20px' }}>
                {/* Hotel Name */}
                <h4 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: isDarkMode ? '#e8eaed' : '#1f2937',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {hotel.name}
                </h4>

                {/* Address */}
                {hotel.address && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    marginBottom: '12px',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    📍 {hotel.address}
                  </p>
                )}

                {/* Rating */}
                {hotel.reviewScore && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}>
                      {hotel.reviewScore.toFixed(1)}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: isDarkMode ? '#e8eaed' : '#1f2937',
                      fontWeight: '500'
                    }}>
                      {hotel.reviewScoreWord || 'Good'}
                    </div>
                    {hotel.reviewCount && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }}>
                        ({hotel.reviewCount} reviews)
                      </div>
                    )}
                  </div>
                )}

                {/* Amenities */}
                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '12px'
                  }}>
                    {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
                          color: isDarkMode ? '#60a5fa' : '#1e40af',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}

                {/* Check-in/Check-out Times */}
                {(hotel.checkInTime || hotel.checkOutTime) && (
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    color: isDarkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    {hotel.checkInTime && (
                      <div>
                        <span style={{ fontWeight: '500' }}>Check-in:</span> {hotel.checkInTime}
                      </div>
                    )}
                    {hotel.checkOutTime && (
                      <div>
                        <span style={{ fontWeight: '500' }}>Check-out:</span> {hotel.checkOutTime}
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      marginBottom: '4px'
                    }}>
                      Total for {nights} nights
                    </div>
                    <div style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: isDarkMode ? '#e8eaed' : '#1f2937'
                    }}>
                      ${totalPrice ? totalPrice.toFixed(0) : 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => onBookHotel(hotel)}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#3b82f6';
                    }}
                  >
                    Book on Booking.com
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Hotels Button */}
      {hotels.length > 6 && (
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <div style={{
            fontSize: '1rem',
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            marginBottom: '15px'
          }}>
            Showing 6 of {hotels.length} hotels
          </div>
          <button
            onClick={() => {
              const searchString = encodeURIComponent(destination.trim());
              const bookingUrl = `https://www.booking.com/searchresults.html?ss=${searchString}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${guests}&no_rooms=1&group_children=0`;
              window.open(bookingUrl, '_blank', 'noopener,noreferrer');
            }}
            style={{
              padding: '15px 40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            🔍 View All {hotels.length} Hotels on Booking.com
          </button>
        </div>
      )}

      {/* Hotel Search Tip */}
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
  );
}
