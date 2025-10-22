import React from 'react';

interface HotelRecommendationsProps {
  hotels: any;
  role: string;
  isDarkMode?: boolean;
}

export const HotelRecommendations: React.FC<HotelRecommendationsProps> = ({ hotels, role, isDarkMode = false }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>🏨</span>
      <span>Hotel Recommendations</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {hotels.slice(0, 3).map((hotel: any, idx: number) => (
        <div key={idx} style={{
          padding: '12px',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderRadius: '8px',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {hotel.name}
          </div>
          <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
            {hotel.rating && `⭐ ${hotel.rating} • `}{hotel.price && `$${hotel.price}/night • `}{hotel.location}
          </div>
        </div>
      ))}
    </div>
  </div>
);