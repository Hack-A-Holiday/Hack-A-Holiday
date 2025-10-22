

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

    // Fetch all sessions for this user first so we can clear agent memory
    const sessions = await chatModel.getAllChatSessionsForUser({ user_id: userId });

    // Delete persistent chat sessions from the chat table
    await chatModel.deleteAllChatSessionsForUser({ user_id: userId });

    // Clear any agent in-memory / conversation table state for each session
    if (Array.isArray(sessions) && sessions.length > 0) {
      for (const s of sessions) {
        try {
          if (s && s._id) {
            await aiAgent.clearConversation(s._id);
          }
        } catch (err) {
          console.error('Failed to clear aiAgent conversation for session', s && s._id, err);
        }
      }
    }

    // Also clear any stored chat pointers on the user object (user.chats)
    try {
      const user = await userModel.getUserById(userId);
      if (user) {
        user.chats = [];
        await userModel.updateUser(user);
      }
    } catch (err) {
      console.error('Failed to clear user.chats for user', userId, err);
    }

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

    // We'll filter for complete conversations after AI response is generated


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


    // Save chat session ONLY if we have complete user-AI pairs after AI response
    try {
      const chatModel = require('../models/chatModel');
      const nowIso = new Date().toISOString();
      if (!user_id) throw new Error('user_id is required to save chat session');
      
      // Add the AI response to session messages for filtering
      let allMessages = [...sessionMessages];
      if (response && response.content) {
        // Add AI response to the messages
        const aiResponse = {
          role: 'assistant',
          content: Array.isArray(response.content) ? response.content.join('\n') : response.content,
          timestamp: Date.now(),
          id: `ai_${Date.now()}`
        };
        allMessages.push(aiResponse);
      }
      
      // Only save if we have complete conversation pairs
      if (chatModel.hasCompleteConversation(allMessages)) {
        const completeMessages = chatModel.filterCompleteConversation(allMessages);
        
        if (completeMessages.length > 0) {
          // Generate AI-powered title from first user message
          const firstUserMsg = completeMessages.find(m => m && m.role === 'user');
          const title = firstUserMsg && firstUserMsg.content 
            ? await chatModel.generateConversationTitleWithAI(firstUserMsg.content)
            : 'New Chat';
            
          await chatModel.saveChatSession({
            user_id,
            _id: newSessionId,
            messages: completeMessages,
            title,
            category: 'general',
            created_at: nowIso,
            updated_at: nowIso
          });
          
          console.log('✅ Saved complete conversation with', completeMessages.length, 'messages');
          
          // Also store in user object
          try {
            const userModel = require('../models/userModel');
            const user = await userModel.getUserById(user_id);
            if (user) {
              user.chats = user.chats || [];
              const newChats = [...user.chats, completeMessages].slice(-50);
              user.chats = newChats;
              await userModel.updateUser(user);
            }
          } catch (err) {
            console.error('Failed to update user chat history:', err);
          }
        } else {
          console.log('⚠️ Not saving session: No complete conversation pairs found');
        }
      } else {
        console.log('⚠️ Not saving session: Incomplete conversation (no user-AI pairs)');
      }
    } catch (err) {
      console.error('Failed to save chat session to chat table:', err);
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

    const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous';
    const history = await aiAgent.loadConversationHistory(sessionId, userId);

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
    console.log('📡 Chat history request - userId:', userId, 'sessionId:', sessionId);
    
    if (!userId || !sessionId) {
      return res.status(400).json({ success: false, error: 'userId and sessionId are required' });
    }
    
    const chatModel = require('../models/chatModel');
    const session = await chatModel.getChatSession({ user_id: userId, _id: sessionId });
    
    console.log('📥 Retrieved session:', session ? 'Found' : 'Not found');
    if (session) {
      console.log('📋 Session details:', {
        id: session._id,
        messageCount: session.messages ? session.messages.length : 0,
        title: session.title
      });
    }
    
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
 * Save or update a chat session for a user
 * POST /ai-agent/user-sessions/:userId
 * Body: { conversationId, messages, userId, userEmail, userName }
 */
router.post('/user-sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { conversationId, messages } = req.body;
    if (!userId || !conversationId || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'userId, conversationId, and messages are required' });
    }
    
    const chatModel = require('../models/chatModel');
    const nowIso = new Date().toISOString();
    
    // Only save if we have complete conversation pairs
    if (chatModel.hasCompleteConversation(messages)) {
      const completeMessages = chatModel.filterCompleteConversation(messages);
      
      if (completeMessages.length > 0) {
        // Generate AI-powered title from first user message
        const firstUserMsg = completeMessages.find(m => m && m.role === 'user');
        const title = firstUserMsg && firstUserMsg.content 
          ? await chatModel.generateConversationTitleWithAI(firstUserMsg.content)
          : 'New Chat';
          
        await chatModel.saveChatSession({
          user_id: userId,
          _id: conversationId,
          messages: completeMessages,
          title,
          category: 'general',
          created_at: nowIso,
          updated_at: nowIso
        });

        // Also sync to IntegratedAITravelAgent conversation history (so the AI can resume context)
        try {
          // Check if aiAgent already has history for this session to avoid duplicates
          const existing = await aiAgent.loadConversationHistory(conversationId, userId);
          if (!existing || existing.length === 0) {
            // Messages are expected to be an array of chat messages (user/assistant pairs)
            for (let i = 0; i < completeMessages.length; i++) {
              const m = completeMessages[i];
              if (!m) continue;
              // Only process user -> assistant pairs
              if ((m.role === 'user') && completeMessages[i+1] && (completeMessages[i+1].role === 'assistant' || completeMessages[i+1].role === 'ai')) {
                const userMsg = m;
                const assistantMsg = completeMessages[i+1];
                // Normalize content to strings when possible
                const userText = typeof userMsg.content === 'string' ? userMsg.content : JSON.stringify(userMsg.content);
                const assistantText = typeof assistantMsg.content === 'string' ? assistantMsg.content : JSON.stringify(assistantMsg.content);
                const ts = assistantMsg.timestamp || userMsg.timestamp || nowIso;
                await aiAgent.saveConversation(conversationId, userId, {
                  user: userText,
                  assistant: assistantText,
                  intent: assistantMsg.intent || null,
                  timestamp: (typeof ts === 'number') ? new Date(ts).toISOString() : new Date(ts).toISOString(),
                  dataFetched: !!assistantMsg.data
                });
                i++; // skip the assistant message we just processed
              }
            }
          } else {
            // Agent already has conversation history for this sessionId
            console.log(`⚠️ aiAgent already contains history for session ${conversationId}, skipping sync`);
          }
        } catch (err) {
          console.error('❌ Failed to sync conversation to aiAgent:', err);
        }

        console.log('✅ Saved complete conversation session with', completeMessages.length, 'messages');
        res.json({ success: true, message: 'Complete chat session saved', conversationId });
      } else {
        console.log('⚠️ Not saving session: No complete conversation pairs found');
        res.json({ success: false, message: 'No complete conversation pairs to save', conversationId });
      }
    } else {
      console.log('⚠️ Not saving session: Incomplete conversation (no user-AI pairs)');
      res.json({ success: false, message: 'Incomplete conversation - not saved', conversationId });
    }
  } catch (error) {
    console.error('❌ Failed to save user chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to save user chat session', message: error.message });
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
        let title = sess.title || 'New Chat';
        let preview = 'No messages yet';
        
        if (Array.isArray(sess.messages) && sess.messages.length > 0) {
          const firstUserMsg = sess.messages.find(m => m && m.role === 'user');
          if (firstUserMsg && typeof firstUserMsg.content === 'string') {
            preview = firstUserMsg.content.slice(0, 60);
            // Generate title if not set
            if (!sess.title || sess.title === 'New Chat') {
              title = chatModel.generateConversationTitle(firstUserMsg.content);
            }
          }
        }
        
        return {
          _id: sess._id,
          user_id: sess.user_id,
          title,
          preview,
          created_at: sess.created_at,
          updated_at: sess.updated_at,
          messageCount: sess.messages ? sess.messages.length : 0
        };
      }).sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    }
    res.json({ success: true, sessions: summaries });
  } catch (error) {
    console.error('❌ Failed to fetch user chat sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user chat sessions', message: error.message });
  }
});

