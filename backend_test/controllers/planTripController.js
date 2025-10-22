// Plan Trip Controller
const planTripService = require('../services/planTripService');
const IntegratedAITravelAgent = require('../services/IntegratedAITravelAgent');

// Initialize AI agent for context and preferences
const aiAgent = new IntegratedAITravelAgent();

exports.planTrip = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const preferences = req.body.preferences;
    
    console.log('\n🗺️  ═══════════════════════════════════════');
    console.log('🗺️  Plan Trip Request (AI Agent Mode) - User:', userEmail);
    console.log('🗺️  ═══════════════════════════════════════');

    // Get user context for intelligent processing
    const userContext = aiAgent.getUserContext(userId);
    
    // Extract preferences from the request message if present
    if (preferences.destination || preferences.origin) {
      const message = `Plan a trip from ${preferences.origin || 'my location'} to ${preferences.destination} for ${preferences.duration || 7} days`;
      const extractedPrefs = aiAgent.extractPreferencesFromMessage(message, userContext);
      
      if (Object.keys(extractedPrefs).length > 0) {
        aiAgent.updateUserContext(userId, { preferences: extractedPrefs });
        console.log('   ✨ Extracted and stored preferences:', extractedPrefs);
      }
    }

    // Load comprehensive user preferences from AI agent
    const savedPreferences = await aiAgent.loadUserPreferences(userId);
    
    // Smart origin detection using context
    let effectiveOrigin = preferences.origin;
    if (!effectiveOrigin) {
      // Try to get from user context (homeCity or recent searches)
      if (userContext.preferences?.homeCity) {
        effectiveOrigin = userContext.preferences.homeCity;
        console.log('   🏠 Using home city from context:', effectiveOrigin);
      } else if (userContext.searchHistory?.length > 0) {
        // Look for most recent origin
        for (let i = userContext.searchHistory.length - 1; i >= 0; i--) {
          if (userContext.searchHistory[i].origin) {
            effectiveOrigin = userContext.searchHistory[i].origin;
            console.log('   📍 Using origin from recent search:', effectiveOrigin);
            break;
          }
        }
      }
    }
    
    // Merge saved preferences with current request (AI agent style)
    const enhancedPreferences = {
      ...preferences,
      origin: effectiveOrigin,
      userPreferences: savedPreferences,
      travelStyle: savedPreferences.travelStyle || preferences.travelStyle,
      interests: [...new Set([
        ...(savedPreferences.interests || []),
        ...(preferences.interests || [])
      ])],
      budgetRange: savedPreferences.budgetRange || preferences.budgetRange,
      budget: savedPreferences.budget || preferences.budget,
      homeCity: userContext.preferences?.homeCity
    };

    console.log('   🧠 Using AI agent context with preferences:', {
      origin: effectiveOrigin,
      destination: preferences.destination,
      travelStyle: enhancedPreferences.travelStyle,
      interests: enhancedPreferences.interests,
      homeCity: enhancedPreferences.homeCity
    });
    
    // Store this as a trip search in context
    aiAgent.updateUserContext(userId, {
      searchHistory: {
        type: 'trip_planning',
        origin: effectiveOrigin,
        destination: preferences.destination,
        duration: preferences.duration,
        budget: preferences.budget
      }
    });
    
    // Get token from cookie or header
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    // Use IntegratedAITravelAgent for comprehensive trip planning with real APIs
    const tripPlanningMessage = `Plan a complete trip from ${effectiveOrigin || 'my location'} to ${preferences.destination} for ${preferences.duration || 7} days. 
    Budget: $${preferences.budget || 'moderate'}
    Travel style: ${preferences.travelStyle || 'balanced'}
    Interests: ${(preferences.interests || []).join(', ')}
    
    Please provide:
    1. Detailed daily itinerary
    2. Flight recommendations with real prices
    3. Hotel recommendations with real prices and availability
    4. Nearby attractions and activities
    5. Budget breakdown`;

    const result = await aiAgent.processMessage({
      message: tripPlanningMessage,
      userId: userId,
      sessionId: `trip_${Date.now()}`,
      conversationHistory: [],
      userContext: {
        ...userContext,
        preferences: enhancedPreferences
      }
    });

    // Handle IntegratedAITravelAgent response format
    if (result.multiMessage && Array.isArray(result.content)) {
      // Multi-message response - return as is for frontend processing
      console.log('   ✅ Multi-message response generated with', result.content.length, 'messages');
      return res.status(201).json({
        success: true,
        data: {
          response: result.content,
          conversationId: result.metadata?.sessionId,
          realData: result.realData,
          aiContext: {
            usedHomeCity: effectiveOrigin === userContext.preferences?.homeCity,
            usedSearchHistory: effectiveOrigin !== preferences.origin && effectiveOrigin,
            personalizedWithPreferences: Object.keys(savedPreferences).length > 0,
            totalSearches: userContext.searchHistory?.length || 0,
            apiCallsMade: result.metadata?.apiCallsMade || false
          }
        }
      });
    } else {
      // Single response - format for backward compatibility
      console.log('   ✅ Single response generated');
      return res.status(201).json({
        success: true,
        data: {
          response: result.content,
          conversationId: result.metadata?.sessionId,
          realData: result.realData,
          aiContext: {
            usedHomeCity: effectiveOrigin === userContext.preferences?.homeCity,
            usedSearchHistory: effectiveOrigin !== preferences.origin && effectiveOrigin,
            personalizedWithPreferences: Object.keys(savedPreferences).length > 0,
            totalSearches: userContext.searchHistory?.length || 0,
            apiCallsMade: result.metadata?.apiCallsMade || false
          }
        }
      });
    }

    console.log('   ✅ AI-powered trip plan generated with context');
    console.log('═══════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Plan trip error:', err);
    const errorResponse = { error: err.message || 'Failed to plan trip' };
    res.status(500).json(errorResponse);
  }
};
