import React from 'react';
import { useRouter } from 'next/router';

interface FlightRecommendationsProps {
  flights: any[];
  role: string;
  isDarkMode?: boolean;
  googleFlightsUrl?: string;
  origin?: string;
  destination?: string;
  depDate?: string;
  retDate?: string;
}

export const FlightRecommendations: React.FC<FlightRecommendationsProps> = ({ 
  flights, 
  role, 
  isDarkMode = false, 
  googleFlightsUrl, 
  origin, 
  destination, 
  depDate, 
  retDate 
}) => {
  const router = useRouter();
  
  const handleExploreMore = () => {
    // Redirect to flight search page with the dates
    const searchParams = new URLSearchParams();
    if (origin) searchParams.set('origin', origin);
    if (destination) searchParams.set('destination', destination);
    if (depDate) searchParams.set('departureDate', depDate);
    if (retDate) searchParams.set('returnDate', retDate);
    
    router.push(`/flight-search?${searchParams.toString()}`);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>✈️</span>
        <span>Flight Recommendations</span>
      </div>
      
      <div style={{ marginBottom: '16px', fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
        Based on your preferences, here are the best flight options:
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {flights.slice(0, 3).map((flight: any, idx: number) => (
          <div key={idx} style={{
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            borderRadius: '12px',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
            padding: '16px',
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50')
              }}>
                {idx + 1}. {flight.airline} ({flight.flightNumber})
              </h3>
              <div style={{ 
                fontWeight: '700', 
                fontSize: '1.2rem', 
                color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50') 
              }}>
                ${flight.price}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Route:</strong> {flight.origin} → {flight.destination}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Duration:</strong> {flight.duration}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Departure:</strong> {new Date(flight.departureTime).toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Arrival:</strong> {new Date(flight.arrivalTime).toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Stops:</strong> {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
              </div>
            </div>
            
            <a
              href={googleFlightsUrl}
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
              ✈️ Book {flight.airline} {flight.flightNumber}
            </a>
          </div>
        ))}
      </div>
      
      <button
        onClick={handleExploreMore}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#059669',
          color: 'white',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#047857';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#059669';
        }}
      >
        🔍 Explore More Options
      </button>
    </div>
  );
};