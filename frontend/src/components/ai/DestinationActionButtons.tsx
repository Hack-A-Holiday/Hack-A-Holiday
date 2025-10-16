import React from 'react';

interface DestinationActionButtonsProps {
  destination: string;
  origin?: string;
  dates?: {
    departure: string;
    return?: string;
  };
  onRestaurantsClick: (destination: string) => void;
  onActivitiesClick: (destination: string) => void;
  isDarkMode: boolean;
}

const DestinationActionButtons: React.FC<DestinationActionButtonsProps> = ({
  destination,
  origin,
  dates,
  onRestaurantsClick,
  onActivitiesClick,
  isDarkMode
}) => {
  const buttonBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    flex: '1',
    justifyContent: 'center',
    minWidth: '140px'
  };

  const restaurantsButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white'
  };

  const activitiesButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: 'white'
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  };

  return (
    <div style={{
      marginTop: '20px',
      paddingTop: '16px',
      borderTop: isDarkMode ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(102, 126, 234, 0.2)'
    }}>
      <div style={{
        fontSize: '0.9rem',
        fontWeight: '600',
        color: isDarkMode ? '#aaa' : '#666',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        🌍 Explore {destination}
      </div>
      
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => onRestaurantsClick(destination)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={restaurantsButtonStyle}
        >
          <span style={{ fontSize: '1.2rem' }}>🍽️</span>
          <span>Popular Restaurants</span>
        </button>
        
        <button
          onClick={() => onActivitiesClick(destination)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={activitiesButtonStyle}
        >
          <span style={{ fontSize: '1.2rem' }}>🎯</span>
          <span>Popular Activities</span>
        </button>
      </div>
    </div>
  );
};

export default DestinationActionButtons;
