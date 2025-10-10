/**
 * Booking Confirmation Modal
 * Shows when user returns from booking tabs
 */

import React, { useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface BookingConfirmationModalProps {
  bookingData: {
    type: 'flight' | 'package' | 'hotel' | 'vacation';
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    details: any;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  bookingData,
  onConfirm,
  onCancel
}) => {
  const { isDarkMode } = useDarkMode();
  const [isAnimating, setIsAnimating] = useState(true);

  React.useEffect(() => {
    setTimeout(() => setIsAnimating(false), 300);
  }, []);

  const getBookingTypeLabel = () => {
    switch (bookingData.type) {
      case 'flight': return '✈️ Flight Booking';
      case 'package': return '🎫 Round-Trip Package';
      case 'hotel': return '🏨 Hotel Booking';
      case 'vacation': return '🎁 Complete Vacation Package';
      default: return '📝 Booking';
    }
  };

  const getBookingDescription = () => {
    const { origin, destination, departureDate, returnDate } = bookingData;
    
    if (bookingData.type === 'hotel') {
      return `${destination} • ${departureDate} to ${returnDate}`;
    }
    
    if (returnDate) {
      return `${origin} → ${destination} • Round-trip`;
    }
    
    return `${origin} → ${destination} • One-way`;
  };

  return (
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
        animation: 'fadeIn 0.3s ease',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

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
          animation: 'slideUp 0.3s ease',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative gradient background */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              fontSize: '72px',
              marginBottom: '20px',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            🎉
          </div>
          <h2
            style={{
              margin: '0 0 12px 0',
              fontSize: '28px',
              fontWeight: '700',
              color: isDarkMode ? '#e8eaed' : '#2c3e50'
            }}
          >
            Welcome Back!
          </h2>
          <p
            style={{
              margin: 0,
              color: isDarkMode ? '#9ca3af' : '#6c757d',
              fontSize: '16px',
              lineHeight: '1.5'
            }}
          >
            Did you successfully plan your trip?
          </p>
        </div>

        {/* Booking Info Card */}
        <div
          style={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
              : 'linear-gradient(135deg, #f0f4ff 0%, #fff0f8 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            border: isDarkMode 
              ? '1px solid rgba(102, 126, 234, 0.3)' 
              : '2px solid rgba(102, 126, 234, 0.2)'
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: isDarkMode ? '#8b9cff' : '#667eea',
              marginBottom: '12px'
            }}
          >
            {getBookingTypeLabel()}
          </div>
          
          <div
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: isDarkMode ? '#e8eaed' : '#2c3e50',
              marginBottom: '8px'
            }}
          >
            {getBookingDescription()}
          </div>

          <div
            style={{
              fontSize: '14px',
              color: isDarkMode ? '#9ca3af' : '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📅</span>
            <span>
              {new Date(bookingData.departureDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
              {bookingData.returnDate && ` - ${new Date(bookingData.returnDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f2f5',
              color: isDarkMode ? '#e8eaed' : '#495057',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
              padding: '16px 24px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.background = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#e4e6eb';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.background = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f2f5';
            }}
          >
            Not Yet
          </button>

          <button
            onClick={onConfirm}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            ✅ Yes, Trip Planned!
          </button>
        </div>

        {/* Helper Text */}
        <p
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: isDarkMode ? '#6b7280' : '#9ca3af',
            lineHeight: '1.5'
          }}
        >
          Confirming will add this trip to your profile and update your travel statistics.
        </p>
      </div>
    </div>
  );
};
