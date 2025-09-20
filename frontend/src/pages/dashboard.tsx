import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import InteractiveGlobe from '../components/InteractiveGlobe';
import { Destination } from '../data/destinations';

interface TripPreferences {
  destination: string;
  destinationData?: Destination;
  budget: number;
  duration: number;
  interests: string[];
  startDate: string;
  travelers: number;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: any;
  requestId: string;
  timestamp: string;
}

export default function Dashboard() {
  const { state, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 640);
      setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const [preferences, setPreferences] = useState<TripPreferences>({
    destination: '',
    destinationData: undefined,
    budget: 2000,
    duration: 5,
    interests: ['culture', 'food'],
    startDate: '2024-06-01',
    travelers: 2,
    travelStyle: 'mid-range',
  });

  const [loading, setLoading] = useState(false);
  const [globeSearchQuery, setGlobeSearchQuery] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableInterests = [
    'culture', 'history', 'museums', 'art', 'architecture',
    'food', 'nightlife', 'shopping', 'nature', 'hiking',
    'beaches', 'adventure', 'sports', 'photography',
    'music', 'festivals', 'local-experiences', 'wellness'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate destination selection
    if (!preferences.destinationData) {
      setError('Please select a destination from the globe');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if user is logged in
      if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
      }

      const response = await fetch(`${apiUrl}/plan-trip`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ preferences }),
      });

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error?.message || 'Failed to create trip plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleDestinationSelect = (destination: Destination) => {
    setPreferences(prev => ({
      ...prev,
      destination: `${destination.name}, ${destination.country}`,
      destinationData: destination
    }));
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>Plan Trip - Travel Companion</title>
        <meta name="description" content="AI-powered travel planning" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        
        <main style={{ 
          padding: isMobile ? '20px 15px' : isTablet ? '30px 20px' : '40px 20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: isMobile ? '30px' : '40px', color: 'white' }}>
            <h1 style={{ 
              fontSize: isMobile ? '2.2rem' : isTablet ? '2.6rem' : '3rem', 
              marginBottom: '10px',
              lineHeight: '1.2'
            }}>
              🤖 Autonomous Travel Companion
            </h1>
            <p style={{ 
              fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem', 
              opacity: 0.9,
              lineHeight: '1.4'
            }}>
              AI-powered trip planning with AWS Bedrock
            </p>
          </div>

          {/* Trip Planning Form */}
          <div style={{ 
            background: 'white', 
            borderRadius: '15px', 
            padding: isMobile ? '25px' : isTablet ? '35px' : '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <form onSubmit={handleSubmit}>
              {/* Interactive Globe for Destination Selection */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '15px',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '10px' : '0'
                }}>
                  <h3 style={{ 
                    margin: '0 0 10px 0', 
                    fontSize: isMobile ? '1.3rem' : '1.6rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    🌍 Choose Your Destination
                  </h3>
                  
                  <p style={{ 
                    margin: '0 0 15px 0', 
                    color: '#666', 
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}>
                    Explore the world and select your perfect travel destination
                  </p>
                  
                  {/* Search bar for globe */}
                  <input
                    type="text"
                    value={globeSearchQuery}
                    onChange={(e) => setGlobeSearchQuery(e.target.value)}
                    placeholder="🔍 Search destinations..."
                    style={{
                      padding: '12px 20px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '25px',
                      fontSize: '14px',
                      width: '100%',
                      outline: 'none',
                      marginBottom: '20px',
                      transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
                
                {/* Selected destination display */}
                {preferences.destinationData && (
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    marginBottom: '25px',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '1.2rem',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>📍</span>
                      <span>{preferences.destinationData.name}, {preferences.destinationData.country}</span>
                    </div>
                    <div style={{ opacity: 0.9, fontSize: '0.95rem', marginBottom: '12px' }}>
                      {preferences.destinationData.description}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      marginTop: '12px',
                      fontSize: '0.9rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '6px 12px', 
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>💰</span>
                        <span>{preferences.destinationData.averageCost}</span>
                      </div>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '6px 12px', 
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>🏷️</span>
                        <span style={{ textTransform: 'capitalize' }}>{preferences.destinationData.category}</span>
                      </div>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '6px 12px', 
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>📅</span>
                        <span>Best: {preferences.destinationData.bestMonths.slice(0, 2).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Interactive Globe */}
                <InteractiveGlobe
                  onDestinationSelect={handleDestinationSelect}
                  selectedDestination={preferences.destinationData}
                  searchQuery={globeSearchQuery}
                />
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr', 
                gap: isMobile ? '15px' : '20px', 
                marginBottom: '25px' 
              }}>
                <div>
                  <label htmlFor="budget" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Budget ($)
                  </label>
                  <input
                    id="budget"
                    type="number"
                    value={preferences.budget}
                    onChange={(e) => setPreferences(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    min="100"
                    max="100000"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="duration" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Duration (days)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    value={preferences.duration}
                    onChange={(e) => setPreferences(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    min="1"
                    max="30"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Travelers
                  </label>
                  <input
                    type="number"
                    value={preferences.travelers}
                    onChange={(e) => setPreferences(prev => ({ ...prev, travelers: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    min="1"
                    max="20"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={preferences.startDate}
                    onChange={(e) => setPreferences(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Travel Style
                  </label>
                  <select
                    value={preferences.travelStyle}
                    onChange={(e) => setPreferences(prev => ({ ...prev, travelStyle: e.target.value as any }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="budget">Budget</option>
                    <option value="mid-range">Mid-range</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '15px', fontWeight: '600' }}>
                  Interests (select multiple)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {availableInterests.map((interest) => (
                    <label key={interest} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={preferences.interests.includes(interest)}
                        onChange={() => handleInterestToggle(interest)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>
                        {interest.replace('-', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || preferences.interests.length === 0}
                style={{
                  width: '100%',
                  background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '18px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '🤖 Planning your trip...' : '✈️ Plan My Trip'}
              </button>
            </form>

            {error && (
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: '#f8d7da', 
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                color: '#721c24'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && (
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                background: '#d4edda', 
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                color: '#155724'
              }}>
                <h3 style={{ marginBottom: '15px' }}>🎉 Trip Plan Created Successfully!</h3>
                <p><strong>Trip ID:</strong> {result.data.tripId}</p>
                <p><strong>Destination:</strong> {result.data.itinerary.destination}</p>
                <p><strong>Status:</strong> {result.data.itinerary.status}</p>
                <p><strong>Message:</strong> {result.data.message}</p>
                {result.data.s3Url && (
                  <p>
                    <strong>Itinerary:</strong>{' '}
                    <a 
                      href={result.data.s3Url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#0066cc', textDecoration: 'underline' }}
                    >
                      View Details
                    </a>
                  </p>
                )}
              </div>
            )}

            <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '15px' }}>⚙️ Configuration</h3>
              <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not configured'}</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                To configure the API URL, create a <code>.env.local</code> file with:<br/>
                <code>NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev</code>
              </p>
            </div>
          </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}