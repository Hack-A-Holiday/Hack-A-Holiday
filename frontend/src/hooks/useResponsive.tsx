/**
 * Responsive Breakpoint Hook
 * 
 * Provides real-time breakpoint detection for mobile-first responsive design.
 * Optimized for Android and iPhone (portrait mode).
 * 
 * Breakpoints:
 * - Mobile: 0-640px (phones)
 * - Tablet: 641-1024px (tablets, small laptops)
 * - Desktop: 1025px+ (desktop)
 * 
 * @example
 * const { isMobile, isTablet, isDesktop, width } = useResponsive();
 */

import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoint {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
} as const;

export function useResponsive(): ResponsiveBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setBreakpoint({
        isMobile: width <= BREAKPOINTS.mobile,
        isTablet: width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet,
        isDesktop: width > BREAKPOINTS.tablet,
        width,
        height,
      });
    };

    // Initial check
    updateBreakpoint();

    // Listen for resize events (debounced for performance)
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 150);
    };

    window.addEventListener('resize', debouncedUpdate);
    
    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return breakpoint;
}
