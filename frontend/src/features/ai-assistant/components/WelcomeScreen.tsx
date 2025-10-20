import React from 'react';
import Head from 'next/head';

interface WelcomeScreenProps {
  isDarkMode: boolean;
  isMobile: boolean;
  onStartChat: () => void;
  chatSessions?: any[];
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ isDarkMode, isMobile, onStartChat, chatSessions }) => {
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

        {/* User Chat History */}
        {chatSessions && chatSessions.length > 0 && (
          <div style={{
            marginTop: '60px',
            textAlign: 'left',
            maxWidth: '600px',
            margin: '60px auto 0',
            background: isDarkMode ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.7)',
            borderRadius: '18px',
            padding: '32px',
            boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '18px', color: isDarkMode ? '#fff' : '#222' }}>Your Recent Chats</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {chatSessions.map(sess => (
                <li key={sess._id} style={{
                  marginBottom: '18px',
                  paddingBottom: '12px',
                  borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: isDarkMode ? '#fff' : '#222' }}>{sess.preview || 'New chat'}</div>
                  <div style={{ fontSize: '0.95rem', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>{new Date(sess.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};