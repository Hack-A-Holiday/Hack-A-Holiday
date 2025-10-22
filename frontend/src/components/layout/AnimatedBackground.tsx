/**
 * Animated Background Component
 * 
 * Reusable glowing orb background with configurable positions for different pages
 */

import React from 'react';

interface Orb {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
  height: string;
  color: string;
  animation: string;
}

interface AnimatedBackgroundProps {
  isDarkMode: boolean;
  variant?: 'ai-assistant' | 'flight-search' | 'plan-trip';
  children?: React.ReactNode;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
  isDarkMode, 
  variant = 'ai-assistant',
  children 
}) => {
  
  // Define orb configurations for each page variant
  const orbConfigs: Record<string, Orb[]> = {
    'ai-assistant': [
      {
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
        animation: 'float 6s ease-in-out infinite'
      },
      {
        bottom: '20%',
        right: '15%',
        width: '200px',
        height: '200px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite reverse'
      }
    ],
    'flight-search': [
      {
        top: '5%',
        right: '8%',
        width: '350px',
        height: '350px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)',
        animation: 'float 7s ease-in-out infinite'
      },
      {
        top: '40%',
        left: '5%',
        width: '250px',
        height: '250px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%)',
        animation: 'float 9s ease-in-out infinite reverse'
      },
      {
        bottom: '15%',
        right: '25%',
        width: '180px',
        height: '180px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(236, 72, 153, 0.04) 0%, transparent 70%)',
        animation: 'float 5s ease-in-out infinite'
      }
    ],
    'plan-trip': [
      {
        top: '15%',
        left: '5%',
        width: '280px',
        height: '280px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite'
      },
      {
        top: '8%',
        right: '12%',
        width: '220px',
        height: '220px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)',
        animation: 'float 6s ease-in-out infinite reverse'
      },
      {
        bottom: '25%',
        left: '15%',
        width: '200px',
        height: '200px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(251, 146, 60, 0.11) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(251, 146, 60, 0.04) 0%, transparent 70%)',
        animation: 'float 7s ease-in-out infinite'
      },
      {
        bottom: '10%',
        right: '20%',
        width: '240px',
        height: '240px',
        color: isDarkMode 
          ? 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
        animation: 'float 9s ease-in-out infinite reverse'
      }
    ]
  };

  const orbs = orbConfigs[variant] || orbConfigs['ai-assistant'];

  return (
    <>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        {orbs.map((orb, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: orb.top,
              bottom: orb.bottom,
              left: orb.left,
              right: orb.right,
              width: orb.width,
              height: orb.height,
              background: orb.color,
              borderRadius: '50%',
              animation: orb.animation,
              filter: 'blur(40px)',
              opacity: 0.7
            }}
          />
        ))}
      </div>

      {/* Float animation keyframes */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-30px) translateX(20px) rotate(2deg);
          }
          66% {
            transform: translateY(-20px) translateX(-15px) rotate(-2deg);
          }
        }
      `}</style>

      {/* Content */}
      {children}
    </>
  );
};

export default AnimatedBackground;
