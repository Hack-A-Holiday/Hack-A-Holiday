/**
 * Travel Tips Component
 * 
 * Displays helpful tips for booking flights
 */

import React from 'react';

interface TravelTipsProps {
  isDarkMode: boolean;
  isMobile: boolean;
  isTablet: boolean;
}

const tips = [
  {
    icon: '📅',
    title: 'Book in Advance',
    description: 'Best prices are typically found 2-3 months before departure for domestic flights and 3-6 months for international.',
    color: 'rgba(59, 130, 246'
  },
  {
    icon: '🕐',
    title: 'Flexible Dates',
    description: 'Flying mid-week (Tuesday-Thursday) or during off-peak hours can save you up to 30% on ticket prices.',
    color: 'rgba(16, 185, 129'
  },
  {
    icon: '🔄',
    title: 'Compare Airlines',
    description: 'Check multiple airlines and booking sites. Budget carriers may offer lower base fares but charge for extras.',
    color: 'rgba(245, 158, 11'
  },
  {
    icon: '🎯',
    title: 'Set Price Alerts',
    description: 'Monitor prices for your route and get notified when fares drop. Prices can fluctuate significantly.',
    color: 'rgba(139, 92, 246'
  }
];

export const TravelTips: React.FC<TravelTipsProps> = ({ isDarkMode, isMobile, isTablet }) => {
  return (
    <div style={{
      marginBottom: '40px'
    }}>
      <h2 style={{
        fontSize: isMobile ? '1.8rem' : '2.2rem',
        fontWeight: '600',
        marginBottom: '30px',
        color: isDarkMode ? '#e8eaed' : '#1f2937'
      }}>
        💡 Flight Search Tips
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr',
        gap: '20px'
      }}>
        {tips.map((tip, index) => (
          <div key={index} style={{
            padding: '20px',
            background: isDarkMode ? `${tip.color}, 0.1)` : `${tip.color}, 0.05)`,
            borderRadius: '12px',
            border: isDarkMode ? `1px solid ${tip.color}, 0.2)` : `1px solid ${tip.color}, 0.1)`
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: '12px'
            }}>
              {tip.icon}
            </div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '8px',
              color: isDarkMode ? '#e8eaed' : '#1f2937'
            }}>
              {tip.title}
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              margin: 0
            }}>
              {tip.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
