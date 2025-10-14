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
    
    // Plan trip with enhanced AI context
    const result = await planTripService.planTrip(userId, enhancedPreferences, token, userContext);

    // Ensure the result is correctly formatted before sending it to the frontend
    if (!result.dailyItinerary || !result.destination) {
      console.error('Invalid trip plan response:', result);
      return res.status(500).json({ error: 'Invalid trip plan response' });
    }

    // Update user preferences based on this trip plan (learning from interaction)
    if (result.destination) {
      const tripMessage = `Plan a ${preferences.duration || 7}-day trip to ${result.destination} from ${effectiveOrigin || 'home'} with ${preferences.budget || 'moderate'} budget`;
      await aiAgent.updatePreferencesFromConversation(
        userId,
        tripMessage,
        `Planned ${preferences.duration || 7}-day trip to ${result.destination}`,
        savedPreferences
      );
      
      // Store trip in history
      aiAgent.updateUserContext(userId, {
        tripHistory: {
          destination: result.destination,
          origin: effectiveOrigin,
          duration: preferences.duration,
          budget: result.totalBudget,
          startDate: preferences.startDate
        }
      });
    }

    console.log('   ✅ AI-powered trip plan generated with context');
    console.log('═══════════════════════════════════════\n');

    res.status(201).json({
      ...result,
      // Include AI agent metadata
      aiContext: {
        usedHomeCity: effectiveOrigin === userContext.preferences?.homeCity,
        usedSearchHistory: effectiveOrigin !== preferences.origin && effectiveOrigin,
        personalizedWithPreferences: Object.keys(savedPreferences).length > 0,
        totalSearches: userContext.searchHistory?.length || 0
      }
    });
  } catch (err) {
    console.error('❌ Plan trip error:', err);
    const errorResponse = { error: err.message || 'Failed to plan trip' };
    res.status(500).json(errorResponse);
  }
};
