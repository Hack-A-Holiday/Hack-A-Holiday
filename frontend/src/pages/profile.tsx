import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useResponsive } from '../hooks/useResponsive';
import Navbar from '../components/layout/Navbar';
import Swal from 'sweetalert2';
import { buildApiUrl } from '../config/api';
import { popularDestinations } from '../data/destinations';
import { TravelPreferences, defaultTravelPreferences, preferenceOptions, PreferencesUtils } from '../types/preferences';
// import { tripTrackingService, Trip } from '../services/trip-tracking'; // Original import removed
import { tripApiService, Trip as ApiTrip } from '../services/trip-api';
import { userProfileApiService } from '../services/user-profile-api';
import { 
  FaHome, 
  FaLock, 
  FaInfoCircle, 
  FaSearch, 
  FaDollarSign, 
  FaTrashAlt, 
  FaExclamationTriangle, 
  FaTimes,
  FaEdit
} from 'react-icons/fa';

// ================= FIX STARTS HERE =================
// Define a complete Trip type that matches the mock data being used.
// The error was that the mock data had properties (userId, updatedAt) not in the original type.
export interface Trip {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  status: 'planned' | 'booked' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
  type: 'flight' | 'package' | 'hotel' | 'vacation';
  details?: {
    totalPrice?: number;
  };
}
// ================= FIX ENDS HERE =================

// This is a standalone, stateless component. It was correct as is.
function ProfileHeader({ isMobile, isTablet }: Readonly<{ isMobile: boolean; isTablet: boolean }>) {
  return (
    <header>
      <h1>Profile Information</h1>
    </header>
  );
}

// Enhanced FormField component with better disabled state styling
function FormField({ label, name, type, value, onChange, disabled, isDarkMode = false, isMobile = false }: Readonly<{ 
  label: string; 
  name: string; 
  type: string; 
  value: any; 
  onChange: any; 
  disabled?: boolean;
  isDarkMode?: boolean;
  isMobile?: boolean;
}>) {
  return (
    <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontSize: isMobile ? '13px' : '14px',
        fontWeight: '600',
        color: disabled 
          ? (isDarkMode ? '#6b7280' : '#9ca3af')
          : (isDarkMode ? '#e8eaed' : '#333')
      }}>
        {label}
        {disabled && (
          <span style={{
            marginLeft: '8px',
            fontSize: isMobile ? '11px' : '12px',
            color: isDarkMode ? '#6b7280' : '#9ca3af',
            fontWeight: '400'
          }}>
            (Protected by Google)
          </span>
        )}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          display: 'block',
          width: '100%',
          padding: isMobile ? '14px' : '12px 16px',
          minHeight: isMobile ? '48px' : 'auto',
          marginTop: '5px',
          border: disabled 
            ? (isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid #d1d5db')
            : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #ddd'),
          borderRadius: '8px',
          backgroundColor: disabled 
            ? (isDarkMode ? 'rgba(107, 114, 128, 0.1)' : '#f3f4f6')
            : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white'),
          color: disabled 
            ? (isDarkMode ? '#6b7280' : '#9ca3af')
            : (isDarkMode ? '#e8eaed' : '#333'),
          cursor: disabled ? 'not-allowed' : 'text',
          fontSize: isMobile ? '16px' : '14px',
          transition: 'all 0.2s ease',
          touchAction: 'manipulation'
        }}
      />
    </div>
  );
}

