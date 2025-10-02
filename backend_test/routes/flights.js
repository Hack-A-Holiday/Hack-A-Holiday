const express = require('express');
const cors = require('cors');
const router = express.Router();

// Import flight services
const FlightService = require('../services/FlightService');
const RecommendationEngine = require('../services/RecommendationEngine');

// Initialize services
const flightService = new FlightService({
  rapidApiKey: process.env.RAPIDAPI_KEY,
  amadeuApiKey: process.env.AMADEUS_API_KEY,
  amadeuApiSecret: process.env.AMADEUS_API_SECRET
});

const recommendationEngine = new RecommendationEngine();

/**
 * Enhanced Flight Search Endpoint
 * POST /flights/search
 */
router.post('/search', async (req, res) => {
  try {
    console.log('🛫 Flight search request:', req.body);
    
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = { adults: 1, children: 0, infants: 0 },
      cabinClass = 'economy',
      currency = 'USD',
      filters = {},
      preferences = {},
      userContext = {}
    } = req.body;

    // Validate required fields
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: origin, destination, or departureDate'
      });
    }

    // Get user preferences from context if available
    const enhancedPreferences = {
      prioritizePrice: true,
      prioritizeConvenience: false,
      prioritizeDuration: false,
      prioritizeDirectFlights: false,
      userTravelStyle: 'mid-range',
      flexibility: 'moderate',
      ...preferences,
      ...userContext.flightPreferences
    };

    // Perform flight search
    const searchRequest = {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      currency,
      filters,
      preferences: enhancedPreferences,
      userContext
    };

    const searchResults = await flightService.searchFlightsEnhanced(searchRequest);

    // Apply AI-powered recommendations if user context is available
    if (userContext.userId || userContext.sessionId) {
      const aiRecommendations = await recommendationEngine.enhanceFlightResults(
        searchResults.flights,
        userContext,
        enhancedPreferences
      );
      
      searchResults.aiRecommendations = aiRecommendations;
      searchResults.personalizedScoring = true;
    }

    // Log search for analytics and learning
    if (userContext.sessionId) {
      await logFlightSearch(userContext.sessionId, searchRequest, searchResults);
    }

    res.json({
      success: true,
      ...searchResults,
      searchTime: Date.now() - searchResults.searchStartTime || 0
    });

  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during flight search',
      message: error.message
    });
  }
});

/**
 * Get Flight Recommendations Based on User Chat History
 * POST /flights/recommendations
 */
router.post('/recommendations', async (req, res) => {
  try {
    const {
      userContext,
      chatHistory = [],
      preferences = {},
      destination = null,
      budget = null
    } = req.body;

    if (!userContext.sessionId && !userContext.userId) {
      return res.status(400).json({
        success: false,
        error: 'User context (sessionId or userId) is required'
      });
    }

    // Analyze chat history for travel preferences
    const analyzedPreferences = await recommendationEngine.analyzeChatHistory(
      chatHistory,
      userContext
    );

    // Generate destination recommendations if no specific destination
    let recommendedDestinations = [];
    if (!destination) {
      recommendedDestinations = await recommendationEngine.recommendDestinations(
        analyzedPreferences,
        userContext,
        budget
      );
    }

    // Generate flight recommendations
    const flightRecommendations = await recommendationEngine.generateFlightRecommendations(
      {
        destination,
        analyzedPreferences,
        userContext,
        budget,
        recommendedDestinations
      }
    );

    res.json({
      success: true,
      analyzedPreferences,
      recommendedDestinations,
      flightRecommendations,
      generated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Flight recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating flight recommendations',
      message: error.message
    });
  }
});

/**
 * Save User Flight Preferences
 * POST /flights/preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    const { userContext, preferences } = req.body;

    if (!userContext.sessionId && !userContext.userId) {
      return res.status(400).json({
        success: false,
        error: 'User context is required'
      });
    }

    // Save preferences to user context
    await recommendationEngine.saveUserPreferences(userContext, preferences);

    res.json({
      success: true,
      message: 'Flight preferences saved successfully'
    });

  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Error saving flight preferences',
      message: error.message
    });
  }
});

/**
 * Get User's Flight History and Analytics
 * GET /flights/history/:sessionId
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 10 } = req.query;

    const flightHistory = await recommendationEngine.getUserFlightHistory(
      sessionId,
      parseInt(limit)
    );

    const analytics = await recommendationEngine.generateUserAnalytics(sessionId);

    res.json({
      success: true,
      flightHistory,
      analytics,
      totalSearches: flightHistory.length
    });

  } catch (error) {
    console.error('Flight history error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching flight history',
      message: error.message
    });
  }
});

/**
 * Smart Destination Suggestions Based on AI Analysis
 * POST /flights/smart-suggestions
 */
router.post('/smart-suggestions', async (req, res) => {
  try {
    const {
      userContext,
      chatMessages = [],
      currentSearch = {},
      timeframe = 'flexible'
    } = req.body;

    // Use AI to analyze user intent and preferences
    const smartSuggestions = await recommendationEngine.generateSmartSuggestions({
      userContext,
      chatMessages,
      currentSearch,
      timeframe
    });

    res.json({
      success: true,
      suggestions: smartSuggestions,
      confidence: smartSuggestions.confidence || 0.7,
      reasoning: smartSuggestions.reasoning || 'Based on your conversation and preferences'
    });

  } catch (error) {
    console.error('Smart suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating smart suggestions',
      message: error.message
    });
  }
});

/**
 * Helper function to log flight searches for learning
 */
async function logFlightSearch(sessionId, searchRequest, searchResults) {
  try {
    // Log to database or analytics service for future recommendations
    const searchLog = {
      sessionId,
      timestamp: new Date().toISOString(),
      searchRequest: {
        origin: searchRequest.origin,
        destination: searchRequest.destination,
        departureDate: searchRequest.departureDate,
        returnDate: searchRequest.returnDate,
        passengers: searchRequest.passengers,
        preferences: searchRequest.preferences
      },
      resultsFound: searchResults.flights?.length || 0,
      searchTime: searchResults.searchTime || 0,
      filtersUsed: Object.keys(searchRequest.filters || {}).length > 0
    };

    // Store in your preferred storage (DynamoDB, MongoDB, etc.)
    console.log('Flight search logged:', searchLog);
    
  } catch (error) {
    console.error('Error logging flight search:', error);
  }
}

module.exports = router;