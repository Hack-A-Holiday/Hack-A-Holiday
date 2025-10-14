import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import Swal from 'sweetalert2';
import { popularDestinations } from '../data/destinations';
import { TravelPreferences, defaultTravelPreferences, preferenceOptions, PreferencesUtils } from '../types/preferences';
import { tripTrackingService, Trip } from '../services/trip-tracking';

function ProfileHeader({ isMobile, isTablet }: Readonly<{ isMobile: boolean; isTablet: boolean }>) {
  return (
    <header>
      <h1>Profile Information</h1>
    </header>
  );
}

function FormField({ label, name, type, value, onChange, disabled }: Readonly<{ label: string; name: string; type: string; value: any; onChange: any; disabled?: boolean }>) {
  return (
    <div style={{ marginBottom: '15px' }}>
      <label>
        {label}:
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px', backgroundColor: disabled ? '#e9ecef' : 'white', cursor: disabled ? 'not-allowed' : 'text' }}
        />
      </label>
    </div>
  );
}

function ProfileForm({ editForm, handleInputChange, disabled, fields }: Readonly<{ editForm: any; handleInputChange: any; disabled: boolean; fields: string[] }>) {
  return (
    <form>
      {fields.includes('name') && (
        <FormField
          label="Name"
          name="name"
          type="text"
          value={editForm.name}
          onChange={handleInputChange}
          disabled={disabled}
        />
      )}
      {fields.includes('email') && (
        <FormField
          label="Email"
          name="email"
          type="email"
          value={editForm.email}
          onChange={handleInputChange}
          disabled={disabled}
        />
      )}
    </form>
  );
}

