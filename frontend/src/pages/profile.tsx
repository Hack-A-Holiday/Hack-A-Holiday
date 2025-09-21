import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import Swal from 'sweetalert2';

export default function ProfilePage() {
  const { state } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [editForm, setEditForm] = useState({
    name: state.user?.name || '',
    email: state.user?.email || ''
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 640);
      setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleSaveProfile = async () => {
    // For now, just show a success message
    // In a real app, you'd call an API to update the user
    await Swal.fire({
      icon: 'success',
      title: 'Profile Updated!',
      text: 'Your profile has been updated successfully.',
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: 'This action cannot be undone. All your data will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete my account',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      await Swal.fire({
        icon: 'info',
        title: 'Account Deletion',
        text: 'Account deletion functionality will be implemented soon.',
        confirmButtonColor: '#667eea'
      });
    }
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>Profile - HackTravel</title>
        <meta name="description" content="Manage your HackTravel profile" />
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
            
            {/* Profile Header */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: isMobile ? '20px' : isTablet ? '30px' : '40px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                width: isMobile ? '80px' : '100px',
                height: isMobile ? '80px' : '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: isMobile ? '2rem' : '2.5rem',
                fontWeight: 'bold',
                margin: '0 auto 20px'
              }}>
                {state.user?.name ? state.user.name[0].toUpperCase() : state.user?.email[0].toUpperCase()}
              </div>
              <h1 style={{ 
                margin: '0 0 10px', 
                color: '#333', 
                fontSize: isMobile ? '1.5rem' : isTablet ? '1.8rem' : '2rem' 
              }}>
                {state.user?.name || 'Travel Enthusiast'}
              </h1>
              <p style={{ 
                color: '#666', 
                fontSize: isMobile ? '1rem' : '1.1rem', 
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

            {/* Profile Information */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                marginBottom: '25px',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '15px' : '0'
              }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '1.3rem' : '1.5rem' }}>Profile Information</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: isEditing ? '#6c757d' : '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '12px 20px' : '10px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    alignSelf: isMobile ? 'stretch' : 'auto'
                  }}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {!isEditing ? (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: isMobile ? '0.85rem' : '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Full Name
                    </span>
                    <div style={{
                      padding: isMobile ? '10px 12px' : '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      color: '#333',
                      fontSize: isMobile ? '0.95rem' : '1rem'
                    }}>
                      {state.user?.name || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <span style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: isMobile ? '0.85rem' : '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Email Address
                    </span>
                    <div style={{
                      padding: isMobile ? '10px 12px' : '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      color: '#333',
                      fontSize: isMobile ? '0.95rem' : '1rem',
                      wordBreak: 'break-word'
                    }}>
                      {state.user?.email}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="edit-name" style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: isMobile ? '0.85rem' : '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Full Name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: isMobile ? '0.95rem' : '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                  </div>
                  <div style={{ marginBottom: '25px' }}>
                    <label htmlFor="edit-email" style={{ 
                      display: 'block', 
                      color: '#666', 
                      fontSize: isMobile ? '0.85rem' : '0.9rem', 
                      marginBottom: '5px' 
                    }}>
                      Email Address
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      disabled={state.user?.role === 'google'}
                      style={{
                        width: '100%',
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: isMobile ? '0.95rem' : '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                        backgroundColor: state.user?.role === 'google' ? '#f8f9fa' : 'white',
                        cursor: state.user?.role === 'google' ? 'not-allowed' : 'text',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                    {state.user?.role === 'google' && (
                      <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0', fontStyle: 'italic' }}>
                        Email cannot be changed for Google accounts
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '14px 20px' : '12px 30px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.95rem' : '1rem',
                      fontWeight: '500',
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Account Statistics */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              marginBottom: '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ 
                margin: '0 0 25px', 
                color: '#333',
                fontSize: isMobile ? '1.3rem' : '1.5rem'
              }}>Travel Statistics</h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile 
                  ? '1fr' 
                  : isTablet 
                    ? 'repeat(2, 1fr)' 
                    : 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: isMobile ? '15px' : '20px' 
              }}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? '15px' : '20px', 
                  background: '#f8f9fa', 
                  borderRadius: '15px' 
                }}>
                  <div style={{ 
                    fontSize: isMobile ? '1.5rem' : '2rem', 
                    color: '#667eea', 
                    marginBottom: '10px' 
                  }}>🗺️</div>
                  <div style={{ 
                    fontSize: isMobile ? '1.2rem' : '1.5rem', 
                    fontWeight: 'bold', 
                    color: '#333', 
                    marginBottom: '5px' 
                  }}>0</div>
                  <div style={{ 
                    color: '#666', 
                    fontSize: isMobile ? '0.8rem' : '0.9rem' 
                  }}>Trips Planned</div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? '15px' : '20px', 
                  background: '#f8f9fa', 
                  borderRadius: '15px' 
                }}>
                  <div style={{ 
                    fontSize: isMobile ? '1.5rem' : '2rem', 
                    color: '#667eea', 
                    marginBottom: '10px' 
                  }}>🌍</div>
                  <div style={{ 
                    fontSize: isMobile ? '1.2rem' : '1.5rem', 
                    fontWeight: 'bold', 
                    color: '#333', 
                    marginBottom: '5px' 
                  }}>0</div>
                  <div style={{ 
                    color: '#666', 
                    fontSize: isMobile ? '0.8rem' : '0.9rem' 
                  }}>Countries Visited</div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? '15px' : '20px', 
                  background: '#f8f9fa', 
                  borderRadius: '15px' 
                }}>
                  <div style={{ 
                    fontSize: isMobile ? '1.5rem' : '2rem', 
                    color: '#667eea', 
                    marginBottom: '10px' 
                  }}>⭐</div>
                  <div style={{ 
                    fontSize: isMobile ? '1.2rem' : '1.5rem', 
                    fontWeight: 'bold', 
                    color: '#333', 
                    marginBottom: '5px' 
                  }}>0</div>
                  <div style={{ 
                    color: '#666', 
                    fontSize: isMobile ? '0.8rem' : '0.9rem' 
                  }}>Favorite Places</div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: '2px solid #ffeaa7'
            }}>
              <h2 style={{ 
                margin: '0 0 15px', 
                color: '#e17055',
                fontSize: isMobile ? '1.2rem' : '1.5rem'
              }}>⚠️ Danger Zone</h2>
              <p style={{ 
                color: '#666', 
                marginBottom: '20px',
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={handleDeleteAccount}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: isMobile ? '14px 20px' : '12px 25px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Delete Account
              </button>
            </div>

          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}