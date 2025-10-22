import React, { useState } from 'react';
import Head from 'next/head';
import { KiwiApiService } from '../services/kiwi-api';
import { FlightOption } from '../types/flight';

export default function RealFlightTest() {
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kiwiApiService] = useState(() => new KiwiApiService());

  const testRealData = async () => {
    setLoading(true);
    setError(null);
    setFlights([]);

    try {
      console.log('🛫 Testing Kiwi API with real data...');
      
      const response = await kiwiApiService.searchFlights(
        'JFK', // New York
        'CDG', // Paris
        '2024-06-01',
        { adults: 1 },
        0 // no checked bags
      );

      if (response.itineraries && response.itineraries.length > 0) {
        const realFlights: (FlightOption | null)[] = response.itineraries.slice(0, 5).map((flight, index) => 
          kiwiApiService.convertToFlightOption(flight, index)
        );
        setFlights(realFlights.filter(Boolean) as FlightOption[]);
        console.log('✅ Real flight data loaded:', realFlights.filter(Boolean).length, 'flights');
      } else {
        setError('No flights found');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch flights');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Head>
        <title>Real Flight Data Test - Travel Companion</title>
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            marginBottom: '32px',
            color: '#1f2937',
            fontSize: '2.5rem',
            fontWeight: '700'
          }}>
            🛫 Real Flight Data Test
          </h1>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <button
              onClick={testRealData}
              disabled={loading}
              style={{
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #ffffff40',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading Real Data...
                </>
              ) : (
                <>
                  🛫 Test Real Flight Data
                </>
              )}
            </button>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              ❌ Error: {error}
            </div>
          )}

          {flights.length > 0 && (
            <div>
              <h2 style={{ 
                textAlign: 'center', 
                marginBottom: '24px',
                color: '#059669',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>
                ✅ Real Flight Data from Kiwi API
              </h2>

              <div style={{ display: 'grid', gap: '16px' }}>
                {flights.map((flight, index) => (
                  <div key={flight.id} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: '600', 
                        marginBottom: '8px',
                        color: '#1f2937'
                      }}>
                        {flight.airline} {flight.flightNumber}
                      </div>
                      <div style={{ 
                        fontSize: '1rem', 
                        color: '#6b7280',
                        marginBottom: '4px'
                      }}>
                        {flight.departure.airport} → {flight.arrival.airport}
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: '#9ca3af'
                      }}>
                        {flight.departure.time} - {flight.arrival.time} • {flight.duration}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '700', 
                        color: '#059669',
                        marginBottom: '4px'
                      }}>
                        {formatPrice(flight.price, flight.currency)} per person
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#6b7280'
                      }}>
                        {flight.baggage.checked} checked, 1 carry-on
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '24px',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
                  🎉 Success! Real Flight Data Working
                </div>
                <div style={{ fontSize: '14px', color: '#0369a1' }}>
                  This is actual flight data from Kiwi.com API, not mock data!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
