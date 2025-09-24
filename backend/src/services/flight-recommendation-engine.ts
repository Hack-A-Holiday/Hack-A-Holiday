/**
 * Flight Recommendation Engine
 * 
 * Implements advanced flight recommendation algorithms following enterprise-grade patterns.
 * Provides intelligent flight scoring, filtering, and personalized recommendations.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

import {
  FlightOption,
  FlightSearchFilters,
  FlightSearchPreferences,
  FlightRecommendations,
  FlightSortOption
} from '../types';

/**
 * Configuration for the recommendation engine
 */
export interface RecommendationEngineConfig {
  weights: {
    price: number;
    duration: number;
    convenience: number;
    directFlights: number;
    timePreference: number;
    airline: number;
  };
  thresholds: {
    maxPriceMultiplier: number;
    maxDurationMultiplier: number;
    minScore: number;
  };
}

/**
 * Flight Recommendation Engine
 * 
 * Implements sophisticated algorithms for flight scoring and recommendation.
 * Follows Google/Meta engineering standards with clean architecture.
 */
export class FlightRecommendationEngine {
  private readonly config: RecommendationEngineConfig;

  constructor(config?: Partial<RecommendationEngineConfig>) {
    this.config = {
      weights: {
        price: 0.35,
        duration: 0.25,
        convenience: 0.20,
        directFlights: 0.10,
        timePreference: 0.05,
        airline: 0.05
      },
      thresholds: {
        maxPriceMultiplier: 2.0,
        maxDurationMultiplier: 1.5,
        minScore: 0.3
      },
      ...config
    };
  }

  /**
   * Calculate comprehensive score for a flight based on user preferences
   * 
   * @param flight - The flight option to score
   * @param preferences - User's travel preferences
   * @param filters - Applied search filters
   * @returns Score between 0 and 1 (higher is better)
   */
  calculateScore(
    flight: FlightOption,
    preferences: FlightSearchPreferences,
    filters: FlightSearchFilters
  ): number {
    try {
      const scores = {
        price: this.calculatePriceScore(flight, preferences, filters),
        duration: this.calculateDurationScore(flight, preferences, filters),
        convenience: this.calculateConvenienceScore(flight, preferences),
        directFlights: this.calculateDirectFlightScore(flight, preferences),
        timePreference: this.calculateTimePreferenceScore(flight, preferences),
        airline: this.calculateAirlineScore(flight, preferences)
      };

      // Weighted average of all scores
      const weightedScore = Object.entries(scores).reduce((total, [key, score]) => {
        const weight = this.config.weights[key as keyof typeof this.config.weights];
        return total + (score * weight);
      }, 0);

      // Apply travel style modifier
      const styleModifier = this.getTravelStyleModifier(preferences.userTravelStyle);
      const finalScore = Math.min(1.0, weightedScore * styleModifier);

      return Math.max(0, finalScore);
    } catch (error) {
      console.error('Error calculating flight score:', error);
      return 0.5; // Default neutral score
    }
  }

