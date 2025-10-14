const express = require('express');
const router = express.Router();
const IntegratedAITravelAgent = require('../services/IntegratedAITravelAgent');

// Initialize the integrated AI travel agent
const aiAgent = new IntegratedAITravelAgent();

/**
 * Enhanced AI Agent Chat Endpoint with Full Integration
 * POST /ai-agent/chat
 * 
 * Features:
 * - Bedrock (Nova Pro) for all responses
 * - Real-time flight API integration
 * - Real-time hotel API integration
 * - Conversation history storage and context
 * - User preferences tracking and application
 * - Intelligent intent detection
 */
router.post('/chat', async (req, res) => {
  try {
    console.log('\n🤖 ═══════════════════════════════════════');
    console.log('🤖 AI Travel Agent - New Message');
    console.log('🤖 ═══════════════════════════════════════');

    const {
      messages = [],
      userContext = {},
      aiModel = 'bedrock',
      userId,
      sessionId
    } = req.body;

    // Validate required fields
    if (!messages || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required and cannot be empty'
      });
    }

    // Process message through integrated AI agent
    const response = await aiAgent.processMessage({
      messages,
      userContext,
      userId: userId || userContext.userId,
      sessionId: sessionId || userContext.sessionId
    });

    console.log('✅ Response generated successfully');
    console.log('═══════════════════════════════════════\n');

    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI Agent chat error:', error);
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
 * Get User Preferences
 * GET /ai-agent/preferences/:userId
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const preferences = await aiAgent.loadUserPreferences(userId);

    res.json({
      success: true,
      userId,
      preferences,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving preferences',
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
      userId,
      preferences = {}
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    await aiAgent.saveUserPreferences(userId, {
      ...preferences,
      lastUpdated: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating preferences',
      message: error.message
    });
  }
});

/**
 * Get Conversation History
 * GET /ai-agent/history/:sessionId
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;

    const history = await aiAgent.loadConversationHistory(sessionId);

    res.json({
      success: true,
      sessionId,
      history: history.slice(-parseInt(limit)),
      totalTurns: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving conversation history',
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
 * Clear Conversation History
 * DELETE /ai-agent/history/:sessionId
 */
router.delete('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Clear from in-memory storage
    aiAgent.conversations.delete(sessionId);

    res.json({
      success: true,
      message: 'Conversation history cleared',
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      error: 'Error clearing conversation history',
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
    service: 'Integrated AI Travel Agent',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      aiModel: 'AWS Bedrock Nova Pro',
      flightIntegration: true,
      hotelIntegration: true,
      conversationHistory: true,
      userPreferences: true,
      intelligentIntentDetection: true,
      realTimeDataFetching: true
    },
    capabilities: [
      'Natural language conversation',
      'Flight search and recommendations',
      'Hotel search and recommendations',
      'Destination suggestions',
      'Budget planning',
      'Personalized recommendations based on preferences',
      'Context-aware responses using conversation history',
      'Automatic preference learning',
      'Real-time API data integration'
    ]
  });
});

module.exports = router;