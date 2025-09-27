import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import Swal from 'sweetalert2';
import { popularDestinations } from '../data/destinations';

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
  // Get all unique countries from destinations
  const allCountries = Array.from(new Set(popularDestinations.map(dest => dest.country))).sort();

  // helper to toggle interests without nesting
  const toggleInterest = (interest: string, checked: boolean) => {
    const prevInterests = Array.isArray(editForm.interests) ? editForm.interests : [];
    const updated = checked ? [...prevInterests, interest] : prevInterests.filter((i: string) => i !== interest);
    const syntheticEvent = { target: { name: 'interests', value: updated } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(syntheticEvent);
  };

  // Helper for favourite destinations
  const toggleFavouriteDestination = (country: string, checked: boolean) => {
    const prevFavs = Array.isArray(editForm.favouriteDestinations) ? editForm.favouriteDestinations : [];
    const updated = checked ? [...prevFavs, country] : prevFavs.filter((c: string) => c !== country);
    const syntheticEvent = { target: { name: 'favouriteDestinations', value: updated } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(syntheticEvent);
  };

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
      {fields.includes('numberOfKids') && (
        <FormField
          label="Number of Kids"
          name="numberOfKids"
          type="number"
          value={editForm.numberOfKids}
          onChange={handleInputChange}
        />
      )}
      {fields.includes('budget') && (
        <FormField
          label="Budget ($)"
          name="budget"
          type="number"
          value={editForm.budget}
          onChange={handleInputChange}
          disabled={disabled}
        />
      )}
      {/* Removed duration field */}
      {fields.includes('travelers') && (
        <FormField
          label="Travelers"
          name="travelers"
          type="number"
          value={editForm.travelers}
          onChange={handleInputChange}
          disabled={disabled}
        />
      )}
      {fields.includes('startDate') && (
        <FormField
          label="Start Date"
          name="startDate"
          type="date"
          value={editForm.startDate}
          onChange={handleInputChange}
          disabled={disabled}
        />
      )}
      {fields.includes('travelStyle') && (
        <FormField
          label="Travel Style"
          name="travelStyle"
          type="text"
          value={editForm.travelStyle}
          onChange={handleInputChange}
          disabled={disabled}
        />
      )}
      {fields.includes('interests') && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Interests (select multiple)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {['Culture', 'Art', 'Nightlife', 'Hiking', 'Sports', 'Festivals', 'History', 'Architecture', 'Shopping', 'Beaches', 'Photography', 'Local Experiences', 'Museums', 'Food', 'Nature', 'Adventure', 'Music', 'Wellness'].map((interest) => (
              <label key={interest} style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="interests"
                  value={interest}
                  checked={Array.isArray(editForm.interests) ? editForm.interests.includes(interest) : false}
                  onChange={(e) => toggleInterest(interest, (e.target as HTMLInputElement).checked)}
                  disabled={disabled}
                />
                <span style={{ marginLeft: 8 }}>{interest}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {/* Destination select input removed as requested */}
      {/* Favourite Destinations Multi-select */}
      {fields.includes('destination') && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Favourite Destinations (select multiple countries)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            {allCountries.map((country) => (
              <label key={country} style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="favouriteDestinations"
                  value={country}
                  checked={Array.isArray(editForm.favouriteDestinations) ? editForm.favouriteDestinations.includes(country) : false}
                  onChange={(e) => toggleFavouriteDestination(country, (e.target as HTMLInputElement).checked)}
                  disabled={disabled}
                />
                <span style={{ marginLeft: 8 }}>{country}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {/* Removed travel start date field */}
    </form>
  );
}

export default function ProfilePage() {
  const { state } = useAuth();

  // Hooks must run unconditionally at top level
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [showPlanExpanded, setShowPlanExpanded] = useState(false);
  const [editForm, setEditForm] = useState({
    name: state.user?.name ?? '',
    email: state.user?.email ?? '',
    numberOfKids: (state.user?.preferences as any)?.numberOfKids ?? 0,
    budget: (state.user?.preferences as any)?.budget ?? 1000,
    travelers: (state.user?.preferences as any)?.travelers ?? 1,
    travelStyle: (state.user?.preferences as any)?.travelStyle ?? '',
    interests: (state.user?.preferences as any)?.interests ?? [],
    destination: (state.user?.preferences as any)?.destination ?? '',
    favouriteDestinations: (state.user?.preferences as any)?.favouriteDestinations ?? []
  });

  if (!state.user) {
    return <div>User not authenticated</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as any;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSavePreferences = async () => {
    // here you'd call your API to save preferences. For now just close edit mode.
    setIsEditingPreferences(false);
    Swal.fire('Saved', 'Preferences saved successfully!', 'success');
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

  const handlePlanClick = async () => {
    // Always expand the plan area
    if (state.user?.preferences && Object.keys(state.user.preferences).length > 0) {
      // Ask user whether they want to change preferences
      const result = await Swal.fire({
        title: 'Preferences found',
        text: 'You already have saved preferences. Do you want to change them before planning?',
        icon: 'question',
        showDenyButton: true,
        confirmButtonText: 'Yes, change preferences',
        denyButtonText: 'No, keep preferences'
      });

      if (result.isConfirmed) {
        setIsEditingPreferences(true);
        setShowPlanExpanded(true);
      } else if (result.isDenied) {
        setIsEditingPreferences(false);
        setShowPlanExpanded(true);
      }
    } else {
      // No preferences — show preferences form so user can set them
      setIsEditingPreferences(true);
      setShowPlanExpanded(true);
    }
  };

  // Removed handlePlanSubmit

  return (
    <>
      <Head>
        <title>Profile - HackTravel</title>
        <meta name="description" content="Manage your HackTravel profile" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />

        <main style={{
          padding: '40px 20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            {/* Profile Header */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                margin: '0 auto 20px'
              }}>
                {state.user?.name ? state.user.name[0].toUpperCase() : state.user?.email[0].toUpperCase()}
              </div>
              <h1 style={{
                margin: '0 0 10px',
                color: '#333',
                fontSize: '2rem'
              }}>
                {state.user?.name || 'Travel Enthusiast'}
              </h1>
              <p style={{
                color: '#666',
                fontSize: '1.1rem',
                margin: 0,
                wordBreak: 'break-word'
              }}>
                {state.user?.email}
              </p>
              <div style={{
                display: 'inline-block',
                background: state.user?.role === 'google' ? '#4285f4' : '#667eea',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                marginTop: '15px'
              }}>
                {state.user?.role === 'google' ? '🔗 Google Account' : '📧 Email Account'}
              </div>
            </div>

            {/* Plan My Adventure section removed as requested */}

            {/* Profile Information */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <ProfileHeader isMobile={false} isTablet={false} />
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '25px',
              }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>Profile Information</h2>
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
              </div>

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
                <div>
                  <div style={{ marginBottom: '25px' }}>
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
                  <div style={{ marginBottom: '25px' }}>
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
                  <div style={{ marginBottom: '25px' }}>
                    <span style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Number of Kids
                    </span>
                    <div style={{
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      color: '#333',
                      fontSize: '1rem'
                    }}>
                      {state.user?.preferences?.numberOfKids ?? 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <span style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Budget
                    </span>
                    <div style={{
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      color: '#333',
                      fontSize: '1rem'
                    }}>
                      ${state.user?.preferences?.budget?.toLocaleString() || 'Not specified'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preferences (kept for manual editing outside the plan flow) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                margin: '0 0 25px',
                color: '#333',
                fontSize: '1.5rem'
              }}>Preferences</h2>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
              }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>Preferences</h2>
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
              </div>

              <ProfileForm
                editForm={editForm}
                handleInputChange={handleInputChange}
                disabled={!isEditingPreferences}
                fields={['budget', 'travelers', 'travelStyle', 'interests', 'destination']}
              />
              {isEditingPreferences && (
                <button onClick={handleSavePreferences}>Save Preferences</button>
              )}
            </div>

            {/* Account Statistics */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                margin: '0 0 25px',
                color: '#333',
                fontSize: '1.5rem'
              }}>Travel Statistics</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '15px'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    color: '#667eea',
                    marginBottom: '10px'
                  }}>🗺️</div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '5px'
                  }}>0</div>
                  <div style={{
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>Trips Planned</div>
                </div>
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '15px'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    color: '#667eea',
                    marginBottom: '10px'
                  }}>🌍</div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '5px'
                  }}>0</div>
                  <div style={{
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>Countries Visited</div>
                </div>
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '15px'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    color: '#667eea',
                    marginBottom: '10px'
                  }}>⭐</div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '5px'
                  }}>0</div>
                  <div style={{
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>Favorite Places</div>
                </div>
              </div>
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