  /**
   * Get comprehensive flight recommendations
   */
  getRecommendations(
    flights: FlightOption[],
    preferences: FlightSearchPreferences
  ): FlightRecommendations {
    if (flights.length === 0) {
      return this.getEmptyRecommendations();
    }

    // Calculate scores for all flights
    const scoredFlights = flights.map(flight => ({
      ...flight,
      score: this.calculateScore(flight, preferences, {})
    }));

    // Sort by score for personalized recommendations
    const sortedFlights = scoredFlights.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      bestPrice: this.findBestPrice(flights),
      bestValue: this.findBestValue(scoredFlights),
      fastest: this.findFastest(flights),
      mostConvenient: this.findMostConvenient(flights),
      topRated: sortedFlights.slice(0, 5),
      personalized: sortedFlights.slice(0, 10)
    };
  }

  /**
   * Apply filters to flight results
   */
  applyFilters(flights: FlightOption[], filters: FlightSearchFilters): FlightOption[] {
    return flights.filter(flight => {
      // Price filters
      if (filters.maxPrice && flight.price > filters.maxPrice) return false;
      if (filters.minPrice && flight.price < filters.minPrice) return false;

      // Stops filter
      if (filters.maxStops !== undefined && flight.stops > filters.maxStops) return false;

      // Direct flights only
      if (filters.directFlightsOnly && flight.stops > 0) return false;

      // Duration filters
      if (filters.maxDuration && flight.durationMinutes > filters.maxDuration) return false;
      if (filters.minDuration && flight.durationMinutes < filters.minDuration) return false;

      // Airline filters
      if (filters.preferredAirlines && filters.preferredAirlines.length > 0) {
        if (!filters.preferredAirlines.some(airline => 
          flight.airline.toLowerCase().includes(airline.toLowerCase())
        )) return false;
      }

      if (filters.excludedAirlines && filters.excludedAirlines.length > 0) {
        if (filters.excludedAirlines.some(airline => 
          flight.airline.toLowerCase().includes(airline.toLowerCase())
        )) return false;
      }

      // Time range filters
      if (filters.departureTimeRange) {
        const departureTime = this.parseTime(flight.departure.time);
        const earliest = this.parseTime(filters.departureTimeRange.earliest);
        const latest = this.parseTime(filters.departureTimeRange.latest);
        
        if (departureTime < earliest || departureTime > latest) return false;
      }

      if (filters.arrivalTimeRange) {
        const arrivalTime = this.parseTime(flight.arrival.time);
        const earliest = this.parseTime(filters.arrivalTimeRange.earliest);
        const latest = this.parseTime(filters.arrivalTimeRange.latest);
        
        if (arrivalTime < earliest || arrivalTime > latest) return false;
      }

      // Refundable/Changeable filters
      if (filters.refundable !== undefined && flight.refundable !== filters.refundable) return false;
      if (filters.changeable !== undefined && flight.changeable !== filters.changeable) return false;

      return true;
    });
  }

  /**
   * Sort flights by specified criteria
   */
  sortFlights(flights: FlightOption[], sortBy: FlightSortOption): FlightOption[] {
    const sortedFlights = [...flights];

    switch (sortBy) {
      case 'price-asc':
        return sortedFlights.sort((a, b) => a.price - b.price);
      
      case 'price-desc':
        return sortedFlights.sort((a, b) => b.price - a.price);
      
      case 'duration-asc':
        return sortedFlights.sort((a, b) => a.durationMinutes - b.durationMinutes);
      
      case 'duration-desc':
        return sortedFlights.sort((a, b) => b.durationMinutes - a.durationMinutes);
      
      case 'departure-asc':
        return sortedFlights.sort((a, b) => 
          this.parseTime(a.departure.time) - this.parseTime(b.departure.time)
        );
      
      case 'departure-desc':
        return sortedFlights.sort((a, b) => 
          this.parseTime(b.departure.time) - this.parseTime(a.departure.time)
        );
      
      case 'stops-asc':
        return sortedFlights.sort((a, b) => a.stops - b.stops);
      
      case 'stops-desc':
        return sortedFlights.sort((a, b) => b.stops - a.stops);
      
      case 'score-desc':
        return sortedFlights.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      case 'recommended':
        // This would use the recommendation engine's scoring
        return sortedFlights.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      default:
        return sortedFlights;
    }
  }

  // Private helper methods

  private calculatePriceScore(
    flight: FlightOption,
    preferences: FlightSearchPreferences,
    filters: FlightSearchFilters
  ): number {
    const basePrice = flight.price;
    const maxPrice = filters.maxPrice || basePrice * this.config.thresholds.maxPriceMultiplier;
    
    // Normalize price score (lower price = higher score)
    const priceScore = Math.max(0, 1 - (basePrice / maxPrice));
    
    // Apply travel style modifier
    const styleMultiplier = this.getPriceStyleMultiplier(preferences.userTravelStyle);
    
    return Math.min(1.0, priceScore * styleMultiplier);
  }

  private calculateDurationScore(
    flight: FlightOption,
    preferences: FlightSearchPreferences,
    filters: FlightSearchFilters
  ): number {
    const duration = flight.durationMinutes;
    const maxDuration = filters.maxDuration || duration * this.config.thresholds.maxDurationMultiplier;
    
    // Normalize duration score (shorter duration = higher score)
    const durationScore = Math.max(0, 1 - (duration / maxDuration));
    
    // Boost score for direct flights
    const directFlightBonus = flight.stops === 0 ? 0.2 : 0;
    
    return Math.min(1.0, durationScore + directFlightBonus);
  }

  private calculateConvenienceScore(
    flight: FlightOption,
    preferences: FlightSearchPreferences
  ): number {
    let score = 0.5; // Base convenience score
    
    // Direct flights are more convenient
    if (flight.stops === 0) score += 0.3;
    else if (flight.stops === 1) score += 0.1;
    
    // Refundable flights are more convenient
    if (flight.refundable) score += 0.1;
    
    // Changeable flights are more convenient
    if (flight.changeable) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private calculateDirectFlightScore(
    flight: FlightOption,
    preferences: FlightSearchPreferences
  ): number {
    if (!preferences.prioritizeDirectFlights) return 0.5;
    
    return flight.stops === 0 ? 1.0 : 0.2;
  }

  private calculateTimePreferenceScore(
    flight: FlightOption,
    preferences: FlightSearchPreferences
  ): number {
    if (!preferences.preferredDepartureTime || preferences.preferredDepartureTime === 'any') {
      return 0.5;
    }
    
    const departureHour = this.parseTime(flight.departure.time);
    const timeOfDay = this.getTimeOfDay(departureHour);
    
    return timeOfDay === preferences.preferredDepartureTime ? 1.0 : 0.3;
  }

  private calculateAirlineScore(
    flight: FlightOption,
    preferences: FlightSearchPreferences
  ): number {
    // Premium airlines get higher scores for luxury travelers
    const premiumAirlines = ['Emirates', 'Singapore Airlines', 'Qatar Airways', 'Cathay Pacific'];
    const isPremium = premiumAirlines.some(airline => 
      flight.airline.toLowerCase().includes(airline.toLowerCase())
    );
    
    if (preferences.userTravelStyle === 'luxury' && isPremium) return 1.0;
    if (preferences.userTravelStyle === 'budget' && !isPremium) return 1.0;
    
    return 0.7; // Neutral score for mid-range
  }

  private getTravelStyleModifier(style: string): number {
    switch (style) {
      case 'budget': return 1.1; // Slightly favor budget options
      case 'luxury': return 0.9; // Slightly favor premium options
      default: return 1.0;
    }
  }

  private getPriceStyleMultiplier(style: string): number {
    switch (style) {
      case 'budget': return 1.3; // Heavily weight price for budget travelers
      case 'luxury': return 0.7; // Less weight on price for luxury travelers
      default: return 1.0;
    }
  }

  private findBestPrice(flights: FlightOption[]): FlightOption | null {
    return flights.reduce((best, current) => 
      current.price < best.price ? current : best, flights[0]
    ) || null;
  }

  private findBestValue(flights: FlightOption[]): FlightOption | null {
    // Best value = lowest price per minute of flight time
    return flights.reduce((best, current) => {
      const currentValue = current.price / current.durationMinutes;
      const bestValue = best.price / best.durationMinutes;
      return currentValue < bestValue ? current : best;
    }, flights[0]) || null;
  }

  private findFastest(flights: FlightOption[]): FlightOption | null {
    return flights.reduce((fastest, current) => 
      current.durationMinutes < fastest.durationMinutes ? current : fastest, flights[0]
    ) || null;
  }

  private findMostConvenient(flights: FlightOption[]): FlightOption | null {
    // Most convenient = direct flight with good timing
    const directFlights = flights.filter(f => f.stops === 0);
    if (directFlights.length === 0) return flights[0] || null;
    
    // Prefer flights with reasonable departure times (8 AM - 6 PM)
    const convenientFlights = directFlights.filter(f => {
      const hour = this.parseTime(f.departure.time);
      return hour >= 8 && hour <= 18;
    });
    
    return convenientFlights[0] || directFlights[0] || null;
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }

  private getEmptyRecommendations(): FlightRecommendations {
    return {
      bestPrice: null,
      bestValue: null,
      fastest: null,
      mostConvenient: null,
      topRated: [],
      personalized: []
    };
  }
}
