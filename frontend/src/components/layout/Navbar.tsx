import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';

export default function Navbar() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const getLinkStyle = (path: string) => ({
    textDecoration: 'none',
    color: router.pathname === path ? '#667eea' : (isDarkMode ? '#e0e0e0' : '#666'),
    fontWeight: router.pathname === path ? '600' : '400',
    transition: 'color 0.2s ease'
  });

  return (
    <nav style={{
      background: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
      padding: '12px 0',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: isDarkMode ? '0 2px 20px rgba(0, 0, 0, 0.5)' : '0 2px 20px rgba(0, 0, 0, 0.1)',
      transition: 'background 0.3s ease, border-color 0.3s ease'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo - Home button only */}
        <Link href="/home" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          color: '#667eea',
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem'
        }}>
          <span style={{ marginRight: '8px' }}>🌍</span>
          {isMobile ? 'HAH' : 'Hack-A-Holiday'}
        </Link>

        {/* Mobile Menu Button */}
        {state.user && (
          <button
            onClick={toggleMobileMenu}
            style={{
              display: isMobile ? 'block' : 'none',
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#667eea'
            }}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        )}

        {/* Desktop Navigation */}
        {state.user && (
          <div style={{
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <Link href="/plantrip" style={getLinkStyle('/plantrip')}>
              Plan Trip
            </Link>
            <Link href="/flight-search" style={getLinkStyle('/flight-search')}>
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