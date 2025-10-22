/**
 * Hotel Search Form Component
 * 
 * Provides hotel search interface with destination autocomplete,
 * date pickers, and guest count selection.
 */

import React from 'react';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface HotelSearchFormProps {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  loading: boolean;
  suggestions: string[];
  showSuggestions: boolean;
  onDestinationChange: (value: string) => void;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  onGuestsChange: (count: number) => void;
  onSuggestionSelect: (suggestion: string) => void;
  onSearch: () => void;
  onSuggestionsShow: (show: boolean) => void;
  isMobile?: boolean;
}

export default function HotelSearchForm({
  destination,
  checkIn,
  checkOut,
  guests,
  loading,
  suggestions,
  showSuggestions,
  onDestinationChange,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onSuggestionSelect,
  onSearch,
  onSuggestionsShow,
  isMobile = false
}: HotelSearchFormProps) {
  const { isDarkMode } = useDarkMode();

  return (
    <>
      <h2 style={{
        fontSize: isMobile ? '1.8rem' : '2.2rem',
        fontWeight: '600',
        marginBottom: '30px',
        color: isDarkMode ? '#e8eaed' : '#1f2937'
      }}>
        🏨 Hotel Search
      </h2>

      <p style={{
        fontSize: '1rem',
        color: isDarkMode ? '#9ca3af' : '#6b7280',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        Find the perfect accommodation for your trip. Search hotels by destination and dates.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Destination Input with Autocomplete */}
        <div style={{ position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
            fontSize: '14px'
          }}>
            📍 Destination
          </label>
          <input
            type="text"
            placeholder="Enter city or hotel name"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            onFocus={() => destination.length >= 2 && onSuggestionsShow(true)}
            onBlur={() => setTimeout(() => onSuggestionsShow(false), 200)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
              borderRadius: '10px',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: isDarkMode ? '#1a1f2e' : 'white',
              border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
              borderRadius: '10px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    onSuggestionSelect(suggestion);
                    onSuggestionsShow(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: index < suggestions.length - 1 ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e1e5e9'}` : 'none',
                    color: isDarkMode ? '#e8eaed' : '#000',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  📍 {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-in Date */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
            fontSize: '14px'
          }}>
            📅 Check-in Date
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => onCheckInChange(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
              borderRadius: '10px',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        {/* Check-out Date */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
            fontSize: '14px'
          }}>
            📅 Check-out Date
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => onCheckOutChange(e.target.value)}
            min={checkIn || new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
              borderRadius: '10px',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        {/* Guests Count */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: isDarkMode ? '#e8eaed' : '#495057',
            fontSize: '14px'
          }}>
            👥 Guests
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={guests}
            onChange={(e) => onGuestsChange(parseInt(e.target.value) || 1)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9',
              borderRadius: '10px',
              background: isDarkMode ? '#1a1f2e' : '#fafbfc',
              color: isDarkMode ? '#e8eaed' : '#000',
              fontSize: '16px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* Search Button */}
      <button
        onClick={onSearch}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? '⏳ Searching...' : '🔍 Search Hotels'}
      </button>
    </>
  );
}
