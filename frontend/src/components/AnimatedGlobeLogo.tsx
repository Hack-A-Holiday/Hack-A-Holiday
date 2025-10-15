import React from 'react';

const AnimatedGlobeLogo: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {/* Earth Globe - flat design like the reference */}
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Ocean */}
        <circle cx="50" cy="50" r="48" fill="#2c7fb8" />
        
        {/* North America */}
        <path
          d="M25,20 Q20,25 20,30 L22,35 Q25,38 30,36 L35,34 Q38,30 40,28 L42,25 Q38,20 30,18 Z"
          fill="#7fbc41"
        />
        
        {/* South America */}
        <path
          d="M32,48 Q30,52 28,58 L26,65 Q28,70 32,72 L36,70 Q38,65 37,60 L35,52 Q33,48 32,48 Z"
          fill="#7fbc41"
        />
        
        {/* Europe */}
        <path
          d="M48,18 L52,20 Q55,22 58,20 L60,18 Q58,15 54,16 L50,17 Z"
          fill="#7fbc41"
        />
        
        {/* Africa */}
        <path
          d="M48,28 Q46,32 48,38 L50,48 Q52,54 55,58 L58,60 Q60,58 62,54 L60,45 Q58,35 56,30 L54,26 Q50,26 48,28 Z"
          fill="#7fbc41"
        />
        
        {/* Asia */}
        <path
          d="M62,20 Q60,24 62,30 L68,35 Q72,38 78,36 L82,32 Q84,28 82,24 L78,22 Q72,18 68,20 L62,20 Z"
          fill="#7fbc41"
        />
        
        {/* Australia */}
        <path
          d="M72,58 Q70,62 72,66 L76,68 Q80,66 82,62 L80,58 Q76,56 72,58 Z"
          fill="#7fbc41"
        />
        
        {/* Subtle shading */}
        <circle cx="50" cy="50" r="48" fill="url(#globeShading)" opacity="0.3" />
        
        <defs>
          <radialGradient id="globeShading">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
          </radialGradient>
        </defs>
      </svg>

      {/* X-Axis Orbital Path (Equatorial - Horizontal circle) */}
      <svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        <ellipse
          cx={size / 2}
          cy={size / 2}
          rx={size * 0.4}
          ry={size * 0.4}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4,6"
          opacity="0.7"
        />
      </svg>

      {/* Y-Axis Orbital Path (Vertical circle through poles) */}
      <svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        <ellipse
          cx={size / 2}
          cy={size / 2}
          rx={size * 0.12}
          ry={size * 0.4}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4,6"
          opacity="0.7"
        />
      </svg>

      {/* Z-Axis Orbital Path (Vertical circle perpendicular to Y) */}
      <svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        <ellipse
          cx={size / 2}
          cy={size / 2}
          rx={size * 0.4}
          ry={size * 0.12}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4,6"
          opacity="0.7"
        />
      </svg>

      {/* Cloud 1 - Top left */}
      <svg
        width={size * 0.22}
        height={size * 0.15}
        viewBox="0 0 50 30"
        style={{
          position: 'absolute',
          top: `${size * 0.08}px`,
          left: `${size * 0.05}px`,
        }}
      >
        <ellipse cx="15" cy="20" rx="10" ry="8" fill="#ffffff" />
        <ellipse cx="25" cy="17" rx="12" ry="10" fill="#ffffff" />
        <ellipse cx="35" cy="20" rx="9" ry="7" fill="#ffffff" />
      </svg>

      {/* Cloud 2 - Right side */}
      <svg
        width={size * 0.25}
        height={size * 0.18}
        viewBox="0 0 50 30"
        style={{
          position: 'absolute',
          top: `${size * 0.22}px`,
          right: `${size * 0.02}px`,
        }}
      >
        <ellipse cx="15" cy="20" rx="10" ry="8" fill="#ffffff" />
        <ellipse cx="25" cy="17" rx="12" ry="10" fill="#ffffff" />
        <ellipse cx="35" cy="20" rx="9" ry="7" fill="#ffffff" />
      </svg>

      {/* Cloud 3 - Bottom left */}
      <svg
        width={size * 0.2}
        height={size * 0.14}
        viewBox="0 0 50 30"
        style={{
          position: 'absolute',
          bottom: `${size * 0.15}px`,
          left: `${size * 0.08}px`,
        }}
      >
        <ellipse cx="15" cy="20" rx="10" ry="8" fill="#ffffff" />
        <ellipse cx="25" cy="17" rx="12" ry="10" fill="#ffffff" />
        <ellipse cx="35" cy="20" rx="9" ry="7" fill="#ffffff" />
      </svg>

      {/* Plane 1 - X-Axis at (0,0) - Right side of equator */}
      <svg
        width={size * 0.28}
        height={size * 0.28}
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          top: '50%',
          left: `${size * 0.9}px`,
          transform: 'translate(-50%, -50%) rotate(0deg)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        <path
          d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"
          fill="#ffffff"
        />
      </svg>

      {/* Plane 2 - Y-Axis at (0,0) - Top of vertical orbit */}
      <svg
        width={size * 0.28}
        height={size * 0.28}
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          top: `${size * 0.1}px`,
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        <path
          d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"
          fill="#ffffff"
        />
      </svg>

      {/* Plane 3 - Z-Axis at (0,0) - Front of horizontal orbit */}
      <svg
        width={size * 0.28}
        height={size * 0.28}
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(0deg) translateY(-100%)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        <path
          d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
};

export default AnimatedGlobeLogo;
