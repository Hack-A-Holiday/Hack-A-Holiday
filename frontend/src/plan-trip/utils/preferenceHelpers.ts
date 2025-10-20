import { TravelPreferences } from '../../types/preferences';

/**
 * Validate trip preferences
 */
export const validatePreferences = (prefs: any): boolean => {
  if (!prefs.destination || prefs.destination.trim() === '') {
    return false;
  }
  if (!prefs.budget || prefs.budget <= 0) {
    return false;
  }
  if (!prefs.duration || prefs.duration <= 0) {
    return false;
  }
  if (!prefs.travelers || prefs.travelers <= 0) {
    return false;
  }
  if (!prefs.interests || prefs.interests.length === 0) {
    return false;
  }
  return true;
};

/**
 * Build conversational message for AI agent
 */
export const buildConversationalMessage = (prefs: any): string => {
  const { destination, duration, budget, travelers, interests, travelStyle, startDate, origin } = prefs;
  
  let message = `I want to plan a ${duration}-day trip`;
  
  if (origin) {
    message += ` from ${origin}`;
  }
  
  message += ` to ${destination}`;
  
  if (startDate) {
    message += ` starting on ${startDate}`;
  }
  
  message += ` for ${travelers} ${travelers === 1 ? 'person' : 'people'}`;
  message += ` with a budget of $${budget}`;
  message += `. I'm interested in ${interests.join(', ')}`;
  message += ` and prefer ${travelStyle} accommodations`;
  message += `. Please create a detailed day-by-day itinerary.`;
  
  return message;
};

/**
 * Get responsive font sizes
 */
export const getResponsiveFontSizes = (isMobile: boolean, isTablet: boolean) => {
  return {
    h1: isMobile ? '1.75rem' : isTablet ? '2.25rem' : '2.5rem',
    h2: isMobile ? '1.5rem' : isTablet ? '1.875rem' : '2rem',
    h3: isMobile ? '1.25rem' : isTablet ? '1.5rem' : '1.75rem',
    body: isMobile ? '0.875rem' : isTablet ? '0.9375rem' : '1rem',
    small: isMobile ? '0.75rem' : isTablet ? '0.8125rem' : '0.875rem'
  };
};