/**
 * Delete a specific chat session
 * DELETE /ai-agent/user-sessions/:userId/:sessionId
 */
router.delete('/user-sessions/:userId/:sessionId', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    if (!userId || !sessionId) {
      return res.status(400).json({ success: false, error: 'userId and sessionId are required' });
    }
    
    const chatModel = require('../models/chatModel');
    await chatModel.deleteChatSession({ user_id: userId, _id: sessionId });
    
    // Also clear from AI agent memory
    try {
      await aiAgent.clearConversation(sessionId);
    } catch (err) {
      console.warn('Failed to clear conversation from AI agent:', err);
    }
    
    res.json({ success: true, message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('❌ Failed to delete chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to delete chat session', message: error.message });
  }
});

/**
 * Update chat session title
 * PUT /ai-agent/user-sessions/:userId/:sessionId/title
 */
router.put('/user-sessions/:userId/:sessionId/title', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const { title } = req.body;
    
    if (!userId || !sessionId) {
      return res.status(400).json({ success: false, error: 'userId and sessionId are required' });
    }
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Valid title is required' });
    }
    
    const chatModel = require('../models/chatModel');
    await chatModel.updateChatSessionTitle({ 
      user_id: userId, 
      _id: sessionId, 
      title: title.trim().slice(0, 100) // Limit title length
    });
    
    res.json({ success: true, message: 'Chat title updated successfully' });
  } catch (error) {
    console.error('❌ Failed to update chat title:', error);
    res.status(500).json({ success: false, error: 'Failed to update chat title', message: error.message });
  }
});

