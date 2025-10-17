import React from 'react';
import Head from 'next/head';

interface WelcomeScreenProps {
  isDarkMode: boolean;
  isMobile: boolean;
  onStartChat: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ isDarkMode, isMobile, onStartChat }) => {
  return (
    <div style={{
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: isMobile ? '20px 16px' : '40px 24px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* AI Icon */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '32px',
          boxShadow: '0 25px 50px rgba(102, 126, 234, 0.4)',
          marginBottom: '40px',
          animation: 'pulse 3s ease-in-out infinite alternate'
        }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H14L20 9H21ZM17.5 12C17.78 12 18 12.22 18 12.5V18.5C18 18.78 17.78 19 17.5 19H14.5C14.22 19 14 18.78 14 18.5V12.5C14 12.22 14.22 12 14.5 12H17.5ZM16 10.5C16.83 10.5 17.5 11.17 17.5 12H14.5C14.5 11.17 15.17 10.5 16 10.5Z"/>
          </svg>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: isMobile ? '3rem' : '4.5rem',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: '0 0 24px 0',
          letterSpacing: '-0.02em',
          lineHeight: '1.1'
        }}>
          AI Travel Assistant
        </h1>

        {/* Description */}
        <p style={{
          fontSize: isMobile ? '1.2rem' : '1.5rem',
          color: isDarkMode ? '#94a3b8' : '#64748b',
          margin: '0 auto 48px auto',
          maxWidth: '700px',
          lineHeight: '1.6',
          fontWeight: '400'
        }}>
          Your intelligent travel companion powered by advanced AI. 
          Plan trips, discover destinations, and get personalized recommendations.
        </p>

        {/* Start Chat Button */}
        <button
          onClick={onStartChat}
          style={{
            padding: isMobile ? '18px 40px' : '24px 48px',
            fontSize: isMobile ? '1.1rem' : '1.3rem',
            fontWeight: '700',
            color: 'white',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: '200% 200%',
            backgroundPosition: '100% 100%',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            transition: 'background-position 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, transform 0.3s ease',
            boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
            position: 'relative',
            overflow: 'hidden',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #5b68e6 30%, #8b5cf6 70%, #9333ea 100%)';
            e.currentTarget.style.backgroundSize = '200% 200%';
            e.currentTarget.style.backgroundPosition = '0% 0%';
            e.currentTarget.style.boxShadow = '0 25px 50px rgba(139, 92, 246, 0.6)';
            e.currentTarget.style.transform = 'scale(1.01)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            e.currentTarget.style.backgroundSize = '200% 200%';
            e.currentTarget.style.backgroundPosition = '100% 100%';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.4)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Start Chat
        </button>

        {/* Features */}
        <div style={{
          marginTop: '80px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '32px',
          maxWidth: '900px',
          margin: '80px auto 0'
        }}>
          {[
            { icon: '✈️', title: 'Flight Planning', desc: 'Find best flights and routes' },
            { icon: '🏨', title: 'Hotel Booking', desc: 'Discover perfect accommodations' },
            { icon: '🗺️', title: 'Itinerary Creation', desc: 'Plan detailed travel schedules' }
          ].map((feature, idx) => (
            <div key={idx} style={{
              textAlign: 'center',
              padding: '24px',
              background: isDarkMode 
                ? 'rgba(30, 41, 59, 0.4)' 
                : 'rgba(255, 255, 255, 0.6)',
              borderRadius: '20px',
              border: isDarkMode 
                ? '1px solid rgba(148, 163, 184, 0.1)' 
                : '1px solid rgba(226, 232, 240, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: isDarkMode 
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                margin: '0 0 8px 0'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '0.95rem',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                margin: 0,
                lineHeight: '1.4'
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};