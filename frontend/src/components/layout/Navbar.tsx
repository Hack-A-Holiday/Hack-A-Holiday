import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getLinkStyle = (path: string) => ({
    textDecoration: 'none',
    color: router.pathname === path ? '#667eea' : '#666',
    fontWeight: router.pathname === path ? '600' : '400',
    transition: 'color 0.2s ease'
  });

  return (
    <nav style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '12px 0',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo */}
        <Link href={state.user ? "/home" : "/"} style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          color: '#667eea',
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem'
        }}>
          <span style={{ marginRight: '8px' }}>✈️</span>
          {isMobile ? 'TC' : 'Travel Companion'}
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
            <Link href="/home" style={getLinkStyle('/home')}>
              Home
            </Link>
            <Link href="/dashboard" style={getLinkStyle('/dashboard')}>
              Plan Trip
            </Link>
            <Link href="/profile" style={getLinkStyle('/profile')}>
              Profile
            </Link>

            {/* User Menu */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginLeft: '20px',
              paddingLeft: '20px',
              borderLeft: '1px solid #e0e0e0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  {state.user.name ? state.user.name[0].toUpperCase() : state.user.email[0].toUpperCase()}
                </div>
                <span style={{
                  color: '#666',
                  fontSize: '0.9rem',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {state.user.name || state.user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Sign Out
              </button>
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
          background: 'rgba(255, 255, 255, 0.98)',
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
                <div style={{ fontWeight: '600', color: '#333', fontSize: '1.1rem' }}>
                  {state.user.name || 'Travel Enthusiast'}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
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
              <Link href="/home" onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color: router.pathname === '/home' ? '#667eea' : '#333',
                fontSize: '1.2rem',
                fontWeight: router.pathname === '/home' ? '600' : '400',
                padding: '15px 20px',
                borderRadius: '10px',
                background: router.pathname === '/home' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: router.pathname === '/home' ? '2px solid rgba(102, 126, 234, 0.2)' : '2px solid transparent',
                display: 'block'
              }}>
                🏠 Home
              </Link>
              <Link href="/dashboard" onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color: router.pathname === '/dashboard' ? '#667eea' : '#333',
                fontSize: '1.2rem',
                fontWeight: router.pathname === '/dashboard' ? '600' : '400',
                padding: '15px 20px',
                borderRadius: '10px',
                background: router.pathname === '/dashboard' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: router.pathname === '/dashboard' ? '2px solid rgba(102, 126, 234, 0.2)' : '2px solid transparent',
                display: 'block'
              }}>
                ✈️ Plan Trip
              </Link>
              <Link href="/profile" onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color: router.pathname === '/profile' ? '#667eea' : '#333',
                fontSize: '1.2rem',
                fontWeight: router.pathname === '/profile' ? '600' : '400',
                padding: '15px 20px',
                borderRadius: '10px',
                background: router.pathname === '/profile' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: router.pathname === '/profile' ? '2px solid rgba(102, 126, 234, 0.2)' : '2px solid transparent',
                display: 'block'
              }}>
                👤 Profile
              </Link>
            </div>

            {/* Mobile Sign Out Button */}
            <button
              onClick={() => {
                handleLogout();
                closeMobileMenu();
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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