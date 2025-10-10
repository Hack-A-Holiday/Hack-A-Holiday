import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import { tripTrackingService } from '../services/trip-tracking';

export default function HomePage() {
  const { state } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tripStats, setTripStats] = useState({ tripsPlanned: 0, countriesExplored: 0, totalSpent: 0 });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 640);
      setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load trip statistics
  useEffect(() => {
    const userId = localStorage.getItem('userId') || state.user?.email || 'guest';
    const stats = tripTrackingService.getTripStats(userId);
    setTripStats(stats);
    
    // Listen for trip updates
    const handleTripUpdate = () => {
      const updatedStats = tripTrackingService.getTripStats(userId);
      setTripStats(updatedStats);
    };
    
    // Listen for when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to the tab, refresh stats
        const updatedStats = tripTrackingService.getTripStats(userId);
        setTripStats(updatedStats);
      }
    };
    
    window.addEventListener('tripUpdated', handleTripUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('tripUpdated', handleTripUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.user]);

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>Home - Travel Companion</title>
        <meta name="description" content="Your AI-powered travel planning companion" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Navbar />
        
        <main style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          
          {/* Hero Banner */}
          <section style={{
            padding: isMobile ? '40px 20px' : isTablet ? '60px 20px' : '80px 20px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h1 style={{
                fontSize: isMobile ? '2.5rem' : isTablet ? '3rem' : '3.5rem',
                fontWeight: 'bold',
                margin: '0 0 20px',
                lineHeight: '1.2',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>
                Welcome back, {state.user?.name?.split(' ')[0] || 'Traveler'}! ✈️
              </h1>
              <p style={{
                fontSize: isMobile ? '1.1rem' : isTablet ? '1.2rem' : '1.3rem',
                opacity: 0.9,
                maxWidth: isMobile ? '100%' : '600px',
                margin: '0 auto 40px',
                lineHeight: '1.5'
              }}>
                Your AI-powered travel companion is ready to help you plan your next adventure. 
                Discover amazing destinations, create personalized itineraries, and make memories that last a lifetime.
              </p>
              <div style={{ 
                display: 'flex', 
                gap: isMobile ? '15px' : '20px', 
                justifyContent: 'center', 
                flexWrap: 'wrap',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center'
              }}>
                 <Link href="/plantrip" style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: isMobile ? '15px 25px' : '15px 30px',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  width: isMobile ? '80%' : 'auto',
                  textAlign: 'center'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  🗺️ Plan New Trip
                </Link>
                <Link href="/profile" style={{
                  display: 'inline-block',
                  background: 'white',
                  color: '#667eea',
                  padding: isMobile ? '15px 25px' : '15px 30px',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  border: '2px solid white',
                  width: isMobile ? '80%' : 'auto',
                  textAlign: 'center'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  👤 View Profile
                </Link>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section style={{
            background: isDarkMode ? '#1a1f2e' : 'rgba(255, 255, 255, 0.95)',
            padding: isMobile ? '40px 20px' : isTablet ? '60px 20px' : '80px 20px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h2 style={{
                textAlign: 'center',
                fontSize: isMobile ? '2rem' : isTablet ? '2.2rem' : '2.5rem',
                color: isDarkMode ? '#e8eaed' : '#333',
                marginBottom: '20px'
              }}>
                Why Choose Travel Companion?
              </h2>
              <p style={{
                textAlign: 'center',
                fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                color: isDarkMode ? '#9ca3af' : '#666',
                marginBottom: isMobile ? '40px' : '60px',
                maxWidth: isMobile ? '100%' : '600px',
                margin: `0 auto ${isMobile ? '40px' : '60px'}`,
                lineHeight: '1.5'
              }}>
                Powered by advanced AI to create personalized travel experiences just for you.
              </p>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: isMobile ? '30px' : '40px'
              }}>
                {/* Feature 1 */}
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  borderRadius: '20px',
                  background: isDarkMode ? '#252d3d' : 'white',
                  boxShadow: isDarkMode ? '0 10px 30px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                }}>
                  <div style={{
                    fontSize: '3rem',
                    marginBottom: '20px'
                  }}>🤖</div>
                  <h3 style={{
                    fontSize: '1.5rem',
                    color: isDarkMode ? '#e8eaed' : '#333',
                    marginBottom: '15px'
                  }}>AI-Powered Planning</h3>
                  <p style={{
                    color: isDarkMode ? '#9ca3af' : '#666',
                    lineHeight: '1.6'
                  }}>
                    Our advanced AI analyzes your preferences to create personalized itineraries 
                    that match your travel style and interests perfectly.
                  </p>
                </div>

                {/* Feature 2 */}
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  borderRadius: '20px',
                  background: isDarkMode ? '#252d3d' : 'white',
                  boxShadow: isDarkMode ? '0 10px 30px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                }}>
                  <div style={{
                    fontSize: '3rem',
                    marginBottom: '20px'
                  }}>🎯</div>
                  <h3 style={{
                    fontSize: '1.5rem',
                    color: isDarkMode ? '#e8eaed' : '#333',
                    marginBottom: '15px'
                  }}>Personalized Experiences</h3>
                  <p style={{
                    color: isDarkMode ? '#9ca3af' : '#666',
                    lineHeight: '1.6'
                  }}>
                    Tell us your interests, budget, and travel dates. We&apos;ll craft 
                    unique experiences tailored specifically to your preferences.
                  </p>
                </div>

                {/* Feature 3 */}
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  borderRadius: '20px',
                  background: isDarkMode ? '#252d3d' : 'white',
                  boxShadow: isDarkMode ? '0 10px 30px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                }}>
                  <div style={{
                    fontSize: '3rem',
                    marginBottom: '20px'
                  }}>⚡</div>
                  <h3 style={{
                    fontSize: '1.5rem',
                    color: isDarkMode ? '#e8eaed' : '#333',
                    marginBottom: '15px'
                  }}>Instant Results</h3>
                  <p style={{
                    color: isDarkMode ? '#9ca3af' : '#666',
                    lineHeight: '1.6'
                  }}>
                    Get comprehensive travel plans in seconds, not hours. 
                    Our AI works at lightning speed to deliver amazing itineraries.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Stats */}
          <section style={{
            background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.1)',
            padding: '60px 20px',
            color: 'white'
          }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 style={{
                textAlign: 'center',
                fontSize: '2rem',
                marginBottom: '40px',
                color: isDarkMode ? '#e8eaed' : 'white'
              }}>
                Your Travel Journey
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '30px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>{tripStats.tripsPlanned}</div>
                  <div style={{ opacity: 0.8 }}>Trips Planned</div>
                </div>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>{tripStats.countriesExplored}</div>
                  <div style={{ opacity: 0.8 }}>Countries Explored</div>
                </div>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>${tripStats.totalSpent.toFixed(0)}</div>
                  <div style={{ opacity: 0.8 }}>Total Invested</div>
                </div>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>∞</div>
                  <div style={{ opacity: 0.8 }}>Adventures Ahead</div>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section style={{
            background: isDarkMode ? '#1a1f2e' : 'rgba(255, 255, 255, 0.95)',
            padding: '80px 20px',
            textAlign: 'center'
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{
                fontSize: '2.5rem',
                color: isDarkMode ? '#e8eaed' : '#333',
                marginBottom: '20px'
              }}>
                Ready for Your Next Adventure?
              </h2>
              <p style={{
                fontSize: '1.2rem',
                color: isDarkMode ? '#9ca3af' : '#666',
                marginBottom: '40px'
              }}>
                Let our AI create the perfect itinerary for your dream destination. 
                Your adventure is just one click away!
              </p>
              <Link href="/plantrip" style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '20px 40px',
                borderRadius: '50px',
                textDecoration: 'none',
                fontSize: '1.2rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 5px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
              }}>
                🚀 Start Planning Now
              </Link>
            </div>
          </section>

        </main>
      </div>
    </ProtectedRoute>
  );
}