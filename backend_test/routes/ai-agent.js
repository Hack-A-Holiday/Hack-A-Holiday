const express = require('express');
const router = express.Router();
const ComprehensiveAIAgent = require('../services/ComprehensiveAIAgent');

// Initialize the comprehensive AI agent
const aiAgent = new ComprehensiveAIAgent();

/**
 * Enhanced AI Agent Chat Endpoint
 * POST /ai-agent/chat
 */
router.post('/chat', async (req, res) => {
  try {
    console.log('🤖 AI Agent request:', req.body);

    const {
      messages = [],
      userContext = {},
      aiModel = 'bedrock',
      userId,
      sessionId = `session_${Date.now()}`
    } = req.body;

    // Validate required fields
    if (!messages || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required and cannot be empty'
      });
    }

    // Process message through comprehensive AI agent
    const response = await aiAgent.processUserMessage({
      messages,
      userContext,
      aiModel,
      requestType: 'chat',
      userId: userId || userContext.userId,
      sessionId: sessionId || userContext.sessionId
    });

    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Agent chat error:', error);
    res.status(500).json({
      success: false,
      error: 'AI service temporarily unavailable',
      message: error.message,
      fallback: {
        role: 'ai',
        content: 'I apologize for the technical issue. I\'m here to help you plan your perfect trip! What can I assist you with today?',
        metadata: { model: 'fallback' }
      }
    });
  }
});

/**
 * Get Personalized Travel Recommendations
 * POST /ai-agent/recommendations
 */
router.post('/recommendations', async (req, res) => {
  try {
    const {
      userContext = {},
      chatHistory = [],
      preferences = {},
      destination = null,
      budget = null,
      sessionId = `session_${Date.now()}`
    } = req.body;

    console.log('🎯 Generating recommendations for session:', sessionId);

    // Generate comprehensive recommendations
    const response = await aiAgent.processUserMessage({
      messages: chatHistory,
      userContext: {
        ...userContext,
        preferences,
        destination,
        budget
      },
      requestType: 'recommendation',
      sessionId
    });

    res.json({
      success: true,
      ...response,
      generated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating recommendations',
      message: error.message
    });
  }
});

/**
 * Analyze User Travel Patterns and Preferences
 * POST /ai-agent/analysis
 */
router.post('/analysis', async (req, res) => {
  try {
    const {
      userContext = {},
      chatHistory = [],
      sessionId = `session_${Date.now()}`
    } = req.body;

    console.log('📊 Performing deep analysis for session:', sessionId);

    // Perform deep conversation and preference analysis
    const response = await aiAgent.processUserMessage({
      messages: chatHistory,
      userContext,
      requestType: 'analysis',
      sessionId
    });

    res.json({
      success: true,
      ...response,
      analysisComplete: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Error performing analysis',
      message: error.message
    });
  }
});

/**
 * Get Smart Travel Suggestions Based on Context
 * POST /ai-agent/smart-suggestions
 */
router.post('/smart-suggestions', async (req, res) => {
  try {
    const {
      userContext = {},
      currentContext = {}, // What the user is currently looking at/doing
      sessionId = `session_${Date.now()}`
    } = req.body;

    // Generate contextual suggestions
    const suggestions = await aiAgent.generateSmartSuggestions({
      userContext,
      currentContext,
      sessionId
    });

    res.json({
      success: true,
      suggestions,
      contextual: true,
      timestamp: new Date().toISOString()
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
 * Update User Preferences
 * POST /ai-agent/preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    const {
      userContext = {},
      preferences = {},
      sessionId = `session_${Date.now()}`
    } = req.body;

    // Update user preferences
    await aiAgent.updateUserPreferences(sessionId, preferences);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating preferences',
      message: error.message
    });
  }
});

/**
 * Get User Profile and Travel Analytics
 * GET /ai-agent/profile/:sessionId
 */
router.get('/profile/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get comprehensive user profile
    const profile = await aiAgent.getUserProfile(sessionId);
    const analytics = await aiAgent.generateUserAnalytics(sessionId);

    res.json({
      success: true,
      profile,
      analytics,
      profileComplete: profile.totalInteractions > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving user profile',
      message: error.message
    });
  }
});

/**
 * Integrated Flight Search with AI Recommendations
 * POST /ai-agent/flight-search
 */
router.post('/flight-search', async (req, res) => {
  try {
    const searchRequest = req.body;
    const { userContext = {}, sessionId = `session_${Date.now()}` } = searchRequest;

    console.log('✈️ AI-enhanced flight search:', searchRequest);

    // Get user preferences and chat history for enhanced search
    const userProfile = await aiAgent.getUserProfile(sessionId);
    
    // Enhance search request with AI insights
    const enhancedRequest = {
      ...searchRequest,
      preferences: {
        ...searchRequest.preferences,
        ...userProfile.preferences
      },
      userContext: {
        ...userContext,
        travelProfile: userProfile.travelProfile,
        sessionId
      }
    };

    // Perform flight search (using existing flight service)
    const flightSearchResponse = await searchFlights(enhancedRequest);

    // Enhance results with AI recommendations
    const aiEnhancements = await aiAgent.enhanceFlightResults(
      flightSearchResponse.flights,
      userContext,
      userProfile.preferences
    );

    // Generate contextual travel advice
    const travelAdvice = await aiAgent.generateTravelAdvice({
      searchRequest: enhancedRequest,
      searchResults: flightSearchResponse,
      userProfile
    });

    res.json({
      success: true,
      ...flightSearchResponse,
      aiEnhancements,
      travelAdvice,
      personalizedSearch: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI flight search error:', error);
    res.status(500).json({
      success: false,
      error: 'Error performing AI-enhanced flight search',
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'AI Agent Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    capabilities: [
      'chat',
      'recommendations',
      'analysis',
      'smart-suggestions',
      'flight-integration'
    ]
  });
});

// Helper function to search flights (would use your flight service)
async function searchFlights(searchRequest) {
  // This would call your flight service
  // For now, return a mock response
  return {
    flights: [],
    totalResults: 0,
    searchId: `ai-search-${Date.now()}`,
    provider: 'ai-enhanced'
  };
}

module.exports = router;