/**
 * Search chat sessions
 * GET /ai-agent/user-sessions/:userId/search?q=query
 */
router.get('/user-sessions/:userId/search', async (req, res) => {
  try {
    const { userId } = req.params;
    const { q } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    
    const chatModel = require('../models/chatModel');
    const sessions = await chatModel.getAllChatSessionsForUser({ user_id: userId });
    
    const query = q.toLowerCase().trim();
    const matchingSessions = sessions.filter(sess => {
      // Search in title
      if (sess.title && sess.title.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in messages
      if (Array.isArray(sess.messages)) {
        return sess.messages.some(msg => 
          msg.content && 
          typeof msg.content === 'string' && 
          msg.content.toLowerCase().includes(query)
        );
      }
      
      return false;
    }).map(sess => {
      let title = sess.title || 'New Chat';
      let preview = 'No messages yet';
      
      if (Array.isArray(sess.messages) && sess.messages.length > 0) {
        const firstUserMsg = sess.messages.find(m => m && m.role === 'user');
        if (firstUserMsg && typeof firstUserMsg.content === 'string') {
          preview = firstUserMsg.content.slice(0, 60);
          if (!sess.title || sess.title === 'New Chat') {
            title = chatModel.generateConversationTitle(firstUserMsg.content);
          }
        }
      }
      
      return {
        _id: sess._id,
        user_id: sess.user_id,
        title,
        preview,
        created_at: sess.created_at,
        updated_at: sess.updated_at,
        messageCount: sess.messages ? sess.messages.length : 0
      };
    }).sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    
    res.json({ 
      success: true, 
      sessions: matchingSessions,
      query: q,
      totalResults: matchingSessions.length
    });
  } catch (error) {
    console.error('❌ Failed to search chat sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to search chat sessions', message: error.message });
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