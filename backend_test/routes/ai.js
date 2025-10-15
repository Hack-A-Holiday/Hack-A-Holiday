// backend_test/routes/ai.js
const express = require('express');
const router = express.Router();
const IntegratedAITravelAgent = require('../services/IntegratedAITravelAgent');
const verifyToken = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');

// Initialize the integrated AI travel agent
const aiAgent = new IntegratedAITravelAgent();

/**
 * POST /ai/chat
 * Process chat message with AI agent
 * 
 * Integrated Features:
 * - Bedrock (Nova Pro) for all responses
 * - Real-time flight API integration
 * - Real-time hotel API integration
 * - Conversation history storage and context
 * - User preferences tracking
 * - Works for both authenticated and guest users
 */
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, messages, conversationId, preferences, userContext } = req.body;
    const userId = req.user?.userId || userContext?.userId || 'anonymous';
    const userEmail = req.user?.email || userContext?.email || 'guest';

    console.log('\n🤖 ═══════════════════════════════════════');
    console.log('🤖 AI Chat Request (Agent Mode) - User:', userEmail);
    console.log('🤖 ═══════════════════════════════════════');

    // Validate input
    if (!message && (!messages || messages.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get current user context for intelligent processing
    const agentContext = aiAgent.getUserContext(userId);
    console.log('   🧠 User context loaded:', {
      homeCity: agentContext.preferences?.homeCity,
      searches: agentContext.searchHistory?.length || 0,
      trips: agentContext.tripHistory?.length || 0,
      interests: agentContext.preferences?.interests?.length || 0
    });

    // Build messages array
    let messagesArray = messages || [];
    if (message && !messages) {
      // Single message format - just send the current message
      // Let processMessage handle conversation history internally
      messagesArray = [{ role: 'user', content: message }];
    }

    // Extract current message for preference learning
    const currentMessage = messagesArray[messagesArray.length - 1]?.content || '';
    
    // Extract and store any preferences mentioned in this message
    if (currentMessage) {
      const extractedPrefs = aiAgent.extractPreferencesFromMessage(currentMessage, agentContext);
      if (Object.keys(extractedPrefs).length > 0) {
        aiAgent.updateUserContext(userId, { preferences: extractedPrefs });
        console.log('   ✨ Learned new preferences from message:', extractedPrefs);
      }
    }

    // Process message through integrated AI agent with full context
    const response = await aiAgent.processMessage({
      messages: messagesArray,
      userContext: {
        ...agentContext, // Include full agent context
        ...userContext,
        preferences: {
          ...agentContext.preferences,
          ...preferences
        },
        userId,
        email: userEmail,
        sessionId: conversationId || userId
      },
      userId,
      sessionId: conversationId || userId
    });

    console.log('✅ AI Agent response generated with context');
    console.log('   📊 Context stats:', {
      preferences: Object.keys(agentContext.preferences || {}).length,
      searches: agentContext.searchHistory?.length || 0,
      apiCalls: response.metadata?.apiCallsMade
    });
    console.log('═══════════════════════════════════════\n');

    // Format response to match existing frontend expectations
    // Extract recommendations from realData
    let recommendations = null;
    
    if (response.realData) {
      // Handle combined flight + hotel data
      if (response.realData.type === 'combined') {
        // Return flight results as primary recommendations
        if (response.realData.flights?.results && response.realData.flights.results.length > 0) {
          recommendations = response.realData.flights.results;
        }
      }
      // Handle single flight/hotel data
      else if (response.realData.results && response.realData.results.length > 0) {
        recommendations = response.realData.results;
      }
    }

    res.json({
      success: true,
      data: {
        response: response.content,
        role: response.role,
        type: response.metadata.intent,
        recommendations: recommendations,
        intent: response.metadata.intent,
        conversationId: response.metadata.sessionId,
        timestamp: response.metadata.timestamp,
        // Additional data for enhanced UI
        realData: response.realData,
        userPreferences: response.userPreferences,
        apiCallsMade: response.metadata.apiCallsMade,
        dataSource: response.metadata.dataSource,
        // AI Agent context metadata
        agentContext: {
          usedHomeCity: agentContext.preferences?.homeCity,
          totalSearches: agentContext.searchHistory?.length || 0,
          totalTrips: agentContext.tripHistory?.length || 0,
          learnedInterests: agentContext.preferences?.interests || [],
          personalizedResponse: Object.keys(agentContext.preferences || {}).length > 0
        }
      }
    });

  } catch (error) {
    console.error('❌ AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message,
      fallback: {
        response: 'I apologize for the technical issue. I\'m here to help you plan your perfect trip! What can I assist you with today?'
      }
    });
  }
});

/**
 * GET /ai/conversations
 * Get user's conversation history
 */
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get conversation history from integrated agent
    const history = await aiAgent.loadConversationHistory(userId);

    res.json({
      success: true,
      data: history,
      totalConversations: history.length
    });

  } catch (error) {
    console.error('Fetch conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

/**
 * GET /ai/conversations/:conversationId
 * Get specific conversation messages
 */
router.get('/conversations/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Fetch conversation messages from integrated agent
    const messages = await aiAgent.loadConversationHistory(conversationId);

    res.json({
      success: true,
      data: {
        conversationId,
        messages,
        totalMessages: messages.length
      }
    });

  } catch (error) {
    console.error('Fetch conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation'
    });
  }
});

/**
 * DELETE /ai/conversations/:conversationId
 * Delete a conversation
 */
router.delete('/conversations/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Delete conversation from integrated agent
    aiAgent.conversations.delete(conversationId);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation'
    });
  }
});

/**
 * GET /ai/preferences
 * Get user's travel preferences
 */
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Load user preferences from integrated agent
    const preferences = await aiAgent.loadUserPreferences(userId);

    res.json({
      success: true,
      data: preferences,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
});

/**
 * POST /ai/preferences
 * Update user's travel preferences
 */
router.post('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { preferences } = req.body;

    // Save user preferences to integrated agent
    await aiAgent.saveUserPreferences(userId, {
      ...preferences,
      lastUpdated: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * POST /ai/feedback
 * Submit feedback on AI responses
 */
router.post('/feedback', verifyToken, async (req, res) => {
  try {
    const { messageId, rating, feedback } = req.body;
    const userId = req.user.userId;

    // Store feedback for model improvement
    console.log('📊 User feedback received:', { userId, messageId, rating, feedback });

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

module.exports = router;
