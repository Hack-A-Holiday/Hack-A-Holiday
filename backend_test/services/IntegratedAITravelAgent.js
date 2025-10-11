/**
 * Integrated AI Travel Agent
 * Fully functional travel agent that:
 * - Uses AWS Bedrock (Nova Pro) for all AI responses
 * - Integrates with flight and hotel APIs
 * - Maintains conversation history and context
 * - Stores and uses user preferences
 * - Makes intelligent API calls based on user queries
 */

const { BedrockRuntimeClient, ConverseCommand, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const FlightService = require('./FlightService');
const HotelService = require('./HotelService');

class IntegratedAITravelAgent {
  constructor() {
    // Initialize AWS Bedrock client
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Initialize DynamoDB client for storing conversations and preferences
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Initialize Flight and Hotel services
    this.flightService = new FlightService({
      rapidApiKey: process.env.RAPIDAPI_KEY,
      rapidApiHost: process.env.RAPIDAPI_HOST,
      amadeuApiKey: process.env.AMADEUS_API_KEY,
      amadeuApiSecret: process.env.AMADEUS_API_SECRET
    });

    this.hotelService = new HotelService({
      bookingApiKey: process.env.BOOKING_API_KEY,
      bookingApiHost: process.env.BOOKING_API_HOST,
      rapidApiKey: process.env.RAPIDAPI_KEY
    });

    // Use AWS Nova Pro for all responses
    this.modelId = 'us.amazon.nova-pro-v1:0';

    // In-memory storage (fallback if DynamoDB not available)
    this.conversations = new Map();
    this.userPreferences = new Map();
    this.userContexts = new Map(); // sessionId -> detailed context

    console.log('🤖 Integrated AI Travel Agent initialized');
    console.log(`   Model: ${this.modelId} (AWS Nova Pro)`);
    console.log('   ✅ Flight API integration');
    console.log('   ✅ Hotel API integration');
    console.log('   ✅ Conversation history storage');
    console.log('   ✅ User preferences tracking');
    console.log('   ✅ Enhanced user context storage');
  }

  /**
   * Get or create detailed user context
   */
  getUserContext(sessionId) {
    if (!this.userContexts.has(sessionId)) {
      this.userContexts.set(sessionId, {
        sessionId,
        preferences: {
          budget: null,
          travelStyle: null, // 'budget', 'mid-range', 'luxury'
          interests: [],
          destinations: [],
          accommodationType: null,
          dietaryRestrictions: [],
          homeCity: null // User's home/origin city
        },
        searchHistory: [],
        tripHistory: [],
        conversationTopics: [],
        lastInteraction: Date.now(),
        totalInteractions: 0
      });
    }
    return this.userContexts.get(sessionId);
  }

  /**
   * Extract preferences from user message using NLP patterns
   */
  extractPreferencesFromMessage(message, context) {
    const lowerMsg = message.toLowerCase();
    const updates = {};
    
    // Budget detection - multiple patterns
    const budgetPatterns = [
      /budget\s+(?:of\s+|is\s+|around\s+)?\$?(\d+)/i,
      /\$(\d+)\s+budget/i,
      /under\s+\$?(\d+)/i,
      /around\s+\$?(\d+)/i,
      /about\s+\$?(\d+)/i,
      /spend.*?\$?(\d+)/i,
      /(\d+)\s*(?:dollars|usd)/i
    ];
    for (const pattern of budgetPatterns) {
      const match = message.match(pattern);
      if (match) {
        updates.budget = parseInt(match[1]);
        break;
      }
    }
    
    // Travel style detection
    if (/luxury|premium|5.star|upscale|fancy|high.end|lavish|indulgent/i.test(lowerMsg)) {
      updates.travelStyle = 'luxury';
    } else if (/budget|cheap|affordable|backpack|hostel|economical|frugal|save\s+money/i.test(lowerMsg)) {
      updates.travelStyle = 'budget';
    } else if (/mid.range|moderate|comfortable|3.star|4.star|standard/i.test(lowerMsg)) {
      updates.travelStyle = 'mid-range';
    }
    
    // Interest detection
    const newInterests = [];
    if (/culture|museum|art|history|heritage|monuments?|ancient|archaeology/i.test(lowerMsg)) {
      newInterests.push('culture');
    }
    if (/food|dining|culinary|restaurant|cuisine|eat|foodie|gastronomy/i.test(lowerMsg)) {
      newInterests.push('food');
    }
    if (/adventure|hiking|trek|sports|active|outdoor|climbing|rafting/i.test(lowerMsg)) {
      newInterests.push('adventure');
    }
    if (/beach|sea|ocean|coast|swim|snorkel|surf/i.test(lowerMsg)) {
      newInterests.push('beach');
    }
    if (/shopping|mall|market|boutique|souvenirs/i.test(lowerMsg)) {
      newInterests.push('shopping');
    }
    if (/nightlife|club|bar|party|entertainment/i.test(lowerMsg)) {
      newInterests.push('nightlife');
    }
    if (/nature|wildlife|park|forest|mountain|safari/i.test(lowerMsg)) {
      newInterests.push('nature');
    }
    if (/relax|spa|wellness|peaceful|quiet|zen|meditation/i.test(lowerMsg)) {
      newInterests.push('relaxation');
    }
    if (/photography|photo|instagram|scenic|views/i.test(lowerMsg)) {
      newInterests.push('photography');
    }
    if (/family|kids|children/i.test(lowerMsg)) {
      newInterests.push('family-friendly');
    }
    
    if (newInterests.length > 0) {
      const existingInterests = context.preferences.interests || [];
      updates.interests = [...new Set([...existingInterests, ...newInterests])];
    }
    
    // Accommodation type
    if (/\bhotel\b/i.test(lowerMsg)) updates.accommodationType = 'hotel';
    if (/resort/i.test(lowerMsg)) updates.accommodationType = 'resort';
    if (/airbnb|apartment|rental/i.test(lowerMsg)) updates.accommodationType = 'rental';
    if (/hostel/i.test(lowerMsg)) updates.accommodationType = 'hostel';
    if (/villa/i.test(lowerMsg)) updates.accommodationType = 'villa';
    if (/boutique/i.test(lowerMsg)) updates.accommodationType = 'boutique';
    
    // Dietary restrictions
    const newDietary = [];
    if (/vegetarian/i.test(lowerMsg)) newDietary.push('vegetarian');
    if (/vegan/i.test(lowerMsg)) newDietary.push('vegan');
    if (/gluten.free|celiac/i.test(lowerMsg)) newDietary.push('gluten-free');
    if (/halal/i.test(lowerMsg)) newDietary.push('halal');
    if (/kosher/i.test(lowerMsg)) newDietary.push('kosher');
    if (/dairy.free|lactose/i.test(lowerMsg)) newDietary.push('dairy-free');
    if (/pescatarian/i.test(lowerMsg)) newDietary.push('pescatarian');
    
    if (newDietary.length > 0) {
      const existing = context.preferences.dietaryRestrictions || [];
      updates.dietaryRestrictions = [...new Set([...existing, ...newDietary])];
    }
    
    // Trip pace preference
    if (/slow.paced|leisurely|relaxed|easy.going|no.rush/i.test(lowerMsg)) {
      updates.tripPace = 'relaxed';
    } else if (/fast.paced|action.packed|busy|see.everything|maximize/i.test(lowerMsg)) {
      updates.tripPace = 'fast-paced';
    } else if (/moderate|balanced|mix/i.test(lowerMsg)) {
      updates.tripPace = 'moderate';
    }
    
    // Crowd preference
    if (/avoid.crowds|less.crowded|off.the.beaten|quiet|peaceful|secluded/i.test(lowerMsg)) {
      updates.crowdPreference = 'avoid-crowds';
    } else if (/popular|touristy|main.attractions|iconic/i.test(lowerMsg)) {
      updates.crowdPreference = 'popular-spots';
    }
    
    // Climate preference
    if (/warm|hot|tropical|sunny|beach.weather/i.test(lowerMsg)) {
      updates.climatePreference = 'warm';
    } else if (/cold|snow|winter|skiing|freezing/i.test(lowerMsg)) {
      updates.climatePreference = 'cold';
    } else if (/mild|moderate|spring|fall|autumn/i.test(lowerMsg)) {
      updates.climatePreference = 'mild';
    }
    
    // Trip duration preference
    const durationMatch = message.match(/(\d+)\s*(?:day|night|week)/i);
    if (durationMatch) {
      updates.preferredTripDuration = durationMatch[0];
    }
    
    // Travel companions
    if (/solo|alone|by myself/i.test(lowerMsg)) {
      updates.travelCompanions = 'solo';
    } else if (/couple|partner|spouse|significant.other/i.test(lowerMsg)) {
      updates.travelCompanions = 'couple';
    } else if (/family|kids|children/i.test(lowerMsg)) {
      updates.travelCompanions = 'family';
    } else if (/friends|group/i.test(lowerMsg)) {
      updates.travelCompanions = 'friends';
    }
    
    // Accessibility needs
    const newAccessibility = [];
    if (/wheelchair|mobility|disabled|handicap/i.test(lowerMsg)) {
      newAccessibility.push('wheelchair-accessible');
    }
    if (/elderly|senior|aged/i.test(lowerMsg)) {
      newAccessibility.push('senior-friendly');
    }
    if (/hearing|deaf/i.test(lowerMsg)) {
      newAccessibility.push('hearing-impaired');
    }
    if (/visual|blind|sight/i.test(lowerMsg)) {
      newAccessibility.push('visually-impaired');
    }
    
    if (newAccessibility.length > 0) {
      const existing = context.preferences.accessibilityNeeds || [];
      updates.accessibilityNeeds = [...new Set([...existing, ...newAccessibility])];
    }
    
    // Language preferences
    if (/english.speaking|speak.english/i.test(lowerMsg)) {
      updates.languagePreference = 'english-speaking';
    } else if (/language.barrier|don't.speak/i.test(lowerMsg)) {
      updates.languagePreference = 'any';
    }
    
    // Transport preferences
    if (/public.transport|metro|subway|bus/i.test(lowerMsg)) {
      updates.transportPreference = 'public-transport';
    } else if (/rent.car|drive|car.rental/i.test(lowerMsg)) {
      updates.transportPreference = 'rental-car';
    } else if (/walking|walk|pedestrian/i.test(lowerMsg)) {
      updates.transportPreference = 'walking';
    } else if (/bike|bicycle|cycling/i.test(lowerMsg)) {
      updates.transportPreference = 'bike';
    }
    
    // Visa preferences
    if (/visa.free|no.visa|visa.on.arrival/i.test(lowerMsg)) {
      updates.visaPreference = 'visa-free';
    }
    
    // Safety concerns
    if (/safe|safety|secure|low.crime/i.test(lowerMsg)) {
      updates.prioritizeSafety = true;
    }
    
    // Extract home/origin city (for remembering where user is from)
    const cities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 
                   'pune', 'ahmedabad', 'jaipur', 'lucknow', 'surat', 'kanpur',
                   'new york', 'london', 'paris', 'tokyo', 'dubai', 'singapore',
                   'san francisco', 'los angeles', 'chicago', 'boston', 'seattle',
                   'toronto', 'vancouver', 'sydney', 'melbourne', 'hong kong'];
    
    const fromPatterns = [
      /(?:i'?m|i am|we'?re|we are)\s+from\s+([a-z\s]+)/i,
      /(?:live|living|based|located)\s+in\s+([a-z\s]+)/i,
      /my (?:home|city)\s+is\s+([a-z\s]+)/i,
      /flying\s+(?:out\s+)?from\s+([a-z\s]+)/i,
      /traveling\s+from\s+([a-z\s]+)/i,
      /starting\s+from\s+([a-z\s]+)/i
    ];
    
    for (const pattern of fromPatterns) {
      const match = message.match(pattern);
      if (match) {
        const location = match[1].trim().toLowerCase();
        // Check if it matches a known city
        for (const city of cities) {
          if (location.includes(city)) {
            const cityName = city.charAt(0).toUpperCase() + city.slice(1);
            updates.homeCity = cityName;
            console.log('   🏠 Detected home city:', cityName);
            break;
          }
        }
        if (updates.homeCity) break;
      }
    }
    
    return updates;
  }

  /**
   * Update user context with new information
   */
  updateUserContext(sessionId, updates) {
    const context = this.getUserContext(sessionId);
    
    if (updates.preferences) {
      context.preferences = { ...context.preferences, ...updates.preferences };
    }
    
    if (updates.searchHistory) {
      context.searchHistory.push({
        ...updates.searchHistory,
        timestamp: Date.now()
      });
      // Keep last 20 searches
      if (context.searchHistory.length > 20) {
        context.searchHistory = context.searchHistory.slice(-20);
      }
    }
    
    if (updates.tripHistory) {
      context.tripHistory.push({
        ...updates.tripHistory,
        timestamp: Date.now()
      });
    }
    
    if (updates.conversationTopics) {
      const topic = updates.conversationTopics;
      if (!context.conversationTopics.includes(topic)) {
        context.conversationTopics.push(topic);
        // Keep last 10 topics
        if (context.conversationTopics.length > 10) {
          context.conversationTopics = context.conversationTopics.slice(-10);
        }
      }
    }
    
    context.lastInteraction = Date.now();
    context.totalInteractions++;
    this.userContexts.set(sessionId, context);
    
    console.log(`   📝 Updated user context for session ${sessionId}:`, {
      budget: context.preferences.budget,
      style: context.preferences.travelStyle,
      interests: context.preferences.interests,
      searches: context.searchHistory.length
    });
    
    return context;
  }

  /**
   * Generate personalized user profile summary for AI
   */
  getUserProfileSummary(context) {
    const prefs = context.preferences;
    let summary = '\n=== 👤 USER PROFILE & LEARNED PREFERENCES ===\n';
    
    let hasPreferences = false;
    
    if (prefs.budget) {
      summary += `💰 Budget: $${prefs.budget}\n`;
      hasPreferences = true;
    }
    
    if (prefs.travelStyle) {
      const styleEmoji = {
        'budget': '🎒 Budget-Friendly',
        'mid-range': '🏨 Comfortable Mid-Range',
        'luxury': '✨ Luxury Experience'
      };
      summary += `${styleEmoji[prefs.travelStyle]}\n`;
      hasPreferences = true;
    }
    
    if (prefs.interests && prefs.interests.length > 0) {
      summary += `❤️ Interests: ${prefs.interests.join(', ')}\n`;
      hasPreferences = true;
    }
    
    if (prefs.accommodationType) {
      summary += `🏠 Preferred Accommodation: ${prefs.accommodationType}\n`;
      hasPreferences = true;
    }
    
    if (prefs.dietaryRestrictions && prefs.dietaryRestrictions.length > 0) {
      summary += `🍽️ Dietary: ${prefs.dietaryRestrictions.join(', ')}\n`;
      hasPreferences = true;
    }
    
    if (prefs.tripPace) {
      const paceEmoji = {
        'relaxed': '🐢 Relaxed & Leisurely',
        'moderate': '🚶 Moderate Pace',
        'fast-paced': '🏃 Fast-Paced & Action-Packed'
      };
      summary += `⏱️ Trip Pace: ${paceEmoji[prefs.tripPace]}\n`;
      hasPreferences = true;
    }
    
    if (prefs.crowdPreference) {
      summary += `👥 Crowds: ${prefs.crowdPreference === 'avoid-crowds' ? 'Prefers Less Crowded' : 'Enjoys Popular Spots'}\n`;
      hasPreferences = true;
    }
    
    if (prefs.climatePreference) {
      const climateEmoji = {
        'warm': '☀️ Warm/Tropical',
        'cold': '❄️ Cold/Winter',
        'mild': '🌤️ Mild/Moderate'
      };
      summary += `🌡️ Climate: ${climateEmoji[prefs.climatePreference]}\n`;
      hasPreferences = true;
    }
    
    if (prefs.travelCompanions) {
      const companionEmoji = {
        'solo': '🧳 Solo Traveler',
        'couple': '💑 Traveling as Couple',
        'family': '👨‍👩‍👧‍👦 Family Trip',
        'friends': '👥 Group of Friends'
      };
      summary += `${companionEmoji[prefs.travelCompanions]}\n`;
      hasPreferences = true;
    }
    
    if (prefs.transportPreference) {
      const transportEmoji = {
        'public-transport': '🚇 Prefers Public Transport',
        'rental-car': '🚗 Prefers Rental Car',
        'walking': '🚶 Prefers Walking',
        'bike': '🚲 Prefers Biking'
      };
      summary += `${transportEmoji[prefs.transportPreference]}\n`;
      hasPreferences = true;
    }
    
    if (prefs.accessibilityNeeds && prefs.accessibilityNeeds.length > 0) {
      summary += `♿ Accessibility: ${prefs.accessibilityNeeds.join(', ')}\n`;
      hasPreferences = true;
    }
    
    if (prefs.languagePreference) {
      summary += `🗣️ Language: ${prefs.languagePreference === 'english-speaking' ? 'Prefers English-speaking destinations' : 'Open to any language'}\n`;
      hasPreferences = true;
    }
    
    if (prefs.visaPreference === 'visa-free') {
      summary += `🛂 Visa: Prefers visa-free destinations\n`;
      hasPreferences = true;
    }
    
    if (prefs.prioritizeSafety) {
      summary += `🛡️ Safety: High priority on safe destinations\n`;
      hasPreferences = true;
    }
    
    if (prefs.preferredTripDuration) {
      summary += `📅 Typical Duration: ${prefs.preferredTripDuration}\n`;
      hasPreferences = true;
    }
    
    if (context.searchHistory && context.searchHistory.length > 0) {
      const recentSearches = context.searchHistory.slice(-3);
      const destinations = recentSearches.map(s => s.destination).filter(Boolean);
      if (destinations.length > 0) {
        summary += `📍 Recent Searches: ${destinations.join(', ')}\n`;
        hasPreferences = true;
      }
    }
    
    if (context.tripHistory && context.tripHistory.length > 0) {
      summary += `✈️ Past Trips: ${context.tripHistory.length} trip(s) planned\n`;
      const favDestinations = context.tripHistory.map(t => t.destination).filter(Boolean).slice(-3);
      if (favDestinations.length > 0) {
        summary += `   Favorite Destinations: ${favDestinations.join(', ')}\n`;
      }
      hasPreferences = true;
    }
    
    if (context.totalInteractions > 5) {
      summary += `🗣️ Returning User: ${context.totalInteractions} interactions\n`;
      hasPreferences = true;
    }
    
    if (hasPreferences) {
      summary += '\n🎯 PERSONALIZATION INSTRUCTIONS:\n';
      summary += '- Use this profile to personalize ALL recommendations\n';
      summary += '- Match budget to their preferences when showing prices\n';
      summary += '- Suggest activities based on their interests\n';
      summary += '- Respect dietary restrictions in food recommendations\n';
      summary += '- Consider their travel style in hotel/flight suggestions\n';
      summary += '- Reference their past trips if relevant ("You enjoyed Madrid...")\n';
      summary += '- Be warm and personal ("I remember you prefer...")\n\n';
    } else {
      summary += 'No stored preferences yet. Learn from this conversation!\n\n';
    }
    
    return summary;
  }

  /**
   * Get user context summary for display/export
   */
  getContextSummary(sessionId) {
    const context = this.getUserContext(sessionId);
    return {
      preferences: context.preferences,
      searchHistory: context.searchHistory.slice(-5),
      tripHistory: context.tripHistory,
      totalInteractions: context.totalInteractions,
      lastInteraction: new Date(context.lastInteraction).toLocaleString()
    };
  }

  /**
   * Main entry point - Process user message with full context
   */
  async processMessage(messageData) {
    try {
      const {
        messages = [],
        userContext = {},
        sessionId,
        userId
      } = messageData;

      const effectiveSessionId = sessionId || userContext.sessionId || `session_${Date.now()}`;
      const effectiveUserId = userId || userContext.userId || userContext.email || 'anonymous';

      console.log(`\n🤖 Processing message for session: ${effectiveSessionId}`);

      // 1. Get/create enhanced user context
      const userContextData = this.getUserContext(effectiveSessionId);
      
      // 2. Extract preferences from current message
      const userQuery = messages[messages.length - 1]?.content || '';
      const extractedPrefs = this.extractPreferencesFromMessage(userQuery, userContextData);
      
      if (Object.keys(extractedPrefs).length > 0) {
        this.updateUserContext(effectiveSessionId, { preferences: extractedPrefs });
        console.log('   ✨ Extracted new preferences from message:', extractedPrefs);
      }

      // 3. Load conversation history
      const conversationHistory = await this.loadConversationHistory(effectiveSessionId);

      // 4. Load user preferences and merge with extracted + current request preferences
      let userPreferences = await this.loadUserPreferences(effectiveUserId);
      
      // Merge with extracted preferences from context
      if (userContextData.preferences) {
        userPreferences = {
          ...userPreferences,
          ...userContextData.preferences,
          budget: userContextData.preferences.budget || userPreferences.budget,
          travelStyle: userContextData.preferences.travelStyle || userPreferences.travelStyle,
          interests: [...new Set([
            ...(userContextData.preferences.interests || []),
            ...(userPreferences.interests || [])
          ])]
        };
      }
      
      // Merge preferences from the current request (from trip planning form)
      if (userContext.preferences) {
        console.log('   📋 Merging trip preferences from request:', userContext.preferences);
        userPreferences = {
          ...userPreferences,
          budget: userContext.preferences.budget || userPreferences.budget,
          travelStyle: userContext.preferences.travelStyle || userPreferences.travelStyle,
          interests: userContext.preferences.interests || userPreferences.interests,
          travelers: userContext.preferences.travelers || userPreferences.travelers,
          duration: userContext.preferences.duration || userPreferences.duration,
          // Add trip details if available
          ...(userContext.tripDetails && {
            currentTripOrigin: userContext.tripDetails.origin,
            currentTripDestination: userContext.tripDetails.destination,
            currentTripStartDate: userContext.tripDetails.startDate,
            currentTripDuration: userContext.tripDetails.duration
          })
        };
      }

      console.log('   👤 Final user preferences:', userPreferences);

      // 5. Analyze user query for intent (pass context AND conversation history for smart extraction)
      const queryIntent = await this.analyzeQueryIntent(userQuery, userContext, conversationHistory);

      console.log(`   Intent detected: ${queryIntent.type}`);
      console.log(`   Needs flight data: ${queryIntent.needsFlightData}`);
      console.log(`   Needs hotel data: ${queryIntent.needsHotelData}`);

      // 4. Fetch real data if needed (flights/hotels)
      let realData = null;
      
      // Handle multi-destination comparison
      if (queryIntent.multiDestination && queryIntent.extractedInfo.destinations) {
        console.log('   🔄 Fetching flight data for multiple destinations...');
        const multiFlightData = [];
        
        for (const destination of queryIntent.extractedInfo.destinations) {
          console.log(`   📞 Fetching flights to ${destination}...`);
          const flightInfo = {
            origin: queryIntent.extractedInfo.origin || userContext?.preferences?.homeCity,
            destination: destination,
            departureDate: queryIntent.extractedInfo.departureDate,
            returnDate: queryIntent.extractedInfo.returnDate,
            passengers: queryIntent.extractedInfo.passengers || 1
          };
          
          const flightData = await this.fetchFlightData(flightInfo, userPreferences);
          if (flightData && flightData.results && flightData.results.length > 0) {
            multiFlightData.push({
              destination,
              cheapestPrice: Math.min(...flightData.results.map(f => f.price || Infinity)),
              flightData
            });
          }
        }
        
        if (multiFlightData.length > 0) {
          realData = {
            type: 'multi_destination_comparison',
            destinations: multiFlightData,
            totalDestinations: multiFlightData.length
          };
          console.log('   ✅ Multi-destination data fetched:', multiFlightData.map(d => `${d.destination}: $${d.cheapestPrice}`).join(', '));
        }
      }
      // For trip planning, fetch both flights and hotels
      else if (queryIntent.needsFlightData && queryIntent.needsHotelData) {
        console.log('   📞 Fetching both flight and hotel data from APIs...');
        const flightData = await this.fetchFlightData(queryIntent.extractedInfo, userPreferences);
        const hotelData = await this.fetchHotelData(queryIntent.extractedInfo, userPreferences);
        
        // Combine both if available
        if (flightData && hotelData) {
          realData = {
            type: 'combined',
            flights: flightData,
            hotels: hotelData
          };
        } else if (flightData) {
          realData = flightData;
        } else if (hotelData) {
          realData = hotelData;
        }
      } else if (queryIntent.needsFlightData) {
        console.log('   📞 Fetching flight data from API...');
        realData = await this.fetchFlightData(queryIntent.extractedInfo, userPreferences);
      } else if (queryIntent.needsHotelData) {
        // Handle multi-destination hotel comparison
        if (queryIntent.multiDestination && queryIntent.extractedInfo.destinations) {
          console.log('   🔄 Fetching hotel data for multiple destinations...');
          const multiHotelData = [];
          
          for (const destination of queryIntent.extractedInfo.destinations) {
            console.log(`   📞 Fetching hotels in ${destination}...`);
            const hotelInfo = {
              destination: destination,
              checkIn: queryIntent.extractedInfo.checkIn,
              checkOut: queryIntent.extractedInfo.checkOut,
              guests: queryIntent.extractedInfo.guests || 2,
              priceRange: queryIntent.extractedInfo.priceRange
            };
            
            const hotelData = await this.fetchHotelData(hotelInfo, userPreferences);
            if (hotelData && hotelData.results && hotelData.results.length > 0) {
              multiHotelData.push({
                destination,
                cheapestPrice: Math.min(...hotelData.results.map(h => h.price || Infinity)),
                averagePrice: Math.round(hotelData.results.reduce((sum, h) => sum + (h.price || 0), 0) / hotelData.results.length),
                hotelData
              });
            }
          }
          
          if (multiHotelData.length > 0) {
            realData = {
              type: 'multi_destination_hotel_comparison',
              destinations: multiHotelData,
              totalDestinations: multiHotelData.length
            };
            console.log('   ✅ Multi-destination hotel data fetched:', multiHotelData.map(d => `${d.destination}: $${d.cheapestPrice}/night`).join(', '));
          }
        } else {
          console.log('   📞 Fetching hotel data from API...');
          realData = await this.fetchHotelData(queryIntent.extractedInfo, userPreferences);
        }
      }

      // 6. Store search history if this was a search query
      if (queryIntent.extractedInfo?.destination) {
        this.updateUserContext(effectiveSessionId, {
          searchHistory: {
            type: queryIntent.type,
            destination: queryIntent.extractedInfo.destination,
            origin: queryIntent.extractedInfo.origin,
            budget: userPreferences.budget
          }
        });
      }

      // 7. Build comprehensive context for Bedrock with user profile
      const userProfileSummary = this.getUserProfileSummary(userContextData);
      const contextPrompt = this.buildContextPrompt(
        userQuery,
        conversationHistory,
        userPreferences,
        realData,
        queryIntent,
        userProfileSummary
      );

      // 8. Call Bedrock with full context
      let bedrockResponse = await this.callBedrock(
        contextPrompt,
        conversationHistory,
        userQuery
      );

      // Remove emojis from response
      bedrockResponse = this.removeEmojis(bedrockResponse);

      // 7. Extract and update preferences from conversation
      await this.updatePreferencesFromConversation(
        effectiveUserId,
        userQuery,
        bedrockResponse,
        userPreferences
      );

      // 9. Store trip history if this was trip planning with data
      if (queryIntent.type === 'trip_planning' && realData && queryIntent.extractedInfo?.destination) {
        this.updateUserContext(effectiveSessionId, {
          tripHistory: {
            destination: queryIntent.extractedInfo.destination,
            origin: queryIntent.extractedInfo.origin,
            budget: userPreferences.budget,
            interests: userPreferences.interests,
            travelStyle: userPreferences.travelStyle
          },
          conversationTopics: queryIntent.extractedInfo.destination
        });
      }

      // 10. Save conversation to history
      await this.saveConversation(effectiveSessionId, effectiveUserId, {
        user: userQuery,
        assistant: bedrockResponse,
        intent: queryIntent.type,
        timestamp: new Date().toISOString(),
        dataFetched: !!realData
      });

      // 11. Return comprehensive response with learned context
      return {
        role: 'ai',
        content: bedrockResponse,
        metadata: {
          model: this.modelId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          intent: queryIntent.type,
          apiCallsMade: realData ? true : false,
          dataSource: realData ? (queryIntent.needsFlightData ? 'flight-api' : 'hotel-api') : 'bedrock-only',
          conversationTurn: conversationHistory.length + 1,
          preferencesApplied: Object.keys(userPreferences).length > 0,
          preferencesLearned: Object.keys(extractedPrefs).length,
          timestamp: new Date().toISOString()
        },
        realData,
        userPreferences,
        learnedContext: this.getContextSummary(effectiveSessionId),
        conversationHistory: conversationHistory.slice(-5) // Last 5 turns
      };

    } catch (error) {
      console.error('❌ AI Travel Agent Error:', error);
      throw error;
    }
  }

  /**
   * Use Nova Lite to intelligently analyze query - understand WHAT user wants and IF we need APIs
   */
  async analyzeQueryWithNovaLite(query, conversationContext = null) {
    try {
      const analysisPrompt = `You are a smart travel query analyzer. Analyze this query and return ONLY valid JSON.

Analyze:
1. What is the user REALLY asking for?
2. Do we need to call flight/hotel APIs, or can we just answer conversationally?
3. Extract any destinations, dates, preferences, origin cities mentioned
4. Consider conversation context - is this a follow-up answer to a previous question?

CRITICAL RULES:
- "What can I carry on flights?" = general question (NO API needed)
- "Find flights to Paris" = flight_search (API needed)
- "Tell me about Bali" = destination_info (NO API needed)
- "Cheap hotels in Tokyo" = hotel_search (API needed)
- "What's the best time to visit Europe?" = general (NO API needed)
- "Compare flights to Bali, Goa, Cebu" = flight_search with multiple destinations (API needed)
- If previous message asked "Where are you flying from?" and user replies "Mumbai", that's the ORIGIN city (extractOrigin: ["Mumbai"])

CONVERSATION CONTEXT RULES:
- If assistant previously asked "Which city would you like me to check flight prices for?" and user lists cities = flight_search (API needed)
- If assistant previously asked "Where would you like to stay?" and user lists cities = hotel_search (API needed)
- If user lists city names after talking about flights/travel = likely continuing flight search (API needed)
- A simple list of city names in travel context = user wants to search those destinations

Return JSON format:
{
  "intent": "flight_search|hotel_search|trip_planning|destination_recommendation|budget_inquiry|public_transport|general_question|destination_info|travel_advice|origin_provided",
  "needsFlightAPI": true/false,
  "needsHotelAPI": true/false,
  "extractedDestinations": ["Paris", "London"],
  "extractedOrigin": "Mumbai" (if user is providing origin city),
  "isComparison": true/false,
  "isFollowUpAnswer": true/false (if answering a question from previous turn),
  "queryType": "price_search|general_info|rules|recommendations|booking_help|providing_info",
  "reasoning": "brief explanation of why"
}

Previous context: ${conversationContext ? JSON.stringify(conversationContext).slice(0, 200) : 'None'}

Query: "${query}"

JSON:`;

      const params = {
        modelId: 'us.amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [{ role: 'user', content: [{ text: analysisPrompt }] }],
          inferenceConfig: {
            maxTokens: 300,
            temperature: 0.2,
            topP: 0.9
          }
        })
      };

      const command = new InvokeModelCommand(params);
      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      let analysisText = responseBody.output?.message?.content?.[0]?.text?.trim() || '{}';
      
      // Clean up response
      analysisText = analysisText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      try {
        const analysis = JSON.parse(analysisText);
        console.log('   � Nova Lite Analysis:', {
          intent: analysis.intent,
          needsAPIs: { flight: analysis.needsFlightAPI, hotel: analysis.needsHotelAPI },
          destinations: analysis.extractedDestinations,
          reasoning: analysis.reasoning
        });
        return analysis;
      } catch (parseError) {
        console.log('   ⚠️ Failed to parse Nova Lite analysis, using fallback');
        return {
          intent: 'general_question',
          needsFlightAPI: false,
          needsHotelAPI: false,
          extractedDestinations: [],
          isComparison: false,
          queryType: 'general_info'
        };
      }
    } catch (error) {
      console.error('   ⚠️ Error in Nova Lite analysis:', error.message);
      return {
        intent: 'general_question',
        needsFlightAPI: false,
        needsHotelAPI: false,
        extractedDestinations: [],
        isComparison: false,
        queryType: 'general_info'
      };
    }
  }

  /**
   * Analyze user query to understand intent (now powered by Nova Lite intelligence)
   */
  async analyzeQueryIntent(query, userContext = null, conversationHistory = []) {
    const lowerQuery = query.toLowerCase();

    const intent = {
      type: 'general',
      needsFlightData: false,
      needsHotelData: false,
      extractedInfo: {},
      multiDestination: false
    };
    
    // Step 1: Use Nova Lite for intelligent analysis with conversation context
    const contextForAnalysis = {
      userContext,
      recentMessages: conversationHistory.slice(-2).map(msg => ({
        user: msg.user,
        assistant: msg.assistant?.slice(0, 150) // Truncate for token efficiency
      }))
    };
    const novaAnalysis = await this.analyzeQueryWithNovaLite(query, contextForAnalysis);
    
    // Step 2: Use Nova Lite to extract destinations
    console.log('   🤖 Using Nova Lite to extract destinations...');
    let extractedDestinations = novaAnalysis.extractedDestinations || [];
    
    // Fallback: If Nova analysis didn't extract destinations, try dedicated extraction
    if (extractedDestinations.length === 0 && (novaAnalysis.needsFlightAPI || novaAnalysis.needsHotelAPI)) {
      extractedDestinations = await this.extractDestinationsWithBedrock(query);
    }
    
    // Step 3: Check if user is providing missing info as follow-up (origin for flights, destination for hotels, etc.)
    const lastConversation = conversationHistory[conversationHistory.length - 1];
    const lastAssistant = lastConversation?.assistant?.toLowerCase() || '';
    
    // Special case: If assistant asked "which city for flight prices" and user lists cities with destinations extracted
    if (extractedDestinations.length > 0 && 
        (lastAssistant.includes('which city would you like me to check flight prices') ||
         lastAssistant.includes('which city for flight') ||
         lastAssistant.includes('compare multiple cities'))) {
      console.log('   ✈️ User is providing destination choices after flight price question');
      intent.needsFlightData = true;
      intent.type = 'flight_search';
      
      // Check if we need origin - look for previous flight context
      const previousFlightQuery = conversationHistory.slice(0, -1).reverse().find(msg => 
        msg.user && (msg.user.toLowerCase().includes('flight') || msg.user.toLowerCase().includes('fly'))
      );
      
      if (previousFlightQuery) {
        console.log('   📍 Found previous flight query:', previousFlightQuery.user);
        // We'll ask for origin in the response if not provided
      }
    }
    
    if (novaAnalysis.isFollowUpAnswer) {
      // Case 1: User providing origin for flight search
      if (novaAnalysis.extractedOrigin && lastAssistant.includes('where are you flying from')) {
        console.log('   📍 User provided origin city:', novaAnalysis.extractedOrigin);
        intent.extractedInfo.origin = novaAnalysis.extractedOrigin;
        intent.needsFlightData = true;
        intent.type = 'flight_search';
        console.log('   ✈️ Detected follow-up: origin provided for flight search');
        console.log('   📜 Conversation history length:', conversationHistory.length);
        console.log('   📜 Full conversation history structure:', JSON.stringify(conversationHistory.map((turn, i) => ({
          index: i,
          hasUser: !!turn.user,
          userPreview: turn.user?.slice(0, 50),
          hasAssistant: !!turn.assistant
        })), null, 2));
        
        // Look back through conversation to find the most recent user query with destinations
        // Skip the current query and look at previous user messages
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          const turn = conversationHistory[i];
          if (turn && turn.user) {
            console.log(`   🔍 Checking conversation turn ${i} for destinations:`, turn.user);
            const prevDestinations = await this.extractDestinationsWithBedrock(turn.user);
            console.log(`   📍 Extracted from turn ${i}:`, prevDestinations);
            
            if (prevDestinations && prevDestinations.length > 0) {
              // Filter out regional/continent names that can't be used as destinations
              const validDestinations = prevDestinations.filter(dest => {
                const lower = dest.toLowerCase();
                return !['europe', 'asia', 'africa', 'america', 'oceania', 'antarctica'].includes(lower);
              });
              
              console.log(`   🔎 After filtering regional names:`, validDestinations);
              
              if (validDestinations.length > 0) {
                extractedDestinations = validDestinations;
                console.log('   ✅ Recovered valid destinations from previous turn:', validDestinations);
                console.log('   ✅ extractedDestinations array now contains:', extractedDestinations);
                break;
              } else if (prevDestinations.length > 0) {
                console.log('   ⚠️ Found regional destinations, continuing search:', prevDestinations);
              }
            }
          } else {
            console.log(`   ⏭️ Skipping turn ${i} - no user message`);
          }
        }
        
        console.log('   🎯 Final extractedDestinations after recovery:', extractedDestinations);
      }
      
      // Case 2: User providing destination for hotel search
      else if (extractedDestinations.length > 0 && 
               (lastAssistant.includes('which destination') || 
                lastAssistant.includes('which city') || 
                lastAssistant.includes('where would you like to stay'))) {
        console.log('   🏨 User provided destination for hotel search:', extractedDestinations[0]);
        intent.extractedInfo.destination = extractedDestinations[0];
        intent.needsHotelData = true;
        intent.type = 'hotel_search';
        console.log('   🏨 Detected follow-up: destination provided for hotel search');
      }
      
      // Case 3: User providing any other follow-up info
      else if (novaAnalysis.extractedOrigin) {
        console.log('   📍 User provided origin city:', novaAnalysis.extractedOrigin);
        intent.extractedInfo.origin = novaAnalysis.extractedOrigin;
      }
    }
    
    // Step 4: Set up destination info in intent
    if (extractedDestinations && extractedDestinations.length > 0) {
      console.log('   ✅ Extracted destinations:', extractedDestinations);
      
      // Check if we have multiple destinations (either from comparison or recovered from follow-up)
      if (extractedDestinations.length > 1) {
        intent.multiDestination = true;
        intent.extractedInfo.destinations = extractedDestinations;
        console.log('   🔄 Multi-destination comparison detected');
      } else if (extractedDestinations.length === 1) {
        intent.extractedInfo.destination = extractedDestinations[0];
      }
    }

    // Step 5: Route based on Nova Lite's intelligent analysis
    intent.needsFlightData = novaAnalysis.needsFlightAPI || intent.needsFlightData;
    intent.needsHotelData = novaAnalysis.needsHotelAPI;
    
    // Map intent types
    const intentMap = {
      'flight_search': 'flight_search',
      'hotel_search': 'hotel_search',
      'trip_planning': 'trip_planning',
      'destination_recommendation': 'destination_recommendation',
      'budget_inquiry': 'budget_inquiry',
      'public_transport': 'public_transport',
      'general_question': 'general',
      'destination_info': 'general',
      'travel_advice': 'general',
      'origin_provided': 'general'  // Default mapping for follow-up answers
    };
    
    // Don't override intent type if it was set during follow-up detection
    if (intent.type !== 'flight_search' && intent.type !== 'hotel_search') {
      intent.type = intentMap[novaAnalysis.intent] || 'general';
    } else {
      console.log(`   ✅ Preserving intent type from follow-up detection: ${intent.type}`);
    }
    
    // Extract detailed info based on intent
    // Note: When intent is preserved from follow-up, we should still extract info even if Nova says needsFlightAPI is false
    if (intent.type === 'flight_search' && (novaAnalysis.needsFlightAPI || intent.needsFlightData)) {
      // Extract flight info but preserve any info already set (like origin from follow-up)
      const extractedFlightInfo = this.extractFlightInfo(query, userContext, extractedDestinations);
      intent.extractedInfo = { ...extractedFlightInfo, ...intent.extractedInfo };
      console.log('   ✈️ Flight search with API call, extracted info:', intent.extractedInfo);
    } else if (intent.type === 'hotel_search' && (novaAnalysis.needsHotelAPI || intent.needsHotelData)) {
      const hotelInfo = await this.extractHotelInfo(query, extractedDestinations);
      // Preserve any info already set (like destination from follow-up)
      intent.extractedInfo = { ...hotelInfo, ...intent.extractedInfo };
      console.log('   🏨 Hotel search with API call, extracted info:', intent.extractedInfo);
    } else if (intent.type === 'trip_planning') {
      const flightInfo = this.extractFlightInfo(query, userContext, extractedDestinations);
      const hotelInfo = await this.extractHotelInfo(query, extractedDestinations);
      // Preserve any info already set from follow-up detection
      intent.extractedInfo = { ...flightInfo, ...hotelInfo, ...intent.extractedInfo };
      console.log('   🗺️ Trip planning detected, extracted info:', intent.extractedInfo);
    } else if (intent.type === 'destination_recommendation') {
      intent.extractedInfo = { ...intent.extractedInfo, ...this.extractDestinationInfo(query, userContext) };
      console.log('   🌍 Destination recommendation, extracted info:', intent.extractedInfo);
    } else if (intent.type === 'budget_inquiry') {
      intent.extractedInfo = { ...intent.extractedInfo, ...this.extractBudgetInfo(query, userContext) };
      console.log('   💰 Budget inquiry, extracted info:', intent.extractedInfo);
    } else if (intent.type === 'public_transport') {
      intent.extractedInfo = { ...intent.extractedInfo, ...this.extractTransportInfo(query, userContext) };
      console.log('   🚇 Public transport query, extracted info:', intent.extractedInfo);
    } else {
      console.log(`   💬 General query (${novaAnalysis.queryType}) - No API calls needed`);
      intent.extractedInfo.queryType = novaAnalysis.queryType;
      intent.extractedInfo.reasoning = novaAnalysis.reasoning;
    }

    return intent;
  }

  /**
   * Extract flight information from query (with context-aware smart extraction)
   * NOTE: This method should be called AFTER destination extraction by Nova Lite
   */
  extractFlightInfo(query, userContext = null, extractedDestinations = []) {
    const info = {
      origin: null,
      destination: null,
      departureDate: null,
      returnDate: null,
      passengers: 1
    };

    console.log('   🔍 Extracting flight info from query:', query);
    
    // First, use extracted destinations from Nova Lite if available
    if (extractedDestinations && extractedDestinations.length > 0) {
      info.destination = extractedDestinations[0];
      console.log('   ✅ Using Nova Lite extracted destination:', info.destination);
    }
    
    // Check user context for previous origin mentions
    let contextOrigin = null;
    
    // First priority: user's home city from preferences
    if (userContext?.preferences?.homeCity) {
      contextOrigin = userContext.preferences.homeCity;
      console.log('   🏠 Found home city from user preferences:', contextOrigin);
    }
    
    // Second priority: recent search history
    if (!contextOrigin && userContext?.searchHistory?.length > 0) {
      // Look through recent search history for origin
      for (let i = userContext.searchHistory.length - 1; i >= 0; i--) {
        const search = userContext.searchHistory[i];
        if (search.origin) {
          contextOrigin = search.origin;
          console.log('   💡 Found origin from search history:', contextOrigin);
          break;
        }
      }
    }
    
    const lowerQuery = query.toLowerCase();

    // Only do pattern-based extraction if we don't already have destination from Nova Lite
    if (!info.destination) {
      // Extract "from X to Y" pattern - MORE SPECIFIC, stop at punctuation or common words
      let fromToMatch = query.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+(?:during|in|on|for|by|at|\.|,|;))/i);
      if (!fromToMatch) {
        // Try simpler pattern if the above doesn't match
        fromToMatch = query.match(/from\s+([a-zA-Z\s]{3,20}?)\s+to\s+([a-zA-Z\s]{3,20}?)(?:\s|$)/i);
      }
      
      if (fromToMatch) {
        const extractedOrigin = fromToMatch[1].trim();
        const extractedDest = fromToMatch[2].trim();
        
        // Clean up - remove common trailing words
        info.origin = extractedOrigin.replace(/\s+(arrive|reach|going|flying|travel|trip|during|in).*$/i, '').trim();
        info.destination = extractedDest.replace(/\s+(during|in|on|for|by|at|from).*$/i, '').trim();
        
        console.log('   ✅ Extracted from "from X to Y":', { origin: info.origin, destination: info.destination });
      }
    }
    
    // Check for "to X" pattern for destination (e.g., "flights to Japan")
    if (!info.destination) {
      const toMatch = query.match(/\bto\s+([a-zA-Z\s]{3,20}?)(?:\s+(?:during|in|on|from|for|around|,|\.|\?))/i);
      if (toMatch) {
        info.destination = toMatch[1].trim();
        console.log('   ✅ Extracted destination from "to X":', info.destination);
      }
    }
    
    // Also check for "Traveling from: X" and "Destination: Y" patterns (common in structured input)
    if (!info.origin) {
      const travelingFromMatch = query.match(/traveling\s+from[:\s]+([^\n\r]+?)(?=\n|- |$)/i);
      if (travelingFromMatch) {
        info.origin = travelingFromMatch[1].trim();
        console.log('   ✅ Extracted origin from "Traveling from":', info.origin);
      }
    }
    
    // Extract destination from "Destination: X" pattern if not already set
    if (!info.destination) {
      const destMatch = query.match(/[-•]\s*destination[:\s]+([^\n\r]+?)(?=\n|- |$)/i);
      if (destMatch) {
        info.destination = destMatch[1].trim();
        console.log('   ✅ Extracted destination from "Destination:":', info.destination);
      }
    }

    // Extract dates - look for common date patterns
    const dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      info.departureDate = dateMatch[1];
    }
    
    // Look for month mentions
    const monthMap = {
      'january': '01', 'jan': '01',
      'february': '02', 'feb': '02',
      'march': '03', 'mar': '03',
      'april': '04', 'apr': '04',
      'may': '05',
      'june': '06', 'jun': '06',
      'july': '07', 'jul': '07',
      'august': '08', 'aug': '08',
      'september': '09', 'sep': '09', 'sept': '09',
      'october': '10', 'oct': '10',
      'november': '11', 'nov': '11',
      'december': '12', 'dec': '12'
    };
    
    for (const [monthName, monthNum] of Object.entries(monthMap)) {
      if (lowerQuery.includes(monthName)) {
        const year = new Date().getFullYear();
        info.departureDate = `${year}-${monthNum}-01`;
        info.returnDate = `${year}-${monthNum}-07`; // 7-day default
        console.log(`   📅 Detected ${monthName} timeframe:`, info.departureDate);
        break;
      }
    }
    
    // Look for specific holidays/events
    if (lowerQuery.includes('diwali')) {
      // Diwali 2025 is around Oct 20-24
      info.departureDate = '2025-10-20';
      info.returnDate = '2025-10-27';
      console.log('   📅 Detected Diwali timeframe');
    }
    
    if (lowerQuery.includes('christmas')) {
      const year = new Date().getFullYear();
      info.departureDate = `${year}-12-20`;
      info.returnDate = `${year}-12-27`;
      console.log('   📅 Detected Christmas timeframe');
    }
    
    if (lowerQuery.includes('new year')) {
      const year = new Date().getFullYear();
      info.departureDate = `${year}-12-28`;
      info.returnDate = `${year + 1}-01-04`;
      console.log('   📅 Detected New Year timeframe');
    }

    // Extract passenger count
    const passengerMatch = query.match(/(\d+)\s+(?:passenger|people|person|traveler)/i);
    if (passengerMatch) {
      info.passengers = parseInt(passengerMatch[1]);
    }

    // Use context origin if no origin was found in query
    if (!info.origin && contextOrigin) {
      info.origin = contextOrigin;
      console.log('   🧠 Using origin from conversation context:', info.origin);
    }

    console.log('   📋 Final extracted info:', info);
    return info;
  }

  /**
   * Extract hotel information from query
   */
  async extractHotelInfo(query, extractedDestinations = []) {
    const info = {
      destination: null,
      checkIn: null,
      checkOut: null,
      guests: 2,
      priceRange: 'moderate'
    };

    // First, use extracted destinations from Nova Lite if available
    if (extractedDestinations && extractedDestinations.length > 0) {
      info.destination = extractedDestinations[0];
      console.log('   🏨 Using Nova Lite extracted destination:', info.destination);
    } else {
      // Fallback: Use Bedrock to intelligently extract destinations
      const bedrocExtractedDest = await this.extractDestinationsWithBedrock(query);
      if (bedrocExtractedDest && bedrocExtractedDest.length > 0) {
        info.destination = bedrocExtractedDest[0];
        console.log('   🏨 Extracted hotel destination via Bedrock fallback:', info.destination);
      }
    }
    
    const lowerQuery = query.toLowerCase();

    // Extract price range
    if (lowerQuery.includes('cheap') || lowerQuery.includes('budget')) {
      info.priceRange = 'budget';
    } else if (lowerQuery.includes('luxury') || lowerQuery.includes('premium')) {
      info.priceRange = 'luxury';
    }

    // Extract guest count
    const guestMatch = query.match(/(\d+)\s+(?:guest|people|person)/i);
    if (guestMatch) {
      info.guests = parseInt(guestMatch[1]);
    }

    return info;
  }

  /**
   * Extract destination recommendation info from query
   */
  extractDestinationInfo(query, userContext = null) {
    const info = {
      preferences: {
        budget: null,
        interests: [],
        duration: null,
        travelStyle: null,
        timeframe: null
      },
      constraints: {}
    };

    const lowerQuery = query.toLowerCase();

    // Extract budget
    const budgetPatterns = [
      { pattern: /budget\s+(?:of\s+)?[\$₹€£]?(\d+(?:,\d+)*(?:k)?)/i, multiplier: 1 },
      { pattern: /under\s+[\$₹€£]?(\d+(?:,\d+)*(?:k)?)/i, multiplier: 1 },
      { pattern: /(\d+(?:,\d+)*(?:k)?)\s+(?:dollar|rupee|euro|pound)/i, multiplier: 1 }
    ];
    
    for (const { pattern, multiplier } of budgetPatterns) {
      const match = query.match(pattern);
      if (match) {
        let amount = match[1].replace(/,/g, '');
        if (amount.includes('k')) {
          amount = parseFloat(amount) * 1000;
        }
        info.preferences.budget = parseFloat(amount) * multiplier;
        break;
      }
    }

    // Extract budget range keywords
    if (lowerQuery.includes('cheap') || lowerQuery.includes('budget') || lowerQuery.includes('affordable')) {
      info.preferences.budget = info.preferences.budget || 'low';
    } else if (lowerQuery.includes('luxury') || lowerQuery.includes('premium') || lowerQuery.includes('expensive')) {
      info.preferences.budget = 'high';
    } else if (lowerQuery.includes('moderate') || lowerQuery.includes('mid-range')) {
      info.preferences.budget = 'medium';
    }

    // Extract interests
    const interestKeywords = {
      adventure: ['adventure', 'hiking', 'trekking', 'climbing', 'safari', 'extreme'],
      beach: ['beach', 'ocean', 'sea', 'coastal', 'island', 'tropical'],
      culture: ['culture', 'history', 'museum', 'heritage', 'temple', 'architecture'],
      food: ['food', 'cuisine', 'culinary', 'restaurant', 'street food'],
      nightlife: ['nightlife', 'party', 'club', 'bar', 'entertainment'],
      nature: ['nature', 'wildlife', 'scenic', 'landscape', 'mountain', 'forest'],
      shopping: ['shopping', 'market', 'mall', 'bazaar'],
      relaxation: ['relax', 'spa', 'peaceful', 'quiet', 'zen', 'wellness']
    };

    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        info.preferences.interests.push(interest);
      }
    }

    // Extract duration
    const durationMatch = query.match(/(\d+)\s*(?:day|week|month|night)/i);
    if (durationMatch) {
      info.preferences.duration = durationMatch[0];
    }

    // Extract travel style
    if (lowerQuery.includes('backpack') || lowerQuery.includes('solo')) {
      info.preferences.travelStyle = 'backpacker';
    } else if (lowerQuery.includes('family')) {
      info.preferences.travelStyle = 'family';
    } else if (lowerQuery.includes('romantic') || lowerQuery.includes('honeymoon')) {
      info.preferences.travelStyle = 'romantic';
    } else if (lowerQuery.includes('luxury') || lowerQuery.includes('premium')) {
      info.preferences.travelStyle = 'luxury';
    }

    // Extract timeframe
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    const seasons = ['summer', 'winter', 'spring', 'fall', 'autumn'];
    
    for (const month of months) {
      if (lowerQuery.includes(month)) {
        info.preferences.timeframe = month.charAt(0).toUpperCase() + month.slice(1);
        break;
      }
    }
    
    if (!info.preferences.timeframe) {
      for (const season of seasons) {
        if (lowerQuery.includes(season)) {
          info.preferences.timeframe = season.charAt(0).toUpperCase() + season.slice(1);
          break;
        }
      }
    }

    // Merge with user context preferences if available
    if (userContext?.preferences) {
      info.preferences.budget = info.preferences.budget || userContext.preferences.budget;
      info.preferences.travelStyle = info.preferences.travelStyle || userContext.preferences.travelStyle;
      if (info.preferences.interests.length === 0 && userContext.preferences.interests) {
        info.preferences.interests = userContext.preferences.interests;
      }
    }

    return info;
  }

  /**
   * Extract budget inquiry info from query
   */
  extractBudgetInfo(query, userContext = null) {
    const info = {
      destination: null,
      duration: null,
      travelers: 1,
      travelStyle: null,
      includesFlights: true
    };

    const lowerQuery = query.toLowerCase();

    // Extract destination
    const cities = ['paris', 'london', 'new york', 'tokyo', 'dubai', 'rome', 'barcelona', 'amsterdam',
                   'mumbai', 'delhi', 'bangalore', 'singapore', 'bangkok', 'bali', 'goa', 'maldives',
                   'phuket', 'cebu', 'switzerland', 'norway', 'iceland', 'japan', 'thailand', 'vietnam'];
    
    for (const city of cities) {
      if (lowerQuery.includes(city)) {
        info.destination = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }

    // Extract duration
    const durationPatterns = [
      { pattern: /(\d+)\s*(?:day|days)/i, unit: 'days' },
      { pattern: /(\d+)\s*(?:week|weeks)/i, unit: 'weeks' },
      { pattern: /(\d+)\s*(?:night|nights)/i, unit: 'nights' }
    ];

    for (const { pattern, unit } of durationPatterns) {
      const match = query.match(pattern);
      if (match) {
        info.duration = { value: parseInt(match[1]), unit };
        break;
      }
    }

    // Extract number of travelers
    const travelersMatch = query.match(/(\d+)\s*(?:people|person|traveler|pax|adult)/i);
    if (travelersMatch) {
      info.travelers = parseInt(travelersMatch[1]);
    } else if (lowerQuery.includes('couple')) {
      info.travelers = 2;
    } else if (lowerQuery.includes('family')) {
      info.travelers = 4;
    }

    // Extract travel style
    if (lowerQuery.includes('backpack') || lowerQuery.includes('budget')) {
      info.travelStyle = 'budget';
    } else if (lowerQuery.includes('luxury') || lowerQuery.includes('premium')) {
      info.travelStyle = 'luxury';
    } else if (lowerQuery.includes('comfortable') || lowerQuery.includes('mid-range')) {
      info.travelStyle = 'comfortable';
    }

    // Check if query excludes flights
    if (lowerQuery.includes('without flight') || lowerQuery.includes('excluding flight') || 
        lowerQuery.includes('no flight')) {
      info.includesFlights = false;
    }

    // Merge with user context
    if (userContext?.preferences) {
      info.travelStyle = info.travelStyle || userContext.preferences.travelStyle;
    }

    return info;
  }

  /**
   * Use Bedrock AI to intelligently extract destination names from user query
   * This replaces hardcoded city lists with dynamic extraction
   */
  async extractDestinationsWithBedrock(query) {
    try {
      const extractionPrompt = `You are a travel destination extraction assistant. Extract all destination names (cities, countries, islands, regions) from the user's query.

Rules:
1. Return ONLY a JSON array of destination names
2. Use proper capitalization (e.g., "Koh Samui" not "koh samui", "Europe" not "europe")
3. Include both explicit destinations ("flights to Paris") and implicit ones ("compare Paris, London")
4. Handle variations and typos intelligently
5. Include regions (Europe, Asia, Southeast Asia) if no specific city mentioned
6. If BOTH region AND city mentioned, include BOTH
7. Return empty array [] if no destinations found
8. NO additional text, ONLY the JSON array

Examples:
Query: "compare flights to koh samui, zanzibar, and cebu"
Output: ["Koh Samui", "Zanzibar", "Cebu"]

Query: "cheapest hotels in that beach town in Thailand"
Output: ["Thailand"]

Query: "flights from mumbai to bali"
Output: ["Mumbai", "Bali"]

Query: "find cheap flights to Europe"
Output: ["Europe"]

Query: "cheap flights to Southeast Asia"
Output: ["Southeast Asia"]

Query: "flights to Paris, Europe"
Output: ["Paris", "Europe"]

Query: "what's the weather like?"
Output: []

Now extract destinations from this query:
"${query}"

Return ONLY the JSON array:`;

      // Use Nova Lite for fast extraction
      const params = {
        modelId: 'us.amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [{ text: extractionPrompt }]
            }
          ],
          inferenceConfig: {
            maxTokens: 200,
            temperature: 0.1, // Low temperature for consistent extraction
            topP: 0.9
          }
        })
      };

      const command = new InvokeModelCommand(params);
      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      let extractedText = responseBody.output?.message?.content?.[0]?.text || '';
      
      // Clean up response and parse JSON
      extractedText = extractedText.trim();
      
      // Remove markdown code blocks if present
      extractedText = extractedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to parse as JSON
      try {
        const destinations = JSON.parse(extractedText);
        if (Array.isArray(destinations)) {
          return destinations.filter(dest => dest && typeof dest === 'string');
        }
      } catch (parseError) {
        console.log('   ⚠️ Failed to parse Bedrock extraction response as JSON:', extractedText);
        
        // Fallback: try to extract from text
        const match = extractedText.match(/\[(.*?)\]/);
        if (match) {
          try {
            const fallbackDestinations = JSON.parse('[' + match[1] + ']');
            if (Array.isArray(fallbackDestinations)) {
              return fallbackDestinations.filter(dest => dest && typeof dest === 'string');
            }
          } catch (e) {
            console.log('   ⚠️ Fallback parsing also failed');
          }
        }
      }
      
      return [];
    } catch (error) {
      console.error('   ❌ Error in extractDestinationsWithBedrock:', error);
      // Graceful fallback - return empty array
      return [];
    }
  }

  /**
   * Extract public transport info from query
   */
  extractTransportInfo(query, userContext = null) {
    const info = {
      destination: null,
      transportTypes: [],
      needs: []
    };

    const lowerQuery = query.toLowerCase();

    // Extract destination
    const cities = ['paris', 'london', 'new york', 'tokyo', 'dubai', 'rome', 'barcelona', 'amsterdam',
                   'mumbai', 'delhi', 'bangalore', 'singapore', 'bangkok', 'bali', 'goa', 'maldives',
                   'berlin', 'madrid', 'istanbul', 'sydney', 'melbourne', 'toronto', 'chicago'];
    
    for (const city of cities) {
      if (lowerQuery.includes(city)) {
        info.destination = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }

    // Extract transport types
    const transportTypes = {
      metro: ['metro', 'subway', 'underground', 'tube'],
      bus: ['bus', 'buses'],
      train: ['train', 'railway', 'rail'],
      tram: ['tram', 'streetcar', 'light rail'],
      taxi: ['taxi', 'cab', 'uber', 'grab', 'ola'],
      bike: ['bike', 'bicycle', 'cycling', 'cycle'],
      ferry: ['ferry', 'boat', 'water taxi']
    };

    for (const [type, keywords] of Object.entries(transportTypes)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        info.transportTypes.push(type);
      }
    }

    // Extract needs/questions
    if (lowerQuery.includes('card') || lowerQuery.includes('pass') || lowerQuery.includes('ticket')) {
      info.needs.push('travel_card');
    }
    if (lowerQuery.includes('cost') || lowerQuery.includes('price') || lowerQuery.includes('cheap')) {
      info.needs.push('pricing');
    }
    if (lowerQuery.includes('how to') || lowerQuery.includes('getting to')) {
      info.needs.push('directions');
    }
    if (lowerQuery.includes('app') || lowerQuery.includes('mobile')) {
      info.needs.push('mobile_apps');
    }
    if (lowerQuery.includes('schedule') || lowerQuery.includes('timing') || lowerQuery.includes('hours')) {
      info.needs.push('schedules');
    }

    return info;
  }

  /**
   * Fetch real flight data from API
   */
  async fetchFlightData(extractedInfo, userPreferences) {
    try {
      console.log('\n🛫 ===== FLIGHT API FETCH START =====');
      console.log('   📝 Extracted flight info:', JSON.stringify(extractedInfo, null, 2));
      console.log('   👤 User preferences:', JSON.stringify({ 
        lastOrigin: userPreferences.lastOrigin,
        preferredCabinClass: userPreferences.preferredCabinClass,
        currency: userPreferences.currency 
      }, null, 2));
      
      // Check if we have both origin and destination - if not, don't search
      if (!extractedInfo.origin && !userPreferences.lastOrigin) {
        console.log('   ⚠️ SKIPPING: No origin found in query or preferences');
        console.log('🛫 ===== FLIGHT API FETCH END (NO ORIGIN) =====\n');
        return null;
      }
      
      if (!extractedInfo.destination) {
        console.log('   ⚠️ SKIPPING: No destination found in query');
        console.log('🛫 ===== FLIGHT API FETCH END (NO DESTINATION) =====\n');
        return null;
      }
      
      // Use extracted info (NO DEFAULTS)
      const searchRequest = {
        origin: extractedInfo.origin || userPreferences.lastOrigin,
        destination: extractedInfo.destination,
        departureDate: extractedInfo.departureDate || this.getDefaultDepartureDate(),
        returnDate: extractedInfo.returnDate || this.getDefaultReturnDate(),
        passengers: {
          adults: extractedInfo.passengers || 1,
          children: 0,
          infants: 0
        },
        cabinClass: userPreferences.preferredCabinClass || 'economy',
        currency: userPreferences.currency || 'USD',
        preferences: userPreferences.flightPreferences || {}
      };

      console.log('   🔍 Final Search Request:', JSON.stringify(searchRequest, null, 2));
      console.log('   📡 Calling FlightService.searchFlightsEnhanced()...');

      const startTime = Date.now();
      const results = await this.flightService.searchFlightsEnhanced(searchRequest);
      const duration = Date.now() - startTime;
      
      console.log(`   ⏱️ API call completed in ${duration}ms`);
      console.log('   📊 Results received:', JSON.stringify({
        provider: results.provider,
        totalFlights: results.flights?.length || 0,
        fallbackUsed: results.fallbackUsed,
        success: results.success
      }, null, 2));
      
      // Don't return mock data - return null if provider is 'mock'
      if (results.provider === 'mock') {
        console.log('   ⚠️ Provider is "mock" - returning null (no real data)');
        console.log('🛫 ===== FLIGHT API FETCH END (MOCK DATA) =====\n');
        return null;
      }
      
      const returnData = {
        type: 'flight',
        request: searchRequest,
        results: results.flights || [],
        totalResults: results.flights?.length || 0,
        provider: results.provider,
        searchTime: results.searchTime
      };
      
      console.log('   ✅ Returning real flight data:', JSON.stringify({
        type: returnData.type,
        totalResults: returnData.totalResults,
        provider: returnData.provider
      }, null, 2));
      console.log('🛫 ===== FLIGHT API FETCH END (SUCCESS) =====\n');
      
      return returnData;

    } catch (error) {
      console.error('\n   ❌ FLIGHT API ERROR:');
      console.error('   Error Message:', error.message);
      console.error('   Error Stack:', error.stack);
      console.error('   Error Code:', error.code);
      console.error('   Error Response:', error.response?.data);
      console.log('🛫 ===== FLIGHT API FETCH END (ERROR) =====\n');
      return null; // Return null instead of fallback data
    }
  }

  /**
   * Fetch real hotel data from API
   */
  async fetchHotelData(extractedInfo, userPreferences) {
    try {
      console.log('\n🏨 ===== HOTEL API FETCH START =====');
      console.log('   📝 Extracted hotel info:', JSON.stringify(extractedInfo, null, 2));
      
      // Check if we have destination - if not, don't search
      if (!extractedInfo.destination) {
        console.log('   ⚠️ SKIPPING: No destination found in query');
        console.log('🏨 ===== HOTEL API FETCH END (NO DESTINATION) =====\n');
        return null;
      }
      
      const searchRequest = {
        destination: extractedInfo.destination,
        checkIn: extractedInfo.checkIn || this.getDefaultDepartureDate(),
        checkOut: extractedInfo.checkOut || this.getDefaultReturnDate(),
        adults: extractedInfo.guests || 2,
        rooms: 1,
        currency: userPreferences.currency || 'USD'
      };

      console.log('   🔍 Final Search Request:', JSON.stringify(searchRequest, null, 2));
      console.log('   📡 Calling HotelService.searchHotelsEnhanced()...');

      const startTime = Date.now();
      const results = await this.hotelService.searchHotelsEnhanced(searchRequest);
      const duration = Date.now() - startTime;
      
      console.log(`   ⏱️ API call completed in ${duration}ms`);
      console.log('   📊 Results received:', JSON.stringify({
        isNull: results === null,
        provider: results?.provider,
        totalHotels: results?.hotels?.length || 0,
        fallbackUsed: results?.fallbackUsed,
        success: results?.success
      }, null, 2));

      // Return null if API failed or no results
      if (!results || results.provider === 'mock') {
        console.log('   ⚠️ Hotel API unavailable or only mock data, returning null');
        console.log('🏨 ===== HOTEL API FETCH END (NO REAL DATA) =====\n');
        return null;
      }

      const returnData = {
        type: 'hotel',
        request: searchRequest,
        results: results.hotels || [],
        totalResults: results.hotels?.length || 0,
        provider: results.provider,
        searchTime: results.searchTime
      };
      
      console.log('   ✅ Returning real hotel data:', JSON.stringify({
        type: returnData.type,
        totalResults: returnData.totalResults,
        provider: returnData.provider
      }, null, 2));
      console.log('🏨 ===== HOTEL API FETCH END (SUCCESS) =====\n');

      return returnData;

    } catch (error) {
      console.error('\n   ❌ HOTEL API ERROR:');
      console.error('   Error Message:', error.message);
      console.error('   Error Stack:', error.stack);
      console.error('   Error Code:', error.code);
      console.error('   Error Response:', error.response?.data);
      console.log('🏨 ===== HOTEL API FETCH END (ERROR) =====\n');
      return null; // Return null instead of fallback data
    }
  }

  /**
   * Build comprehensive context prompt for Bedrock
   */
  buildContextPrompt(userQuery, conversationHistory, userPreferences, realData, queryIntent, userProfileSummary = '') {
    const lowerQuery = userQuery.toLowerCase(); // Define lowerQuery for use throughout method
    
    let contextPrompt = `You are an expert AI travel assistant helping users plan their perfect trips.

=== USER CONTEXT ===
`;

    // Add learned user profile summary first (highest priority)
    if (userProfileSummary) {
      contextPrompt += userProfileSummary;
    }

    // Add user preferences
    if (Object.keys(userPreferences).length > 0) {
      contextPrompt += `\nUser Preferences & Trip Details:\n`;
      
      // Current trip details (from trip planning form)
      if (userPreferences.currentTripOrigin) {
        contextPrompt += `- Origin: ${userPreferences.currentTripOrigin}\n`;
      }
      if (userPreferences.currentTripDestination) {
        contextPrompt += `- Destination: ${userPreferences.currentTripDestination}\n`;
      }
      if (userPreferences.currentTripDuration) {
        contextPrompt += `- Duration: ${userPreferences.currentTripDuration} days\n`;
      }
      if (userPreferences.currentTripStartDate) {
        contextPrompt += `- Start Date: ${userPreferences.currentTripStartDate}\n`;
      }
      if (userPreferences.budget) {
        contextPrompt += `- Budget: $${userPreferences.budget}\n`;
      }
      if (userPreferences.travelers) {
        contextPrompt += `- Number of Travelers: ${userPreferences.travelers}\n`;
      }
      if (userPreferences.travelStyle) {
        contextPrompt += `- Travel Style: ${userPreferences.travelStyle}\n`;
      }
      if (userPreferences.interests && Array.isArray(userPreferences.interests)) {
        contextPrompt += `- Interests: ${userPreferences.interests.join(', ')}\n`;
      }
      
      // Stored preferences
      if (userPreferences.preferredDestinations) {
        contextPrompt += `- Favorite Destinations: ${userPreferences.preferredDestinations.join(', ')}\n`;
      }
      if (userPreferences.budgetRange) {
        contextPrompt += `- Budget Range: ${userPreferences.budgetRange}\n`;
      }
    }

    // Add conversation history
    if (conversationHistory.length > 0) {
      contextPrompt += `\n=== RECENT CONVERSATION ===\n`;
      conversationHistory.slice(-5).forEach(turn => {
        contextPrompt += `User: ${turn.user}\n`;
        contextPrompt += `Assistant: ${turn.assistant.substring(0, 200)}${turn.assistant.length > 200 ? '...' : ''}\n\n`;
      });
    }

    // Add real data if fetched
    if (realData && !realData.error) {
      contextPrompt += `\n=== REAL-TIME DATA ===\n`;
      
      // Handle combined flight + hotel data
      if (realData.type === 'combined') {
        // Add flight data
        if (realData.flights && realData.flights.results && realData.flights.results.length > 0) {
          contextPrompt += `\nFLIGHT OPTIONS (${realData.flights.totalResults} found):\n`;
          realData.flights.results.slice(0, 5).forEach((flight, idx) => {
            contextPrompt += `\nFlight Option ${idx + 1}:\n`;
            contextPrompt += `- Airline: ${flight.airline || 'N/A'}\n`;
            contextPrompt += `- Price: ${flight.price || 'N/A'} ${flight.currency || 'USD'}\n`;
            contextPrompt += `- Route: ${realData.flights.request.origin} → ${realData.flights.request.destination}\n`;
            contextPrompt += `- Departure: ${flight.departureTime || 'N/A'}\n`;
            contextPrompt += `- Duration: ${flight.duration || 'N/A'}\n`;
            contextPrompt += `- Stops: ${flight.stops !== undefined ? flight.stops : 'N/A'}\n`;
          });
        }
        
        // Add hotel data
        if (realData.hotels && realData.hotels.results && realData.hotels.results.length > 0) {
          contextPrompt += `\n\nHOTEL OPTIONS (${realData.hotels.totalResults} found):\n`;
          realData.hotels.results.slice(0, 5).forEach((hotel, idx) => {
            contextPrompt += `\nHotel Option ${idx + 1}:\n`;
            contextPrompt += `- Name: ${hotel.name || 'N/A'}\n`;
            contextPrompt += `- Price: ${hotel.price || 'N/A'} ${hotel.currency || 'USD'} per night\n`;
            contextPrompt += `- Rating: ${hotel.rating || 'N/A'} ⭐\n`;
            contextPrompt += `- Location: ${hotel.location || 'N/A'}\n`;
          });
        }
      }
      // Handle flight-only data
      else if (realData.type === 'flight') {
        contextPrompt += `Flight Search Results (${realData.totalResults} options found):\n`;
        if (realData.results.length > 0) {
          realData.results.slice(0, 5).forEach((flight, idx) => {
            contextPrompt += `\nOption ${idx + 1}:\n`;
            contextPrompt += `- Airline: ${flight.airline || 'N/A'}\n`;
            contextPrompt += `- Price: ${flight.price || 'N/A'} ${flight.currency || 'USD'}\n`;
            contextPrompt += `- Departure: ${flight.departureTime || 'N/A'}\n`;
            contextPrompt += `- Duration: ${flight.duration || 'N/A'}\n`;
            contextPrompt += `- Stops: ${flight.stops || 'Direct'}\n`;
          });
        } else {
          contextPrompt += `No flights found. Provide general guidance.\n`;
        }
        contextPrompt += `\nSearch Details:\n`;
        contextPrompt += `- Route: ${realData.request.origin} → ${realData.request.destination}\n`;
        contextPrompt += `- Date: ${realData.request.departureDate}\n`;
        contextPrompt += `- Passengers: ${realData.request.passengers.adults}\n`;
      }
      // Handle hotel-only data
      else if (realData.type === 'hotel') {
        contextPrompt += `Hotel Search Results (${realData.totalResults} options found):\n`;
        if (realData.results.length > 0) {
          realData.results.slice(0, 5).forEach((hotel, idx) => {
            contextPrompt += `\nOption ${idx + 1}:\n`;
            contextPrompt += `- Name: ${hotel.name || 'N/A'}\n`;
            contextPrompt += `- Price: ${hotel.price || 'N/A'} ${hotel.currency || 'USD'} per night\n`;
            contextPrompt += `- Rating: ${hotel.rating || 'N/A'} ⭐\n`;
            contextPrompt += `- Location: ${hotel.location || 'N/A'}\n`;
          });
        } else {
          contextPrompt += `No hotels found. Provide general recommendations.\n`;
        }
        contextPrompt += `\nSearch Details:\n`;
        contextPrompt += `- Destination: ${realData.request.destination}\n`;
        contextPrompt += `- Check-in: ${realData.request.checkIn}\n`;
        contextPrompt += `- Check-out: ${realData.request.checkOut}\n`;
      }
      // Handle multi-destination flight comparison
      else if (realData.type === 'multi_destination_comparison') {
        contextPrompt += `\n=== REAL-TIME MULTI-DESTINATION FLIGHT COMPARISON ===\n`;
        contextPrompt += `Flight prices from ${realData.destinations[0]?.flightData?.request?.origin || 'origin'}:\n\n`;
        
        realData.destinations.forEach((dest, idx) => {
          contextPrompt += `${idx + 1}. ${dest.destination}: $${dest.cheapestPrice} (cheapest option)\n`;
          if (dest.flightData.results.length > 0) {
            const topFlight = dest.flightData.results[0];
            contextPrompt += `   - Airline: ${topFlight.airline || 'N/A'}\n`;
            contextPrompt += `   - Duration: ${topFlight.duration || 'N/A'}\n`;
            contextPrompt += `   - Stops: ${topFlight.stops || 'Direct'}\n`;
          }
          contextPrompt += `\n`;
        });
      }
      // Handle multi-destination hotel comparison
      else if (realData.type === 'multi_destination_hotel_comparison') {
        contextPrompt += `\n=== REAL-TIME MULTI-DESTINATION HOTEL COMPARISON ===\n`;
        contextPrompt += `Hotel prices comparison:\n\n`;
        
        realData.destinations.forEach((dest, idx) => {
          contextPrompt += `${idx + 1}. ${dest.destination}:\n`;
          contextPrompt += `   - Cheapest: $${dest.cheapestPrice} per night\n`;
          contextPrompt += `   - Average: $${dest.averagePrice} per night\n`;
          if (dest.hotelData.results.length > 0) {
            const topHotel = dest.hotelData.results[0];
            contextPrompt += `   - Best Option: ${topHotel.name || 'N/A'}\n`;
            contextPrompt += `   - Rating: ${topHotel.rating || 'N/A'} ⭐\n`;
          }
          contextPrompt += `\n`;
        });
      }
    }

    contextPrompt += `\n=== CURRENT QUERY ===\n`;
    contextPrompt += `Query Type: ${queryIntent.type}\n`;
    contextPrompt += `User Question: ${userQuery}\n\n`;

    contextPrompt += `=== YOUR TASK ===\n`;
    
    // Category-specific instructions
    if (realData && realData.type === 'multi_destination_comparison') {
      contextPrompt += `MULTI-DESTINATION FLIGHT COMPARISON MODE - Real price data available!\n\n`;
      contextPrompt += `CRITICAL: The user wants to COMPARE prices, not see detailed flight lists!\n\n`;
      contextPrompt += `Your ONLY job is to:\n`;
      contextPrompt += `1. START with a quick comparison summary showing prices side-by-side\n`;
      contextPrompt += `2. Rank destinations from CHEAPEST to most expensive\n`;
      contextPrompt += `3. Use ONLY the real prices from the data above\n`;
      contextPrompt += `4. After the comparison, briefly mention 1-2 best flights for the cheapest option\n`;
      contextPrompt += `5. Keep it SUPER concise - comparison should be 3-5 lines max\n`;
      contextPrompt += `6. DO NOT list all flights for all destinations - that's too much!\n`;
      contextPrompt += `7. NO EMOJIS - use plain text formatting only\n\n`;
      contextPrompt += `REQUIRED FORMAT:\n`;
      contextPrompt += `"Real-time flight price comparison from [origin]:\n\n`;
      contextPrompt += `1. CHEAPEST: [Destination] - $XXX\n`;
      contextPrompt += `2. [Destination] - $XXX\n`;
      contextPrompt += `3. [Destination] - $XXX\n`;
      contextPrompt += `4. MOST EXPENSIVE: [Destination] - $XXX\n\n`;
      contextPrompt += `Best Deal: [Destination] is the cheapest at $XXX. Here are the best options:\n`;
      contextPrompt += `- [Airline], Direct, [Duration], Departs [time]\n`;
      contextPrompt += `- [Alternative if needed]\n\n`;
      contextPrompt += `All prices are for direct/cheapest flights. Need details for another destination? Just ask!"\n\n`;
      contextPrompt += `DO NOT show detailed flight lists for all destinations. Focus on the COMPARISON.\n\n`;
    } else if (realData && realData.type === 'multi_destination_hotel_comparison') {
      contextPrompt += `MULTI-DESTINATION HOTEL COMPARISON MODE - Real price data available!\n\n`;
      contextPrompt += `CRITICAL: The user wants to COMPARE hotel prices, not see detailed hotel lists!\n\n`;
      contextPrompt += `Your ONLY job is to:\n`;
      contextPrompt += `1. START with a quick comparison summary showing prices side-by-side\n`;
      contextPrompt += `2. Rank destinations from CHEAPEST to most expensive (use cheapest price per night)\n`;
      contextPrompt += `3. Use ONLY the real prices from the data above\n`;
      contextPrompt += `4. After the comparison, briefly mention 1-2 best hotels for the cheapest destination\n`;
      contextPrompt += `5. Keep it SUPER concise - comparison should be 3-5 lines max\n`;
      contextPrompt += `6. DO NOT list all hotels for all destinations - that's too much!\n`;
      contextPrompt += `7. NO EMOJIS - use plain text formatting only\n\n`;
      contextPrompt += `REQUIRED FORMAT:\n`;
      contextPrompt += `"Real-time hotel price comparison:\n\n`;
      contextPrompt += `1. CHEAPEST: [Destination] - from $XXX/night\n`;
      contextPrompt += `2. [Destination] - from $XXX/night\n`;
      contextPrompt += `3. [Destination] - from $XXX/night\n`;
      contextPrompt += `4. MOST EXPENSIVE: [Destination] - from $XXX/night\n\n`;
      contextPrompt += `Best Deal: [Destination] has the most affordable hotels starting at $XXX/night. Top options:\n`;
      contextPrompt += `- [Hotel Name], [Rating] stars, $XXX/night\n`;
      contextPrompt += `- [Alternative if needed]\n\n`;
      contextPrompt += `Prices are per night. Need details for another destination? Just ask!"\n\n`;
      contextPrompt += `DO NOT show detailed hotel lists for all destinations. Focus on the COMPARISON.\n\n`;
    } else if (queryIntent.type === 'flight_search') {
      // FLIGHT SEARCH - Focus on flights only
      if (realData && !realData.error && realData.results && realData.results.length > 0) {
        contextPrompt += `✈️ FLIGHT SEARCH MODE - Real flight data is available!\n\n`;
        contextPrompt += `Your ONLY job is to:\n`;
        contextPrompt += `1. Present the TOP 5 BEST flight options from the data above\n`;
        contextPrompt += `2. For each flight, highlight: Price, Duration, Departure/Arrival times, Stops\n`;
        contextPrompt += `3. Briefly explain WHY each is a good choice (e.g., "Cheapest option", "Fastest", "Most convenient times")\n`;
        contextPrompt += `4. Keep it concise - 2-3 sentences per flight maximum\n`;
        contextPrompt += `5. Format clearly with bullet points or numbered list\n`;
        contextPrompt += `6. DO NOT create itineraries or mention hotels\n`;
        contextPrompt += `7. DO NOT add day-by-day plans\n`;
        contextPrompt += `8. Just focus on helping them choose the best flight\n\n`;
      } else {
        contextPrompt += `✈️ FLIGHT SEARCH MODE - Cannot fetch flight data\n\n`;
        
        // Check if destination is a region (Europe, Asia, etc.) instead of specific city
        const isRegionalQuery = queryIntent.extractedInfo?.destination && 
          ['europe', 'asia', 'africa', 'south america', 'north america', 'oceania', 'caribbean', 
           'middle east', 'southeast asia', 'south asia', 'east asia', 'central america', 
           'mediterranean', 'scandinavia', 'balkans', 'baltic', 'iberian peninsula'].some(region => 
            queryIntent.extractedInfo.destination.toLowerCase().includes(region.toLowerCase())
          );
        
        // Check if missing origin or destination
        if (!queryIntent.extractedInfo?.origin && !queryIntent.extractedInfo?.destination) {
          contextPrompt += `The user asked about flights but didn't specify WHICH destination.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"I'd be happy to check real-time flight prices for you!\n\n`;
          contextPrompt += `Which specific destination would you like me to search flights for? For example:\n`;
          contextPrompt += `- 'Check flights to Bali'\n`;
          contextPrompt += `- 'Show me flights to Cebu'\n`;
          contextPrompt += `- 'What are flight prices to Goa?'\n\n`;
          contextPrompt += `Once you tell me, I'll fetch live flight data and prices for you!"\n\n`;
        } else if (isRegionalQuery) {
          // User mentioned a region (e.g., "Europe", "Asia") not a specific city
          contextPrompt += `The user mentioned a REGION (${queryIntent.extractedInfo?.destination}) not a specific city.\n\n`;
          contextPrompt += `YOUR RESPONSE MUST:\n`;
          contextPrompt += `1. Acknowledge their interest in ${queryIntent.extractedInfo?.destination}\n`;
          contextPrompt += `2. Suggest 4-5 popular/affordable cities in that region\n`;
          contextPrompt += `3. Ask which specific city they'd like flight prices for\n`;
          contextPrompt += `4. Be friendly and helpful, not robotic\n`;
          contextPrompt += `5. Consider their preferences (budget, interests) when suggesting cities\n\n`;
          contextPrompt += `EXAMPLE FORMAT:\n`;
          contextPrompt += `"Great choice! ${queryIntent.extractedInfo?.destination} has amazing destinations. Here are some popular cities I can search flights for:\n\n`;
          contextPrompt += `- Paris (France) - Culture, art, cuisine\n`;
          contextPrompt += `- Barcelona (Spain) - Beach, architecture\n`;
          contextPrompt += `- Rome (Italy) - History, food\n`;
          contextPrompt += `- Amsterdam (Netherlands) - Canals, museums\n`;
          contextPrompt += `- Prague (Czech Republic) - Budget-friendly, beautiful\n\n`;
          contextPrompt += `Which city would you like me to check flight prices for? Or I can compare multiple cities for you!"\n\n`;
          contextPrompt += `Adapt the cities based on the region and user preferences!\n\n`;
        } else if (!queryIntent.extractedInfo?.origin) {
          contextPrompt += `Missing origin city. Ask:\n`;
          contextPrompt += `"I'd love to search flights to ${queryIntent.extractedInfo?.destination}! Where are you flying from?"\n\n`;
        } else if (!queryIntent.extractedInfo?.destination) {
          contextPrompt += `Missing destination. Ask:\n`;
          contextPrompt += `"I can search flights from ${queryIntent.extractedInfo?.origin}! Which destination are you interested in?"\n\n`;
        } else {
          contextPrompt += `API Error - respond:\n`;
          contextPrompt += `"I'm having trouble fetching flight data right now. Please try:\n`;
          contextPrompt += `- Google Flights (flights.google.com)\n`;
          contextPrompt += `- Skyscanner (skyscanner.com)\n`;
          contextPrompt += `- Kayak (kayak.com)\n\n`;
          contextPrompt += `For ${queryIntent.extractedInfo?.origin} to ${queryIntent.extractedInfo?.destination} flights."\n\n`;
        }
        contextPrompt += `DO NOT create itineraries when asked for flights.\n\n`;
      }
    } else if (queryIntent.type === 'hotel_search') {
      // HOTEL SEARCH - Focus on hotels only
      if (realData && !realData.error && realData.results && realData.results.length > 0) {
        contextPrompt += `🏨 HOTEL SEARCH MODE - Real hotel data is available!\n\n`;
        contextPrompt += `Your ONLY job is to:\n`;
        contextPrompt += `1. Present the TOP 5 BEST hotel options from the data above\n`;
        contextPrompt += `2. For each hotel, highlight: Price, Rating, Location, Key amenities\n`;
        contextPrompt += `3. Briefly explain WHY each is a good choice\n`;
        contextPrompt += `4. Keep it concise - 2-3 sentences per hotel maximum\n`;
        contextPrompt += `5. Format clearly with bullet points or numbered list\n`;
        contextPrompt += `6. DO NOT create itineraries or mention flights\n`;
        contextPrompt += `7. Just focus on helping them choose the best hotel\n\n`;
      } else {
        contextPrompt += `🏨 HOTEL SEARCH MODE - No real-time data available\n\n`;
        contextPrompt += `Simply respond:\n`;
        contextPrompt += `"I don't have real-time hotel data available right now. I recommend checking:\n`;
        contextPrompt += `- Booking.com\n`;
        contextPrompt += `- Hotels.com\n`;
        contextPrompt += `- Airbnb\n\n`;
        contextPrompt += `For accommodations in ${queryIntent.extractedInfo?.destination || 'your destination'}."\n\n`;
      }
    } else if (queryIntent.type === 'trip_planning') {
      // TRIP PLANNING - Create full itinerary with flights and hotels
      if (realData && !realData.error && realData.results && realData.results.length > 0) {
        contextPrompt += `🗺️ TRIP PLANNING MODE - Real data is available!\n\n`;
        contextPrompt += `Your role is to:\n`;
        contextPrompt += `1. RECOMMEND the best 2-3 flights from the options above\n`;
        contextPrompt += `2. RECOMMEND the best 2-3 hotels from the options above\n`;
        contextPrompt += `3. Create a detailed day-by-day ITINERARY considering their interests\n`;
        contextPrompt += `4. Suggest activities, attractions, restaurants for each day\n`;
        contextPrompt += `5. Provide budget estimates and travel tips\n`;
        contextPrompt += `6. Format with clear day-by-day structure (#### Day 1: Title, etc.)\n`;
        contextPrompt += `7. Use ALL the data provided above - don't make up flight/hotel info\n\n`;
      } else {
        contextPrompt += `🗺️ TRIP PLANNING MODE - No real-time data available\n\n`;
        contextPrompt += `Your role is to:\n`;
        contextPrompt += `1. Create an excellent day-by-day ITINERARY\n`;
        contextPrompt += `2. Suggest activities, attractions, restaurants based on their interests\n`;
        contextPrompt += `3. Provide budget estimates for activities and meals\n`;
        contextPrompt += `4. Give practical travel tips and local insights\n`;
        contextPrompt += `5. Format with clear day-by-day structure (#### Day 1: Title, etc.)\n`;
        contextPrompt += `6. DO NOT mention specific flights or hotels - focus on the experience\n\n`;
      }
    } else if (queryIntent.type === 'destination_recommendation') {
      // DESTINATION RECOMMENDATION MODE
      contextPrompt += `🌍 DESTINATION RECOMMENDATION MODE\n\n`;
      contextPrompt += `The user is asking for destination suggestions.\n\n`;
      contextPrompt += `Your role is to:\n`;
      contextPrompt += `1. ANALYZE their preferences (budget, interests, travel style) from the context above\n`;
      contextPrompt += `2. RECOMMEND 3-5 destinations that match their profile\n`;
      contextPrompt += `3. For each destination, briefly explain:\n`;
      contextPrompt += `   - Why it's a good fit for them\n`;
      contextPrompt += `   - Best time to visit\n`;
      contextPrompt += `   - Estimated budget range\n`;
      contextPrompt += `   - Key highlights (2-3 main attractions/experiences)\n`;
      contextPrompt += `4. PRIORITIZE destinations by best match to their preferences\n`;
      contextPrompt += `5. Be specific and actionable - give them clear next steps\n`;
      contextPrompt += `6. Format with clear sections and headings (no emojis)\n\n`;
      contextPrompt += `Example structure:\n`;
      contextPrompt += `1. Best Match: [Destination Name]\n`;
      contextPrompt += `Perfect for: [why it matches their interests]\n`;
      contextPrompt += `Budget: $X - $Y per day\n`;
      contextPrompt += `Must-see: [top highlights]\n\n`;
    } else if (queryIntent.type === 'budget_inquiry') {
      // BUDGET INQUIRY MODE
      contextPrompt += `💰 BUDGET INQUIRY MODE\n\n`;
      contextPrompt += `The user is asking about travel costs and budgeting.\n\n`;
      contextPrompt += `Your role is to:\n`;
      contextPrompt += `1. Provide REALISTIC budget estimates based on their query\n`;
      contextPrompt += `2. Break down costs by category:\n`;
      contextPrompt += `   - Flights (round-trip estimate)\n`;
      contextPrompt += `   - Accommodation (per night range)\n`;
      contextPrompt += `   - Food & Dining (per day)\n`;
      contextPrompt += `   - Activities & Attractions (total estimate)\n`;
      contextPrompt += `   - Local Transport (daily estimate)\n`;
      contextPrompt += `3. Show budget for DIFFERENT travel styles:\n`;
      contextPrompt += `   - LUXURY: High-end experience\n`;
      contextPrompt += `   - COMFORTABLE: Mid-range quality\n`;
      contextPrompt += `   - BUDGET: Backpacker-friendly\n`;
      contextPrompt += `4. Include MONEY-SAVING TIPS specific to the destination\n`;
      contextPrompt += `5. Consider their travel style from preferences if available\n`;
      contextPrompt += `6. Be transparent about what's included/excluded\n`;
      contextPrompt += `7. Mention best time to visit for VALUE (off-season savings)\n\n`;
    } else if (queryIntent.type === 'public_transport') {
      // PUBLIC TRANSPORT MODE
      contextPrompt += `🚇 PUBLIC TRANSPORT MODE\n\n`;
      contextPrompt += `The user is asking about public transportation and getting around.\n\n`;
      contextPrompt += `Your role is to:\n`;
      contextPrompt += `1. Provide COMPREHENSIVE transport information for the destination\n`;
      contextPrompt += `2. Cover ALL major transport options:\n`;
      contextPrompt += `   - 🚇 Metro/Subway (lines, coverage, frequency)\n`;
      contextPrompt += `   - 🚌 Buses (main routes, how to use)\n`;
      contextPrompt += `   - 🚂 Trains (regional/local services)\n`;
      contextPrompt += `   - 🚕 Taxis & Ride-sharing (apps, typical costs)\n`;
      contextPrompt += `   - 🚲 Bikes/Scooters (rental options)\n`;
      contextPrompt += `   - 🚶 Walking (walkability of areas)\n`;
      contextPrompt += `3. Include PRACTICAL INFORMATION:\n`;
      contextPrompt += `   - Travel cards/passes (cost, duration, where to buy)\n`;
      contextPrompt += `   - Mobile apps for navigation/tickets\n`;
      contextPrompt += `   - Operating hours\n`;
      contextPrompt += `   - Typical costs per journey\n`;
      contextPrompt += `   - Tourist passes vs regular tickets\n`;
      contextPrompt += `4. Give MONEY-SAVING TIPS for transport\n`;
      contextPrompt += `5. Include SAFETY TIPS and cultural norms\n`;
      contextPrompt += `6. Suggest best transport for MAJOR TOURIST AREAS\n`;
      contextPrompt += `7. Format clearly with sections for each transport type\n\n`;
      contextPrompt += `Example structure:\n`;
      contextPrompt += `🚇 METRO/SUBWAY\n`;
      contextPrompt += `Coverage: [areas covered]\n`;
      contextPrompt += `Cost: [per ride / day pass]\n`;
      contextPrompt += `Tips: [insider advice]\n\n`;
    } else {
      // GENERAL QUERY - conversational
      contextPrompt += `💬 GENERAL CONVERSATION MODE\n\n`;
      
      // Check if this is a general travel question (e.g., "what can I carry on flights?")
      if (queryIntent.extractedInfo?.queryType === 'rules' || 
          queryIntent.extractedInfo?.queryType === 'general_info' ||
          lowerQuery.includes('what') || lowerQuery.includes('how') || lowerQuery.includes('can i')) {
        contextPrompt += `The user is asking a GENERAL TRAVEL QUESTION, not requesting to search flights/hotels.\n\n`;
        contextPrompt += `Your role is to:\n`;
        contextPrompt += `1. Answer their question directly and comprehensively\n`;
        contextPrompt += `2. Provide practical, actionable information\n`;
        contextPrompt += `3. Include specific examples or tips\n`;
        contextPrompt += `4. If relevant, mention variations by airline/country\n`;
        contextPrompt += `5. Be conversational and helpful\n`;
        contextPrompt += `6. End with: "Need help with anything else?"\n\n`;
        contextPrompt += `DO NOT offer to search flights/hotels unless they specifically ask.\n\n`;
      } else {
        contextPrompt += `Answer the user's question naturally and helpfully.\n\n`;
        contextPrompt += `Guidelines:\n`;
        contextPrompt += `1. Be FRIENDLY and conversational\n`;
        contextPrompt += `2. If it's travel-related:\n`;
        contextPrompt += `   - Use their context (preferences, past searches) to personalize\n`;
        contextPrompt += `   - Provide specific, actionable advice\n`;
        contextPrompt += `   - Suggest follow-up questions they might ask\n`;
        contextPrompt += `3. If asking about features/capabilities:\n`;
        contextPrompt += `   - Explain what you can help with clearly\n`;
        contextPrompt += `   - Give examples of questions they can ask\n`;
        contextPrompt += `4. Keep it CONCISE but informative\n`;
        contextPrompt += `5. Use clear formatting without emojis\n`;
        contextPrompt += `6. End with a helpful question or prompt to continue conversation\n\n`;
      }
    }
    
    contextPrompt += `IMPORTANT RULES:\n`;
    contextPrompt += `- MATCH your response to the query type (${queryIntent.type})\n`;
    contextPrompt += `- If they ask for FLIGHTS, give ONLY flight recommendations\n`;
    contextPrompt += `- If they ask for HOTELS, give ONLY hotel recommendations\n`;
    contextPrompt += `- If they ask for TRIP PLAN, give full itinerary with both\n`;
    contextPrompt += `- Use user preferences (budget, interests, style) in recommendations\n`;
    contextPrompt += `- Be specific and actionable\n`;
    contextPrompt += `- Be friendly and professional\n`;
    contextPrompt += `- DO NOT use emojis in your response - use plain text only\n`;
    contextPrompt += `- Use clear formatting with headers, bullets, and numbers instead of emojis\n\n`;

    contextPrompt += `Respond naturally and conversationally:`;

    return contextPrompt;
  }

  /**
   * Call AWS Bedrock with context
   */
  async callBedrock(systemPrompt, conversationHistory, currentQuery) {
    try {
      const messages = [];

      // Add recent conversation history (ensure alternating user/assistant pattern)
      const recentHistory = conversationHistory.slice(-5);
      
      // Bedrock requires conversation to start with user message
      // If history starts with assistant, skip it
      let startIndex = 0;
      if (recentHistory.length > 0 && recentHistory[0].assistant && !recentHistory[0].user) {
        startIndex = 1;
      }

      for (let i = startIndex; i < recentHistory.length; i++) {
        const turn = recentHistory[i];
        if (turn.user) {
          messages.push({
            role: 'user',
            content: [{ text: turn.user }]
          });
        }
        if (turn.assistant) {
          messages.push({
            role: 'assistant',
            content: [{ text: turn.assistant }]
          });
        }
      }

      // Add current query (ensure we have at least one user message)
      messages.push({
        role: 'user',
        content: [{ text: currentQuery }]
      });

      // Validate conversation structure - Bedrock requires:
      // 1. Must start with user message
      // 2. Must alternate user/assistant
      // 3. Must end with user message
      if (messages.length === 0 || messages[0].role !== 'user') {
        console.error('   ⚠️ Invalid conversation structure, resetting to current query only');
        messages.length = 0;
        messages.push({
          role: 'user',
          content: [{ text: currentQuery }]
        });
      }

      // Ensure proper alternation and no consecutive messages from same role
      const cleanedMessages = [];
      let lastRole = null;
      for (const msg of messages) {
        if (msg.role !== lastRole) {
          cleanedMessages.push(msg);
          lastRole = msg.role;
        } else {
          console.warn(`   ⚠️ Skipping duplicate ${msg.role} message`);
        }
      }

      // Final validation - ensure we end with user message
      if (cleanedMessages.length === 0 || cleanedMessages[cleanedMessages.length - 1].role !== 'user') {
        console.error('   ⚠️ Conversation must end with user message');
        cleanedMessages.push({
          role: 'user',
          content: [{ text: currentQuery }]
        });
      }

      // Use cleaned messages
      const finalMessages = cleanedMessages.length > 0 ? cleanedMessages : [{
        role: 'user',
        content: [{ text: currentQuery }]
      }];

      // Debug logging
      console.log('   📋 Conversation structure for Bedrock:');
      console.log(`      - Total messages: ${finalMessages.length}`);
      console.log(`      - First message role: ${finalMessages[0]?.role}`);
      console.log(`      - Last message role: ${finalMessages[finalMessages.length - 1]?.role}`);

      const command = new ConverseCommand({
        modelId: this.modelId,
        messages: finalMessages,
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0.7,
          topP: 0.9
        }
      });

      console.log('   🧠 Calling Bedrock Nova Pro...');
      const response = await this.bedrockClient.send(command);

      const responseText = response.output.message.content[0].text;
      console.log(`   ✅ Bedrock response received (${responseText.length} chars)`);

      return responseText;

    } catch (error) {
      console.error('   ❌ Bedrock API error:', error);
      return "I apologize, but I'm having trouble processing your request right now. I'm here to help you plan amazing trips! Could you please rephrase your question?";
    }
  }

  /**
   * Load conversation history from storage
   */
  async loadConversationHistory(sessionId) {
    try {
      // Try DynamoDB first
      if (process.env.CONVERSATIONS_TABLE) {
        const params = {
          TableName: process.env.CONVERSATIONS_TABLE,
          KeyConditionExpression: 'sessionId = :sessionId',
          ExpressionAttributeValues: marshall({
            ':sessionId': sessionId
          }),
          ScanIndexForward: false,
          Limit: 10
        };

        const result = await this.dynamoClient.send(new QueryCommand(params));
        if (result.Items && result.Items.length > 0) {
          return result.Items.map(item => unmarshall(item)).reverse();
        }
      }

      // Fallback to in-memory
      return this.conversations.get(sessionId) || [];

    } catch (error) {
      console.error('Error loading conversation:', error);
      return this.conversations.get(sessionId) || [];
    }
  }

  /**
   * Load user preferences from storage
   */
  async loadUserPreferences(userId) {
    try {
      // Try DynamoDB first
      if (process.env.USER_PREFERENCES_TABLE) {
        const params = {
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: marshall({ userId })
        };

        const result = await this.dynamoClient.send(new GetItemCommand(params));
        if (result.Item) {
          return unmarshall(result.Item);
        }
      }

      // Fallback to in-memory
      return this.userPreferences.get(userId) || {};

    } catch (error) {
      console.error('Error loading preferences:', error);
      return this.userPreferences.get(userId) || {};
    }
  }

  /**
   * Save conversation to history
   */
  async saveConversation(sessionId, userId, conversation) {
    try {
      // Save to in-memory
      const history = this.conversations.get(sessionId) || [];
      history.push(conversation);
      this.conversations.set(sessionId, history.slice(-20)); // Keep last 20 turns

      // Try to save to DynamoDB
      if (process.env.CONVERSATIONS_TABLE) {
        const params = {
          TableName: process.env.CONVERSATIONS_TABLE,
          Item: marshall({
            sessionId,
            userId,
            timestamp: conversation.timestamp,
            ...conversation
          })
        };

        await this.dynamoClient.send(new PutItemCommand(params));
      }

    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  /**
   * Update user preferences based on conversation
   */
  async updatePreferencesFromConversation(userId, userQuery, aiResponse, currentPreferences) {
    try {
      const lowerQuery = userQuery.toLowerCase();
      const lowerResponse = aiResponse.toLowerCase();
      const updated = { ...currentPreferences };
      let hasUpdates = false;

      // Extract travel style
      if (lowerQuery.includes('budget') || lowerQuery.includes('cheap')) {
        updated.travelStyle = 'budget';
        hasUpdates = true;
      } else if (lowerQuery.includes('luxury') || lowerQuery.includes('premium')) {
        updated.travelStyle = 'luxury';
        hasUpdates = true;
      }

      // Extract destinations mentioned
      const cities = ['paris', 'london', 'tokyo', 'dubai', 'rome', 'barcelona', 'new york', 
                     'mumbai', 'delhi', 'singapore', 'bangkok'];
      for (const city of cities) {
        if (lowerQuery.includes(city) || lowerResponse.includes(city)) {
          updated.preferredDestinations = updated.preferredDestinations || [];
          const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
          if (!updated.preferredDestinations.includes(capitalizedCity)) {
            updated.preferredDestinations.push(capitalizedCity);
            hasUpdates = true;
          }
        }
      }

      // Extract interests
      const interests = ['adventure', 'culture', 'food', 'beach', 'shopping', 'nightlife', 'history'];
      for (const interest of interests) {
        if (lowerQuery.includes(interest)) {
          updated.interests = updated.interests || [];
          if (!updated.interests.includes(interest)) {
            updated.interests.push(interest);
            hasUpdates = true;
          }
        }
      }

      // Save if updates found
      if (hasUpdates) {
        updated.lastUpdated = new Date().toISOString();
        await this.saveUserPreferences(userId, updated);
        console.log('   ✅ User preferences updated');
      }

    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(userId, preferences) {
    try {
      // Save to in-memory
      this.userPreferences.set(userId, preferences);

      // Try to save to DynamoDB
      if (process.env.USER_PREFERENCES_TABLE) {
        const params = {
          TableName: process.env.USER_PREFERENCES_TABLE,
          Item: marshall({
            userId,
            ...preferences,
            updatedAt: new Date().toISOString()
          })
        };

        await this.dynamoClient.send(new PutItemCommand(params));
      }

    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  /**
   * Helper: Get default departure date (7 days from now)
   */
  getDefaultDepartureDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Get default return date (14 days from now)
   */
  getDefaultReturnDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  }

  /**
   * Remove all emojis from text
   */
  removeEmojis(text) {
    if (!text) return text;
    
    // Remove emojis using regex
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{E0020}-\u{E007F}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu, '');
  }
}

module.exports = IntegratedAITravelAgent;
