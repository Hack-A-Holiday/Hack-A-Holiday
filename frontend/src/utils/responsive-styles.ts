/**
 * Responsive Style Utilities
 * 
 * Helper functions for creating responsive inline styles.
 * Works with the existing inline style={{}} pattern.
 * 
 * @example
 * // Simple responsive values
 * <div style={responsiveValue('padding', '10px', '20px', '40px')}>
 * 
 * // Responsive style objects
 * <div style={responsiveStyles(
 *   { fontSize: '14px', padding: '10px' },  // mobile
 *   { fontSize: '16px', padding: '20px' },  // tablet
 *   { fontSize: '18px', padding: '30px' }   // desktop
 * )}>
 */

import { CSSProperties } from 'react';

/**
 * Get a responsive value based on breakpoint
 */
export function getResponsiveValue<T>(
  isMobile: boolean,
  isTablet: boolean,
  mobileValue: T,
  tabletValue?: T,
  desktopValue?: T
): T {
  if (isMobile) return mobileValue;
  if (isTablet && tabletValue !== undefined) return tabletValue;
  return desktopValue !== undefined ? desktopValue : (tabletValue || mobileValue);
}

/**
 * Merge responsive style objects based on breakpoint
 */
export function responsiveStyles(
  isMobile: boolean,
  isTablet: boolean,
  mobileStyles: CSSProperties,
  tabletStyles?: CSSProperties,
  desktopStyles?: CSSProperties
): CSSProperties {
  const baseStyles = mobileStyles;
  
  if (isMobile) {
    return baseStyles;
  }
  
  if (isTablet && tabletStyles) {
    return { ...baseStyles, ...tabletStyles };
  }
  
  if (desktopStyles) {
    return { ...baseStyles, ...(tabletStyles || {}), ...desktopStyles };
  }
  
  return { ...baseStyles, ...(tabletStyles || {}) };
}

/**
 * Common responsive container styles
 */
export const getResponsiveContainer = (isMobile: boolean, isTablet: boolean): CSSProperties => ({
  maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
  margin: '0 auto',
  padding: isMobile ? '0 15px' : isTablet ? '0 30px' : '0 40px',
  width: '100%',
  boxSizing: 'border-box',
});

/**
 * Responsive padding
 */
export const getResponsivePadding = (isMobile: boolean, isTablet: boolean): string => {
  return isMobile ? '15px' : isTablet ? '20px' : '30px';
};

/**
 * Responsive font sizes
 */
export const getResponsiveFontSize = (
  isMobile: boolean,
  isTablet: boolean,
  type: 'h1' | 'h2' | 'h3' | 'body' | 'small'
): string => {
  const sizes = {
    h1: { mobile: '2rem', tablet: '2.5rem', desktop: '3rem' },
    h2: { mobile: '1.5rem', tablet: '2rem', desktop: '2.5rem' },
    h3: { mobile: '1.25rem', tablet: '1.5rem', desktop: '1.75rem' },
    body: { mobile: '0.875rem', tablet: '1rem', desktop: '1rem' },
    small: { mobile: '0.75rem', tablet: '0.875rem', desktop: '0.875rem' },
  };

  const size = sizes[type];
  return isMobile ? size.mobile : isTablet ? size.tablet : size.desktop;
};

/**
 * Responsive grid columns
 */
export const getResponsiveColumns = (isMobile: boolean, isTablet: boolean): number => {
  return isMobile ? 1 : isTablet ? 2 : 3;
};

/**
 * Responsive gap spacing
 */
export const getResponsiveGap = (isMobile: boolean, isTablet: boolean): string => {
  return isMobile ? '10px' : isTablet ? '15px' : '20px';
};

/**
 * Touch-friendly button sizes (minimum 44x44px for mobile)
 */
export const getTouchFriendlyButton = (isMobile: boolean): CSSProperties => ({
  minHeight: isMobile ? '44px' : '40px',
  minWidth: isMobile ? '44px' : 'auto',
  padding: isMobile ? '12px 20px' : '10px 16px',
  fontSize: isMobile ? '14px' : '14px',
  cursor: 'pointer',
  touchAction: 'manipulation', // Prevents zoom on double-tap
});

/**
 * Responsive modal/dialog sizing
 */
export const getResponsiveModal = (isMobile: boolean, isTablet: boolean): CSSProperties => ({
  width: isMobile ? '95%' : isTablet ? '80%' : '600px',
  maxWidth: isMobile ? '95vw' : '90vw',
  maxHeight: isMobile ? '90vh' : '85vh',
  margin: isMobile ? '20px auto' : '40px auto',
  padding: isMobile ? '20px' : '30px',
});

/**
 * Responsive table wrapper (prevents horizontal overflow)
 */
export const getResponsiveTableWrapper = (isMobile: boolean): CSSProperties => ({
  width: '100%',
  overflowX: isMobile ? 'auto' : 'visible',
  WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
  marginBottom: '20px',
});

/**
 * Responsive form input
 */
export const getResponsiveInput = (isMobile: boolean): CSSProperties => ({
  width: '100%',
  padding: isMobile ? '12px' : '10px',
  fontSize: isMobile ? '16px' : '14px', // 16px prevents iOS zoom on focus
  minHeight: isMobile ? '44px' : '40px',
  boxSizing: 'border-box',
});

/**
 * Responsive sidebar (for chat, filters, etc.)
 */
export const getResponsiveSidebar = (
  isMobile: boolean,
  isOpen: boolean
): CSSProperties => ({
  width: isMobile ? '100%' : '320px',
  position: isMobile ? 'fixed' : 'relative',
  top: isMobile ? '0' : 'auto',
  left: isMobile ? (isOpen ? '0' : '-100%') : 'auto',
  height: isMobile ? '100vh' : 'auto',
  zIndex: isMobile ? 1000 : 'auto',
  transition: 'left 0.3s ease',
  overflowY: 'auto',
});
