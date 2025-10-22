/**
 * Filter Bar Component
 * 
 * Filter buttons for attraction recommendations
 */

import React from 'react';
import { FilterType } from '../types';

interface FilterBarProps {
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
  isDarkMode: boolean;
  isMobile: boolean;
}

const filters: FilterType[] = ['All', 'Top Rated', 'Popular', 'Hidden Gems'];

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  setActiveFilter,
  isDarkMode,
  isMobile
}) => {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '24px',
      justifyContent: isMobile ? 'center' : 'flex-start'
    }}>
      {filters.map(filter => (
        <button
          key={filter}
          onClick={() => setActiveFilter(filter)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: activeFilter === filter
              ? `2px solid ${isDarkMode ? '#3b82f6' : '#2563eb'}`
              : isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
            background: activeFilter === filter
              ? isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)'
              : isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
            color: activeFilter === filter
              ? isDarkMode ? '#93c5fd' : '#2563eb'
              : isDarkMode ? '#e8eaed' : '#1f2937',
            fontSize: '0.9rem',
            fontWeight: activeFilter === filter ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (activeFilter !== filter) {
              e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f9fafb';
            }
          }}
          onMouseLeave={(e) => {
            if (activeFilter !== filter) {
              e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff';
            }
          }}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};
