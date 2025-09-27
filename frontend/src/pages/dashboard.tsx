import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import { Destination } from '../data/destinations';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import FlightSearch from '../components/FlightSearch';

// Dynamic import for InteractiveGlobe to avoid SSR issues
const InteractiveGlobe = dynamic(() => import('../components/InteractiveGlobe'), {
  ssr: false,
  loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading globe...</div>
});

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
  tripId?: string;
  itinerary?: any;
  message?: string;
  error?: any;
  requestId?: string;
  timestamp?: string;
}

export default function Dashboard() {
  const { state } = useAuth();
  const router = useRouter();
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
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreferencesForm, setShowPreferencesForm] = useState(false);

  // Removed unused showPlanExpanded
  // Removed unused isEditingPreferences
  const [showFlightSearch, setShowFlightSearch] = useState(false);

  // Helper functions for responsive styling
  const getContainerPadding = () => {
    if (isMobile) return '20px 15px';
    if (isTablet) return '30px 20px';
    return '40px 20px';
  };

  const getTitleFontSize = () => {
    if (isMobile) return '2.2rem';
    if (isTablet) return '2.6rem';
    return '3rem';
  };

  const getSubtitleFontSize = () => {
    if (isMobile) return '1rem';
    if (isTablet) return '1.1rem';
    return '1.2rem';
  };

  const getContentPadding = () => {
    if (isMobile) return '25px';
    if (isTablet) return '35px';
    return '40px';
  };

  const getGridColumns = () => {
    if (isMobile) return '1fr';
    return '1fr 1fr';
  };

  const availableInterests = [
    'culture', 'history', 'museums', 'art', 'architecture',
    'food', 'nightlife', 'shopping', 'nature', 'hiking',
    'beaches', 'adventure', 'sports', 'photography',
    'music', 'festivals', 'local-experiences', 'wellness'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
      }

      // Include existing user preferences in the request body
      const requestBody = {
        preferences: {
          ...preferences,
          existingUserPreferences: state?.user?.preferences || {},
        },
      };

      const response = await fetch(`${apiUrl}/plan-trip`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      const data: ApiResponse = await response.json();
      if (data.success) {
        setResult(data);
        // Redirect to AI Travel Agent interface after successful plan
        setTimeout(() => {
          router.push('/ai-travel-agent');
        }, 1000);
      } else {
        setError(data.error?.message || 'Failed to create trip plan');
      }
    } catch (err) {
      console.error('Error planning trip:', err);
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
    // Clear previous itinerary result when destination changes
    setResult(null);
    setError(null);
  };

  const handlePlanClick = () => {
    if (!preferences.destinationData) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select a destination from the globe.',
      });
      return;
    }

    if (!preferences.duration || preferences.duration < 1) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please enter a valid duration (at least 1 day).',
      });
      return;
    }

    if (!preferences.startDate) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select a start date.',
      });
      return;
    }

    if (state?.user?.preferences) {
      Swal.fire({
        title: 'Edit Preferences?',
        text: 'You have existing preferences saved. Would you like to edit them for this trip?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, edit preferences',
        cancelButtonText: 'No, use existing preferences',
      }).then((result) => {
        if (result.isConfirmed) {
          setShowPreferencesForm(true);
        } else {
          triggerApiCall(preferences);
        }
      });
    } else {
      setShowPreferencesForm(true);
    }
  };

  const triggerApiCall = async (preferences: TripPreferences) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
      }

      const requestBody = {
        preferences: {
          ...preferences,
          existingUserPreferences: state?.user?.preferences || {},
        },
      };

      console.log('Sending request to API:', apiUrl);
      console.log('Request payload:', requestBody);

      const response = await fetch(`${apiUrl}/plan-trip`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setResult(data);
        setTimeout(() => {
          router.push('/ai-travel-agent');
        }, 1000);
      } else {
        throw new Error(data.error?.message || 'Failed to create trip plan');
      }
    } catch (err) {
      console.error('Error planning trip:', err);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Update preferences with user preferences from profile
  useEffect(() => {
    if (state?.user?.preferences) {
      const userPrefs = state.user.preferences;
      setPreferences((prev) => ({
        ...prev,
        budget: userPrefs.budget || prev.budget,
        interests: userPrefs.interests || prev.interests,
        travelers: userPrefs.numberOfKids || prev.travelers,
        travelStyle: userPrefs.travelStyle || prev.travelStyle,
      }));
    }
  }, [state?.user?.preferences]);

  // Set default start date to current date
  useEffect(() => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    setPreferences((prev) => ({
      ...prev,
      startDate: currentDate,
    }));
  }, []);

  // Fix type mismatch for travelStyle
  const handleTravelStyleChange = (value: 'budget' | 'mid-range' | 'luxury') => {
    setPreferences((prev) => ({ ...prev, travelStyle: value }));
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>Plan Trip - HackTravel</title>
        <meta name="description" content="AI-powered travel planning with Claude 4" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        
        <main style={{ 
          padding: getContainerPadding(),
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: isMobile ? '30px' : '40px', color: 'white' }}>
            <h1 style={{ 
              fontSize: getTitleFontSize(), 
              marginBottom: '10px',
              lineHeight: '1.2'
            }}>
              🌍 HackTravel
            </h1>
            <p style={{ 
              fontSize: getSubtitleFontSize(), 
              opacity: 0.9,
              lineHeight: '1.4'
            }}>
              AI-powered trip planning with Claude 4
            </p>
          </div>

          {/* Trip Planning Form */}
          <div style={{ 
            background: 'white', 
            borderRadius: '15px', 
            padding: getContentPadding(),
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
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

              {/* Trip Planning Form */}
              <form onSubmit={e => e.preventDefault()} style={{ marginTop: '30px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(), gap: isMobile ? '15px' : '20px', marginBottom: '25px' }}>
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
                    <label htmlFor="start-date-input" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Start Date
                    </label>
                    <input
                      id="start-date-input"
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
                </div>

                <button
                  type="button"
                  onClick={handlePlanClick}
                  style={{
                    width: '100%',
                    background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    fontSize: '18px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? '🤖 Creating your adventure...' : '🌟 Plan My Adventure'}
                </button>
              </form>

              {showPreferencesForm && (
                <div style={{
                  background: 'white',
                  borderRadius: '15px',
                  padding: '20px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  marginTop: '20px',
                }}>
                  <h3 style={{
                    marginBottom: '15px',
                    fontSize: '1.6rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    Provide Trip Details
                  </h3>
                  <form id="trip-details-form" style={{ display: 'grid', gap: '15px' }}>
                    <label>
                      Budget ($):
                      <input
                        type="number"
                        value={preferences.budget}
                        onChange={(e) => setPreferences((prev) => ({ ...prev, budget: parseInt(e.target.value) }))}
                        min="100"
                        max="100000"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e1e5e9',
                          borderRadius: '8px',
                        }}
                      />
                    </label>
                    <label>
                      Travelers:
                      <input
                        type="number"
                        value={preferences.travelers}
                        onChange={(e) => setPreferences((prev) => ({ ...prev, travelers: parseInt(e.target.value) }))}
                        min="1"
                        max="20"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e1e5e9',
                          borderRadius: '8px',
                        }}
                      />
                    </label>
                    <label>
                      Travel Style:
                      <select
                        value={preferences.travelStyle}
                        onChange={(e) => handleTravelStyleChange(e.target.value as 'budget' | 'mid-range' | 'luxury')}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e1e5e9',
                          borderRadius: '8px',
                        }}
                      >
                        <option value="budget">Budget</option>
                        <option value="mid-range">Mid-range</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </label>
                    <label>
                      Interests:
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {availableInterests.map((interest) => (
                          <label key={interest} style={{ marginRight: '10px' }}>
                            <input
                              type="checkbox"
                              value={interest}
                              checked={preferences.interests.includes(interest)}
                              onChange={(e) => handleInterestToggle(e.target.value)}
                            />
                            {interest.replace('-', ' ')}
                          </label>
                        ))}
                      </div>
                    </label>
                    <label>
                      Duration (days):
                      <input
                        type="number"
                        value={preferences.duration}
                        onChange={(e) => setPreferences((prev) => ({ ...prev, duration: parseInt(e.target.value) }))}
                        min="1"
                        max="30"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e1e5e9',
                          borderRadius: '8px',
                        }}
                      />
                    </label>
                    <label>
                      Start Date:
                      <input
                        type="date"
                        value={preferences.startDate}
                        onChange={(e) => setPreferences((prev) => ({ ...prev, startDate: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e1e5e9',
                          borderRadius: '8px',
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => triggerApiCall(preferences)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '15px 30px',
                        fontSize: '18px',
                        fontWeight: '600',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      Submit
                    </button>
                  </form>
                </div>
              )}
          </div>

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
                padding: '25px', 
                background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)', 
                border: '2px solid #28a745',
                borderRadius: '15px',
                color: '#155724',
                boxShadow: '0 8px 24px rgba(40, 167, 69, 0.15)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h3 style={{ 
                    marginBottom: '10px', 
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}>
                    🎉 Your HackTravel Adventure is Ready!
                  </h3>
                  <p style={{ fontSize: '16px', margin: '0', opacity: 0.8 }}>
                    Powered by Claude 4 AI
                  </p>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                  gap: '15px',
                  marginBottom: '20px' 
                }}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.7)', 
                    padding: '15px', 
                    borderRadius: '10px' 
                  }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>🎯 Destination:</strong> {result.itinerary.destination}
                    </p>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>📅 Duration:</strong> {result.itinerary.duration || preferences.duration} days
                    </p>
                    <p style={{ margin: '0' }}>
                      <strong>💰 Total Cost:</strong> ${result.itinerary.totalCost}
                    </p>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(255,255,255,0.7)', 
                    padding: '15px', 
                    borderRadius: '10px' 
                  }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>✈️ Flights:</strong> {result.itinerary?.realTimeData?.flightsFound || 0} found
                    </p>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>🏨 Hotels:</strong> {result.itinerary?.realTimeData?.hotelsFound || 0} found
                    </p>
                    <p style={{ margin: '0' }}>
                      <strong>🎪 Activities:</strong> {result.itinerary?.realTimeData?.activitiesFound || 0} planned
                    </p>
                  </div>
                </div>

                {/* Flight Search Button */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <button
                    onClick={() => setShowFlightSearch(!showFlightSearch)}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    🔍 {showFlightSearch ? 'Hide' : 'Search'} Flight Options
                  </button>
                </div>

                {/* Flight Search Component */}
                {showFlightSearch && (
                  <div style={{ marginBottom: '30px' }}>
                    <FlightSearch
                      initialSearch={{
                        origin: 'JFK', // Default origin
                        destination: result.itinerary.destination,
                        departureDate: preferences.startDate,
                        passengers: { adults: preferences.travelers }
                      }}
                      onFlightSelect={(flight) => {
                        console.log('Selected flight:', flight);
                        // You can add logic here to integrate the selected flight with the trip
                      }}
                    />
                  </div>
                )}

                {/* Trip Overview */}
                {result.itinerary?.overview && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.8)', 
                    padding: '20px', 
                    borderRadius: '15px',
                    marginBottom: '20px',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>🌟 Trip Overview</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <p style={{ margin: '5px 0' }}><strong>🌍 Destination:</strong> {result.itinerary.overview.destination}</p>
                      <p style={{ margin: '5px 0' }}><strong>📅 Best Time:</strong> {result.itinerary.overview.bestTimeToVisit}</p>
                      <p style={{ margin: '5px 0' }}><strong>💱 Currency:</strong> {result.itinerary.overview.currency}</p>
                      <p style={{ margin: '5px 0' }}><strong>🗣️ Language:</strong> {result.itinerary.overview.language}</p>
                    </div>
                    {result.itinerary.overview.topHighlights && (
                      <div style={{ marginTop: '15px' }}>
                        <strong>⭐ Top Highlights:</strong>
                        <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                          {result.itinerary.overview.topHighlights.map((highlight: string, index: number) => (
                            <li key={highlight} style={{ marginBottom: '5px' }}>{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Daily Itinerary */}
                {result?.itinerary?.dailyPlans && result.itinerary.dailyPlans.length > 0 && (
                  result.itinerary.dailyPlans.map((day: any, index: number) => (
                    <div key={day.day || day.date || index} style={{ 
                      background: 'rgba(255,255,255,0.9)', 
                      padding: '20px', 
                      borderRadius: '15px',
                      marginBottom: '15px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#4a5568', fontSize: '18px' }}>
                          Day {day.day} - {day.theme}
                        </h4>
                        <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>{day.date}</p>
                      </div>

                      {/* Activities for each time of day */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                        {/* Morning */}
                        <div style={{ background: '#fff5e1', padding: '15px', borderRadius: '10px', border: '1px solid #fbd38d' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: '#c05621' }}>🌅 Morning</h5>
                          {day.activities.morning.map((activity: any, idx: number) => (
                            <div key={'morning-' + idx + '-' + activity.name} style={{ marginBottom: '8px', fontSize: '14px' }}>
                              <strong>{activity.name}</strong>
                              <p style={{ margin: '2px 0', color: '#666', fontSize: '12px' }}>{activity.description}</p>
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>Duration: {activity.duration}</span>
                            </div>
                          ))}
                        </div>

                        {/* Afternoon */}
                        <div style={{ background: '#e6fffa', padding: '15px', borderRadius: '10px', border: '1px solid #81e6d9' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: '#2c7a7b' }}>☀️ Afternoon</h5>
                          {day.activities.afternoon.map((activity: any, idx: number) => (
                            <div key={'afternoon-' + idx + '-' + activity.name} style={{ marginBottom: '8px', fontSize: '14px' }}>
                              <strong>{activity.name}</strong>
                              <p style={{ margin: '2px 0', color: '#666', fontSize: '12px' }}>{activity.description}</p>
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>Duration: {activity.duration}</span>
                            </div>
                          ))}
                        </div>

                        {/* Evening */}
                        <div style={{ background: '#edf2f7', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e0' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: '#4a5568' }}>🌆 Evening</h5>
                          {day.activities.evening.map((activity: any, idx: number) => (
                            <div key={'evening-' + idx + '-' + activity.name} style={{ marginBottom: '8px', fontSize: '14px' }}>
                              <strong>{activity.name}</strong>
                              <p style={{ margin: '2px 0', color: '#666', fontSize: '12px' }}>{activity.description}</p>
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>Duration: {activity.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Meals */}
                      <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>🍽️ Recommended Meals</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                          <div>
                            <strong>🥐 Breakfast:</strong> {day.meals.breakfast.name}
                            <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>{day.meals.breakfast.description}</p>
                          </div>
                          <div>
                            <strong>🥙 Lunch:</strong> {day.meals.lunch.name}
                            <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>{day.meals.lunch.description}</p>
                          </div>
                          <div>
                            <strong>🍽️ Dinner:</strong> {day.meals.dinner.name}
                            <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>{day.meals.dinner.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Transportation and Cost */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '15px', fontSize: '14px' }}>
                        <div>
                          <strong>🚌 Transportation:</strong> {day.transportation}
                        </div>
                        <div>
                          <strong>💰 Daily Budget:</strong> ${day.totalCost}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Travel Tips */}
                {result.itinerary?.travelTips && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.8)', 
                    padding: '20px', 
                    borderRadius: '15px',
                    marginBottom: '20px',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>💡 Travel Tips</h3>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {result.itinerary.travelTips.map((tip: string, index: number) => (
                        <li key={tip} style={{ marginBottom: '8px', fontSize: '14px' }}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Emergency Info */}
                {result.itinerary?.emergencyInfo && (
                  <div style={{ 
                    background: 'rgba(254, 215, 215, 0.8)', 
                    padding: '20px', 
                    borderRadius: '15px',
                    marginBottom: '20px',
                    border: '1px solid #feb2b2'
                  }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#c53030', fontSize: '18px' }}>🚨 Emergency Information</h3>
                    <div style={{ fontSize: '14px' }}>
                      <p style={{ margin: '5px 0' }}><strong>Emergency Numbers:</strong> {
                        typeof result.itinerary.emergencyInfo.emergency === 'object'
                          ? Object.entries(result.itinerary.emergencyInfo.emergency).map(([key, value]) => (
                              <span key={key} style={{ display: 'block', marginLeft: '10px' }}>
                                <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {String(value)}
                              </span>
                            ))
                          : result.itinerary.emergencyInfo.emergency
                      }</p>
                      <p style={{ margin: '5px 0' }}><strong>Embassy Contact:</strong> {result.itinerary.emergencyInfo.embassy}</p>
                      <p style={{ margin: '5px 0' }}><strong>Hospital:</strong> {result.itinerary.emergencyInfo.hospitalContact}</p>
                    </div>
                  </div>
                )}

                <div style={{ 
                  textAlign: 'center',
                  padding: '15px',
                  background: 'rgba(255,255,255,0.5)',
                  borderRadius: '10px',
                  marginBottom: '15px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                    <strong>📋 Trip ID:</strong> <code>{result.tripId}</code>
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', fontStyle: 'italic' }}>
                    {result.message}
                  </p>
                </div>

                {result.itinerary?.s3Url && (
                  <div style={{ textAlign: 'center' }}>
                    <a 
                      href={result.itinerary.s3Url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '25px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '16px',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      onFocus={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onBlur={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      📄 View Complete Itinerary
                    </a>
                  </div>
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