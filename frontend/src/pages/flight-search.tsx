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

export default function FlightSearchPage() {
  const { state } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 640);
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

  return (
    <ProtectedRoute>
      <Head>
        <title>Flight & Hotel Search - Hack-A-Holiday</title>
        <meta name="description" content="Search and compare flights and hotels with advanced filtering and intelligent recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: isMobile ? '10px' : '20px'
      }}>
        <Navbar />
        
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          paddingTop: isMobile ? '20px' : '40px'
        }}>
          {/* Page Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: isMobile ? '30px' : '40px',
            color: 'white'
          }}>
            <h1 style={{
              fontSize: isMobile ? '2rem' : '3rem',
              fontWeight: '700',
              margin: '0 0 16px 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              color: isDarkMode ? '#e8eaed' : 'white'
            }}>
              ✈️ Flight Search
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
          <FlightSearch
            onFlightSelect={handleFlightSelect}
            className="flight-search-page"
          />

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

          {/* Features Section */}
          <div style={{
            marginTop: '60px',
            padding: isMobile ? '30px 20px' : '40px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            color: 'white'
          }}>
            <h2 style={{
              textAlign: 'center',
              fontSize: isMobile ? '1.8rem' : '2.2rem',
              fontWeight: '600',
              margin: '0 0 30px 0'
            }}>
              Why Choose Our Flight Search?
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧠</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                  AI-Powered Recommendations
                </h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: '0' }}>
                  Get personalized flight suggestions based on your travel style and preferences.
                </p>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚡</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                  Real-Time Search
                </h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: '0' }}>
                  Search across multiple airlines and booking platforms for the best deals.
                </p>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎯</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                  Advanced Filtering
                </h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: '0' }}>
                  Filter by price, duration, stops, airlines, and more to find exactly what you need.
                </p>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💰</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                  Best Price Guarantee
                </h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: '0' }}>
                  We compare prices from multiple sources to ensure you get the best deal.
                </p>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div style={{
            marginTop: '40px',
            padding: isMobile ? '30px 20px' : '40px',
            background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: isDarkMode ? '0 5px 20px rgba(0,0,0,0.6)' : 'none'
          }}>
            <h2 style={{
              textAlign: 'center',
              fontSize: isMobile ? '1.8rem' : '2.2rem',
              fontWeight: '600',
              margin: '0 0 30px 0',
              color: isDarkMode ? '#e8eaed' : '#1f2937'
            }}>
              💡 Flight Search Tips
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 12px 0', color: isDarkMode ? '#8b9cff' : '#3b82f6' }}>
                  🕐 Best Time to Book
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: '0', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  Book domestic flights 1-3 months in advance and international flights 2-8 months ahead for the best prices.
                </p>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 12px 0', color: isDarkMode ? '#8b9cff' : '#3b82f6' }}>
                  📅 Flexible Dates
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: '0', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  Use our flexible date search to find cheaper flights by adjusting your travel dates by a few days.
                </p>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 12px 0', color: isDarkMode ? '#8b9cff' : '#3b82f6' }}>
                  🎯 Set Price Alerts
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: '0', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  Set up price alerts for your desired routes to get notified when prices drop.
                </p>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 12px 0', color: isDarkMode ? '#8b9cff' : '#3b82f6' }}>
                  🏷️ Consider Nearby Airports
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: '0', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  Check flights to nearby airports as they might offer better prices or more convenient times.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
