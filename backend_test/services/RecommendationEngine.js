const axios = require('axios');

/**
 * AI-Powered Recommendation Engine
 * Analyzes user chat history and preferences to provide personalized travel recommendations
 */
class RecommendationEngine {
  constructor() {
    this.userPreferences = new Map(); // In-memory storage (use database in production)
    this.chatAnalysis = new Map();
    this.flightHistory = new Map();
    this.destinationKnowledge = this.initializeDestinationKnowledge();
  }

  /**
   * Analyze chat history to extract travel preferences and intent
   */
  async analyzeChatHistory(chatMessages, userContext) {
    try {
      const analysis = {
        preferences: {
          budget: 'medium',
          travelStyle: 'balanced',
          interests: [],
          destinations: [],
          timePreferences: {},
          flightPreferences: {}
        },
        intent: {
          planningTrip: false,
          lookingForFlights: false,
          destination: null,
          timeframe: null,
          urgency: 'low'
        },
        sentiment: 'neutral',
        confidence: 0.7
      };

      // Extract keywords and patterns from chat messages
      const allText = chatMessages.map(msg => msg.content).join(' ').toLowerCase();
      
      // Budget analysis
      if (allText.includes('budget') || allText.includes('cheap') || allText.includes('affordable')) {
        analysis.preferences.budget = 'low';
        analysis.confidence += 0.1;
      } else if (allText.includes('luxury') || allText.includes('premium') || allText.includes('business class')) {
        analysis.preferences.budget = 'high';
        analysis.confidence += 0.1;
      }

      // Travel style analysis
      if (allText.includes('adventure') || allText.includes('hiking') || allText.includes('exploring')) {
        analysis.preferences.travelStyle = 'adventure';
        analysis.preferences.interests.push('adventure', 'nature');
      } else if (allText.includes('relax') || allText.includes('beach') || allText.includes('spa')) {
        analysis.preferences.travelStyle = 'relaxation';
        analysis.preferences.interests.push('relaxation', 'wellness');
      } else if (allText.includes('culture') || allText.includes('museum') || allText.includes('history')) {
        analysis.preferences.travelStyle = 'cultural';
        analysis.preferences.interests.push('culture', 'history');
      }

      // Destination extraction
      const destinations = this.extractDestinations(allText);
      analysis.preferences.destinations = destinations;

      // Flight preferences
      if (allText.includes('direct flight') || allText.includes('non-stop')) {
        analysis.preferences.flightPreferences.preferDirect = true;
      }
      if (allText.includes('morning flight') || allText.includes('early departure')) {
        analysis.preferences.flightPreferences.timePreference = 'morning';
      }
      if (allText.includes('window seat') || allText.includes('aisle seat')) {
        analysis.preferences.flightPreferences.seatPreference = 
          allText.includes('window') ? 'window' : 'aisle';
      }

      // Intent analysis
      if (allText.includes('plan') || allText.includes('trip') || allText.includes('vacation')) {
        analysis.intent.planningTrip = true;
      }
      if (allText.includes('flight') || allText.includes('fly') || allText.includes('airline')) {
        analysis.intent.lookingForFlights = true;
      }

      // Store analysis for future use
      this.chatAnalysis.set(userContext.sessionId || userContext.userId, {
        ...analysis,
        lastUpdated: new Date().toISOString(),
        messageCount: chatMessages.length
      });

      return analysis;

    } catch (error) {
      console.error('Error analyzing chat history:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Generate personalized destination recommendations
   */
  async recommendDestinations(analyzedPreferences, userContext, budget = null) {
    try {
      const { interests, travelStyle, destinations } = analyzedPreferences;
      const userBudget = budget || analyzedPreferences.budget;

      // Filter destinations based on preferences
      let recommendations = [...this.destinationKnowledge];

      // Filter by budget
      if (userBudget === 'low') {
        recommendations = recommendations.filter(dest => dest.budgetLevel <= 2);
      } else if (userBudget === 'high') {
        recommendations = recommendations.filter(dest => dest.budgetLevel >= 3);
      }

      // Filter by travel style
      if (travelStyle && travelStyle !== 'balanced') {
        recommendations = recommendations.filter(dest => 
          dest.travelStyles.includes(travelStyle)
        );
      }

      // Filter by interests
      if (interests.length > 0) {
        recommendations = recommendations.filter(dest =>
          interests.some(interest => dest.interests.includes(interest))
        );
      }

      // Score and rank destinations
      recommendations.forEach(dest => {
        let score = dest.popularityScore || 0.5;
        
        // Boost score for matching interests
        interests.forEach(interest => {
          if (dest.interests.includes(interest)) {
            score += 0.2;
          }
        });

        // Boost score for matching travel style
        if (dest.travelStyles.includes(travelStyle)) {
          score += 0.3;
        }

        // Seasonal adjustments
        const currentMonth = new Date().getMonth();
        if (dest.bestMonths && dest.bestMonths.includes(currentMonth)) {
          score += 0.1;
        }

        dest.recommendationScore = Math.min(score, 1.0);
      });

      // Sort by score and return top 5
      return recommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 5)
        .map(dest => ({
          destination: dest.name,
          country: dest.country,
          airportCode: dest.airportCode,
          description: dest.description,
          whyRecommended: dest.whyRecommended || 'Matches your travel preferences',
          budgetLevel: dest.budgetLevel,
          bestFor: dest.interests,
          averageStay: dest.averageStay || '5-7 days',
          score: dest.recommendationScore
        }));

    } catch (error) {
      console.error('Error generating destination recommendations:', error);
      return this.getDefaultDestinations();
    }
  }

  /**
   * Generate flight recommendations based on user preferences and chat analysis
   */
  async generateFlightRecommendations(params) {
    try {
      const {
        destination,
        analyzedPreferences,
        userContext,
        budget,
        recommendedDestinations = []
      } = params;

      const recommendations = {
        preferredRoutes: [],
        flightTips: [],
        timingAdvice: {},
        budgetTips: [],
        airlineRecommendations: []
      };

      // Generate route recommendations
      if (destination) {
        recommendations.preferredRoutes = await this.generateRouteRecommendations(
          destination,
          analyzedPreferences,
          userContext
        );
      } else if (recommendedDestinations.length > 0) {
        recommendations.preferredRoutes = recommendedDestinations.map(dest => ({
          destination: dest.destination,
          airportCode: dest.airportCode,
          estimatedPrice: this.estimatePrice(dest.destination, analyzedPreferences.budget),
          bestBookingTime: '6-8 weeks before departure',
          reasonToVisit: dest.whyRecommended
        }));
      }

      // Generate personalized flight tips
      recommendations.flightTips = this.generateFlightTips(analyzedPreferences);

      // Timing advice
      recommendations.timingAdvice = this.generateTimingAdvice(analyzedPreferences);

      // Budget tips
      recommendations.budgetTips = this.generateBudgetTips(analyzedPreferences.budget);

      // Airline recommendations
      recommendations.airlineRecommendations = this.generateAirlineRecommendations(
        analyzedPreferences
      );

      return recommendations;

    } catch (error) {
      console.error('Error generating flight recommendations:', error);
      return this.getDefaultFlightRecommendations();
    }
  }

  /**
   * Enhance flight search results with AI scoring
   */
  async enhanceFlightResults(flights, userContext, preferences) {
    try {
      const analysisKey = userContext.sessionId || userContext.userId;
      const chatAnalysis = this.chatAnalysis.get(analysisKey);

      if (!chatAnalysis) {
        return flights; // No analysis available, return original results
      }

      // Score each flight based on user preferences
      const enhancedFlights = flights.map(flight => {
        let personalizedScore = 0.5; // Base score

        // Price preference scoring
        if (chatAnalysis.preferences.budget === 'low' && flight.price < 500) {
          personalizedScore += 0.3;
        } else if (chatAnalysis.preferences.budget === 'high' && flight.cabinClass !== 'economy') {
          personalizedScore += 0.2;
        }

        // Direct flight preference
        if (chatAnalysis.preferences.flightPreferences.preferDirect && flight.stops === 0) {
          personalizedScore += 0.4;
        }

        // Time preference scoring
        if (chatAnalysis.preferences.flightPreferences.timePreference) {
          const departureHour = new Date(flight.departureTime).getHours();
          const pref = chatAnalysis.preferences.flightPreferences.timePreference;
          
          if (pref === 'morning' && departureHour >= 6 && departureHour <= 12) {
            personalizedScore += 0.2;
          } else if (pref === 'afternoon' && departureHour >= 12 && departureHour <= 18) {
            personalizedScore += 0.2;
          } else if (pref === 'evening' && departureHour >= 18) {
            personalizedScore += 0.2;
          }
        }

        // Duration scoring (shorter is generally better)
        if (flight.durationMinutes < 480) { // Less than 8 hours
          personalizedScore += 0.1;
        }

        // Baggage scoring
        if (flight.baggage?.checked && flight.baggage.checked !== 'Not included') {
          personalizedScore += 0.1;
        }

        return {
          ...flight,
          personalizedScore: Math.min(personalizedScore, 1.0),
          recommendationReason: this.generateRecommendationReason(flight, chatAnalysis)
        };
      });

      // Sort by personalized score
      return enhancedFlights.sort((a, b) => b.personalizedScore - a.personalizedScore);

    } catch (error) {
      console.error('Error enhancing flight results:', error);
      return flights;
    }
  }

  /**
   * Generate smart suggestions based on conversation context
   */
  async generateSmartSuggestions(params) {
    try {
      const { userContext, chatMessages, currentSearch, timeframe } = params;

      // Analyze recent messages for context
      const recentMessages = chatMessages.slice(-5); // Last 5 messages
      const context = recentMessages.map(msg => msg.content).join(' ').toLowerCase();

      const suggestions = {
        destinations: [],
        flightOptions: [],
        travelTips: [],
        confidence: 0.7,
        reasoning: 'Based on your conversation'
      };

      // Extract intent from context
      if (context.includes('romantic') || context.includes('honeymoon')) {
        suggestions.destinations = this.getRomanticDestinations();
        suggestions.reasoning = 'Perfect for romantic getaways';
      } else if (context.includes('family') || context.includes('kids')) {
        suggestions.destinations = this.getFamilyDestinations();
        suggestions.reasoning = 'Great for family vacations';
      } else if (context.includes('adventure') || context.includes('hiking')) {
        suggestions.destinations = this.getAdventureDestinations();
        suggestions.reasoning = 'Perfect for adventure seekers';
      }

      // Generate flight suggestions based on current search
      if (currentSearch.origin && currentSearch.destination) {
        suggestions.flightOptions = [
          {
            type: 'flexible_dates',
            suggestion: 'Try searching ±3 days for better prices',
            potentialSavings: '15-30%'
          },
          {
            type: 'alternative_airports',
            suggestion: 'Check nearby airports for more options',
            potentialSavings: '10-25%'
          }
        ];
      }

      // Add travel tips
      suggestions.travelTips = [
        'Book domestic flights 1-3 months in advance for best prices',
        'Tuesday and Wednesday departures are often cheaper',
        'Consider red-eye flights for additional savings'
      ];

      return suggestions;

    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Save user preferences for future recommendations
   */
  async saveUserPreferences(userContext, preferences) {
    const key = userContext.sessionId || userContext.userId;
    this.userPreferences.set(key, {
      ...preferences,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Get user flight history for analytics
   */
  async getUserFlightHistory(sessionId, limit = 10) {
    const history = this.flightHistory.get(sessionId) || [];
    return history.slice(0, limit);
  }

  /**
   * Generate user analytics
   */
  async generateUserAnalytics(sessionId) {
    const history = this.flightHistory.get(sessionId) || [];
    const preferences = this.userPreferences.get(sessionId) || {};
    const chatAnalysis = this.chatAnalysis.get(sessionId) || {};

    return {
      totalSearches: history.length,
      averageBudget: this.calculateAverageBudget(history),
      preferredDestinations: this.getTopDestinations(history),
      travelStyle: chatAnalysis.preferences?.travelStyle || 'unknown',
      lastActivity: history.length > 0 ? history[0].timestamp : null
    };
  }

  // Helper methods
  initializeDestinationKnowledge() {
    return [
      {
        name: 'Paris',
        country: 'France',
        airportCode: 'CDG',
        description: 'City of Light with romantic charm',
        interests: ['culture', 'history', 'romance', 'food'],
        travelStyles: ['cultural', 'romantic', 'luxury'],
        budgetLevel: 3,
        popularityScore: 0.9,
        bestMonths: [4, 5, 6, 9, 10],
        averageStay: '4-6 days'
      },
      {
        name: 'Tokyo',
        country: 'Japan',
        airportCode: 'NRT',
        description: 'Modern metropolis meets ancient traditions',
        interests: ['culture', 'technology', 'food', 'adventure'],
        travelStyles: ['cultural', 'adventure', 'luxury'],
        budgetLevel: 4,
        popularityScore: 0.85,
        bestMonths: [3, 4, 5, 10, 11],
        averageStay: '7-10 days'
      },
      {
        name: 'Bali',
        country: 'Indonesia',
        airportCode: 'DPS',
        description: 'Tropical paradise with spiritual charm',
        interests: ['relaxation', 'nature', 'wellness', 'adventure'],
        travelStyles: ['relaxation', 'adventure', 'budget'],
        budgetLevel: 2,
        popularityScore: 0.8,
        bestMonths: [4, 5, 6, 7, 8, 9],
        averageStay: '5-8 days'
      },
      {
        name: 'New York',
        country: 'USA',
        airportCode: 'JFK',
        description: 'The city that never sleeps',
        interests: ['culture', 'entertainment', 'food', 'shopping'],
        travelStyles: ['cultural', 'luxury', 'adventure'],
        budgetLevel: 4,
        popularityScore: 0.95,
        bestMonths: [4, 5, 6, 9, 10, 11],
        averageStay: '4-7 days'
      },
      {
        name: 'Bangkok',
        country: 'Thailand',
        airportCode: 'BKK',
        description: 'Vibrant street life and golden temples',
        interests: ['culture', 'food', 'adventure', 'budget'],
        travelStyles: ['cultural', 'adventure', 'budget'],
        budgetLevel: 1,
        popularityScore: 0.75,
        bestMonths: [11, 12, 1, 2, 3],
        averageStay: '3-6 days'
      }
    ];
  }

  extractDestinations(text) {
    const destinations = ['paris', 'tokyo', 'bali', 'new york', 'bangkok', 'london', 'rome', 'barcelona'];
    return destinations.filter(dest => text.includes(dest));
  }

  generateFlightTips(preferences) {
    const tips = [];
    
    if (preferences.budget === 'low') {
      tips.push('Consider budget airlines for short-haul flights');
      tips.push('Book well in advance for better deals');
      tips.push('Be flexible with dates and times');
    }
    
    if (preferences.flightPreferences.preferDirect) {
      tips.push('Direct flights may cost more but save time');
      tips.push('Check if layovers are worth the savings');
    }

    return tips;
  }

  generateTimingAdvice(preferences) {
    return {
      bestBookingTime: '6-8 weeks before departure',
      cheapestDays: ['Tuesday', 'Wednesday'],
      peakSeason: 'June-August, December',
      shouldBook: preferences.budget === 'high' ? 'Book premium seats early' : 'Monitor prices for deals'
    };
  }

  generateBudgetTips(budget) {
    const tips = {
      low: [
        'Use incognito mode when searching',
        'Clear cookies between searches',
        'Compare prices across multiple sites',
        'Consider nearby airports'
      ],
      medium: [
        'Book during sales periods',
        'Join airline loyalty programs',
        'Consider package deals'
      ],
      high: [
        'Book premium seats early',
        'Consider airline lounges',
        'Look into business class upgrades'
      ]
    };

    return tips[budget] || tips.medium;
  }

  generateAirlineRecommendations(preferences) {
    // This would be enhanced with real data
    return [
      { airline: 'Emirates', reason: 'Excellent service and comfort' },
      { airline: 'Singapore Airlines', reason: 'Top-rated for customer service' },
      { airline: 'Qatar Airways', reason: 'Great value for money' }
    ];
  }

  generateRecommendationReason(flight, chatAnalysis) {
    const reasons = [];
    
    if (flight.stops === 0 && chatAnalysis.preferences.flightPreferences.preferDirect) {
      reasons.push('Direct flight as preferred');
    }
    
    if (flight.price < 500 && chatAnalysis.preferences.budget === 'low') {
      reasons.push('Great price for budget travel');
    }
    
    if (flight.personalizedScore > 0.8) {
      reasons.push('Matches your preferences perfectly');
    }

    return reasons.join(', ') || 'Good option for your trip';
  }

  getDefaultAnalysis() {
    return {
      preferences: {
        budget: 'medium',
        travelStyle: 'balanced',
        interests: [],
        destinations: []
      },
      intent: { planningTrip: false, lookingForFlights: false },
      sentiment: 'neutral',
      confidence: 0.3
    };
  }

  getDefaultDestinations() {
    return [
      { destination: 'Paris', country: 'France', airportCode: 'CDG', score: 0.8 },
      { destination: 'Tokyo', country: 'Japan', airportCode: 'NRT', score: 0.75 }
    ];
  }

  getDefaultFlightRecommendations() {
    return {
      preferredRoutes: [],
      flightTips: ['Book in advance for better prices'],
      timingAdvice: { bestBookingTime: '6-8 weeks before' },
      budgetTips: ['Compare multiple airlines'],
      airlineRecommendations: []
    };
  }

  getDefaultSuggestions() {
    return {
      destinations: [],
      flightOptions: [],
      travelTips: ['Book flights in advance for better deals'],
      confidence: 0.3,
      reasoning: 'Default recommendations'
    };
  }

  getRomanticDestinations() {
    return ['Paris', 'Venice', 'Santorini', 'Maldives'];
  }

  getFamilyDestinations() {
    return ['Orlando', 'London', 'Tokyo', 'Singapore'];
  }

  getAdventureDestinations() {
    return ['New Zealand', 'Nepal', 'Costa Rica', 'Iceland'];
  }

  estimatePrice(destination, budget) {
    const basePrices = { Paris: 800, Tokyo: 1200, Bali: 600 };
    const multiplier = budget === 'low' ? 0.8 : budget === 'high' ? 1.5 : 1.0;
    return Math.round((basePrices[destination] || 700) * multiplier);
  }

  calculateAverageBudget(history) {
    if (history.length === 0) return 0;
    const total = history.reduce((sum, search) => sum + (search.averagePrice || 0), 0);
    return Math.round(total / history.length);
  }

  getTopDestinations(history) {
    const destinations = {};
    history.forEach(search => {
      if (search.destination) {
        destinations[search.destination] = (destinations[search.destination] || 0) + 1;
      }
    });
    return Object.entries(destinations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([dest, count]) => ({ destination: dest, searches: count }));
  }
}

module.exports = RecommendationEngine;