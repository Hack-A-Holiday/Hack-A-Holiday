import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import Swal from 'sweetalert2';

export default function Navbar() {
  // Toggle user menu dropdown
  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    // Redirect to login
    router.push('/');
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  const { state, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fix: Define toggleMobileMenu to toggle the mobile menu state
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };
  // user menu controls (Dark Mode / Clear History) are rendered in the dropdown below

  // Fix: getLinkStyle function for navigation links
  const getLinkStyle = (path: string) => {
    const isActive = router.pathname === path || (path === '/plantrip' && router.pathname === '/ai-agent');
    return {
      textDecoration: 'none',
      color: isActive ? '#667eea' : (isDarkMode ? '#e0e0e0' : '#666'),
      fontWeight: isActive ? '600' : '400',
      transition: 'color 0.2s ease'
    };
  };

  return (
    <nav className="navbar" style={{
      backdropFilter: 'blur(15px)',
      padding: '0',
      height: isMobile ? '60px' : '80px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: isDarkMode ? '0 2px 15px rgba(0, 0, 0, 0.3)' : '0 2px 15px rgba(0, 0, 0, 0.08)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100%'
      }}>
        {/* Logo - Home button only */}
        <Link href="/home" className="nav-brand" style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: isMobile ? '1.2rem' : '1.5rem'
        }}>
          <Image
            src="/Hack Travel.png"
            alt="Hack Travel Logo"
            width={isMobile ? 200 : 280}
            height={isMobile ? 60 : 80}
            style={{
              objectFit: 'contain'
            }}
          />
        </Link>

        {/* Mobile Menu Button */}
        {state.user && (
          <button
            onClick={toggleMobileMenu}
            style={{
              display: isMobile ? 'flex' : 'none',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              padding: 0
            }}
            aria-label="Toggle mobile menu"
          >
            <span style={{
              display: 'block',
              width: '24px',
              height: '2px',
              background: '#667eea',
              transition: 'transform 0.3s ease',
              transform: isMobileMenuOpen ? 'rotate(45deg) translateY(8px)' : 'none'
            }} />
            <span style={{
              display: 'block',
              width: '24px',
              height: '2px',
              background: '#667eea',
              opacity: isMobileMenuOpen ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }} />
            <span style={{
              display: 'block',
              width: '24px',
              height: '2px',
              background: '#667eea',
              transition: 'transform 0.3s ease',
              transform: isMobileMenuOpen ? 'rotate(-45deg) translateY(-8px)' : 'none'
            }} />
          </button>
        )}

        {/* Desktop Navigation */}
        {state.user && (
          <div style={{
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <Link href="/plantrip" className={`nav-link ${router.pathname === '/plantrip' ? 'active' : ''}`}>
              Plan Trip
            </Link>
            <Link href="/ai-assistant" className={`nav-link ${router.pathname === '/ai-assistant' ? 'active' : ''}`}>
              AI Assistant
            </Link>
            <Link href="/flight-search" className={`nav-link ${router.pathname === '/flight-search' ? 'active' : ''}`}>
              Flight & Hotel Search
            </Link>

            {/* User Menu Dropdown */}
            <div ref={userMenuRef} style={{ position: 'relative', marginLeft: '20px' }}>
              <button
                onClick={toggleUserMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  transition: 'background 0.2s ease',
                  backgroundColor: isUserMenuOpen ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.1)') : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isUserMenuOpen) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(102, 126, 234, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isUserMenuOpen) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  {state.user.name ? state.user.name[0].toUpperCase() : state.user.email[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    color: isDarkMode ? '#e0e0e0' : '#333',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {state.user.name || 'User'}
                  </div>
                  <div style={{
                    color: isDarkMode ? '#999' : '#666',
                    fontSize: '0.75rem',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {state.user.email}
                  </div>
                </div>
                <span style={{
                  color: isDarkMode ? '#999' : '#666',
                  fontSize: '0.8rem',
                  transition: 'transform 0.2s ease',
                  transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  ▼
                </span>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: isDarkMode ? '#2a2a2a' : 'white',
                  borderRadius: '12px',
                  boxShadow: isDarkMode ? '0 8px 30px rgba(0, 0, 0, 0.5)' : '0 8px 30px rgba(0, 0, 0, 0.15)',
                  minWidth: '220px',
                  overflow: 'hidden',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                  zIndex: 1001
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                    background: isDarkMode ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)'
                  }}>
                    <div style={{
                      color: isDarkMode ? '#e0e0e0' : '#333',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {state.user.name || 'User'}
                    </div>
                    <div style={{
                      color: isDarkMode ? '#999' : '#666',
                      fontSize: '0.75rem'
                    }}>
                      {state.user.email}
                    </div>
                  </div>

                  <div style={{ padding: '8px 0' }}>
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        textDecoration: 'none',
                        color: isDarkMode ? '#e0e0e0' : '#333',
                        transition: 'background 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(102, 126, 234, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>👤</span>
                      <span style={{ fontSize: '0.9rem' }}>Profile</span>
                    </Link>

                    <button
                      onClick={() => {
                        toggleDarkMode();
                        setIsUserMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: isDarkMode ? '#e0e0e0' : '#333',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(102, 126, 234, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{isDarkMode ? '🌙' : '☀️'}</span>
                        <span>Dark Mode</span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '20px',
                        borderRadius: '10px',
                        background: isDarkMode ? '#667eea' : '#ccc',
                        position: 'relative',
                        transition: 'background 0.3s ease'
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: 'white',
                          position: 'absolute',
                          top: '2px',
                          left: isDarkMode ? '22px' : '2px',
                          transition: 'left 0.3s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </button>

                    <div style={{
                      height: '1px',
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e0e0e0',
                      margin: '8px 0'
                    }} />

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
                          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                          const response = await fetch(`${apiUrl}/ai-agent/user-sessions/${state.user.id}`, {
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
                          setIsUserMenuOpen(false);
                          await Swal.fire('Cleared', 'All chat history has been removed from the server.', 'success');
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
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        textAlign: 'left',
                        cursor: isClearingHistory ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isClearingHistory) e.currentTarget.style.background = isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{isClearingHistory ? '...' : '🗑️'}</span>
                      <span style={{ fontSize: '0.9rem' }}>{isClearingHistory ? 'Clearing...' : 'Clear All Chat History'}</span>
                    </button>

                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: '#ff4444',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDarkMode ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 68, 68, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {state.user && isMobile && isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '73px',
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode ? 'rgba(20, 20, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          padding: '20px',
          zIndex: 999
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* User Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '20px',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '15px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                {state.user.name ? state.user.name[0].toUpperCase() : state.user.email[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '600', color: isDarkMode ? '#e0e0e0' : '#333', fontSize: '1.1rem' }}>
                  {state.user.name || 'Travel Enthusiast'}
                </div>
                <div style={{ color: isDarkMode ? '#999' : '#666', fontSize: '0.9rem' }}>
                  {state.user.email}
                </div>
              </div>
            </div>

            {/* Mobile Navigation Links */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <Link href="/plantrip" onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color: router.pathname === '/plantrip' ? '#667eea' : (isDarkMode ? '#e0e0e0' : '#333'),
                fontSize: '1.2rem',
                fontWeight: router.pathname === '/plantrip' ? '600' : '400',
                padding: '15px 20px',
                borderRadius: '10px',
                background: router.pathname === '/plantrip' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: router.pathname === '/plantrip' ? '2px solid rgba(102, 126, 234, 0.2)' : '2px solid transparent',
                display: 'block'
              }}>
                ✈️ Plan Trip
              </Link>
              <Link href="/ai-assistant" onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color: router.pathname === '/ai-assistant' ? '#667eea' : '#333',
                fontSize: '1.2rem',
                fontWeight: router.pathname === '/ai-assistant' ? '600' : '400',
                padding: '15px 20px',
                borderRadius: '10px',
                background: router.pathname === '/ai-assistant' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: router.pathname === '/ai-assistant' ? '2px solid rgba(102, 126, 234, 0.2)' : '2px solid transparent',
                display: 'block'
              }}>
                🤖 AI Assistant
              </Link>
              <Link href="/flight-search" onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color: router.pathname === '/flight-search' ? '#667eea' : (isDarkMode ? '#e0e0e0' : '#333'),
                fontSize: '1.2rem',
                fontWeight: router.pathname === '/flight-search' ? '600' : '400',
                padding: '15px 20px',
                borderRadius: '10px',
                background: router.pathname === '/flight-search' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: router.pathname === '/flight-search' ? '2px solid rgba(102, 126, 234, 0.2)' : '2px solid transparent',
                display: 'block'
              }}>
                🔍 Flight & Hotel Search
              </Link>
              <Link href="/profile" onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color: router.pathname === '/profile' ? '#667eea' : (isDarkMode ? '#e0e0e0' : '#333'),
                fontSize: '1.2rem',
                fontWeight: router.pathname === '/profile' ? '600' : '400',
                padding: '15px 20px',
                borderRadius: '10px',
                background: router.pathname === '/profile' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: router.pathname === '/profile' ? '2px solid rgba(102, 126, 234, 0.2)' : '2px solid transparent',
                display: 'block'
              }}>
                � Profile
              </Link>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                toggleDarkMode();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px 20px',
                borderRadius: '10px',
                background: 'transparent',
                border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                color: isDarkMode ? '#e0e0e0' : '#333',
                fontSize: '1.1rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>{isDarkMode ? '🌙' : '☀️'}</span>
                <span>Dark Mode</span>
              </div>
              <div style={{
                width: '50px',
                height: '26px',
                borderRadius: '13px',
                background: isDarkMode ? '#667eea' : '#ccc',
                position: 'relative',
                transition: 'background 0.3s ease'
              }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: isDarkMode ? '26px' : '2px',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
            </button>

            {/* Mobile Sign Out Button */}
            <button
              onClick={() => {
                handleLogout();
                closeMobileMenu();
              }}
              style={{
                background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                color: 'white',
                border: 'none',
                padding: '15px 20px',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                marginTop: '20px'
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}