function TravelPreferencesForm({ 
  preferences, 
  onPreferenceChange, 
  isEditing 
}: { 
  preferences: TravelPreferences; 
  onPreferenceChange: (updates: Partial<TravelPreferences>) => void; 
  isEditing: boolean; 
}) {
  const handleInputChange = (field: keyof TravelPreferences, value: any) => {
    onPreferenceChange({ [field]: value });
  };

  const handleFlightPreferenceChange = (field: string, value: any) => {
    onPreferenceChange({
      flightPreferences: {
        ...preferences.flightPreferences,
        [field]: value
      }
    });
  };

  const handleInterestToggle = (interest: string) => {
    const currentInterests = preferences.interests || [];
    const updatedInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    
    onPreferenceChange({ interests: updatedInterests });
  };

  const handleDestinationToggle = (destination: string) => {
    const currentDestinations = preferences.favoriteDestinations || [];
    const updatedDestinations = currentDestinations.includes(destination)
      ? currentDestinations.filter(d => d !== destination)
      : [...currentDestinations, destination];
    
    onPreferenceChange({ favoriteDestinations: updatedDestinations });
  };

  if (!isEditing) {
    // Display mode
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {/* Basic Travel Info */}
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Travel Style</h4>
            <p style={{ margin: '5px 0', textTransform: 'capitalize' }}><strong>Style:</strong> {preferences.travelStyle}</p>
            <p style={{ margin: '5px 0' }}><strong>Budget:</strong> ${preferences.budget}</p>
            <p style={{ margin: '5px 0' }}><strong>Travelers:</strong> {preferences.travelers}</p>
            <p style={{ margin: '5px 0' }}><strong>Kids:</strong> {preferences.numberOfKids}</p>
          </div>

          {/* Flight Preferences */}
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Flight Preferences</h4>
            <p style={{ margin: '5px 0' }}><strong>Cabin:</strong> {preferences.flightPreferences.cabinClass}</p>
            <p style={{ margin: '5px 0' }}><strong>Time:</strong> {preferences.flightPreferences.timePreference}</p>
            <p style={{ margin: '5px 0' }}><strong>Seat:</strong> {preferences.flightPreferences.seatPreference}</p>
            <p style={{ margin: '5px 0' }}><strong>Direct:</strong> {preferences.flightPreferences.preferDirect ? 'Yes' : 'No'}</p>
          </div>

          {/* Accommodation */}
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Accommodation</h4>
            <p style={{ margin: '5px 0', textTransform: 'capitalize' }}><strong>Type:</strong> {preferences.accommodationType}</p>
            <p style={{ margin: '5px 0', textTransform: 'capitalize' }}><strong>Room:</strong> {preferences.roomPreference}</p>
            <p style={{ margin: '5px 0', textTransform: 'capitalize' }}><strong>Activity Level:</strong> {preferences.activityLevel}</p>
          </div>
        </div>

        {/* Interests */}
        {preferences.interests && preferences.interests.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Interests</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {preferences.interests.map((interest) => (
                <span
                  key={interest}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    textTransform: 'capitalize'
                  }}
                >
                  {interest.replace('-', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Destinations */}
        {preferences.favoriteDestinations && preferences.favoriteDestinations.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Favorite Destinations</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {preferences.favoriteDestinations.map((destination) => (
                <span
                  key={destination}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem'
                  }}
                >
                  {destination}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <form style={{ display: 'grid', gap: '20px' }}>
      {/* Basic Travel Information */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Basic Travel Information</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Budget ($)
            </label>
            <input
              type="number"
              value={preferences.budget}
              onChange={(e) => handleInputChange('budget', parseInt(e.target.value))}
              min="100"
              max="100000"
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Number of Travelers
            </label>
            <input
              type="number"
              value={preferences.travelers}
              onChange={(e) => handleInputChange('travelers', parseInt(e.target.value))}
              min="1"
              max="20"
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Number of Kids
            </label>
            <input
              type="number"
              value={preferences.numberOfKids}
              onChange={(e) => handleInputChange('numberOfKids', parseInt(e.target.value))}
              min="0"
              max="10"
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Travel Style
            </label>
            <select
              value={preferences.travelStyle}
              onChange={(e) => handleInputChange('travelStyle', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            >
              {preferenceOptions.travelStyles.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Flight Preferences */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Flight Preferences</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Cabin Class
            </label>
            <select
              value={preferences.flightPreferences.cabinClass}
              onChange={(e) => handleFlightPreferenceChange('cabinClass', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            >
              {preferenceOptions.cabinClasses.map((cabin) => (
                <option key={cabin.value} value={cabin.value}>
                  {cabin.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Preferred Time
            </label>
            <select
              value={preferences.flightPreferences.timePreference}
              onChange={(e) => handleFlightPreferenceChange('timePreference', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            >
              {preferenceOptions.timePreferences.map((time) => (
                <option key={time.value} value={time.value}>
                  {time.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Seat Preference
            </label>
            <select
              value={preferences.flightPreferences.seatPreference}
              onChange={(e) => handleFlightPreferenceChange('seatPreference', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            >
              {preferenceOptions.seatPreferences.map((seat) => (
                <option key={seat.value} value={seat.value}>
                  {seat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="preferDirect"
              checked={preferences.flightPreferences.preferDirect}
              onChange={(e) => handleFlightPreferenceChange('preferDirect', e.target.checked)}
            />
            <label htmlFor="preferDirect" style={{ fontWeight: '600' }}>
              Prefer Direct Flights
            </label>
          </div>
        </div>
      </div>

      {/* Accommodation Preferences */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Accommodation Preferences</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Accommodation Type
            </label>
            <select
              value={preferences.accommodationType}
              onChange={(e) => handleInputChange('accommodationType', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            >
              {preferenceOptions.accommodationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Room Preference
            </label>
            <select
              value={preferences.roomPreference}
              onChange={(e) => handleInputChange('roomPreference', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            >
              {preferenceOptions.roomPreferences.map((room) => (
                <option key={room.value} value={room.value}>
                  {room.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Activity Level
            </label>
            <select
              value={preferences.activityLevel}
              onChange={(e) => handleInputChange('activityLevel', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
            >
              {preferenceOptions.activityLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Travel Interests</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {preferenceOptions.interests.map((interest) => (
            <label key={interest} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={(preferences.interests || []).includes(interest)}
                onChange={() => handleInterestToggle(interest)}
              />
              <span style={{ textTransform: 'capitalize' }}>{interest.replace('-', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Favorite Destinations */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Favorite Destinations</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {Array.from(new Set(popularDestinations.map(dest => dest.country))).sort().map((country) => (
            <label key={country} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={(preferences.favoriteDestinations || []).includes(country)}
                onChange={() => handleDestinationToggle(country)}
              />
              <span>{country}</span>
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { state } = useAuth();

  // Hooks must run unconditionally at top level
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const isGoogleUser = state.user?.role === 'google';
  
  const [editForm, setEditForm] = useState({
    name: state.user?.name ?? '',
    email: state.user?.email ?? ''
  });

  // Home city state
  const [homeCity, setHomeCity] = useState((state.user as any)?.homeCity || '');
  const [isEditingHomeCity, setIsEditingHomeCity] = useState(false);

  // Initialize travel preferences from user data or defaults
  const [travelPreferences, setTravelPreferences] = useState<TravelPreferences>(() => {
    const userPrefs = state.user?.preferences as any;
    if (userPrefs) {
      return PreferencesUtils.mergePreferences(defaultTravelPreferences, {
        budget: userPrefs.budget || defaultTravelPreferences.budget,
        travelers: userPrefs.travelers || defaultTravelPreferences.travelers,
        travelStyle: userPrefs.travelStyle || defaultTravelPreferences.travelStyle,
        interests: userPrefs.interests || defaultTravelPreferences.interests,
        favoriteDestinations: userPrefs.favouriteDestinations || userPrefs.favoriteDestinations || defaultTravelPreferences.favoriteDestinations,
        numberOfKids: userPrefs.numberOfKids || defaultTravelPreferences.numberOfKids,
        accommodationType: userPrefs.accommodationType || defaultTravelPreferences.accommodationType,
        activityLevel: userPrefs.activityLevel || defaultTravelPreferences.activityLevel,
        flightPreferences: {
          ...defaultTravelPreferences.flightPreferences,
          ...(userPrefs.flightPreferences || {})
        }
      });
    }
    return defaultTravelPreferences;
  });

  // Load user trips
  useEffect(() => {
    if (state.user) {
      const userId = localStorage.getItem('userId') || state.user.email || 'guest';
      const trips = tripTrackingService.getTrips(userId);
      setUserTrips(trips);

      // Listen for trip updates
      const handleTripUpdate = () => {
        const updatedTrips = tripTrackingService.getTrips(userId);
        setUserTrips(updatedTrips);
      };

      // Listen for when user returns to the tab
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // User returned to the tab, refresh trips
          const updatedTrips = tripTrackingService.getTrips(userId);
          setUserTrips(updatedTrips);
        }
      };

      window.addEventListener('tripUpdated', handleTripUpdate);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('tripUpdated', handleTripUpdate);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [state.user]);

  if (!state.user) {
    return <div>User not authenticated</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as any;
    // Prevent Google user from editing name/email
    if (isGoogleUser && (name === 'name' || name === 'email')) return;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (updates: Partial<TravelPreferences>) => {
    setTravelPreferences(prev => PreferencesUtils.mergePreferences(prev, updates));
  };

  const handleSaveHomeCity = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_URL}/user/profile/home-city`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ homeCity: homeCity.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to save home city');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Home City Saved!',
        text: `Your home city has been set to ${homeCity}. The AI will use this as your default origin for flight searches.`,
        timer: 3000,
        showConfirmButton: false
      });

      setIsEditingHomeCity(false);
    } catch (error) {
      console.error('Error saving home city:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Failed to save home city. Please try again.',
      });
    }
  };

  const handleSavePreferences = async () => {
    try {
      // Validate preferences
      const errors = PreferencesUtils.validatePreferences(travelPreferences);
      if (errors.length > 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          html: errors.map(error => `• ${error}`).join('<br>'),
        });
        return;
      }

      // Here you would typically save to your backend
      // For now, we'll just show a success message
      await Swal.fire({
        icon: 'success',
        title: 'Preferences Saved!',
        text: 'Your travel preferences have been updated successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      setIsEditingPreferences(false);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Failed to save preferences. Please try again.',
      });
    }
  };

  const handleDeleteAccount = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Deleted', 'Account deleted successfully!', 'success');
      }
    });
  };

  const isPreferencesComplete = PreferencesUtils.isComplete(travelPreferences);
  const missingFields = PreferencesUtils.getMissingFields(travelPreferences);

  return (
    <>
      <Head>
        <title>Profile - Hack-A-Holiday</title>
        <meta name="description" content="Manage your profile and travel preferences" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        <main style={{ padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* Profile Information */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '25px',
              }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>Profile Information</h2>
                {!isGoogleUser && (
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    style={{
                      background: isEditingProfile ? '#6c757d' : '#667eea',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                    }}
                  >
                    {isEditingProfile ? 'Cancel' : 'Edit Profile Info'}
                  </button>
                )}
              </div>

              {isGoogleUser && (
                <div style={{
                  background: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                  <span style={{ color: '#1976d2', fontSize: '0.9rem' }}>
                    Google account details cannot be edited. Your name and email are managed by Google.
                  </span>
                </div>
              )}

              {!isEditingProfile ? (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Full Name
                    </span>
                    <div style={{
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      color: '#333',
                      fontSize: '1rem'
                    }}>
                      {state.user?.name || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <span style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Email Address
                    </span>
                    <div style={{
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      color: '#333',
                      fontSize: '1rem',
                      wordBreak: 'break-word'
                    }}>
                      {state.user?.email}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <ProfileForm
                    editForm={editForm}
                    handleInputChange={handleInputChange}
                    disabled={isGoogleUser}
                    fields={['name', 'email']}
                  />
                  {!isGoogleUser && (
                    <div style={{ marginTop: '20px' }}>
                      <button
                        style={{
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '12px 25px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          marginRight: '10px'
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Home City */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '25px',
              }}>
                <div>
                  <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>🏠 Home City</h2>
                  <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                    Set your default origin city for flight searches
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingHomeCity(!isEditingHomeCity)}
                  style={{
                    background: isEditingHomeCity ? '#6c757d' : '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  {isEditingHomeCity ? 'Cancel' : 'Edit Home City'}
                </button>
              </div>

              {!isEditingHomeCity ? (
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '15px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                    Your Home City
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                    {homeCity || 'Not set'}
                  </div>
                  {homeCity && (
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '10px' }}>
                      ✅ AI will use {homeCity} as your default origin when you search for flights
                    </div>
                  )}
                  {!homeCity && (
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '10px' }}>
                      ℹ️ Click "Edit Home City" to set your default origin city
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ background: '#e3f2fd', borderRadius: '10px', padding: '15px', marginBottom: '20px' }}>
                    <p style={{ margin: 0, color: '#1976d2', fontSize: '0.9rem' }}>
                      💡 <strong>Tip:</strong> Once you set your home city, the AI will remember it and use it as your default origin for flight searches. Just say "find flights to Paris" and the AI will know you're flying from {homeCity || 'your home city'}!
                    </p>
                  </div>
                  
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#333' }}>
                    Enter your home city
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Mumbai, New York, London"
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #667eea',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#764ba2'}
                    onBlur={(e) => e.target.style.borderColor = '#667eea'}
                  />
                  
                  <button
                    onClick={handleSaveHomeCity}
                    disabled={!homeCity.trim()}
                    style={{
                      background: homeCity.trim() ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '12px 25px',
                      borderRadius: '10px',
                      cursor: homeCity.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      marginTop: '15px',
                      width: '100%'
                    }}
                  >
                    Save Home City
                  </button>
                </div>
              )}
            </div>

            {/* Travel Preferences */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '25px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>Travel Preferences</h2>
                  {!isPreferencesComplete && (
                    <p style={{ margin: '5px 0 0 0', color: '#dc3545', fontSize: '0.85rem' }}>
                      ⚠️ Complete your preferences for better recommendations
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {!isPreferencesComplete && (
                    <span style={{
                      background: '#ffc107',
                      color: '#212529',
                      padding: '4px 8px',
                      borderRadius: '15px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {missingFields.length} missing
                    </span>
                  )}
                  <button
                    onClick={() => setIsEditingPreferences(!isEditingPreferences)}
                    style={{
                      background: isEditingPreferences ? '#6c757d' : '#667eea',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                    }}
                  >
                    {isEditingPreferences ? 'Cancel' : 'Edit Preferences'}
                  </button>
                  {isEditingPreferences && (
                    <button
                      onClick={handleSavePreferences}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                      }}
                    >
                      Save Preferences
                    </button>
                  )}
                </div>
              </div>

              <TravelPreferencesForm
                preferences={travelPreferences}
                onPreferenceChange={handlePreferenceChange}
                isEditing={isEditingPreferences}
              />
            </div>

            {/* Upcoming Trips */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                margin: '0 0 25px',
                color: '#333',
                fontSize: '1.5rem'
              }}>✈️ Your Trips ({userTrips.length})</h2>
              {userTrips.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  No trips planned yet. Start exploring and book your first trip!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {userTrips.map((trip) => (
                    <div
                      key={trip.id}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '15px',
                        padding: '20px',
                        color: 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' }}>
                            {trip.type === 'flight' && '✈️'}
                            {trip.type === 'package' && '🎫'}
                            {trip.type === 'hotel' && '🏨'}
                            {trip.type === 'vacation' && '🎁'}
                            {' '}
                            {trip.origin} → {trip.destination}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                            📅 {trip.departureDate}
                            {trip.returnDate && ` - ${trip.returnDate}`}
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          padding: '5px 15px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          {trip.status.toUpperCase()}
                        </div>
                      </div>
                      {trip.details.totalPrice && (
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '10px' }}>
                          💰 ${trip.details.totalPrice.toFixed(2)}
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '10px' }}>
                        Created: {new Date(trip.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: '2px solid #ffeaa7'
            }}>
              <h2 style={{
                margin: '0 0 15px',
                color: '#e17055',
                fontSize: '1.5rem'
              }}>⚠️ Danger Zone</h2>
              <p style={{
                color: '#666',
                marginBottom: '20px',
                fontSize: '1rem'
              }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={handleDeleteAccount}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  width: '100%'
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}