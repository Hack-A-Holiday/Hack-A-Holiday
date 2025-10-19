
const express = require('express');
const router = express.Router();
const IntegratedAITravelAgent = require('../services/IntegratedAITravelAgent');
const userModel = require('../models/userModel');
const aiAgent = new IntegratedAITravelAgent();

/**
 * Clear ALL chat sessions for a user
 * DELETE /ai-agent/user-sessions/:userId
 */
router.delete('/user-sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const chatModel = require('../models/chatModel');
    await chatModel.deleteAllChatSessionsForUser({ user_id: userId });
    res.json({ success: true, message: 'All chat sessions cleared', userId });
  } catch (error) {
    console.error('❌ Failed to clear all user chat sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to clear all user chat sessions', message: error.message });
  }
});

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
      messages,
      message, // allow single message for backward compatibility
      userContext = {},
      aiModel = 'bedrock',
      userId,
      sessionId
    } = req.body;


    // Always create a new session for each new query
    let sessionMessages = [];
    // Always generate a unique session ID if not provided
    let newSessionId = sessionId || userContext.sessionId || `session_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    const user_id = userId || userContext.userId;
    if (Array.isArray(messages) && messages.length > 0) {
      sessionMessages = messages;
    } else if (message) {
      sessionMessages = [
        {
          role: 'user',
          content: message,
          timestamp: Date.now(),
        }
      ];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Messages array or message is required and cannot be empty'
      });
    }

    // Filter: Only store sessions where every user message has a corresponding AI response
    function filterPairedMessages(messagesArr) {
      const paired = [];
      let i = 0;
      while (i < messagesArr.length) {
        if (messagesArr[i].role === 'user' && messagesArr[i+1] && messagesArr[i+1].role === 'ai') {
          paired.push(messagesArr[i]);
          paired.push(messagesArr[i+1]);
          i += 2;
        } else {
          i++;
        }
      }
      return paired;
    }
    const pairedSessionMessages = filterPairedMessages(sessionMessages);


    // Process message through integrated AI agent
    const response = await aiAgent.processMessage({
      messages: sessionMessages,
      userContext,
      userId: user_id,
      sessionId: newSessionId
    });

    // Always inject Google Flights button(s) for flight_search intent, or prompt for missing info
    try {
      let intentInfo = null;
      if (aiAgent && typeof aiAgent.analyzeUserIntent === 'function') {
        intentInfo = await aiAgent.analyzeUserIntent(
          sessionMessages[sessionMessages.length-1]?.content || ''
        );
      }
      const extracted = intentInfo && intentInfo.extractedInfo ? intentInfo.extractedInfo : {};
      const intentType = intentInfo && intentInfo.type;
      // Multi-city support: destinations can be array
      let origins = [];
      let destinations = [];
      let departureDate = extracted.departureDate || '';
      let returnDate = extracted.returnDate || '';
      let passengers = extracted.passengers || '';
      // Fallback: use Nova Lite origin if extracted.origin is missing
      let novaLiteOrigin = (intentInfo && intentInfo.origin) || (intentInfo && intentInfo.extractedInfo && intentInfo.extractedInfo.origin);
      if (Array.isArray(extracted.destinations) && extracted.destinations.length > 0) {
        destinations = extracted.destinations;
        origins = [extracted.origin || userContext.origin || novaLiteOrigin];
      } else if (extracted.destination) {
        destinations = [extracted.destination];
        origins = [extracted.origin || userContext.origin || novaLiteOrigin];
      }
      // Always generate a Google Flights button with whatever info is available
      if (intentType === 'flight_search') {
        let missingFields = [];
        if (!origins.length || !origins[0]) missingFields.push('origin city');
        if (!destinations.length || !destinations[0]) missingFields.push('destination city');
        if (!departureDate) missingFields.push('travel dates');
        if (!passengers) missingFields.push('number of passengers');

        // Build Google Flights query with whatever info is present
        let query = '';
        if (origins.length && origins[0]) query += origins[0];
        if (destinations.length && destinations[0]) query += (query ? ' to ' : '') + destinations[0];
        if (departureDate) query += ` ${departureDate}`;
        if (returnDate) query += ` return ${returnDate}`;
        if (passengers) query += ` ${passengers} passengers`;
        const googleFlightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;

        if (response && typeof response === 'object') {
          response.data = response.data || {};
          response.data.googleFlightsButton = googleFlightsUrl;
          if (missingFields.length > 0) {
            response.data.missingFlightInfoPrompt = `Please provide the following information to search for flights: ${missingFields.join(', ')}.`;
          }
        }
      }
    } catch (err) {
      console.error('Failed to inject Google Flights button or prompt:', err);
    }


    // Save chat session as a single item (array of messages) after every AI response, or at least store user message for sidebar/history
    try {
      const chatModel = require('../models/chatModel');
      const nowIso = new Date().toISOString();
      if (!user_id) throw new Error('user_id is required to save chat session');
      let toSave = [];
      if (pairedSessionMessages.length > 0) {
        toSave = pairedSessionMessages;
      } else if (sessionMessages.length > 0) {
        // Save at least the user message for sidebar/history (for fallback, API error, or first message)
        toSave = sessionMessages;
      }
      if (toSave.length > 0) {
        await chatModel.saveChatSession({
          user_id,
          _id: newSessionId,
          messages: toSave,
          category: 'general',
          created_at: nowIso,
          updated_at: nowIso
        });
      } else {
        console.log('⚠️ Not saving session: No messages to save');
      }
    } catch (err) {
      console.error('Failed to save chat session to chat table:', err);
    }

    // Also store chat session (array of user+AI messages) in user object as a grouped session
    if (user_id && pairedSessionMessages.length > 0) {
      try {
        const user = await userModel.getUserById(user_id);
        if (user) {
          user.chats = user.chats || [];
          const newChats = [...user.chats, pairedSessionMessages].slice(-50);
          user.chats = newChats;
          await userModel.updateUser(user);
        }
      } catch (err) {
        console.error('Failed to update user chat history:', err);
      }
    }

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

    // Only use present chat context (request body) for search
    const origin = searchRequest.origin;
    const destination = searchRequest.destination;
    const departureDate = searchRequest.departureDate;
    const returnDate = searchRequest.returnDate;
    const passengers = searchRequest.passengers;
    const cabinClass = searchRequest.cabinClass;
    const currency = searchRequest.currency;
    const flightPreferences = searchRequest.preferences || {};

    // Validate required fields (no defaults, no fallback)
    if (!origin) {
      return res.status(400).json({ success: false, error: 'Origin is required for flight search.' });
    }
    if (!destination) {
      return res.status(400).json({ success: false, error: 'Destination is required for flight search.' });
    }
    if (!departureDate) {
      return res.status(400).json({ success: false, error: 'Departure date is required for flight search.' });
    }

    // Build search payload (no defaults)
    const payload = {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      currency,
      preferences: flightPreferences
    };

    // Call the real flight API (same as fetchFlightData)
    let results = null;
    let kiwiFailed = false;
    try {
      const axios = require('axios');
      const response = await axios.post('http://localhost:4000/flights/search', payload);
      results = response.data;
    } catch (err) {
      kiwiFailed = true;
      // API error, check for Google Flights fallback
      if (err.response && err.response.data && err.response.data.googleFlightsFallback) {
        return res.json({
          success: true,
          flights: [],
          provider: 'google_flights_fallback',
          googleFlightsFallback: err.response.data.googleFlightsFallback,
          googleFlightsButton: err.response.data.googleFlightsFallback, // Always provide button
          timestamp: new Date().toISOString()
        });
      }
      // If Kiwi fails and no fallback, still generate Google Flights button
      const query = `${origin} to ${destination} ${departureDate}`;
      const googleFlightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
      return res.json({
        success: true,
        flights: [],
        provider: 'google_flights_fallback',
        googleFlightsFallback: googleFlightsUrl,
        googleFlightsButton: googleFlightsUrl,
        timestamp: new Date().toISOString()
      });
    }

    // If API failed but has Google Flights fallback, return fallback
    if (results && !results.success && results.googleFlightsFallback) {
      return res.json({
        success: true,
        flights: [],
        provider: 'google_flights_fallback',
        googleFlightsFallback: results.googleFlightsFallback,
        googleFlightsButton: results.googleFlightsFallback,
        timestamp: new Date().toISOString()
      });
    }

    // Never return mock data
    if (results && results.provider === 'mock') {
      // Still generate Google Flights button
      const query = `${origin} to ${destination} ${departureDate}`;
      const googleFlightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
      return res.status(200).json({
        success: true,
        flights: [],
        provider: 'google_flights_fallback',
        googleFlightsFallback: googleFlightsUrl,
        googleFlightsButton: googleFlightsUrl,
        timestamp: new Date().toISOString()
      });
    }

    // Return real results (match fetchFlightData structure)
    // Always provide Google Flights button
    const query = `${origin} to ${destination} ${departureDate}`;
    const googleFlightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
    return res.json({
      success: true,
      type: 'flight',
      request: payload,
      results: results.flights || [],
      totalResults: results.flights?.length || 0,
      provider: results.provider,
      searchTime: results.searchTime,
      currency: results.currency || payload.currency,
      googleFlightsFallback: results.googleFlightsFallback,
      googleFlightsButton: googleFlightsUrl,
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
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    const chatModel = require('../models/chatModel');
    // Find session by sessionId (search for _id)
    const session = await chatModel.getChatSession({ user_id: undefined, _id: sessionId });
    if (!session || !Array.isArray(session.messages)) {
      return res.json({ success: true, history: [] });
    }
    res.json({ success: true, history: session.messages });
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching conversation history',
      message: error.message
    });
  }
});

/**
 * Get Chat History for a User/Session
 * GET /ai-agent/chat-history?userId=...&sessionId=...
 */
router.get('/chat-history', async (req, res) => {
  try {
    const { userId, sessionId } = req.query;
    if (!userId || !sessionId) {
      return res.status(400).json({ success: false, error: 'userId and sessionId are required' });
    }
    const chatModel = require('../models/chatModel');
    const session = await chatModel.getChatSession({ user_id: userId, _id: sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }
    res.json({ success: true, session });
  } catch (error) {
    console.error('❌ Chat history fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat history', message: error.message });
  }
});

/**
 * Get all chat sessions for a user (for sidebar)
 * GET /ai-agent/user-sessions/:userId
 */
router.get('/user-sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const chatModel = require('../models/chatModel');
    // Get all chat sessions for this user from HackAHolidayChatHistory
    let sessions = await chatModel.getAllChatSessionsForUser({ user_id: userId });
    // Build sidebar summaries from each session
    let summaries = [];
    if (Array.isArray(sessions)) {
      summaries = sessions.map(sess => {
        let preview = 'New chat';
        if (Array.isArray(sess.messages) && sess.messages.length > 0) {
          const firstUserMsg = sess.messages.find(m => m && m.role === 'user');
          if (firstUserMsg && typeof firstUserMsg.content === 'string') {
            preview = firstUserMsg.content.slice(0, 60);
          }
        }
        return {
          _id: sess._id,
          user_id: sess.user_id,
          created_at: sess.created_at,
          preview
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    res.json({ success: true, sessions: summaries });
  } catch (error) {
    console.error('❌ Failed to fetch user chat sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user chat sessions', message: error.message });
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