import { TripPreferences, Itinerary, DayPlan } from '../types';

// Cost calculation utilities
export function calculateTotalCost(itinerary: Partial<Itinerary>): number {
  let total = 0;
  
  // Flight costs
  if (itinerary.flights?.outbound) {
    total += itinerary.flights.outbound.price;
  }
  if (itinerary.flights?.return) {
    total += itinerary.flights.return.price;
  }
  
  // Hotel costs
  if (itinerary.hotels) {
    total += itinerary.hotels.reduce((sum, hotel) => sum + hotel.totalPrice, 0);
  }
  
  // Daily costs
  if (itinerary.days) {
    total += itinerary.days.reduce((sum, day) => sum + day.totalCost, 0);
  }
  
  return Math.round(total * 100) / 100; // Round to 2 decimal places
}

export function calculateDayCost(day: DayPlan): number {
  let total = 0;
  
  // Activity costs
  total += day.activities.reduce((sum, activity) => sum + activity.price, 0);
  
  // Meal costs
  total += day.meals.reduce((sum, meal) => sum + meal.estimatedCost, 0);
  
  // Transportation costs
  total += day.transportation.reduce((sum, transport) => sum + transport.cost, 0);
  
  return Math.round(total * 100) / 100;
}

export function calculateBudgetBreakdown(itinerary: Partial<Itinerary>) {
  const breakdown = {
    flights: 0,
    accommodation: 0,
    activities: 0,
    meals: 0,
    transportation: 0,
    miscellaneous: 0
  };
  
  // Flight costs
  if (itinerary.flights?.outbound) {
    breakdown.flights += itinerary.flights.outbound.price;
  }
  if (itinerary.flights?.return) {
    breakdown.flights += itinerary.flights.return.price;
  }
  
  // Hotel costs
  if (itinerary.hotels) {
    breakdown.accommodation = itinerary.hotels.reduce(
      (sum, hotel) => sum + hotel.totalPrice, 0
    );
  }
  
  // Daily activity, meal, and transport costs
  if (itinerary.days) {
    itinerary.days.forEach(day => {
      breakdown.activities += day.activities.reduce(
        (sum, activity) => sum + activity.price, 0
      );
      breakdown.meals += day.meals.reduce(
        (sum, meal) => sum + meal.estimatedCost, 0
      );
      breakdown.transportation += day.transportation.reduce(
        (sum, transport) => sum + transport.cost, 0
      );
    });
  }
  
  // Round all values
  Object.keys(breakdown).forEach(key => {
    breakdown[key as keyof typeof breakdown] = Math.round(
      breakdown[key as keyof typeof breakdown] * 100
    ) / 100;
  });
  
  return breakdown;
}

// Budget optimization utilities
export function optimizeBudget(
  preferences: TripPreferences,
  currentCost: number
): {
  canOptimize: boolean;
  suggestions: string[];
  targetReductions: {
    flights: number;
    accommodation: number;
    activities: number;
  };
} {
  const overBudget = currentCost - preferences.budget;
  
  if (overBudget <= 0) {
    return {
      canOptimize: false,
      suggestions: [],
      targetReductions: { flights: 0, accommodation: 0, activities: 0 }
    };
  }
  
  const suggestions: string[] = [];
  const targetReductions = {
    flights: 0,
    accommodation: 0,
    activities: 0
  };
  
  // Calculate percentage over budget
  const overBudgetPercent = (overBudget / preferences.budget) * 100;
  
  if (overBudgetPercent > 50) {
    suggestions.push('Consider a different destination or increase your budget');
    suggestions.push('Look for alternative travel dates with better prices');
  } else if (overBudgetPercent > 25) {
    suggestions.push('Consider budget airlines or flights with stops');
    suggestions.push('Look for hostels or budget accommodations');
    suggestions.push('Focus on free or low-cost activities');
    
    targetReductions.flights = overBudget * 0.4;
    targetReductions.accommodation = overBudget * 0.4;
    targetReductions.activities = overBudget * 0.2;
  } else {
    suggestions.push('Consider slightly cheaper flight options');
    suggestions.push('Look for hotels with fewer amenities');
    suggestions.push('Replace some paid activities with free alternatives');
    
    targetReductions.flights = overBudget * 0.3;
    targetReductions.accommodation = overBudget * 0.3;
    targetReductions.activities = overBudget * 0.4;
  }
  
  return {
    canOptimize: true,
    suggestions,
    targetReductions
  };
}

// Date and duration utilities
export function calculateEndDate(startDate: string, duration: number): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + duration);
  return end.toISOString().split('T')[0];
}

export function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function generateDateRange(startDate: string, duration: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  
  for (let i = 0; i < duration; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    dates.push(currentDate.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Traveler-based calculations
export function adjustCostForTravelers(baseCost: number, travelers: number, type: 'per-person' | 'per-room' | 'per-group'): number {
  switch (type) {
    case 'per-person':
      return baseCost * travelers;
    case 'per-room':
      // Assume 2 people per room, round up for odd numbers
      return baseCost * Math.ceil(travelers / 2);
    case 'per-group':
      return baseCost;
    default:
      return baseCost * travelers;
  }
}

// Rating and scoring utilities
export function calculateConfidenceScore(
  budgetMatch: number, // 0-1, how well we matched the budget
  availabilityMatch: number, // 0-1, how many options we found
  preferencesMatch: number // 0-1, how well we matched interests
): number {
  const weights = {
    budget: 0.4,
    availability: 0.3,
    preferences: 0.3
  };
  
  const score = (
    budgetMatch * weights.budget +
    availabilityMatch * weights.availability +
    preferencesMatch * weights.preferences
  );
  
  return Math.round(score * 100) / 100;
}

export function calculateBudgetMatch(actualCost: number, targetBudget: number): number {
  if (actualCost <= targetBudget) {
    // Perfect match if within budget
    return 1.0;
  } else {
    // Decrease score based on how much over budget
    const overBudgetPercent = (actualCost - targetBudget) / targetBudget;
    return Math.max(0, 1 - overBudgetPercent);
  }
}

// Utility functions for formatting
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

export function formatDate(dateString: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateString);
  
  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}