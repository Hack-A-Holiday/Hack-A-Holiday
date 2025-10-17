import React from 'react';

interface HotelCardsProps {
  hotels: any[];
  role: string;
  isDarkMode?: boolean;
  bookingUrl?: string;
}

export const HotelCards: React.FC<HotelCardsProps> = ({ hotels, role, isDarkMode = false, bookingUrl }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>🏨</span>
      <span>Hotel Recommendations</span>
    </div>
    
    {bookingUrl && (
      <div style={{ marginBottom: '16px' }}>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#1d4ed8',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8';
          }}
        >
          🏨 Search More Hotels on Booking.com
        </a>
      </div>
    )}
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
      {hotels.slice(0, 3).map((hotel: any, idx: number) => (
        <div key={idx} style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
          overflow: 'hidden',
          boxShadow: isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDarkMode ? '0 8px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
        }}
        >
          {/* Hotel Image Placeholder */}
          <div style={{
            height: '200px',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#ccc'
          }}>
            🏨
          </div>
          
          {/* Hotel Content */}
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'),
                lineHeight: '1.3'
              }}>
                {hotel.name}
              </h3>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '1.2rem', 
                  color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50') 
                }}>
                  ${hotel.price}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: role === 'user' ? 'rgba(255,255,255,0.7)' : (isDarkMode ? 'rgba(255,255,255,0.6)' : '#888') 
                }}>
                  per night
                </div>
              </div>
            </div>
            
            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <span style={{ color: '#ffc107', fontSize: '14px' }}>⭐</span>
              <span style={{ 
                fontSize: '0.9rem', 
                fontWeight: '500', 
                color: role === 'user' ? 'rgba(255,255,255,0.9)' : (isDarkMode ? 'rgba(255,255,255,0.8)' : '#666') 
              }}>
                {hotel.rating}/5
              </span>
              <span style={{ 
                fontSize: '0.8rem', 
                color: role === 'user' ? 'rgba(255,255,255,0.6)' : (isDarkMode ? 'rgba(255,255,255,0.5)' : '#999') 
              }}>
                ({hotel.review_count || 'N/A'} reviews)
              </span>
            </div>
            
            {/* Location */}
            <div style={{ 
              fontSize: '0.9rem', 
              color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666'),
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              📍 {hotel.location || hotel.address || 'Location not specified'}
            </div>
            
            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div style={{ 
                fontSize: '0.8rem', 
                color: role === 'user' ? 'rgba(255,255,255,0.7)' : (isDarkMode ? 'rgba(255,255,255,0.6)' : '#888'),
                marginBottom: '12px'
              }}>
                {hotel.amenities.slice(0, 3).join(' • ')}
                {hotel.amenities.length > 3 && ` +${hotel.amenities.length - 3} more`}
              </div>
            )}
            
            {/* Description */}
            {hotel.description && (
              <div style={{ 
                fontSize: '0.85rem', 
                color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666'),
                lineHeight: '1.4',
                marginBottom: '12px'
              }}>
                {hotel.description.length > 100 ? `${hotel.description.substring(0, 100)}...` : hotel.description}
              </div>
            )}
            
            {/* Book Now Button */}
            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
            >
              View on Booking.com
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);