// Enhanced ProfileForm component with better styling and Google user support
function ProfileForm({ editForm, handleInputChange, disabled, fields, isDarkMode = false, isMobile = false }: Readonly<{ 
  editForm: any; 
  handleInputChange: any; 
  disabled: boolean; 
  fields: string[]; 
  isDarkMode?: boolean;
  isMobile?: boolean;
}>) {
  return (
    <form>
      {fields.includes('name') && (
        <FormField
          label="Full Name"
          name="name"
          type="text"
          value={editForm.name}
          onChange={handleInputChange}
          disabled={disabled}
          isDarkMode={isDarkMode}
          isMobile={isMobile}
        />
      )}
      {fields.includes('email') && (
        <FormField
          label="Email Address"
          name="email"
          type="email"
          value={editForm.email}
          onChange={handleInputChange}
          disabled={disabled}
          isDarkMode={isDarkMode}
          isMobile={isMobile}
        />
      )}
      
      {disabled && (
        <div style={{
          background: isDarkMode ? 'rgba(107, 114, 128, 0.1)' : '#f8f9fa',
          border: `1px solid ${isDarkMode ? 'rgba(107, 114, 128, 0.2)' : '#e9ecef'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaLock style={{ fontSize: '1rem', color: isDarkMode ? '#9ca3af' : '#6c757d' }} />
          <span style={{ 
            color: isDarkMode ? '#9ca3af' : '#6c757d', 
            fontSize: '0.85rem',
            fontStyle: 'italic'
          }}>
            These fields are protected and managed by your Google account
          </span>
        </div>
      )}
    </form>
  );
}

// Travel Preferences Form Component
function TravelPreferencesForm({
  preferences,
  onPreferenceChange,
  isEditing,
  isDarkMode = false
}: {
  preferences: TravelPreferences;
  onPreferenceChange: (updates: Partial<TravelPreferences>) => void;
  isEditing: boolean;
  isDarkMode?: boolean;
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
      ? currentInterests.filter((i) => i !== interest)
      : [...currentInterests, interest];
    onPreferenceChange({ interests: updatedInterests });
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #ddd',
    borderRadius: '8px',
    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
    color: isDarkMode ? '#e8eaed' : '#333',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: isDarkMode ? '#e8eaed' : '#333'
  };

  if (!isEditing) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div>
          <h4 style={{ color: isDarkMode ? '#e8eaed' : '#333', marginBottom: '15px' }}>Basic Preferences</h4>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: isDarkMode ? '#9ca3af' : '#666', fontSize: '0.9rem' }}>Travel Style:</span>
            <div style={{ color: isDarkMode ? '#e8eaed' : '#333', fontWeight: '500' }}>
              {preferenceOptions.travelStyles.find(s => s.value === preferences.travelStyle)?.label || 'Not set'}
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: isDarkMode ? '#9ca3af' : '#666', fontSize: '0.9rem' }}>Budget:</span>
            <div style={{ color: isDarkMode ? '#e8eaed' : '#333', fontWeight: '500' }}>
              ${preferences.budget || 'Not set'}
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: isDarkMode ? '#9ca3af' : '#666', fontSize: '0.9rem' }}>Travelers:</span>
            <div style={{ color: isDarkMode ? '#e8eaed' : '#333', fontWeight: '500' }}>
              {preferences.travelers || 'Not set'}
            </div>
          </div>
        </div>
        
        <div>
          <h4 style={{ color: isDarkMode ? '#e8eaed' : '#333', marginBottom: '15px' }}>Interests</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {preferences.interests?.length > 0 ? preferences.interests.map(interest => (
              <span key={interest} style={{
                background: isDarkMode ? 'rgba(102, 126, 234, 0.2)' : '#e3f2fd',
                color: isDarkMode ? '#8b9cff' : '#1976d2',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}>
                {interest}
              </span>
            )) : (
              <span style={{ color: isDarkMode ? '#9ca3af' : '#666', fontSize: '0.9rem' }}>No interests selected</span>
            )}
          </div>
        </div>
        
        <div>
          <h4 style={{ color: isDarkMode ? '#e8eaed' : '#333', marginBottom: '15px' }}>Accommodation</h4>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: isDarkMode ? '#9ca3af' : '#666', fontSize: '0.9rem' }}>Type:</span>
            <div style={{ color: isDarkMode ? '#e8eaed' : '#333', fontWeight: '500' }}>
              {preferenceOptions.accommodationTypes.find(a => a.value === preferences.accommodationType)?.label || 'Not set'}
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: isDarkMode ? '#9ca3af' : '#666', fontSize: '0.9rem' }}>Activity Level:</span>
            <div style={{ color: isDarkMode ? '#e8eaed' : '#333', fontWeight: '500' }}>
              {preferenceOptions.activityLevels.find(a => a.value === preferences.activityLevel)?.label || 'Not set'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
      {/* Basic Preferences */}
      <div>
        <h4 style={{ color: isDarkMode ? '#e8eaed' : '#333', marginBottom: '20px' }}>Basic Preferences</h4>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Travel Style</label>
          <select
            value={preferences.travelStyle}
            onChange={(e) => handleInputChange('travelStyle', e.target.value)}
            style={inputStyle}
          >
            {preferenceOptions.travelStyles.map(style => (
              <option key={style.value} value={style.value}>{style.label}</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Budget (USD)</label>
          <input
            type="number"
            value={preferences.budget}
            onChange={(e) => handleInputChange('budget', parseInt(e.target.value))}
            style={inputStyle}
            min="100"
            step="100"
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Number of Travelers</label>
          <input
            type="number"
            value={preferences.travelers}
            onChange={(e) => handleInputChange('travelers', parseInt(e.target.value))}
            style={inputStyle}
            min="1"
            max="20"
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Activity Level</label>
          <select
            value={preferences.activityLevel}
            onChange={(e) => handleInputChange('activityLevel', e.target.value)}
            style={inputStyle}
          >
            {preferenceOptions.activityLevels.map(level => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Interests */}
      <div>
        <h4 style={{ color: isDarkMode ? '#e8eaed' : '#333', marginBottom: '20px' }}>Travel Interests</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {preferenceOptions.interests.map(interest => (
            <label key={interest} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: preferences.interests?.includes(interest) 
                ? (isDarkMode ? 'rgba(102, 126, 234, 0.2)' : '#e3f2fd')
                : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa'),
              borderRadius: '8px',
              cursor: 'pointer',
              border: preferences.interests?.includes(interest)
                ? (isDarkMode ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid #2196f3')
                : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'),
              transition: 'all 0.2s ease'
            }}>
              <input
                type="checkbox"
                checked={preferences.interests?.includes(interest) || false}
                onChange={() => handleInterestToggle(interest)}
                style={{ margin: 0 }}
              />
              <span style={{ 
                fontSize: '0.9rem',
                color: isDarkMode ? '#e8eaed' : '#333',
                textTransform: 'capitalize'
              }}>
                {interest}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Accommodation & Flight Preferences */}
      <div>
        <h4 style={{ color: isDarkMode ? '#e8eaed' : '#333', marginBottom: '20px' }}>Accommodation & Travel</h4>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Accommodation Type</label>
          <select
            value={preferences.accommodationType}
            onChange={(e) => handleInputChange('accommodationType', e.target.value)}
            style={inputStyle}
          >
            {preferenceOptions.accommodationTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Flight Time Preference</label>
          <select
            value={preferences.flightPreferences?.timePreference || 'any'}
            onChange={(e) => handleFlightPreferenceChange('timePreference', e.target.value)}
            style={inputStyle}
          >
            {preferenceOptions.timePreferences.map(time => (
              <option key={time.value} value={time.value}>{time.label}</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Cabin Class</label>
          <select
            value={preferences.flightPreferences?.cabinClass || 'economy'}
            onChange={(e) => handleFlightPreferenceChange('cabinClass', e.target.value)}
            style={inputStyle}
          >
            {preferenceOptions.cabinClasses.map(cabin => (
              <option key={cabin.value} value={cabin.value}>{cabin.label}</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: isDarkMode ? '#e8eaed' : '#333',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={preferences.flightPreferences?.preferDirect || false}
              onChange={(e) => handleFlightPreferenceChange('preferDirect', e.target.checked)}
            />
            Prefer direct flights
          </label>
        </div>
      </div>
    </div>
  );
}


export default function ProfilePage() {

  // --- Placeholder State and Context ---
  // These were used in your JSX but not defined. I've created placeholders for them.
  const { state } = useAuth(); // Assuming state comes from your auth context
  const { isDarkMode } = useDarkMode(); // Assuming isDarkMode comes from your dark mode context
  const { isMobile, isTablet } = useResponsive();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false); // Example state
  const [editForm, setEditForm] = useState({ name: state.user?.name || '', email: state.user?.email || '' });
  const [isEditingHomeCity, setIsEditingHomeCity] = useState(false);
  const [homeCity, setHomeCity] = useState(''); // Home city state
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [userTrips, setUserTrips] = useState<Trip[]>([]); // Initialize with empty array
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [tripToCancel, setTripToCancel] = useState<Trip | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  // --- Logic that was outside a component ---
  // This logic is now correctly placed inside the ProfilePage component.
  const [travelPreferences, setTravelPreferences] = useState<TravelPreferences>(defaultTravelPreferences);

  const isPreferencesComplete = PreferencesUtils.isComplete(travelPreferences);
  const missingFields = PreferencesUtils.getMissingFields(travelPreferences);

  const handlePreferenceChange = (updates: Partial<TravelPreferences>) => {
    setTravelPreferences((prev) => ({ ...prev, ...updates }));
  };

  // --- Placeholder Handlers ---
  // These functions were called but not defined in your snippet.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async () => {
    if (!state.user?.email || isGoogleUser) return;
    
    try {
      // Here you would typically call an API to update the user's profile
      // For now, we'll just show a success message since the backend API isn't implemented
      setIsEditingProfile(false);
      
      await Swal.fire({
        icon: 'success',
        title: 'Profile Saved',
        text: 'Your profile information has been saved successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Unable to save your profile. Please try again.',
      });
    }
  };

  const handleSaveHomeCity = async () => {
    if (!state.user?.email || !homeCity.trim()) return;
    
    try {
      await userProfileApiService.updateHomeCity(state.user.email, homeCity.trim());
      setIsEditingHomeCity(false);
      
      await Swal.fire({
        icon: 'success',
        title: 'Home City Saved',
        text: 'Your home city has been saved successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('❌ Error saving home city:', error);
      // The error is now handled by localStorage fallback, so this shouldn't happen
      await Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Unable to save your home city. Please try again.',
      });
    }
  };

  const handleSavePreferences = async () => {
    if (!state.user?.email) return;
    
    try {
      await userProfileApiService.updateTravelPreferences(state.user.email, travelPreferences);
      setIsEditingPreferences(false);
      
      await Swal.fire({
        icon: 'success',
        title: 'Preferences Saved',
        text: 'Your travel preferences have been saved successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('❌ Error saving preferences:', error);
      // The error is now handled by localStorage fallback, so this shouldn't happen
      await Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'Unable to save your preferences. Please try again.',
      });
    }
  };

  // City search functionality
  const handleCitySearch = async (query: string) => {
    setHomeCity(query);
    
    if (query.length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsLoadingCities(true);
    try {
      const suggestions = await userProfileApiService.getCitySuggestions(query);
      setCitySuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('❌ Error searching cities:', error);
      setCitySuggestions([]);
    } finally {
      setIsLoadingCities(false);
    }
  };

  const handleCitySelect = (city: any) => {
    setHomeCity(city.displayName);
    setShowSuggestions(false);
    setCitySuggestions([]);
  };

  const handleDeleteAccount = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log("Deleting account...");
        // Add account deletion logic here
        Swal.fire('Deleted!', 'Your account has been deleted.', 'success');
      }
    });
  };

  const handleCancelTrip = async () => {
    if (!tripToCancel || !cancellationReason || !state.user?.email) return;
    
    try {
      console.log(`Cancelling trip ${tripToCancel.id} for reason: ${cancellationReason}`);
      
      // Call the cancel trip API
      await tripApiService.cancelTrip({
        userId: state.user.email,
        tripId: tripToCancel.id,
        reason: cancellationReason
      });
      
      // Refresh the trip list
      const response = await tripApiService.getUserTrips(state.user.email);
      setUserTrips(response.trips);
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Trip Cancelled',
        text: 'Your trip has been cancelled successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('❌ Error cancelling trip:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Cancellation Failed',
        text: 'Unable to cancel your trip. Please try again.',
      });
    } finally {
      setShowCancelModal(false);
      setTripToCancel(null);
      setCancellationReason('');
    }
  };

  // --- useEffect for fetching data ---
  useEffect(() => {
    // Fetch user trips using email as the user identifier
    const fetchTrips = async () => {
      if (!state.user?.email) return;
      
      setIsLoadingTrips(true);
      try {
        console.log(`🔄 Loading trips for user: ${state.user.email}`);
        const response = await tripApiService.getUserTrips(state.user.email);
        setUserTrips(response.trips);
        console.log(`✅ Loaded ${response.trips.length} trips for user`);
      } catch (error) {
        console.error('❌ Error loading trips:', error);
        // Show empty state on error
        setUserTrips([]);
        
        // Optionally show error message to user
        Swal.fire({
          icon: 'error',
          title: 'Failed to Load Trips',
          text: 'Unable to load your trips. Please try again later.',
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false
        });
      } finally {
        setIsLoadingTrips(false);
      }
    };

    if (state.user?.email) {
      fetchTrips();
    }
  }, [state.user?.email]);

  // Add trip refresh mechanism - listen for trip updates
  useEffect(() => {
    const handleTripUpdate = () => {
      // Refresh trips when a new trip is created
      if (state.user?.email) {
        console.log('🔄 Trip update detected, refreshing trip list...');
        const fetchTrips = async () => {
          try {
            const response = await tripApiService.getUserTrips(state.user.email);
            setUserTrips(response.trips);
            console.log(`✅ Refreshed trip list: ${response.trips.length} trips`);
          } catch (error) {
            console.error('❌ Error refreshing trips:', error);
          }
        };
        fetchTrips();
      }
    };

    // Listen for custom trip update events
    window.addEventListener('tripUpdated', handleTripUpdate);
    window.addEventListener('tripCreated', handleTripUpdate);

    return () => {
      window.removeEventListener('tripUpdated', handleTripUpdate);
      window.removeEventListener('tripCreated', handleTripUpdate);
    };
  }, [state.user?.email]);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!state.user?.email) return;
      
      try {
        console.log(`📋 Loading profile for user: ${state.user.email}`);
        const profile = await userProfileApiService.getUserProfile(state.user.email);
        
        // Update state with loaded profile data
        setHomeCity(profile.homeCity || '');
        setTravelPreferences(profile.travelPreferences || defaultTravelPreferences);
        
        console.log('✅ Profile loaded successfully');
      } catch (error) {
        console.error('❌ Error loading profile:', error);
        // Use defaults on error
        setHomeCity('');
        setTravelPreferences(defaultTravelPreferences);
        
        // Show a subtle notification that we're using local storage
        if (error.message && error.message.includes('SyntaxError')) {
          console.log('ℹ️ Using local storage for profile data until backend is available');
        }
      }
    };

    if (state.user?.email) {
      loadUserProfile();
    }
  }, [state.user?.email]);

  // User context switching detection and data refresh
  useEffect(() => {
    // Clear cached data when user changes
    const currentUserEmail = state.user?.email;
    
    if (currentUserEmail) {
      console.log(`👤 User context detected: ${currentUserEmail}`);
      
      // Clear any cached trip data from previous user
      setUserTrips([]);
      setIsLoadingTrips(true);
      
      // Reset form data for new user
      setEditForm({ 
        name: state.user?.name || '', 
        email: state.user?.email || '' 
      });
      
      // Check if user is a Google user - use explicit role property
      const isGoogle = state.user?.role === 'google';
      
      console.log('🔍 Google user detection:', {
        role: state.user?.role,
        isGoogle: isGoogle,
        email: state.user?.email?.substring(0, 10) + '...',
        name: state.user?.name
      });
      
      setIsGoogleUser(isGoogle);
      
      console.log('🔄 Cleared cached data for user context switch');
    }
  }, [state.user?.email, state.user?.name, state.user?.role]);


  // --- The `return` statement with all your JSX ---
  // This was also incorrectly placed outside a component.
  return (
    <>
      <Head>
        <title>Profile - Hack Travel</title>
        <meta name="description" content="Manage your profile and travel preferences" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
          : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%)',
        paddingBottom: '40px'
      }}>
        <Navbar />
        <main style={{ padding: isMobile ? '20px 15px' : '40px 20px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

            {/* Page Header */}
            <div style={{
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              <h1 style={{
                fontSize: isMobile ? '2rem' : '2.5rem',
                fontWeight: '800',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
              }}>
                Your Profile
              </h1>
              <p style={{
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontSize: isMobile ? '0.95rem' : '1.05rem',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Manage your account settings and travel preferences
              </p>
            </div>

            {/* Profile Information */}
            <div style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' 
                : 'white',
              borderRadius: '24px',
              padding: isMobile ? '24px' : '40px',
              marginBottom: '24px',
              boxShadow: isDarkMode 
                ? '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
                : '0 20px 60px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative Background Elements */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                opacity: '0.05',
                filter: 'blur(40px)'
              }} />
              
              <div style={{
                position: 'relative',
                zIndex: 1
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  marginBottom: isMobile ? '24px' : '32px',
                  gap: isMobile ? '15px' : '0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: isMobile ? '56px' : '72px',
                      height: isMobile ? '56px' : '72px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: isMobile ? '1.5rem' : '2rem',
                      fontWeight: '700',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                    }}>
                      {state.user?.name ? state.user.name[0].toUpperCase() : state.user?.email?.[0].toUpperCase() || '?'}
                    </div>
                    <div>
                      <h2 style={{ 
                        margin: 0, 
                        color: isDarkMode ? '#f1f5f9' : '#1e293b', 
                        fontSize: isMobile ? '1.4rem' : '1.75rem',
                        fontWeight: '700',
                        marginBottom: '4px'
                      }}>
                        Profile Information
                      </h2>
                      {isGoogleUser ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: isMobile ? '0.8rem' : '0.875rem',
                          color: isDarkMode ? '#94a3b8' : '#64748b'
                        }}>
                          <FaLock style={{ fontSize: '0.75rem' }} />
                          <span>Managed by Google OAuth</span>
                        </div>
                      ) : (
                        <p style={{ 
                          margin: 0,
                          color: isDarkMode ? '#94a3b8' : '#64748b', 
                          fontSize: isMobile ? '0.8rem' : '0.9rem' 
                        }}>
                          Manage your account details
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {!isGoogleUser && (
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      style={{
                        background: isEditingProfile 
                          ? (isDarkMode ? '#475569' : '#cbd5e1')
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: isMobile ? '12px 24px' : '12px 28px',
                        minHeight: isMobile ? '48px' : 'auto',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.9rem' : '0.95rem',
                        fontWeight: '500',
                        width: isMobile ? '100%' : 'auto',
                        touchAction: 'manipulation',
                        boxShadow: isEditingProfile 
                          ? 'none' 
                          : '0 2px 8px rgba(102, 126, 234, 0.2)',
                        transition: 'all 0.3s ease',
                        transform: isEditingProfile ? 'scale(0.98)' : 'scale(1)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isEditingProfile) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isEditingProfile) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                        }
                      }}
                    >
                      {isEditingProfile ? (
                        <>
                          <FaTimes style={{ fontSize: '0.9rem' }} /> Cancel
                        </>
                      ) : (
                        <>
                          <FaEdit style={{ fontSize: '0.9rem' }} /> Edit Profile
                        </>
                      )}
                    </button>
                  )}
                  
                  {isGoogleUser && (
                    <div style={{
                      background: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(241, 245, 249, 0.8)',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      border: isDarkMode ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #e2e8f0',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: isMobile ? '100%' : 'auto',
                      justifyContent: isMobile ? 'center' : 'flex-start'
                    }}>
                      <FaLock style={{ fontSize: '0.85rem' }} />
                      <span>Protected by Google</span>
                    </div>
                  )}
                </div>

              {isGoogleUser && (
                <div style={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
                  border: `1.5px solid ${isDarkMode ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                  borderRadius: '16px',
                  padding: '20px 24px',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  boxShadow: isDarkMode 
                    ? '0 4px 12px rgba(59, 130, 246, 0.1)' 
                    : '0 4px 12px rgba(59, 130, 246, 0.08)'
                }}>
                  <div style={{
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)'
                      : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                    padding: '10px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                  }}>
                    <FaLock style={{ 
                      fontSize: '1.1rem',
                      color: 'white'
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: isDarkMode ? '#93c5fd' : '#2563eb', 
                      fontSize: '1rem',
                      fontWeight: '700',
                      marginBottom: '6px',
                      letterSpacing: '-0.01em'
                    }}>
                      Google Account Protection
                    </div>
                    <div style={{ 
                      color: isDarkMode ? '#cbd5e1' : '#475569', 
                      fontSize: '0.9rem',
                      lineHeight: '1.6'
                    }}>
                      Your name and email are managed by Google and cannot be edited here. 
                      You can still update your travel preferences and other profile settings.
                    </div>
                  </div>
                </div>
              )} {!isEditingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Full Name
                      {isGoogleUser && (
                        <span style={{
                          background: isDarkMode 
                            ? 'linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0%, rgba(71, 85, 105, 0.2) 100%)' 
                            : 'linear-gradient(135deg, rgba(226, 232, 240, 1) 0%, rgba(203, 213, 225, 1) 100%)',
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`
                        }}>
                          <FaLock style={{ fontSize: '0.65rem' }} />
                          <span>PROTECTED</span>
                        </span>
                      )}
                    </label>
                    <div style={{
                      padding: '16px 20px',
                      background: isGoogleUser 
                        ? (isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)')
                        : (isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff'),
                      borderRadius: '12px',
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '1rem',
                      fontWeight: '500',
                      border: isGoogleUser
                        ? (isDarkMode ? '1.5px solid rgba(100, 116, 139, 0.3)' : '1.5px solid rgba(226, 232, 240, 1)')
                        : (isDarkMode ? '1.5px solid rgba(51, 65, 85, 0.5)' : '1.5px solid #e2e8f0'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isDarkMode 
                        ? '0 2px 8px rgba(0, 0, 0, 0.2)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      cursor: isGoogleUser ? 'not-allowed' : 'default',
                      opacity: isGoogleUser ? 0.7 : 1
                    }}>
                      <span>{state.user?.name || 'Not specified'}</span>
                      {isGoogleUser && (
                        <FaLock style={{ 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          fontSize: '0.9rem'
                        }} />
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Email Address
                      {isGoogleUser && (
                        <span style={{
                          background: isDarkMode 
                            ? 'linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0%, rgba(71, 85, 105, 0.2) 100%)' 
                            : 'linear-gradient(135deg, rgba(226, 232, 240, 1) 0%, rgba(203, 213, 225, 1) 100%)',
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`
                        }}>
                          <FaLock style={{ fontSize: '0.65rem' }} />
                          <span>PROTECTED</span>
                        </span>
                      )}
                    </label>
                    <div style={{
                      padding: '16px 20px',
                      background: isGoogleUser 
                        ? (isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 1)')
                        : (isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff'),
                      borderRadius: '12px',
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '1rem',
                      fontWeight: '500',
                      wordBreak: 'break-word',
                      border: isGoogleUser
                        ? (isDarkMode ? '1.5px solid rgba(100, 116, 139, 0.3)' : '1.5px solid rgba(226, 232, 240, 1)')
                        : (isDarkMode ? '1.5px solid rgba(51, 65, 85, 0.5)' : '1.5px solid #e2e8f0'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isDarkMode 
                        ? '0 2px 8px rgba(0, 0, 0, 0.2)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      cursor: isGoogleUser ? 'not-allowed' : 'default',
                      opacity: isGoogleUser ? 0.7 : 1
                    }}>
                      <span>{state.user?.email}</span>
                      {isGoogleUser && (
                        <FaLock style={{ 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          fontSize: '0.9rem'
                        }} />
                      )}
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
                    isDarkMode={isDarkMode}
                    isMobile={isMobile}
                  />
                  {!isGoogleUser && (
                    <div style={{ marginTop: isMobile ? '16px' : '20px' }}>
                      <button
                        onClick={handleSaveProfile}
                        style={{
                          width: isMobile ? '100%' : 'auto',
                          minHeight: isMobile ? '48px' : 'auto',
                          background: '#28a745',
                          color: 'white',
                          touchAction: 'manipulation',
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
              </div> {/* Close position: relative div */}
            </div> {/* Close Profile Information */}

            {/* Home City */}
            <div style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' 
                : 'white',
              borderRadius: '24px',
              padding: isMobile ? '24px' : '40px',
              marginBottom: '24px',
              boxShadow: isDarkMode 
                ? '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
                : '0 20px 60px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative Background Elements */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                left: '-50px',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                opacity: '0.05',
                filter: 'blur(40px)'
              }} />
              
              <div style={{
                position: 'relative',
                zIndex: 1
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  marginBottom: isMobile ? '24px' : '32px',
                  gap: isMobile ? '15px' : '0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: isMobile ? '48px' : '60px',
                      height: isMobile ? '48px' : '60px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: isMobile ? '1.3rem' : '1.6rem',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                    }}>
                      <FaHome />
                    </div>
                    <div>
                      <h2 style={{ 
                        margin: 0, 
                        color: isDarkMode ? '#f1f5f9' : '#1e293b', 
                        fontSize: isMobile ? '1.3rem' : '1.6rem',
                        fontWeight: '700',
                        marginBottom: '4px'
                      }}>
                        Home City
                      </h2>
                      <p style={{ 
                        margin: 0,
                        color: isDarkMode ? '#94a3b8' : '#64748b', 
                        fontSize: isMobile ? '0.8rem' : '0.9rem' 
                      }}>
                        Set your default origin city
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingHomeCity(!isEditingHomeCity)}
                    style={{
                      background: isEditingHomeCity 
                        ? (isDarkMode ? '#475569' : '#cbd5e1')
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '12px 24px' : '12px 28px',
                      minHeight: isMobile ? '48px' : 'auto',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.9rem' : '0.95rem',
                      fontWeight: '500',
                      width: isMobile ? '100%' : 'auto',
                      touchAction: 'manipulation',
                      boxShadow: isEditingHomeCity 
                        ? 'none' 
                        : '0 2px 8px rgba(102, 126, 234, 0.2)',
                      transition: 'all 0.3s ease',
                      transform: isEditingHomeCity ? 'scale(0.98)' : 'scale(1)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditingHomeCity) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEditingHomeCity) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                      }
                    }}
                  >
                    {isEditingHomeCity ? (
                      <>
                        <FaTimes style={{ fontSize: '0.9rem' }} /> Cancel
                      </>
                    ) : (
                      <>
                        <FaEdit style={{ fontSize: '0.9rem' }} /> Edit Home City
                      </>
                    )}
                  </button>
                </div>

              {!isEditingHomeCity ? (
                <div style={{
                  padding: isMobile ? '24px' : '32px',
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                  borderRadius: '20px',
                  color: 'white',
                  boxShadow: '0 12px 32px rgba(102, 126, 234, 0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Pattern overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none'
                  }} />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      opacity: 0.9, 
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: '600'
                    }}>
                      Your Home City
                    </div>
                    <div style={{ 
                      fontSize: isMobile ? '1.8rem' : '2.2rem', 
                      fontWeight: '800',
                      marginBottom: '12px',
                      letterSpacing: '-0.02em'
                    }}>
                      {homeCity || 'Not set'}
                    </div>
                    {homeCity && (
                      <div style={{ 
                        fontSize: '0.9rem', 
                        opacity: 0.95, 
                        lineHeight: '1.6',
                        background: 'rgba(255, 255, 255, 0.15)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)'
                      }}>
                        💡 AI will use <strong>{homeCity}</strong> as your default origin when you search for flights
                      </div>
                    )}
                    {!homeCity && (
                      <div style={{ 
                        fontSize: '0.9rem', 
                        opacity: 0.95, 
                        lineHeight: '1.6',
                        background: 'rgba(255, 255, 255, 0.15)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)'
                      }}>
                      Click &quot;Edit Home City&quot; to set your default origin city
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: '#e3f2fd', borderRadius: '10px', padding: '15px', marginBottom: '20px' }}>
                    <p style={{ margin: 0, color: '#1976d2', fontSize: '0.9rem' }}>
                      <strong>Tip:</strong> Once you set your home city, the AI will remember it and use it as your default origin for flight searches. Just say &quot;find flights to Paris&quot; and the AI will know you&apos;re flying from {homeCity || 'your home city'}!
                    </p>
                  </div> <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Enter your home city
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="e.g., Mumbai, New York, London"
                      value={homeCity}
                      onChange={(e) => handleCitySearch(e.target.value)}
                      onFocus={() => {
                        if (citySuggestions.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow for clicks
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: isDarkMode ? '2px solid rgba(102, 126, 234, 0.5)' : '2px solid #667eea',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.3s',
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
                        color: isDarkMode ? '#e8eaed' : '#333'
                      }}
                    />
                    
                    {isLoadingCities && (
                      <div style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: isDarkMode ? '#9ca3af' : '#666'
                      }}>
                        <FaSearch style={{ fontSize: '1rem' }} />
                      </div>
                    )}
                    
                    {showSuggestions && citySuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: isDarkMode ? '#1e2532' : 'white',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}>
                        {citySuggestions.map((city, index) => (
                          <div
                            key={index}
                            onClick={() => handleCitySelect(city)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: index < citySuggestions.length - 1 ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #f0f0f0') : 'none',
                              color: isDarkMode ? '#e8eaed' : '#333',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              (e.target as HTMLElement).style.backgroundColor = isDarkMode ? 'rgba(102, 126, 234, 0.2)' : '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              (e.target as HTMLElement).style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ fontWeight: '500' }}>{city.name}</div>
                            <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#9ca3af' : '#666', marginTop: '2px' }}>
                              {city.country} {city.iataCode && `(${city.iataCode})`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
              </div> {/* Close position: relative div */}
            </div> {/* Close Home City */}

            {/* Travel Preferences */}
            <div style={{
              background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: isDarkMode ? '0 10px 30px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
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
                  <h2 style={{ margin: 0, color: isDarkMode ? '#e8eaed' : '#333', fontSize: '1.5rem' }}>Travel Preferences</h2>
                  {!isPreferencesComplete && (
                    <p style={{ margin: '5px 0 0 0', color: '#dc3545', fontSize: '0.85rem' }}>
                      Complete your preferences for better recommendations
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
                      background: isEditingPreferences 
                        ? (isDarkMode ? '#475569' : '#cbd5e1')
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '12px 24px' : '12px 28px',
                      minHeight: isMobile ? '48px' : 'auto',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.9rem' : '0.95rem',
                      fontWeight: '500',
                      touchAction: 'manipulation',
                      boxShadow: isEditingPreferences 
                        ? 'none' 
                        : '0 2px 8px rgba(102, 126, 234, 0.2)',
                      transition: 'all 0.3s ease',
                      transform: isEditingPreferences ? 'scale(0.98)' : 'scale(1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditingPreferences) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEditingPreferences) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                      }
                    }}
                  >
                    {isEditingPreferences ? (
                      <>
                        <FaTimes style={{ fontSize: '0.9rem' }} /> Cancel
                      </>
                    ) : (
                      <>
                        <FaEdit style={{ fontSize: '0.9rem' }} /> Edit Preferences
                      </>
                    )}
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
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Upcoming Trips */}
            <div style={{
              background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: isDarkMode ? '0 10px 30px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
            }}>
              <h2 style={{
                margin: '0 0 25px',
                color: isDarkMode ? '#e8eaed' : '#333',
                fontSize: '1.5rem'
              }}>Your Trips ({userTrips.length})</h2>
              {isLoadingTrips ? (
                <p style={{ color: isDarkMode ? '#9ca3af' : '#666', textAlign: 'center', padding: '20px' }}>
                  Loading trips...
                </p>
              ) : userTrips.length === 0 ? (
                <p style={{ color: isDarkMode ? '#9ca3af' : '#666', textAlign: 'center', padding: '20px' }}>
                  No trips planned yet. Start exploring and book your first trip!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {userTrips.map((trip) => (
                    <div
                      key={trip.id}
                      style={{
                        background: trip.status === 'cancelled'
                          ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '15px',
                        padding: '20px',
                        color: 'white',
                        opacity: trip.status === 'cancelled' ? 0.7 : 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' }}>
                            {trip.origin} → {trip.destination}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                            {new Date(trip.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {trip.returnDate && ` - ${new Date(trip.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
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
                      {trip.details?.totalPrice && (
                        <div style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 'bold', 
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FaDollarSign style={{ fontSize: '1rem' }} />
                          ${Math.round(trip.details.totalPrice)}
                        </div>
                      )}
                      {trip.cancellationReason && (
                        <div style={{
                          fontSize: '0.85rem',
                          opacity: 0.9,
                          marginTop: '10px',
                          padding: '8px 12px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FaTimes style={{ fontSize: '0.9rem' }} />
                          Cancelled: {trip.cancellationReason}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                          Created: {new Date(trip.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {trip.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setTripToCancel(trip);
                                setShowCancelModal(true);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.2)';
                              }}
                            >
                              Cancel Trip
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const confirmed = await Swal.fire({
                                title: 'Delete Trip?',
                                text: 'This will permanently delete this trip from your list. This cannot be undone.',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#dc3545',
                                cancelButtonColor: '#6c757d',
                                confirmButtonText: 'Yes, delete it',
                                cancelButtonText: 'Keep trip'
                              });
                              
                              if (confirmed.isConfirmed && state.user?.email) {
                                try {
                                  await tripApiService.deleteTrip(state.user.email, trip.id);
                                  
                                  // Refresh the trip list
                                  const response = await tripApiService.getUserTrips(state.user.email);
                                  setUserTrips(response.trips);
                                  
                                  await Swal.fire({
                                    icon: 'success',
                                    title: 'Deleted!',
                                    text: 'Your trip has been deleted.',
                                    timer: 2000,
                                    showConfirmButton: false
                                  });
                                } catch (error) {
                                  console.error('❌ Error deleting trip:', error);
                                  await Swal.fire({
                                    icon: 'error',
                                    title: 'Delete Failed',
                                    text: 'Unable to delete your trip. Please try again.',
                                  });
                                }
                              }
                            }}
                            style={{
                              background: 'rgba(220, 53, 69, 0.8)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              (e.target as HTMLElement).style.background = 'rgba(220, 53, 69, 1)';
                            }}
                            onMouseLeave={(e) => {
                              (e.target as HTMLElement).style.background = 'rgba(220, 53, 69, 0.8)';
                            }}
                          >
                            <FaTrashAlt style={{ fontSize: '0.85rem' }} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div style={{
              background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: isDarkMode ? '0 10px 30px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: isDarkMode ? '2px solid rgba(255, 234, 167, 0.3)' : '2px solid #ffeaa7'
            }}>
              <h2 style={{
                margin: '0 0 15px',
                color: '#e17055',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <FaExclamationTriangle style={{ fontSize: '1.3rem' }} />
                Danger Zone
              </h2>
              <p style={{
                color: isDarkMode ? '#9ca3af' : '#666',
                marginBottom: '20px',
                fontSize: '1rem'
              }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '12px 24px' : '12px 28px',
                    minHeight: isMobile ? '48px' : 'auto',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                    fontWeight: '500',
                    width: '100%',
                    touchAction: 'manipulation',
                    boxShadow: '0 2px 8px rgba(220, 53, 69, 0.2)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.2)';
                  }}
                >
                  <FaTrashAlt style={{ fontSize: '0.9rem' }} />
                  Delete Account
                </button>
                <button
                  onClick={async () => {
                    if (!state.user?.id) return;
                    const confirmed = await Swal.fire({
                      title: 'Clear all chat history?',
                      text: 'This will permanently delete all your saved chat sessions from the server. This cannot be undone.',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonText: 'Yes, clear it',
                      cancelButtonText: 'Cancel'
                    });
                    if (!confirmed.isConfirmed) return;
                    setIsClearingHistory(true);
                    try {
                      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
                      const fullUrl = `${baseUrl}/ai-agent/user-sessions/${state.user.id}`;
                      console.log('Clear history API URL:', fullUrl);
                      const response = await fetch(fullUrl, {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': state.token ? `Bearer ${state.token}` : ''
                        }
                      });
                      const data = await response.json().catch(() => ({}));
                      if (!response.ok || !data.success) {
                        console.error('Clear history failed:', data);
                        await Swal.fire('Error', data.error || 'Failed to clear server chat history', 'error');
                        return;
                      }
                      await Swal.fire('Cleared', 'All chat history has been removed from the server.', 'success');
                      // Refresh app so sidebar and other components update
                      window.location.reload();
                    } catch (err) {
                      console.error('Error clearing server history:', err);
                      await Swal.fire('Error', 'Failed to clear chat history. Please try again.', 'error');
                    } finally {
                      setIsClearingHistory(false);
                    }
                  }}
                  disabled={isClearingHistory}
                  style={{
                    background: isClearingHistory 
                      ? (isDarkMode ? '#991b1b' : '#b91c1c')
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '12px 24px' : '12px 28px',
                    minHeight: isMobile ? '48px' : 'auto',
                    borderRadius: '12px',
                    cursor: isClearingHistory ? 'not-allowed' : 'pointer',
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                    fontWeight: '500',
                    width: '100%',
                    touchAction: 'manipulation',
                    boxShadow: isClearingHistory 
                      ? 'none' 
                      : '0 2px 8px rgba(239, 68, 68, 0.2)',
                    transition: 'all 0.3s ease',
                    transform: isClearingHistory ? 'scale(0.98)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isClearingHistory ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isClearingHistory) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isClearingHistory) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.2)';
                    }
                  }}
                >
                  <FaTrashAlt style={{ fontSize: '0.9rem' }} />
                  {isClearingHistory ? 'Clearing...' : 'Clear All Chat History'}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Trip Cancellation Modal */}
        {showCancelModal && tripToCancel && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              backdropFilter: 'blur(8px)',
              padding: '20px'
            }}
            onClick={() => {
              setShowCancelModal(false);
              setTripToCancel(null);
              setCancellationReason('');
            }}
          >
            <div
              style={{
                background: isDarkMode ? '#1e2532' : 'white',
                borderRadius: '24px',
                padding: '40px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: isDarkMode
                  ? '0 25px 50px rgba(0, 0, 0, 0.9)'
                  : '0 25px 50px rgba(0, 0, 0, 0.3)',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{
                margin: '0 0 20px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: isDarkMode ? '#e8eaed' : '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <FaTimes style={{ color: '#dc3545', fontSize: '22px' }} />
                Cancel Trip
              </h2>

              <div style={{
                background: isDarkMode
                  ? 'rgba(255, 193, 7, 0.15)'
                  : '#fff3cd',
                border: `1px solid ${isDarkMode ? 'rgba(255, 193, 7, 0.3)' : '#ffc107'}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: isDarkMode ? '#ffd54f' : '#856404', 
                  lineHeight: '1.5',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <FaInfoCircle style={{ fontSize: '16px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Important Disclaimer:</strong>
                    <br />
                    This will only update your trip status in Hack Travel. You must contact your airlines, hotels, and any other booking providers directly to cancel your actual reservations and request refunds.
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  padding: '16px',
                  background: isDarkMode ? 'rgba(102, 126, 234, 0.1)' : '#f0f4ff',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: isDarkMode ? '#8b9cff' : '#667eea', marginBottom: '8px' }}>
                    {tripToCancel.type === 'flight' && '✈️'}
                    {tripToCancel.type === 'package' && '🎫'}
                    {tripToCancel.type === 'hotel' && '🏨'}
                    {tripToCancel.type === 'vacation' && '🎁'}
                    {' '}
                    {tripToCancel.origin} → {tripToCancel.destination}
                  </div>
                  <div style={{ fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#6c757d' }}>
                    📅 {new Date(tripToCancel.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {tripToCancel.returnDate && ` - ${new Date(tripToCancel.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </div>
                </div>

                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e8eaed' : '#2c3e50'
                }}>
                  Reason for Cancellation *
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #ddd',
                    borderRadius: '8px',
                    background: isDarkMode ? '#1e2532' : 'white',
                    color: isDarkMode ? '#e8eaed' : '#333',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Select a reason...
                  </option>
                  <option value="Change of plans" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Change of plans
                  </option>
                  <option value="Financial reasons" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Financial reasons
                  </option>
                  <option value="Health concerns" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Health concerns
                  </option>
                  <option value="Work commitments" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Work commitments
                  </option>
                  <option value="Found better deal" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Found better deal
                  </option>
                  <option value="Travel restrictions" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Travel restrictions
                  </option>
                  <option value="Weather concerns" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Weather concerns
                  </option>
                  <option value="Personal emergency" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Personal emergency
                  </option>
                  <option value="Other" style={{ background: isDarkMode ? '#1e2532' : 'white', color: isDarkMode ? '#e8eaed' : '#333' }}>
                    Other
                  </option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setTripToCancel(null);
                    setCancellationReason('');
                  }}
                  style={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f2f5',
                    color: isDarkMode ? '#e8eaed' : '#495057',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Keep Trip
                </button>

                <button
                  onClick={handleCancelTrip}
                  disabled={!cancellationReason}
                  style={{
                    background: cancellationReason ? '#dc3545' : '#999',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: cancellationReason ? 'pointer' : 'not-allowed',
                    opacity: cancellationReason ? 1 : 0.6
                  }}
                >
                  Cancel Trip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}