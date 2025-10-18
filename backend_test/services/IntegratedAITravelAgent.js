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
const TripAdvisorRapidAPIService = require('./TripAdvisorRapidAPIService');

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

    // TripAdvisor (RapidAPI) for attractions and restaurants enrichment
    this.tripAdvisorService = new TripAdvisorRapidAPIService();

    // Use AWS Nova Pro for all responses
    this.modelId = 'amazon.nova-pro-v1:0';

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
          // General Travel Preferences
          budget: null, // Overall trip budget
          travelStyle: null, // 'budget', 'mid-range', 'luxury'
          interests: [],
          destinations: [],
          homeCity: null, // User's home/origin city
          
          // Flight Preferences
          flightPreferences: {
            preferredAirlines: [], // e.g., ['Emirates', 'Qatar Airways']
            avoidAirlines: [], // Airlines to exclude
            preferredCabinClass: 'economy', // 'economy', 'premium_economy', 'business', 'first'
            maxStops: null, // null = any, 0 = direct only, 1 = max 1 stop, etc.
            preferredDepartureTime: null, // 'morning', 'afternoon', 'evening', 'night'
            preferredArrivalTime: null, // 'morning', 'afternoon', 'evening', 'night'
            maxFlightDuration: null, // Max duration in hours
            seatPreference: null, // 'window', 'aisle', 'middle'
            mealPreference: null, // 'vegetarian', 'vegan', 'non-veg', 'kosher', 'halal'
            baggageImportance: 'standard', // 'carry-on-only', 'standard', 'extra'
            flexibleDates: false, // Willing to adjust dates for better prices
            priceAlertEnabled: false, // Want price drop notifications
            loyaltyPrograms: [] // Frequent flyer programs
          },
          
          // Hotel Preferences
          hotelPreferences: {
            preferredChains: [], // e.g., ['Marriott', 'Hilton']
            accommodationType: null, // 'hotel', 'resort', 'airbnb', 'hostel', 'villa', 'boutique'
            minRating: null, // Minimum hotel rating (1-5 stars)
            preferredAmenities: [], // 'wifi', 'pool', 'gym', 'spa', 'breakfast', 'parking', 'pet-friendly'
            roomType: null, // 'single', 'double', 'suite', 'family'
            locationPreference: null, // 'city-center', 'near-beach', 'near-airport', 'quiet-area'
            viewPreference: null, // 'ocean-view', 'city-view', 'mountain-view', 'garden-view'
            budgetPerNight: null // Max budget per night
          },
          
          // Additional Preferences
          dietaryRestrictions: [],
          accessibilityNeeds: [], // 'wheelchair', 'hearing-impaired', 'visual-impaired'
          travelingWith: null, // 'solo', 'couple', 'family', 'friends', 'business'
          currency: 'USD', // Preferred currency for display
          language: 'en' // Preferred language
        },
        searchHistory: [],
        tripHistory: [],
        conversationTopics: [],
        currentDestinations: [], // Recently discussed destinations
        lastSearchParams: null, // Last flight/hotel search parameters for navigation
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
    
    // ============ FLIGHT PREFERENCES ============
    if (!updates.flightPreferences) updates.flightPreferences = {};
    
    // Cabin class detection
    if (/business.class|business.seat/i.test(lowerMsg)) {
      updates.flightPreferences.preferredCabinClass = 'business';
    } else if (/first.class|first.seat/i.test(lowerMsg)) {
      updates.flightPreferences.preferredCabinClass = 'first';
    } else if (/premium.economy|premium.seat/i.test(lowerMsg)) {
      updates.flightPreferences.preferredCabinClass = 'premium_economy';
    } else if (/economy|coach/i.test(lowerMsg)) {
      updates.flightPreferences.preferredCabinClass = 'economy';
    }
    
    // Airline preferences
    const airlines = [
      'Emirates', 'Qatar Airways', 'Singapore Airlines', 'Etihad', 'Lufthansa',
      'British Airways', 'Air India', 'IndiGo', 'Vistara', 'SpiceJet',
      'United', 'Delta', 'American Airlines', 'Southwest', 'JetBlue',
      'Air France', 'KLM', 'Turkish Airlines', 'Thai Airways', 'Cathay Pacific'
    ];
    
    const preferredAirlines = [];
    const avoidAirlines = [];
    
    for (const airline of airlines) {
      if (new RegExp(`(prefer|like|love|want).*${airline}`, 'i').test(message)) {
        preferredAirlines.push(airline);
      } else if (new RegExp(`(avoid|don't like|hate|not).*${airline}`, 'i').test(message)) {
        avoidAirlines.push(airline);
      }
    }
    
    if (preferredAirlines.length > 0) {
      const existing = context.preferences.flightPreferences?.preferredAirlines || [];
      updates.flightPreferences.preferredAirlines = [...new Set([...existing, ...preferredAirlines])];
    }
    
    if (avoidAirlines.length > 0) {
      const existing = context.preferences.flightPreferences?.avoidAirlines || [];
      updates.flightPreferences.avoidAirlines = [...new Set([...existing, ...avoidAirlines])];
    }
    
    // Stop preferences
    if (/direct.flight|non.stop|no.stops/i.test(lowerMsg)) {
      updates.flightPreferences.maxStops = 0;
    } else if (/one.stop|1.stop|single.stop/i.test(lowerMsg)) {
      updates.flightPreferences.maxStops = 1;
    } else if (/any.stops|multiple.stops|don't.care.stops/i.test(lowerMsg)) {
      updates.flightPreferences.maxStops = null;
    }
    
    // Departure time preferences
    if (/morning.flight|early.flight|depart.*morning/i.test(lowerMsg)) {
      updates.flightPreferences.preferredDepartureTime = 'morning';
    } else if (/afternoon.flight|depart.*afternoon/i.test(lowerMsg)) {
      updates.flightPreferences.preferredDepartureTime = 'afternoon';
    } else if (/evening.flight|depart.*evening/i.test(lowerMsg)) {
      updates.flightPreferences.preferredDepartureTime = 'evening';
    } else if (/night.flight|red.eye|overnight|depart.*night/i.test(lowerMsg)) {
      updates.flightPreferences.preferredDepartureTime = 'night';
    }
    
    // Seat preferences
    if (/window.seat/i.test(lowerMsg)) {
      updates.flightPreferences.seatPreference = 'window';
    } else if (/aisle.seat/i.test(lowerMsg)) {
      updates.flightPreferences.seatPreference = 'aisle';
    }
    
    // Meal preferences (for flights)
    if (/vegetarian.meal|veg.meal/i.test(lowerMsg)) {
      updates.flightPreferences.mealPreference = 'vegetarian';
    } else if (/vegan.meal/i.test(lowerMsg)) {
      updates.flightPreferences.mealPreference = 'vegan';
    } else if (/halal.meal/i.test(lowerMsg)) {
      updates.flightPreferences.mealPreference = 'halal';
    } else if (/kosher.meal/i.test(lowerMsg)) {
      updates.flightPreferences.mealPreference = 'kosher';
    }
    
    // Baggage preferences
    if (/carry.on.only|hand.luggage.only|no.checked/i.test(lowerMsg)) {
      updates.flightPreferences.baggageImportance = 'carry-on-only';
    } else if (/extra.baggage|more.luggage|heavy.bags/i.test(lowerMsg)) {
      updates.flightPreferences.baggageImportance = 'extra';
    }
    
    // Flexible dates
    if (/flexible.dates|any.dates|date.flexible/i.test(lowerMsg)) {
      updates.flightPreferences.flexibleDates = true;
    }
    
    // ============ HOTEL PREFERENCES ============
    if (!updates.hotelPreferences) updates.hotelPreferences = {};
    
    // Hotel chains
    const hotelChains = [
      'Marriott', 'Hilton', 'Hyatt', 'IHG', 'Radisson', 'Sheraton',
      'Taj', 'Oberoi', 'Accor', 'Four Seasons', 'Ritz-Carlton'
    ];
    
    const preferredChains = [];
    for (const chain of hotelChains) {
      if (new RegExp(`(prefer|like|stay.*at).*${chain}`, 'i').test(message)) {
        preferredChains.push(chain);
      }
    }
    
    if (preferredChains.length > 0) {
      const existing = context.preferences.hotelPreferences?.preferredChains || [];
      updates.hotelPreferences.preferredChains = [...new Set([...existing, ...preferredChains])];
    }
    
    // Hotel rating
    const ratingMatch = message.match(/(\d)\s*star|minimum.*(\d)\s*star|at least.*(\d)\s*star/i);
    if (ratingMatch) {
      const rating = parseInt(ratingMatch[1] || ratingMatch[2] || ratingMatch[3]);
      if (rating >= 1 && rating <= 5) {
        updates.hotelPreferences.minRating = rating;
      }
    }
    
    // Amenities
    const amenities = [];
    if (/wifi|internet|wi-fi/i.test(lowerMsg)) amenities.push('wifi');
    if (/pool|swimming/i.test(lowerMsg)) amenities.push('pool');
    if (/gym|fitness|workout/i.test(lowerMsg)) amenities.push('gym');
    if (/spa|massage/i.test(lowerMsg)) amenities.push('spa');
    if (/breakfast|morning.meal/i.test(lowerMsg)) amenities.push('breakfast');
    if (/parking|car.park/i.test(lowerMsg)) amenities.push('parking');
    if (/pet.friendly|pets.allowed|bring.*pet/i.test(lowerMsg)) amenities.push('pet-friendly');
    if (/airport.shuttle|airport.transfer/i.test(lowerMsg)) amenities.push('airport-shuttle');
    if (/restaurant|dining/i.test(lowerMsg)) amenities.push('restaurant');
    if (/bar|lounge/i.test(lowerMsg)) amenities.push('bar');
    if (/conference|meeting.room|business.center/i.test(lowerMsg)) amenities.push('business-facilities');
    
    if (amenities.length > 0) {
      const existing = context.preferences.hotelPreferences?.preferredAmenities || [];
      updates.hotelPreferences.preferredAmenities = [...new Set([...existing, ...amenities])];
    }
    
    // Room type
    if (/suite|luxury.room/i.test(lowerMsg)) {
      updates.hotelPreferences.roomType = 'suite';
    } else if (/family.room|connecting.room/i.test(lowerMsg)) {
      updates.hotelPreferences.roomType = 'family';
    } else if (/double.room|queen|king/i.test(lowerMsg)) {
      updates.hotelPreferences.roomType = 'double';
    } else if (/single.room/i.test(lowerMsg)) {
      updates.hotelPreferences.roomType = 'single';
    }
    
    // Location preference
    if (/city.center|downtown|central/i.test(lowerMsg)) {
      updates.hotelPreferences.locationPreference = 'city-center';
    } else if (/near.beach|beachfront|beach.side/i.test(lowerMsg)) {
      updates.hotelPreferences.locationPreference = 'near-beach';
    } else if (/near.airport|airport.area/i.test(lowerMsg)) {
      updates.hotelPreferences.locationPreference = 'near-airport';
    } else if (/quiet.area|peaceful|away.from.noise/i.test(lowerMsg)) {
      updates.hotelPreferences.locationPreference = 'quiet-area';
    }
    
    // View preference
    if (/ocean.view|sea.view/i.test(lowerMsg)) {
      updates.hotelPreferences.viewPreference = 'ocean-view';
    } else if (/city.view|urban.view/i.test(lowerMsg)) {
      updates.hotelPreferences.viewPreference = 'city-view';
    } else if (/mountain.view/i.test(lowerMsg)) {
      updates.hotelPreferences.viewPreference = 'mountain-view';
    } else if (/garden.view/i.test(lowerMsg)) {
      updates.hotelPreferences.viewPreference = 'garden-view';
    }
    
    // Hotel budget per night
    const hotelBudgetMatch = message.match(/\$?(\d+).*per.night|per.night.*\$?(\d+)|hotel.*budget.*\$?(\d+)/i);
    if (hotelBudgetMatch) {
      const budget = parseInt(hotelBudgetMatch[1] || hotelBudgetMatch[2] || hotelBudgetMatch[3]);
      if (budget > 0) {
        updates.hotelPreferences.budgetPerNight = budget;
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
      // Deep merge for nested objects (flightPreferences, hotelPreferences)
      context.preferences = {
        ...context.preferences,
        ...updates.preferences,
        flightPreferences: {
          ...context.preferences.flightPreferences,
          ...updates.preferences.flightPreferences
        },
        hotelPreferences: {
          ...context.preferences.hotelPreferences,
          ...updates.preferences.hotelPreferences
        }
      };
    }
    
    // Handle standalone flightPreferences updates
    if (updates.flightPreferences) {
      context.preferences.flightPreferences = {
        ...context.preferences.flightPreferences,
        ...updates.flightPreferences
      };
    }
    
    // Handle standalone hotelPreferences updates
    if (updates.hotelPreferences) {
      context.preferences.hotelPreferences = {
        ...context.preferences.hotelPreferences,
        ...updates.hotelPreferences
      };
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
   * Detect if user wants destination enrichment information
   * @param {string} message - User message
   * @param {Object} context - User context
   * @returns {Object} Intent detection result
   */
  detectDestinationIntent(message, context) {
    const lowerMsg = message.toLowerCase();
    
    const intent = {
      wantsRestaurants: false,
      wantsActivities: false,
      wantsPhotos: false,
      destination: null,
      confidence: 0
    };
    
    // Detect restaurant intent
    if (/restaurant|food|dining|eat|cuisine|where to eat|best places to eat|popular restaurants/i.test(lowerMsg)) {
      intent.wantsRestaurants = true;
      intent.confidence += 0.4;
    }
    
    // Detect activities/attractions intent
    if (/activity|activities|things to do|attractions|sightseeing|what to do|places to visit|popular activities|tourist spots/i.test(lowerMsg)) {
      intent.wantsActivities = true;
      intent.confidence += 0.4;
    }
    
    // Detect photo intent
    if (/photo|picture|image|show me|what.*look like|gallery|view/i.test(lowerMsg)) {
      intent.wantsPhotos = true;
      intent.confidence += 0.2;
    }
    
    // Extract destination from message or context
    intent.destination = this.extractDestination(message, context);
    
    return intent;
  }

  /**
   * Extract destination from message or context
   * @param {string} message - User message
   * @param {Object} context - User context with conversation history
   * @returns {string|null} Destination name
   */
  extractDestination(message, context) {
    // First, try to extract from the message itself
    const lowerMsg = message.toLowerCase();
    
    // Common patterns for destination mentions
    const patterns = [
      /(?:in|at|near|around|visiting|going to|traveling to|trip to|fly to|flight to)\s+([a-z\s]+?)(?:\s|,|\.|\?|!|$)/i,
      /([a-z\s]+?)\s+(?:restaurants|activities|attractions|hotels|flights)/i,
      /(?:popular|best|top)\s+(?:restaurants|activities|attractions)\s+(?:in|at|near)\s+([a-z\s]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const destination = match[1].trim();
        // Filter out common words that aren't destinations
        const excludeWords = ['the', 'a', 'an', 'some', 'any', 'good', 'best', 'popular', 'top', 'nice'];
        if (!excludeWords.includes(destination.toLowerCase()) && destination.length > 2) {
          console.log(`   📍 Extracted destination from message: ${destination}`);
          return destination;
        }
      }
    }
    
    // If not found in message, check context for recent destinations
    if (context.currentDestinations && context.currentDestinations.length > 0) {
      // Get the most recent destination discussed (within last 5 minutes)
      const recentDestinations = context.currentDestinations.filter(
        d => Date.now() - d.discussedAt < 5 * 60 * 1000
      );
      
      if (recentDestinations.length > 0) {
        const destination = recentDestinations[recentDestinations.length - 1].name;
        console.log(`   📍 Using recent destination from context: ${destination}`);
        return destination;
      }
    }
    
    // Check search history for recent destinations
    if (context.searchHistory && context.searchHistory.length > 0) {
      const recentSearch = context.searchHistory[context.searchHistory.length - 1];
      if (recentSearch.destination) {
        console.log(`   📍 Using destination from search history: ${recentSearch.destination}`);
        return recentSearch.destination;
      }
    }
    
    return null;
  }

  /**
   * Store destination in context for future reference
   * @param {string} sessionId - Session ID
   * @param {string} destination - Destination name
   * @param {Object} additionalInfo - Additional info (origin, dates, etc.)
   */
  storeDestinationInContext(sessionId, destination, additionalInfo = {}) {
    const context = this.getUserContext(sessionId);
    
    if (!context.currentDestinations) {
      context.currentDestinations = [];
    }
    
    // Clean up old destinations (older than 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    context.currentDestinations = context.currentDestinations.filter(
      d => d.discussedAt > oneDayAgo
    );
    
    // Add or update destination
    const existingIndex = context.currentDestinations.findIndex(d => 
      d.name.toLowerCase() === destination.toLowerCase()
    );
    
    const destinationData = {
      name: destination,
      discussedAt: Date.now(),
      ...additionalInfo
    };
    
    if (existingIndex >= 0) {
      context.currentDestinations[existingIndex] = destinationData;
    } else {
      context.currentDestinations.push(destinationData);
    }
    
    // Keep only last 5 destinations
    if (context.currentDestinations.length > 5) {
      context.currentDestinations = context.currentDestinations.slice(-5);
    }
    
    this.userContexts.set(sessionId, context);
    console.log(`   💾 Stored destination in context: ${destination}`);
  }

  /**
   * Store search parameters for navigation to search tabs
   * @param {string} sessionId - Session ID
   * @param {Object} searchParams - Search parameters
   */
  storeSearchParams(sessionId, searchParams) {
    const context = this.getUserContext(sessionId);
    
    context.lastSearchParams = {
      ...searchParams,
      timestamp: Date.now()
    };
    
    this.userContexts.set(sessionId, context);
    console.log(`   💾 Stored search params for navigation:`, searchParams);
  }

  /**
   * Get last search parameters for pre-populating search forms
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Search parameters or null
   */
  getLastSearchParams(sessionId) {
    const context = this.getUserContext(sessionId);
    
    // Return params if they're less than 1 hour old
    if (context.lastSearchParams) {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (context.lastSearchParams.timestamp > oneHourAgo) {
        return context.lastSearchParams;
      }
    }
    
    return null;
  }

  /**
   * Fetch and format destination enrichment data
   * @param {string} destination - Destination name
   * @param {string} type - Type of enrichment ('restaurants' or 'activities')
   * @param {number} limit - Number of results to return
   * @returns {Promise<Object>} Enrichment data
   */
  async enrichDestinationInfo(destination, type = 'restaurants', limit = 5) {
    try {
      console.log(`   🔍 Enriching ${type} for destination: ${destination}`);
      
      // Search for locations
      let searchResults;
      if (type === 'restaurants') {
        searchResults = await this.tripAdvisorService.getRestaurantsNearby(destination, limit);
      } else {
        searchResults = await this.tripAdvisorService.getAttractionsNearby(destination, limit);
      }
      
      if (!searchResults || searchResults.length === 0) {
        console.log(`   ⚠️ No ${type} found for ${destination}`);
        return {
          success: false,
          message: `I couldn't find ${type} information for ${destination}. Would you like to try a different destination?`
        };
      }
      
      console.log(`   ✅ Found ${searchResults.length} ${type} for ${destination}`);
      
      // Get details and photos for top results (limit to 3 for performance)
      const enrichedResults = await Promise.all(
        searchResults.slice(0, Math.min(3, limit)).map(async (location) => {
          try {
            const locationId = location.contentId || location.location_id;
            if (!locationId) {
              console.warn(`   ⚠️ No location ID for ${location.name}`);
              return location;
            }
            
            // Fetch details and photos in parallel
            const [details, photos] = await Promise.all([
              this.tripAdvisorService.getLocationDetails(locationId).catch(err => {
                console.warn(`   ⚠️ Failed to get details for ${location.name}:`, err.message);
                return null;
              }),
              this.tripAdvisorService.getLocationPhotos(locationId, 5).catch(err => {
                console.warn(`   ⚠️ Failed to get photos for ${location.name}:`, err.message);
                return [];
              })
            ]);
            
            return {
              ...location,
              ...(details || {}),
              photos: photos || []
            };
          } catch (error) {
            console.error(`   ❌ Error enriching location ${location.name}:`, error.message);
            return location;
          }
        })
      );
      
      return {
        success: true,
        destination,
        type,
        results: enrichedResults,
        count: enrichedResults.length
      };
      
    } catch (error) {
      console.error(`   ❌ Error enriching destination ${destination}:`, error);
      return {
        success: false,
        message: `I encountered an issue fetching ${type} for ${destination}. Please try again.`,
        error: error.message
      };
    }
  }

  /**
   * Format destination enrichment data for AI response
   * @param {Object} enrichmentData - Enrichment data from enrichDestinationInfo
   * @returns {string} Formatted response text
   */
  formatDestinationResponse(enrichmentData) {
    if (!enrichmentData.success) {
      return enrichmentData.message;
    }
    
    const { destination, type, results } = enrichmentData;
    
    let response = `Here are some popular ${type} in ${destination}:\n\n`;
    
    results.forEach((location, index) => {
      response += `${index + 1}. **${location.name}**\n`;
      
      if (location.rating) {
        const stars = '⭐'.repeat(Math.round(location.rating));
        response += `   ${stars} ${location.rating}/5`;
        if (location.num_reviews || location.reviewCount) {
          response += ` (${location.num_reviews || location.reviewCount} reviews)`;
        }
        response += '\n';
      }
      
      if (location.description) {
        const shortDesc = location.description.substring(0, 150);
        response += `   ${shortDesc}${location.description.length > 150 ? '...' : ''}\n`;
      }
      
      if (location.address) {
        response += `   📍 ${location.address}\n`;
      }
      
      if (type === 'restaurants') {
        if (location.cuisine && Array.isArray(location.cuisine)) {
          const cuisineNames = location.cuisine.map(c => 
            typeof c === 'string' ? c : c.name || c.localized_name
          ).filter(Boolean);
          if (cuisineNames.length > 0) {
            response += `   🍽️ Cuisine: ${cuisineNames.join(', ')}\n`;
          }
        }
        
        if (location.price_level || location.priceLevel) {
          response += `   💰 Price: ${location.price_level || location.priceLevel}\n`;
        }
      }
      
      if (type === 'activities' && location.category) {
        const categoryName = typeof location.category === 'string' 
          ? location.category 
          : location.category.name || location.category.localized_name;
        if (categoryName) {
          response += `   🎯 Category: ${categoryName}\n`;
        }
      }
      
      if (location.hours && location.hours.weekday_text) {
        response += `   🕐 Hours: ${location.hours.weekday_text[0]}\n`;
      }
      
      if (location.web_url) {
        response += `   🔗 [View on TripAdvisor](${location.web_url})\n`;
      }
      
      response += '\n';
    });
    
    response += `\nWould you like more details about any of these ${type}?`;
    
    return response;
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
   * Get nearby attractions using TripAdvisor API
   */
  async getNearbyAttractions(destination) {
    try {
      console.log('🏛️ ===== TRIPADVISOR ATTRACTIONS API START =====');
      console.log('🔍 Searching for attractions in:', destination);
      
      // First, get the location ID for the destination
      const locationId = await this.getTripAdvisorLocationId(destination);
      
      if (!locationId) {
        console.log('❌ No location ID found for destination:', destination);
        return [];
      }
      
      console.log('📍 Found location ID:', locationId);
      
      // Get location details to get coordinates
      const locationDetails = await this.getTripAdvisorLocationDetails(locationId);
      
      if (!locationDetails || !locationDetails.latitude || !locationDetails.longitude) {
        console.log('❌ No coordinates found for location:', locationId);
        return [];
      }
      
      const latLong = `${locationDetails.latitude},${locationDetails.longitude}`;
      console.log('📍 Coordinates:', latLong);
      
      // Search for nearby attractions
      const attractions = await this.searchNearbyAttractions(latLong);
      
      console.log('🏛️ ===== TRIPADVISOR ATTRACTIONS API END =====');
      return attractions;
      
    } catch (error) {
      console.error('❌ Error fetching attractions:', error);
      return [];
    }
  }

  /**
   * Get TripAdvisor location ID for a destination
   */
  async getTripAdvisorLocationId(destination) {
    try {
      const apiKey = process.env.TRIPADVISOR_API_KEY;
      if (!apiKey) {
        console.log('❌ TripAdvisor API key not found');
        return null;
      }

      // First try to get the geo ID from our mapping
      const geoId = this.getTripAdvisorGeoId(destination);
      if (geoId && geoId !== '304554') { // Not default Mumbai
        console.log('📍 Using mapped geo ID for', destination, ':', geoId);
        return geoId;
      }

      // If not found in mapping, search the API
      const searchUrl = 'https://api.content.tripadvisor.com/api/v1/location/search';
      const params = new URLSearchParams({
        key: apiKey,
        searchQuery: destination,
        category: 'geos',
        language: 'en'
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ TripAdvisor search API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Find the best match for the destination
        let bestMatch = data.data[0];
        
        // Look for exact matches first
        for (const location of data.data) {
          if (location.name.toLowerCase().includes(destination.toLowerCase()) || 
              destination.toLowerCase().includes(location.name.toLowerCase())) {
            bestMatch = location;
            break;
          }
        }
        
        console.log('📍 Found location:', bestMatch.name, 'ID:', bestMatch.location_id);
        return bestMatch.location_id;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting TripAdvisor location ID:', error);
      return null;
    }
  }

  /**
   * Get TripAdvisor location details
   */
  async getTripAdvisorLocationDetails(locationId) {
    try {
      const apiKey = process.env.TRIPADVISOR_API_KEY;
      if (!apiKey) {
        console.log('❌ TripAdvisor API key not found');
        return null;
      }

      const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details`;
      const params = new URLSearchParams({
        key: apiKey,
        language: 'en',
        currency: 'USD'
      });

      const response = await fetch(`${detailsUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ TripAdvisor details API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting TripAdvisor location details:', error);
      return null;
    }
  }

  /**
   * Search for nearby attractions
   */
  async searchNearbyAttractions(latLong) {
    try {
      const apiKey = process.env.TRIPADVISOR_API_KEY;
      if (!apiKey) {
        console.log('❌ TripAdvisor API key not found');
        return [];
      }

      const nearbyUrl = 'https://api.content.tripadvisor.com/api/v1/location/nearby_search';
      const params = new URLSearchParams({
        key: apiKey,
        latLong: latLong,
        category: 'attractions',
        radius: '10',
        radiusUnit: 'km',
        language: 'en'
      });

      const response = await fetch(`${nearbyUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ TripAdvisor nearby search API error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const attractions = data.data.map(attraction => ({
          id: attraction.location_id,
          name: attraction.name,
          rating: attraction.rating,
          review_count: attraction.num_reviews,
          category: attraction.category?.name || 'Attraction',
          address: attraction.address,
          description: attraction.description,
          web_url: attraction.web_url,
          photo_url: attraction.photo?.images?.medium?.url || null,
          latitude: attraction.latitude,
          longitude: attraction.longitude
        }));
        
        console.log('🏛️ Found attractions:', attractions.length);
        return attractions;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error searching nearby attractions:', error);
      return [];
    }
  }

  /**
   * Get TripAdvisor geo ID for URL generation
   */
  getTripAdvisorGeoId(destination) {
    // Map common destinations to TripAdvisor geo IDs
    const geoIdMap = {
      'Mumbai': '304554',
      'Delhi': '304551',
      'Bangalore': '304557',
      'Chennai': '304556',
      'Kolkata': '304555',
      'Hyderabad': '304558',
      'Pune': '304559',
      'Jaipur': '304560',
      'Agra': '304561',
      'Goa': '304562',
      'Kochi': '304563',
      'Udaipur': '304564',
      'Jodhpur': '304565',
      'Varanasi': '304566',
      'Amritsar': '304567',
      'New York': '60763',
      'London': '186338',
      'Paris': '187147',
      'Tokyo': '298184',
      'Dubai': '295424',
      'Singapore': '294265',
      'Bangkok': '293916',
      'Sydney': '255062',
      'Melbourne': '255100',
      'Rome': '187791',
      'Barcelona': '187497',
      'Amsterdam': '188590',
      'Berlin': '187275',
      'Vienna': '190454',
      'Prague': '274707',
      'Istanbul': '293974',
      'Cairo': '294205',
      'Cape Town': '312656',
      'Marrakech': '293953',
      'Buenos Aires': '312411',
      'Rio de Janeiro': '303506',
      'Sao Paulo': '303631',
      'Mexico City': '294196',
      'Los Angeles': '32655',
      'San Francisco': '60745',
      'Chicago': '35805',
      'Miami': '34438',
      'Las Vegas': '45963',
      'Seattle': '60878',
      'Boston': '60763',
      'Washington DC': '28970',
      'Toronto': '155019',
      'Vancouver': '154943',
      'Montreal': '155032',
      'Calgary': '154951',
      'Ottawa': '155004',
      'Quebec City': '155005',
      'Halifax': '154946',
      'Winnipeg': '154955',
      'Edmonton': '154948',
      'Victoria': '154954',
      'Hamilton': '154952'
    };
    
    return geoIdMap[destination] || '304554'; // Default to Mumbai
  }

  /**
   * Get mock hotels for a destination
   * Comprehensive destination matching for worldwide coverage
   */
  getMockHotelsForDestination(destination) {
    const dest = destination.toLowerCase().trim();
    
    // Comprehensive destination matching system
    const destinationData = this.getDestinationData(dest);
    
    if (destinationData) {
      return destinationData.hotels;
    }
    
    // Fallback: Generate contextual hotels based on destination type
    return this.generateContextualHotels(destination);
  }

  /**
   * Get comprehensive destination data including hotels and attractions
   */
  getDestinationData(dest) {
    // ASIA
    if (this.matchesDestination(dest, ['japan', 'tokyo', 'osaka', 'kyoto', 'nara', 'hiroshima', 'yokohama', 'sapporo'])) {
      return {
        hotels: [
          {
            name: 'The Ritz-Carlton Tokyo',
            price: 450,
            rating: 4.7,
            review_count: 3200,
            location: 'Tokyo, Japan',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel in Roppongi with stunning city views and world-class service',
            address: '9-7-1 Akasaka, Minato-ku, Tokyo'
          },
          {
            name: 'Park Hyatt Tokyo',
            price: 380,
            rating: 4.6,
            review_count: 2800,
            location: 'Tokyo, Japan',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Iconic luxury hotel featured in "Lost in Translation" with panoramic city views',
            address: '3-7-1-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo'
          },
          {
            name: 'Aman Tokyo',
            price: 520,
            rating: 4.8,
            review_count: 1500,
            location: 'Tokyo, Japan',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge', 'Fitness Center'],
            description: 'Ultra-luxury hotel with minimalist design and exceptional service',
            address: '1-5-6 Otemachi, Chiyoda-ku, Tokyo'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hong kong', 'macau'])) {
      return {
        hotels: [
          {
            name: 'The Peninsula Hong Kong',
            price: 400,
            rating: 4.6,
            review_count: 2800,
            location: 'Hong Kong',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel with harbor views and exceptional service',
            address: 'Salisbury Road, Tsim Sha Tsui, Hong Kong'
          },
          {
            name: 'The Ritz-Carlton Shanghai',
            price: 350,
            rating: 4.5,
            review_count: 2200,
            location: 'Shanghai, China',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Modern luxury hotel in Pudong with stunning city skyline views',
            address: 'No. 8 Century Avenue, Pudong, Shanghai'
          },
          {
            name: 'Aman Summer Palace',
            price: 480,
            rating: 4.8,
            review_count: 1800,
            location: 'Beijing, China',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury resort near the Summer Palace with traditional Chinese architecture',
            address: '15 Gongmenqian Street, Haidian District, Beijing'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['india', 'mumbai', 'bombay', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'kolkata', 'goa', 'jaipur', 'agra'])) {
      return {
        hotels: [
          {
            name: 'The Taj Mahal Palace',
            price: 200,
            rating: 4.7,
            review_count: 3500,
            location: 'Mumbai, India',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel overlooking the Gateway of India and Arabian Sea',
            address: 'Apollo Bunder, Colaba, Mumbai'
          },
          {
            name: 'The Oberoi New Delhi',
            price: 180,
            rating: 4.6,
            review_count: 2800,
            location: 'New Delhi, India',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Luxury hotel in the heart of Delhi with modern amenities and traditional hospitality',
            address: 'Dr. Zakir Hussain Marg, New Delhi'
          },
          {
            name: 'Taj Lake Palace',
            price: 350,
            rating: 4.8,
            review_count: 2200,
            location: 'Udaipur, India',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Floating palace hotel on Lake Pichola with breathtaking views',
            address: 'Pichola, Udaipur, Rajasthan'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['singapore', 'malaysia', 'kuala lumpur', 'thailand', 'bangkok', 'phuket', 'indonesia', 'bali', 'jakarta', 'philippines', 'manila', 'vietnam', 'ho chi minh', 'hanoi'])) {
      return {
        hotels: [
          {
            name: 'Marina Bay Sands',
            price: 300,
            rating: 4.5,
            review_count: 4200,
            location: 'Singapore',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Casino'],
            description: 'Iconic hotel with rooftop infinity pool and stunning city views',
            address: '10 Bayfront Avenue, Singapore'
          },
          {
            name: 'The St. Regis Bangkok',
            price: 250,
            rating: 4.4,
            review_count: 1800,
            location: 'Bangkok, Thailand',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Luxury hotel in the heart of Bangkok with traditional Thai hospitality',
            address: '159 Rajadamri Road, Bangkok'
          },
          {
            name: 'The Mulia Bali',
            price: 200,
            rating: 4.6,
            review_count: 3200,
            location: 'Bali, Indonesia',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Beach Access'],
            description: 'Beachfront luxury resort with stunning ocean views and Balinese culture',
            address: 'Jl. Raya Nusa Dua Selatan, Bali'
          }
        ]
      };
    }
    
    // EUROPE
    if (this.matchesDestination(dest, ['france', 'paris', 'lyon', 'marseille', 'nice', 'cannes'])) {
      return {
        hotels: [
          {
            name: 'The Ritz Paris',
            price: 400,
            rating: 4.7,
            review_count: 3800,
            location: 'Paris, France',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Legendary luxury hotel in Place Vendôme with timeless elegance',
            address: '15 Place Vendôme, 75001 Paris, France'
          },
          {
            name: 'Hotel Plaza Athénée',
            price: 350,
            rating: 4.6,
            review_count: 3200,
            location: 'Paris, France',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Luxury hotel on Avenue Montaigne with Eiffel Tower views',
            address: '25 Avenue Montaigne, 75008 Paris, France'
          },
          {
            name: 'Le Meurice',
            price: 380,
            rating: 4.5,
            review_count: 2900,
            location: 'Paris, France',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Palace hotel near the Louvre with royal heritage',
            address: '228 Rue de Rivoli, 75001 Paris, France'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['united kingdom', 'uk', 'london', 'manchester', 'edinburgh', 'glasgow', 'birmingham'])) {
      return {
        hotels: [
          {
            name: 'The Savoy London',
            price: 300,
            rating: 4.6,
            review_count: 4200,
            location: 'London, UK',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel on the Thames with timeless elegance',
            address: 'Strand, London WC2R 0EU, UK'
          },
          {
            name: 'Claridge\'s',
            price: 350,
            rating: 4.7,
            review_count: 2800,
            location: 'London, UK',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Art Deco luxury hotel in Mayfair with exceptional service',
            address: 'Brook St, London W1K 4HR, UK'
          },
          {
            name: 'The Ritz London',
            price: 320,
            rating: 4.5,
            review_count: 3600,
            location: 'London, UK',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Iconic luxury hotel in Piccadilly with afternoon tea tradition',
            address: '150 Piccadilly, London W1J 9BR, UK'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne'])) {
      return {
        hotels: [
          {
            name: 'Hotel Adlon Kempinski',
            price: 280,
            rating: 4.5,
            review_count: 2200,
            location: 'Berlin, Germany',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel near Brandenburg Gate with modern amenities',
            address: 'Unter den Linden 77, 10117 Berlin, Germany'
          },
          {
            name: 'The Charles Hotel',
            price: 250,
            rating: 4.4,
            review_count: 1800,
            location: 'Munich, Germany',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Modern luxury hotel in Munich with Bavarian charm',
            address: 'Sophienstraße 28, 80333 München, Germany'
          },
          {
            name: 'The Fontenay Hamburg',
            price: 220,
            rating: 4.6,
            review_count: 1500,
            location: 'Hamburg, Germany',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Contemporary luxury hotel with lake views and modern design',
            address: 'Fontenay 10, 20354 Hamburg, Germany'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['italy', 'rome', 'milan', 'florence', 'venice', 'naples', 'bologna'])) {
      return {
        hotels: [
          {
            name: 'Hotel de Russie',
            price: 350,
            rating: 4.6,
            review_count: 2800,
            location: 'Rome, Italy',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel near Spanish Steps with beautiful garden courtyard',
            address: 'Via del Babuino, 9, 00187 Roma RM, Italy'
          },
          {
            name: 'Armani Hotel Milano',
            price: 400,
            rating: 4.5,
            review_count: 2200,
            location: 'Milan, Italy',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Fashion-forward luxury hotel in the heart of Milan',
            address: 'Via Manzoni, 31, 20121 Milano MI, Italy'
          },
          {
            name: 'Hotel Danieli',
            price: 380,
            rating: 4.7,
            review_count: 3200,
            location: 'Venice, Italy',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel overlooking the Grand Canal',
            address: 'Riva degli Schiavoni, 4196, 30122 Venezia VE, Italy'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['spain', 'madrid', 'barcelona', 'seville', 'valencia', 'bilbao'])) {
      return {
        hotels: [
          {
            name: 'Hotel Ritz Madrid',
            price: 300,
            rating: 4.5,
            review_count: 2500,
            location: 'Madrid, Spain',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel near Prado Museum with classic elegance',
            address: 'Plaza de la Lealtad, 5, 28014 Madrid, Spain'
          },
          {
            name: 'Hotel Casa Fuster',
            price: 280,
            rating: 4.4,
            review_count: 1800,
            location: 'Barcelona, Spain',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Modernist luxury hotel on Passeig de Gràcia with rooftop pool',
            address: 'Passeig de Gràcia, 132, 08008 Barcelona, Spain'
          },
          {
            name: 'Hotel Alfonso XIII',
            price: 250,
            rating: 4.6,
            review_count: 2200,
            location: 'Seville, Spain',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel with Moorish architecture and Andalusian charm',
            address: 'C. San Fernando, 2, 41004 Sevilla, Spain'
          }
        ]
      };
    }
    
    // NORTH AMERICA
    if (this.matchesDestination(dest, ['united states', 'usa', 'america', 'new york', 'nyc', 'manhattan', 'los angeles', 'la', 'chicago', 'miami', 'las vegas', 'san francisco', 'boston', 'washington', 'seattle'])) {
      return {
        hotels: [
          {
            name: 'The Plaza New York',
            price: 400,
            rating: 4.5,
            review_count: 4500,
            location: 'New York, NY',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Historic luxury hotel on Central Park with timeless elegance',
            address: '768 5th Ave, New York, NY'
          },
          {
            name: 'The Beverly Hills Hotel',
            price: 450,
            rating: 4.6,
            review_count: 3200,
            location: 'Beverly Hills, CA',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Iconic luxury hotel with Hollywood glamour and tropical gardens',
            address: '9641 Sunset Blvd, Beverly Hills, CA'
          },
          {
            name: 'The Ritz-Carlton Chicago',
            price: 350,
            rating: 4.4,
            review_count: 2800,
            location: 'Chicago, IL',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel with stunning lake views and modern amenities',
            address: '160 E Pearson St, Chicago, IL'
          }
        ]
      };
    }
    
    if (this.matchesDestination(dest, ['canada', 'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa'])) {
      return {
        hotels: [
          {
            name: 'The Ritz-Carlton Toronto',
            price: 300,
            rating: 4.5,
            review_count: 2200,
            location: 'Toronto, Canada',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel in the heart of Toronto with modern amenities',
            address: '181 Wellington St W, Toronto, ON M5V 3G5, Canada'
          },
          {
            name: 'Fairmont Pacific Rim',
            price: 280,
            rating: 4.6,
            review_count: 2500,
            location: 'Vancouver, Canada',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Luxury hotel with stunning harbor views and contemporary design',
            address: '1038 Canada Pl, Vancouver, BC V6C 0B9, Canada'
          },
          {
            name: 'Ritz-Carlton Montreal',
            price: 250,
            rating: 4.4,
            review_count: 1800,
            location: 'Montreal, Canada',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel in Old Montreal with historic charm and modern luxury',
            address: '1228 Sherbrooke St W, Montreal, QC H3G 1H6, Canada'
          }
        ]
      };
    }
    
    // OCEANIA
    if (this.matchesDestination(dest, ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'new zealand', 'auckland', 'wellington', 'queenstown'])) {
      return {
        hotels: [
          {
            name: 'Park Hyatt Sydney',
            price: 400,
            rating: 4.7,
            review_count: 3200,
            location: 'Sydney, Australia',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel with iconic Opera House and harbor views',
            address: '7 Hickson Rd, The Rocks NSW 2000, Australia'
          },
          {
            name: 'The Langham Melbourne',
            price: 280,
            rating: 4.5,
            review_count: 2200,
            location: 'Melbourne, Australia',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Luxury hotel in the heart of Melbourne with modern amenities',
            address: '1 Southgate Ave, Southbank VIC 3006, Australia'
          },
          {
            name: 'The Langham Auckland',
            price: 250,
            rating: 4.4,
            review_count: 1800,
            location: 'Auckland, New Zealand',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel with harbor views and contemporary design',
            address: '83 Symonds St, Auckland 1010, New Zealand'
          }
        ]
      };
    }
    
    // MIDDLE EAST & AFRICA
    if (this.matchesDestination(dest, ['uae', 'dubai', 'abu dhabi', 'qatar', 'doha', 'saudi arabia', 'riyadh', 'jeddah', 'egypt', 'cairo', 'south africa', 'cape town', 'johannesburg'])) {
      return {
        hotels: [
          {
            name: 'Burj Al Arab',
            price: 500,
            rating: 4.6,
            review_count: 4200,
            location: 'Dubai, UAE',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Iconic luxury hotel shaped like a sail with stunning architecture',
            address: 'Jumeirah Beach, Dubai, UAE'
          },
          {
            name: 'Emirates Palace',
            price: 400,
            rating: 4.5,
            review_count: 3200,
            location: 'Abu Dhabi, UAE',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'],
            description: 'Palace-style luxury hotel with gold accents and beachfront location',
            address: 'West Corniche Road, Abu Dhabi, UAE'
          },
          {
            name: 'The Ritz-Carlton Cairo',
            price: 200,
            rating: 4.4,
            review_count: 1800,
            location: 'Cairo, Egypt',
            amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'],
            description: 'Luxury hotel with views of the Nile and ancient Egyptian charm',
            address: '1191 Nile Corniche, Cairo, Egypt'
          }
        ]
      };
    }
    
    return null; // No specific data found
  }

  /**
   * Check if destination matches any of the provided keywords
   */
  matchesDestination(dest, keywords) {
    return keywords.some(keyword => dest.includes(keyword.toLowerCase()));
  }

  /**
   * Generate contextual hotels for unknown destinations
   */
  generateContextualHotels(destination) {
    const dest = destination.toLowerCase();
    
    // Determine destination type and generate appropriate hotels
    let hotelType = 'city';
    let priceRange = { min: 120, max: 200 };
    let amenities = ['WiFi', 'Restaurant'];
    
    if (dest.includes('beach') || dest.includes('coast') || dest.includes('island')) {
      hotelType = 'beach';
      priceRange = { min: 150, max: 300 };
      amenities = ['WiFi', 'Pool', 'Restaurant', 'Beach Access'];
    } else if (dest.includes('mountain') || dest.includes('alpine') || dest.includes('ski')) {
      hotelType = 'mountain';
      priceRange = { min: 180, max: 350 };
      amenities = ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Fitness Center'];
    } else if (dest.includes('desert') || dest.includes('oasis')) {
      hotelType = 'desert';
      priceRange = { min: 200, max: 400 };
      amenities = ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Concierge'];
    } else if (dest.includes('historic') || dest.includes('ancient') || dest.includes('old')) {
      hotelType = 'historic';
      priceRange = { min: 100, max: 250 };
      amenities = ['WiFi', 'Restaurant', 'Historic Charm'];
    }
    
    const basePrice = Math.floor(Math.random() * (priceRange.max - priceRange.min + 1)) + priceRange.min;
    
    return [
      {
        name: `${this.capitalizeFirst(destination)} Grand Hotel`,
        price: basePrice,
        rating: 4.2 + Math.random() * 0.6,
        review_count: Math.floor(Math.random() * 2000) + 500,
        location: destination,
        amenities: amenities,
        description: `Luxury ${hotelType} hotel with modern amenities and exceptional service in ${destination}`,
        address: `City Center, ${destination}`
      },
      {
        name: `The ${this.capitalizeFirst(destination)} Plaza`,
        price: Math.floor(basePrice * 0.8),
        rating: 4.0 + Math.random() * 0.5,
        review_count: Math.floor(Math.random() * 1500) + 300,
        location: destination,
        amenities: amenities.slice(0, -1), // Remove one amenity for mid-range
        description: `Comfortable ${hotelType} hotel with great location and friendly service`,
        address: `Business District, ${destination}`
      },
      {
        name: `${this.capitalizeFirst(destination)} Boutique Hotel`,
        price: Math.floor(basePrice * 1.2),
        rating: 4.3 + Math.random() * 0.4,
        review_count: Math.floor(Math.random() * 1000) + 200,
        location: destination,
        amenities: [...amenities, 'Unique Design'],
        description: `Charming boutique ${hotelType} hotel with unique character and personalized service`,
        address: `Historic District, ${destination}`
      }
    ];
  }

  /**
   * Capitalize first letter of each word
   */
  capitalizeFirst(str) {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }

  /**
   * Get mock attractions for a destination
   * Comprehensive destination matching for worldwide coverage
   */
  getMockAttractionsForDestination(destination) {
    const dest = destination.toLowerCase().trim();
    
    // Comprehensive destination matching system
    const destinationData = this.getDestinationData(dest);
    
    if (destinationData && destinationData.attractions) {
      return destinationData.attractions;
    }
    
    // Fallback: Generate contextual attractions based on destination type
    return this.generateContextualAttractions(destination);
  }

  /**
   * Get comprehensive destination data including hotels and attractions
   */
  getDestinationAttractionsData(dest) {
    // ASIA
    if (this.matchesDestination(dest, ['japan', 'tokyo', 'osaka', 'kyoto', 'nara', 'hiroshima', 'yokohama', 'sapporo'])) {
      return [
        {
          id: '3436969',
          name: 'Tokyo Skytree',
          rating: 4.2,
          review_count: 38000,
          category: 'Observation Deck',
          address: '1-1-2 Oshiage, Sumida City, Tokyo',
          description: '634-meter tall broadcasting tower and observation deck. Offers panoramic views of Tokyo and Mount Fuji on clear days.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319505-Reviews-Tokyo_Skytree-Tokyo_Tokyo_Prefecture.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Senso-ji Temple',
          rating: 4.3,
          review_count: 45000,
          category: 'Religious Site',
          address: '2-3-1 Asakusa, Taito City, Tokyo',
          description: 'Tokyo\'s oldest temple, founded in 628 AD. A vibrant Buddhist temple complex in the historic Asakusa district.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319504-Reviews-Senso_ji_Temple-Tokyo_Tokyo_Prefecture.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Meiji Shrine',
          rating: 4.4,
          review_count: 42000,
          category: 'Religious Site',
          address: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo',
          description: 'Shinto shrine dedicated to Emperor Meiji and Empress Shoken. Surrounded by a peaceful forest in the heart of Tokyo.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319506-Reviews-Meiji_Shrine-Tokyo_Tokyo_Prefecture.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    if (this.matchesDestination(dest, ['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hong kong', 'macau'])) {
      return [
        {
          id: '3436969',
          name: 'Great Wall of China',
          rating: 4.6,
          review_count: 85000,
          category: 'Historic Site',
          address: 'Huairou District, Beijing, China',
          description: 'Ancient fortification system and one of the Seven Wonders of the World. Stretches over 13,000 miles across northern China.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g294212-d311538-Reviews-Great_Wall_of_China-Beijing.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Forbidden City',
          rating: 4.5,
          review_count: 65000,
          category: 'Historic Site',
          address: '4 Jingshan Front St, Dongcheng, Beijing, China',
          description: 'Imperial palace complex that served as the home of emperors for nearly 500 years. UNESCO World Heritage Site.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g294212-d311539-Reviews-Forbidden_City-Beijing.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Victoria Peak',
          rating: 4.3,
          review_count: 42000,
          category: 'Observation Deck',
          address: 'Victoria Peak, Hong Kong',
          description: 'Highest point on Hong Kong Island offering panoramic views of the city skyline and harbor.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g294217-d311540-Reviews-Victoria_Peak-Hong_Kong.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    if (this.matchesDestination(dest, ['india', 'mumbai', 'bombay', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'kolkata', 'goa', 'jaipur', 'agra'])) {
      return [
        {
          id: '3436969',
          name: 'Taj Mahal',
          rating: 4.7,
          review_count: 125000,
          category: 'Monument',
          address: 'Agra, Uttar Pradesh, India',
          description: 'Iconic white marble mausoleum, one of the Seven Wonders of the World. Built by Mughal emperor Shah Jahan in memory of his wife Mumtaz Mahal.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g297683-d319504-Reviews-Taj_Mahal-Agra_Uttar_Pradesh.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Gateway of India',
          rating: 4.1,
          review_count: 55000,
          category: 'Monument',
          address: 'Apollo Bunder, Colaba, Mumbai',
          description: 'Historic arch monument overlooking the Arabian Sea, built to commemorate the visit of King George V and Queen Mary.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319507-Reviews-Gateway_of_India-Mumbai_Maharashtra.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Red Fort',
          rating: 4.3,
          review_count: 45000,
          category: 'Historic Site',
          address: 'Old Delhi, Delhi, India',
          description: 'Historic fort complex, UNESCO World Heritage Site. Built by Mughal emperor Shah Jahan.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304551-d319505-Reviews-Red_Fort-Delhi.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    if (this.matchesDestination(dest, ['singapore', 'malaysia', 'kuala lumpur', 'thailand', 'bangkok', 'phuket', 'indonesia', 'bali', 'jakarta', 'philippines', 'manila', 'vietnam', 'ho chi minh', 'hanoi'])) {
      return [
        {
          id: '3436969',
          name: 'Marina Bay Sands',
          rating: 4.4,
          review_count: 35000,
          category: 'Landmark',
          address: '10 Bayfront Avenue, Singapore',
          description: 'Iconic integrated resort with rooftop infinity pool, casino, and stunning city views.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g294265-d311541-Reviews-Marina_Bay_Sands-Singapore.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Grand Palace',
          rating: 4.2,
          review_count: 28000,
          category: 'Historic Site',
          address: 'Na Phra Lan Rd, Phra Nakhon, Bangkok, Thailand',
          description: 'Former royal residence and complex of buildings in Bangkok. Home to the Temple of the Emerald Buddha.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g293916-d311542-Reviews-Grand_Palace-Bangkok.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Tanah Lot Temple',
          rating: 4.3,
          review_count: 22000,
          category: 'Religious Site',
          address: 'Beraban, Kediri, Tabanan Regency, Bali, Indonesia',
          description: 'Ancient Hindu temple perched on a rock formation in the sea. Famous for its sunset views.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g297700-d311543-Reviews-Tanah_Lot_Temple-Bali.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // EUROPE
    if (this.matchesDestination(dest, ['france', 'paris', 'lyon', 'marseille', 'nice', 'cannes'])) {
      return [
        {
          id: '3436969',
          name: 'Eiffel Tower',
          rating: 4.5,
          review_count: 125000,
          category: 'Landmark',
          address: 'Champ de Mars, 7th arrondissement, Paris',
          description: 'Iconic iron lattice tower and symbol of Paris. Built for the 1889 World\'s Fair, it offers stunning views from its observation decks.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187147-d187147-Reviews-Eiffel_Tower-Paris_Ile_de_France.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Louvre Museum',
          rating: 4.4,
          review_count: 95000,
          category: 'Museum',
          address: 'Rue de Rivoli, 1st arrondissement, Paris',
          description: 'World\'s largest art museum and historic monument. Home to the Mona Lisa and thousands of other masterpieces.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187147-d188757-Reviews-Louvre_Museum-Paris_Ile_de_France.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Notre-Dame Cathedral',
          rating: 4.3,
          review_count: 85000,
          category: 'Religious Site',
          address: '6 Parvis Notre-Dame, 4th arrondissement, Paris',
          description: 'Medieval Catholic cathedral, masterpiece of French Gothic architecture. Currently under restoration after the 2019 fire.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187147-d188757-Reviews-Notre_Dame_Cathedral-Paris_Ile_de_France.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    if (this.matchesDestination(dest, ['united kingdom', 'uk', 'london', 'manchester', 'edinburgh', 'glasgow', 'birmingham'])) {
      return [
        {
          id: '3436969',
          name: 'Big Ben',
          rating: 4.3,
          review_count: 65000,
          category: 'Monument',
          address: 'Westminster, London SW1A 0AA, UK',
          description: 'Iconic clock tower and symbol of London. Part of the Palace of Westminster, this Gothic Revival masterpiece is a UNESCO World Heritage Site.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g186338-d319504-Reviews-Big_Ben-London_England.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Tower of London',
          rating: 4.4,
          review_count: 72000,
          category: 'Historic Site',
          address: 'London EC3N 4AB, UK',
          description: 'Historic castle on the north bank of the River Thames. Home to the Crown Jewels and the famous Beefeaters.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g186338-d319505-Reviews-Tower_of_London-London_England.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'British Museum',
          rating: 4.5,
          review_count: 88000,
          category: 'Museum',
          address: 'Great Russell St, London WC1B 3DG, UK',
          description: 'World-famous museum housing over 8 million works, including the Rosetta Stone and Elgin Marbles.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g186338-d319506-Reviews-British_Museum-London_England.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    if (this.matchesDestination(dest, ['italy', 'rome', 'milan', 'florence', 'venice', 'naples', 'bologna'])) {
      return [
        {
          id: '3436969',
          name: 'Colosseum',
          rating: 4.6,
          review_count: 95000,
          category: 'Historic Site',
          address: 'Piazza del Colosseo, 1, 00184 Roma RM, Italy',
          description: 'Ancient amphitheater and symbol of Rome. One of the most recognizable landmarks in the world.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187791-d311544-Reviews-Colosseum-Rome_Lazio.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Leaning Tower of Pisa',
          rating: 4.2,
          review_count: 45000,
          category: 'Monument',
          address: 'Piazza del Duomo, 56126 Pisa PI, Italy',
          description: 'Famous freestanding bell tower known for its unintended tilt. Part of the Piazza del Duomo complex.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187899-d311545-Reviews-Leaning_Tower_of_Pisa-Pisa_Province_of_Pisa_Tuscany.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'St. Mark\'s Basilica',
          rating: 4.4,
          review_count: 38000,
          category: 'Religious Site',
          address: 'P.za San Marco, 328, 30100 Venezia VE, Italy',
          description: 'Cathedral church in Venice known for its Byzantine architecture and golden mosaics.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187870-d311546-Reviews-St_Mark_s_Basilica-Venice_Veneto.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // NORTH AMERICA
    if (this.matchesDestination(dest, ['united states', 'usa', 'america', 'new york', 'nyc', 'manhattan', 'los angeles', 'la', 'chicago', 'miami', 'las vegas', 'san francisco', 'boston', 'washington', 'seattle'])) {
      return [
        {
          id: '3436969',
          name: 'Statue of Liberty',
          rating: 4.3,
          review_count: 85000,
          category: 'Monument',
          address: 'Liberty Island, New York, NY',
          description: 'Iconic symbol of freedom and democracy, gifted by France to the United States. Take a ferry to visit this UNESCO World Heritage Site.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g60763-d319504-Reviews-Statue_of_Liberty-New_York_City_New_York.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Central Park',
          rating: 4.5,
          review_count: 95000,
          category: 'Park',
          address: 'New York, NY 10024',
          description: '843-acre urban park in Manhattan, featuring lakes, meadows, and walking paths. A green oasis in the heart of the city.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g60763-d319505-Reviews-Central_Park-New_York_City_New_York.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Golden Gate Bridge',
          rating: 4.4,
          review_count: 65000,
          category: 'Landmark',
          address: 'Golden Gate Bridge, San Francisco, CA',
          description: 'Iconic suspension bridge spanning the Golden Gate strait. One of the most photographed bridges in the world.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g60713-d311547-Reviews-Golden_Gate_Bridge-San_Francisco_California.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    if (this.matchesDestination(dest, ['canada', 'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa'])) {
      return [
        {
          id: '3436969',
          name: 'CN Tower',
          rating: 4.2,
          review_count: 35000,
          category: 'Observation Deck',
          address: '290 Bremner Blvd, Toronto, ON M5V 3L9, Canada',
          description: 'Iconic communications and observation tower in Toronto. One of the tallest free-standing structures in the world.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g155019-d311548-Reviews-CN_Tower-Toronto_Ontario.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Stanley Park',
          rating: 4.6,
          review_count: 28000,
          category: 'Park',
          address: 'Vancouver, BC V6G 1Z4, Canada',
          description: '1,000-acre public park in Vancouver with scenic seawall, beaches, and forest trails.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g154943-d311549-Reviews-Stanley_Park-Vancouver_British_Columbia.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Notre-Dame Basilica',
          rating: 4.3,
          review_count: 18000,
          category: 'Religious Site',
          address: '110 Notre-Dame St W, Montreal, QC H2Y 1T1, Canada',
          description: 'Historic Gothic Revival church in Old Montreal with stunning interior architecture.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g155032-d311550-Reviews-Notre_Dame_Basilica-Montreal_Quebec.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // OCEANIA
    if (this.matchesDestination(dest, ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'new zealand', 'auckland', 'wellington', 'queenstown'])) {
      return [
        {
          id: '3436969',
          name: 'Sydney Opera House',
          rating: 4.5,
          review_count: 75000,
          category: 'Landmark',
          address: 'Bennelong Point, Sydney NSW 2000, Australia',
          description: 'Iconic performing arts center with distinctive shell-like roof design. UNESCO World Heritage Site.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g255060-d311551-Reviews-Sydney_Opera_House-Sydney_New_South_Wales.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Harbour Bridge',
          rating: 4.3,
          review_count: 45000,
          category: 'Landmark',
          address: 'Sydney Harbour Bridge, Sydney NSW, Australia',
          description: 'Steel arch bridge across Sydney Harbour. Popular for bridge climbing and scenic walks.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g255060-d311552-Reviews-Harbour_Bridge-Sydney_New_South_Wales.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Sky Tower',
          rating: 4.2,
          review_count: 25000,
          category: 'Observation Deck',
          address: 'Victoria St W, Auckland 1010, New Zealand',
          description: 'Tallest freestanding structure in the Southern Hemisphere. Offers panoramic views of Auckland.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g255062-d311553-Reviews-Sky_Tower-Auckland_Central_North_Island.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // MIDDLE EAST & AFRICA
    if (this.matchesDestination(dest, ['uae', 'dubai', 'abu dhabi', 'qatar', 'doha', 'saudi arabia', 'riyadh', 'jeddah', 'egypt', 'cairo', 'south africa', 'cape town', 'johannesburg'])) {
      return [
        {
          id: '3436969',
          name: 'Burj Khalifa',
          rating: 4.4,
          review_count: 55000,
          category: 'Observation Deck',
          address: '1 Sheikh Mohammed bin Rashid Blvd, Dubai, UAE',
          description: 'Tallest building in the world at 828 meters. Offers stunning views from its observation decks.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g295424-d311554-Reviews-Burj_Khalifa-Dubai_Emirate_of_Dubai.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Pyramids of Giza',
          rating: 4.6,
          review_count: 85000,
          category: 'Historic Site',
          address: 'Giza, Egypt',
          description: 'Ancient pyramid complex including the Great Pyramid of Giza. One of the Seven Wonders of the Ancient World.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g294201-d311555-Reviews-Pyramids_of_Giza-Giza_Giza_Governorate.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Table Mountain',
          rating: 4.5,
          review_count: 42000,
          category: 'Natural Feature',
          address: 'Table Mountain National Park, Cape Town, South Africa',
          description: 'Flat-topped mountain overlooking Cape Town. Accessible by cable car or hiking trails.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g312659-d311556-Reviews-Table_Mountain-Cape_Town_Central_Western_Cape.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    return null; // No specific data found
  }

  /**
   * Generate contextual attractions for unknown destinations
   */
  generateContextualAttractions(destination) {
    const dest = destination.toLowerCase();
    
    // Determine destination type and generate appropriate attractions
    let attractionType = 'city';
    let categories = ['Landmark', 'Museum', 'Historic Site'];
    
    if (dest.includes('beach') || dest.includes('coast') || dest.includes('island')) {
      attractionType = 'beach';
      categories = ['Beach', 'Marine Park', 'Lighthouse'];
    } else if (dest.includes('mountain') || dest.includes('alpine') || dest.includes('ski')) {
      attractionType = 'mountain';
      categories = ['Mountain', 'National Park', 'Ski Resort'];
    } else if (dest.includes('desert') || dest.includes('oasis')) {
      attractionType = 'desert';
      categories = ['Desert', 'Oasis', 'Canyon'];
    } else if (dest.includes('historic') || dest.includes('ancient') || dest.includes('old')) {
      attractionType = 'historic';
      categories = ['Historic Site', 'Archaeological Site', 'Museum'];
    }
    
    return [
      {
        id: '3436969',
        name: `${this.capitalizeFirst(destination)} City Center`,
        rating: 4.2 + Math.random() * 0.6,
        review_count: Math.floor(Math.random() * 5000) + 1000,
        category: categories[0],
        address: `City Center, ${destination}`,
        description: `Main ${attractionType} attraction in ${destination} with cultural significance and local charm.`,
        web_url: 'https://www.tripadvisor.com/',
        photo_url: null
      },
      {
        id: '3436970',
        name: `${this.capitalizeFirst(destination)} Museum`,
        rating: 4.1 + Math.random() * 0.5,
        review_count: Math.floor(Math.random() * 3000) + 500,
        category: categories[1],
        address: `Museum District, ${destination}`,
        description: `Local museum showcasing the history and culture of ${destination} and its surrounding region.`,
        web_url: 'https://www.tripadvisor.com/',
        photo_url: null
      },
      {
        id: '3436971',
        name: `${this.capitalizeFirst(destination)} Historic District`,
        rating: 4.0 + Math.random() * 0.6,
        review_count: Math.floor(Math.random() * 2500) + 300,
        category: categories[2],
        address: `Historic District, ${destination}`,
        description: `Historic area with traditional architecture and cultural significance in ${destination}.`,
        web_url: 'https://www.tripadvisor.com/',
        photo_url: null
      }
    ];
  }

  /**
   * Get mock attractions for a destination (legacy method for backward compatibility)
   */
  getMockAttractionsForDestinationLegacy(destination) {
    // Mumbai/Bombay specific attractions
    if (destination.toLowerCase().includes('mumbai') || destination.toLowerCase().includes('bombay') || destination.toLowerCase().includes('bom')) {
      return [
        {
          id: '3436969',
          name: 'Gateway of India',
          rating: 4.1,
          review_count: 55000,
          category: 'Monument',
          address: 'Apollo Bunder, Colaba, Mumbai',
          description: 'Historic arch monument overlooking the Arabian Sea, built to commemorate the visit of King George V and Queen Mary. This iconic landmark is Mumbai\'s most famous tourist attraction and a symbol of the city.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319507-Reviews-Gateway_of_India-Mumbai_Maharashtra.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Elephanta Caves',
          rating: 4.2,
          review_count: 32000,
          category: 'UNESCO World Heritage Site',
          address: 'Elephanta Island, Mumbai',
          description: 'Ancient rock-cut cave temples dedicated to Lord Shiva, accessible by ferry from Gateway of India. These 6th-century caves feature intricate sculptures and are a UNESCO World Heritage Site.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319508-Reviews-Elephanta_Caves-Mumbai_Maharashtra.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya',
          rating: 4.3,
          review_count: 28000,
          category: 'Museum',
          address: '159-161, Mahatma Gandhi Road, Fort, Mumbai',
          description: 'Formerly Prince of Wales Museum, houses extensive collection of Indian art and artifacts. This beautiful Indo-Saracenic building showcases over 50,000 artifacts spanning 5,000 years of Indian history.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304554-d319509-Reviews-Chhatrapati_Shivaji_Maharaj_Vastu_Sangrahalaya-Mumbai_Maharashtra.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // Delhi-specific attractions
    if (destination.toLowerCase().includes('delhi')) {
      return [
        {
          id: '3436969',
          name: 'Red Fort',
          rating: 4.3,
          review_count: 45000,
          category: 'Historic Site',
          address: 'Old Delhi, Delhi, India',
          description: 'Historic fort complex, UNESCO World Heritage Site. Built by Mughal emperor Shah Jahan, this massive red sandstone fort is a symbol of Delhi.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304551-d319505-Reviews-Red_Fort-Delhi.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Qutub Minar',
          rating: 4.2,
          review_count: 38000,
          category: 'Monument',
          address: 'Mehrauli, Delhi, India',
          description: 'Tallest brick minaret in the world, UNESCO World Heritage Site. This 73-meter tall tower is a masterpiece of Indo-Islamic architecture.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304551-d319506-Reviews-Qutub_Minar-Delhi.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'India Gate',
          rating: 4.1,
          review_count: 42000,
          category: 'Monument',
          address: 'Rajpath, New Delhi, India',
          description: 'War memorial arch dedicated to Indian soldiers who died in World War I. A popular gathering spot and symbol of national pride.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g304551-d319507-Reviews-India_Gate-Delhi.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // Agra-specific attractions
    if (destination.toLowerCase().includes('agra')) {
      return [
        {
          id: '3436969',
          name: 'Taj Mahal',
          rating: 4.7,
          review_count: 125000,
          category: 'Monument',
          address: 'Agra, Uttar Pradesh, India',
          description: 'Iconic white marble mausoleum, one of the Seven Wonders of the World. Built by Mughal emperor Shah Jahan in memory of his wife Mumtaz Mahal.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g297683-d319504-Reviews-Taj_Mahal-Agra_Uttar_Pradesh.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Agra Fort',
          rating: 4.4,
          review_count: 35000,
          category: 'Historic Site',
          address: 'Agra, Uttar Pradesh, India',
          description: 'UNESCO World Heritage Site, this massive red sandstone fort was the main residence of Mughal emperors until 1638.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g297683-d319505-Reviews-Agra_Fort-Agra_Uttar_Pradesh.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Fatehpur Sikri',
          rating: 4.2,
          review_count: 28000,
          category: 'Historic Site',
          address: 'Fatehpur Sikri, Uttar Pradesh, India',
          description: 'UNESCO World Heritage Site, this abandoned Mughal city showcases the architectural genius of Emperor Akbar.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g297683-d319506-Reviews-Fatehpur_Sikri-Agra_Uttar_Pradesh.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // New York attractions
    if (destination.toLowerCase().includes('new york') || destination.toLowerCase().includes('nyc')) {
      return [
        {
          id: '3436969',
          name: 'Statue of Liberty',
          rating: 4.3,
          review_count: 85000,
          category: 'Monument',
          address: 'Liberty Island, New York, NY',
          description: 'Iconic symbol of freedom and democracy, gifted by France to the United States. Take a ferry to visit this UNESCO World Heritage Site.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g60763-d319504-Reviews-Statue_of_Liberty-New_York_City_New_York.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Central Park',
          rating: 4.5,
          review_count: 95000,
          category: 'Park',
          address: 'New York, NY 10024',
          description: '843-acre urban park in Manhattan, featuring lakes, meadows, and walking paths. A green oasis in the heart of the city.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g60763-d319505-Reviews-Central_Park-New_York_City_New_York.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Empire State Building',
          rating: 4.2,
          review_count: 78000,
          category: 'Observation Deck',
          address: '350 5th Ave, New York, NY',
          description: 'Art Deco skyscraper with observation decks offering panoramic views of Manhattan. An iconic symbol of New York City.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g60763-d319506-Reviews-Empire_State_Building-New_York_City_New_York.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // London attractions
    if (destination.toLowerCase().includes('london')) {
      return [
        {
          id: '3436969',
          name: 'Big Ben',
          rating: 4.3,
          review_count: 65000,
          category: 'Monument',
          address: 'Westminster, London SW1A 0AA, UK',
          description: 'Iconic clock tower and symbol of London. Part of the Palace of Westminster, this Gothic Revival masterpiece is a UNESCO World Heritage Site.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g186338-d319504-Reviews-Big_Ben-London_England.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Tower of London',
          rating: 4.4,
          review_count: 72000,
          category: 'Historic Site',
          address: 'London EC3N 4AB, UK',
          description: 'Historic castle on the north bank of the River Thames. Home to the Crown Jewels and the famous Beefeaters.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g186338-d319505-Reviews-Tower_of_London-London_England.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'British Museum',
          rating: 4.5,
          review_count: 88000,
          category: 'Museum',
          address: 'Great Russell St, London WC1B 3DG, UK',
          description: 'World-famous museum housing over 8 million works, including the Rosetta Stone and Elgin Marbles.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g186338-d319506-Reviews-British_Museum-London_England.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // Paris attractions
    if (destination.toLowerCase().includes('paris')) {
      return [
        {
          id: '3436969',
          name: 'Eiffel Tower',
          rating: 4.5,
          review_count: 125000,
          category: 'Landmark',
          address: 'Champ de Mars, 7th arrondissement, Paris',
          description: 'Iconic iron lattice tower and symbol of Paris. Built for the 1889 World\'s Fair, it offers stunning views from its observation decks.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187147-d187147-Reviews-Eiffel_Tower-Paris_Ile_de_France.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Louvre Museum',
          rating: 4.4,
          review_count: 95000,
          category: 'Museum',
          address: 'Rue de Rivoli, 1st arrondissement, Paris',
          description: 'World\'s largest art museum and historic monument. Home to the Mona Lisa and thousands of other masterpieces.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187147-d188757-Reviews-Louvre_Museum-Paris_Ile_de_France.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Notre-Dame Cathedral',
          rating: 4.3,
          review_count: 85000,
          category: 'Religious Site',
          address: '6 Parvis Notre-Dame, 4th arrondissement, Paris',
          description: 'Medieval Catholic cathedral, masterpiece of French Gothic architecture. Currently under restoration after the 2019 fire.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g187147-d188757-Reviews-Notre_Dame_Cathedral-Paris_Ile_de_France.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
    // Tokyo attractions
    if (destination.toLowerCase().includes('tokyo')) {
      return [
        {
          id: '3436969',
          name: 'Senso-ji Temple',
          rating: 4.3,
          review_count: 45000,
          category: 'Religious Site',
          address: '2-3-1 Asakusa, Taito City, Tokyo',
          description: 'Tokyo\'s oldest temple, founded in 628 AD. A vibrant Buddhist temple complex in the historic Asakusa district.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319504-Reviews-Senso_ji_Temple-Tokyo_Tokyo_Prefecture.html',
          photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436970',
          name: 'Tokyo Skytree',
          rating: 4.2,
          review_count: 38000,
          category: 'Observation Deck',
          address: '1-1-2 Oshiage, Sumida City, Tokyo',
          description: '634-meter tall broadcasting tower and observation deck. Offers panoramic views of Tokyo and Mount Fuji on clear days.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319505-Reviews-Tokyo_Skytree-Tokyo_Tokyo_Prefecture.html',
          photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: '3436971',
          name: 'Meiji Shrine',
          rating: 4.4,
          review_count: 42000,
          category: 'Religious Site',
          address: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo',
          description: 'Shinto shrine dedicated to Emperor Meiji and Empress Shoken. Surrounded by a peaceful forest in the heart of Tokyo.',
          web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319506-Reviews-Meiji_Shrine-Tokyo_Tokyo_Prefecture.html',
          photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
        }
      ];
    }
    
         // Japan-specific attractions
         if (destination.toLowerCase().includes('japan') || destination.toLowerCase().includes('tokyo')) {
           return [
             {
               id: '3436969',
               name: 'Tokyo Skytree',
               rating: 4.2,
               review_count: 38000,
               category: 'Observation Deck',
               address: '1-1-2 Oshiage, Sumida City, Tokyo',
               description: '634-meter tall broadcasting tower and observation deck. Offers panoramic views of Tokyo and Mount Fuji on clear days.',
               web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319505-Reviews-Tokyo_Skytree-Tokyo_Tokyo_Prefecture.html',
               photo_url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop&crop=center'
             },
             {
               id: '3436970',
               name: 'Senso-ji Temple',
               rating: 4.3,
               review_count: 45000,
               category: 'Religious Site',
               address: '2-3-1 Asakusa, Taito City, Tokyo',
               description: 'Tokyo\'s oldest temple, founded in 628 AD. A vibrant Buddhist temple complex in the historic Asakusa district.',
               web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319504-Reviews-Senso_ji_Temple-Tokyo_Tokyo_Prefecture.html',
               photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
             },
             {
               id: '3436971',
               name: 'Meiji Shrine',
               rating: 4.4,
               review_count: 42000,
               category: 'Religious Site',
               address: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo',
               description: 'Shinto shrine dedicated to Emperor Meiji and Empress Shoken. Surrounded by a peaceful forest in the heart of Tokyo.',
               web_url: 'https://www.tripadvisor.com/Attraction_Review-g298184-d319506-Reviews-Meiji_Shrine-Tokyo_Tokyo_Prefecture.html',
               photo_url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop&crop=center'
             }
           ];
         }
         
         // Default attractions (generic)
         return [
           {
             id: '3436969',
             name: 'City Center',
             rating: 4.2,
             review_count: 5000,
             category: 'Landmark',
             address: 'City Center, ' + destination,
             description: 'Main city center with shops, restaurants, and cultural attractions.',
             web_url: 'https://www.tripadvisor.com/',
             photo_url: null
           },
           {
             id: '3436970',
             name: 'Local Museum',
             rating: 4.1,
             review_count: 3000,
             category: 'Museum',
             address: 'Museum District, ' + destination,
             description: 'Local museum showcasing the history and culture of the region.',
             web_url: 'https://www.tripadvisor.com/',
             photo_url: null
           },
           {
             id: '3436971',
             name: 'Historic District',
             rating: 4.0,
             review_count: 2500,
             category: 'Historic Site',
             address: 'Historic District, ' + destination,
             description: 'Historic area with traditional architecture and cultural significance.',
             web_url: 'https://www.tripadvisor.com/',
             photo_url: null
           }
         ];
  }

  /**
   * Generate 3 separate messages for trip planning
   */
  async generateMultiMessageResponse(bedrockResponse, realData, tripAdvisorData, queryIntent, userPreferences, sessionId, userId) {
    const messages = [];
    
    // Message 1: Detailed Itinerary
    const itineraryMessage = {
      id: `msg_${Date.now()}_itinerary`,
      role: 'assistant',
      content: bedrockResponse,
      timestamp: Date.now(),
      type: 'text'
    };
    messages.push(itineraryMessage);
    
    // Message 2: Flight Recommendations with individual Google Flights buttons
    console.log('🔍 DEBUG: Checking flight message condition...');
    console.log('🔍 DEBUG: realData exists:', !!realData);
    console.log('🔍 DEBUG: realData.type:', realData?.type);
    console.log('🔍 DEBUG: realData.results exists:', !!realData?.results);
    console.log('🔍 DEBUG: realData.results length:', realData?.results?.length);
    
    // Check for flight data in different possible structures
    let flightResults = null;
    if (realData && realData.type === 'flight' && realData.results) {
      flightResults = realData.results;
    } else if (realData && realData.type === 'combined' && realData.flights && realData.flights.results) {
      flightResults = realData.flights.results;
    }
    
    if (flightResults && flightResults.length > 0) {
      console.log('🔍 DEBUG: Using real flight data');
      const topFlights = flightResults.slice(0, 3); // Top 3 flights
      const origin = queryIntent.extractedInfo?.origin || '';
      const destination = queryIntent.extractedInfo?.destination || '';
      const depDate = queryIntent.extractedInfo?.departureDate || '';
      const retDate = queryIntent.extractedInfo?.returnDate || '';
      
      let flightContent = `## ✈️ Flight Recommendations\n\nBased on your preferences, here are the best flight options:\n\n`;
      
      topFlights.forEach((flight, index) => {
        flightContent += `**${index + 1}. ${flight.airline} (${flight.flightNumber})**\n`;
        flightContent += `- **Price:** $${flight.price}\n`;
        flightContent += `- **Route:** ${flight.origin} → ${flight.destination}\n`;
        flightContent += `- **Departure:** ${flight.departureTime}\n`;
        flightContent += `- **Arrival:** ${flight.arrivalTime}\n`;
        flightContent += `- **Duration:** ${flight.duration}\n`;
        flightContent += `- **Stops:** ${flight.stops}\n\n`;
      });
      
      // Add individual Google Flights buttons for each flight
      topFlights.forEach((flight, index) => {
        let individualUrl = 'https://www.google.com/travel/flights';
        if (retDate) {
          individualUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}%20returning%20${retDate}`;
        } else if (depDate) {
          individualUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}`;
        } else {
          individualUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}`;
        }
        
        flightContent += `[✈️ Book ${flight.airline} ${flight.flightNumber}](${individualUrl})\n\n`;
      });
      
      // Add general Google Flights search button
      let googleFlightsUrl = 'https://www.google.com/travel/flights';
      if (retDate) {
        googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}%20returning%20${retDate}`;
      } else if (depDate) {
        googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}`;
      } else {
        googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}`;
      }
      
      flightContent += `[🔍 Explore More Options](${googleFlightsUrl})\n\n`;
      flightContent += `*Click any button above to search and book flights directly on Google Flights.*`;
      
      const flightMessage = {
        id: `msg_${Date.now()}_flights`,
        role: 'assistant',
        content: flightContent,
        timestamp: Date.now(),
        type: 'flight_recommendations',
        data: {
          flights: topFlights,
          googleFlightsUrl: googleFlightsUrl,
          origin: origin,
          destination: destination,
          depDate: depDate,
          retDate: retDate
        }
      };
      messages.push(flightMessage);
    } else {
      console.log('🔍 DEBUG: No flight results found, creating fallback message');
      // Fallback: Create flight message with Google Flights link when no results
      const origin = queryIntent.extractedInfo?.origin || '';
      const destination = queryIntent.extractedInfo?.destination || '';
      const depDate = queryIntent.extractedInfo?.departureDate || '';
      const retDate = queryIntent.extractedInfo?.returnDate || '';
      
      let flightContent = `## ✈️ Flight Recommendations\n\nNo flights found in our database for this route. You can search for flights directly on Google Flights:\n\n`;
      
      // Add Google Flights search button
      let googleFlightsUrl = 'https://www.google.com/travel/flights';
      if (retDate) {
        googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}%20returning%20${retDate}`;
      } else if (depDate) {
        googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}`;
      } else {
        googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}`;
      }
      
      flightContent += `[🔍 Search Flights on Google Flights](${googleFlightsUrl})\n\n`;
      flightContent += `*Click the link above to search and book flights directly on Google Flights.*`;
      
      const flightMessage = {
        id: `msg_${Date.now()}_flights`,
        role: 'assistant',
        content: flightContent,
        timestamp: Date.now(),
        type: 'flight_recommendations',
        data: {
          flights: [],
          googleFlightsUrl: googleFlightsUrl,
          origin: origin,
          destination: destination,
          depDate: depDate,
          retDate: retDate
        }
      };
      messages.push(flightMessage);
    }
    
    // Message 3: Hotel Recommendations as cards
    console.log('🔍 DEBUG: Checking hotel message condition...');
    console.log('🔍 DEBUG: realData exists:', !!realData);
    console.log('🔍 DEBUG: realData.type:', realData?.type);
    console.log('🔍 DEBUG: realData.results exists:', !!realData?.results);
    console.log('🔍 DEBUG: realData.results length:', realData?.results?.length);
    console.log('🔍 DEBUG: realData structure:', JSON.stringify(realData, null, 2));
    
    // Check for hotel data in different possible structures
    let hotelResults = null;
    if (realData && realData.type === 'hotel' && realData.results) {
      hotelResults = realData.results;
    } else if (realData && realData.type === 'combined' && realData.hotels && realData.hotels.results) {
      hotelResults = realData.hotels.results;
    }
    
    console.log('🔍 DEBUG: hotelResults:', hotelResults);
    console.log('🔍 DEBUG: hotelResults length:', hotelResults?.length);
    
    if (hotelResults && hotelResults.length > 0) {
      console.log('🔍 DEBUG: Using real hotel data');
      const topHotels = hotelResults.slice(0, 3); // Top 3 hotels
      const destination = queryIntent.extractedInfo?.destination || '';
      const checkIn = queryIntent.extractedInfo?.checkIn || '';
      const checkOut = queryIntent.extractedInfo?.checkOut || '';
      const guests = queryIntent.extractedInfo?.guests || 2;
      
      let hotelContent = `## 🏨 Hotel Recommendations\n\nHere are the best hotels in ${destination} that fit your budget:\n\n`;
      
      // Add Booking.com search button
      let bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
      if (checkIn) bookingUrl += `&checkin=${checkIn}`;
      if (checkOut) bookingUrl += `&checkout=${checkOut}`;
      if (guests) bookingUrl += `&group_adults=${guests}`;
      
      hotelContent += `[🏨 Search More Hotels on Booking.com](${bookingUrl})\n\n`;
      hotelContent += `*Click the link above to search for more hotel options and book directly on Booking.com.*`;
      
      const hotelMessage = {
        id: `msg_${Date.now()}_hotels`,
        role: 'assistant',
        content: hotelContent,
        timestamp: Date.now(),
        type: 'hotel_cards',
        data: {
          hotels: topHotels,
          bookingUrl: bookingUrl
        }
      };
      messages.push(hotelMessage);
         } else {
           console.log('🔍 DEBUG: Using mock hotel data');
           // Fallback: Create hotel message with mock data when no hotel data is available
           const destination = queryIntent.extractedInfo?.destination || 'your destination';
           const checkIn = queryIntent.extractedInfo?.checkIn || '';
           const checkOut = queryIntent.extractedInfo?.checkOut || '';
           const guests = queryIntent.extractedInfo?.guests || 2;
           
           // Create destination-specific mock hotel data
           const mockHotels = this.getMockHotelsForDestination(destination);
      
      let hotelContent = `## 🏨 Hotel Recommendations\n\nHere are some recommended hotels in ${destination}:\n\n`;
      
      // Add Booking.com search button
      let bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
      if (checkIn) bookingUrl += `&checkin=${checkIn}`;
      if (checkOut) bookingUrl += `&checkout=${checkOut}`;
      if (guests) bookingUrl += `&group_adults=${guests}`;
      
      hotelContent += `[🏨 Search More Hotels on Booking.com](${bookingUrl})\n\n`;
      hotelContent += `*Click the link above to search for more hotel options and book directly on Booking.com.*`;
      
      const hotelMessage = {
        id: `msg_${Date.now()}_hotels`,
        role: 'assistant',
        content: hotelContent,
        timestamp: Date.now(),
        type: 'hotel_cards',
        data: {
          hotels: mockHotels,
          bookingUrl: bookingUrl
        }
      };
      messages.push(hotelMessage);
    }
    
    // Message 4: Nearby Attractions using TripAdvisor API
    console.log('🔍 DEBUG: Checking attractions message condition...');
    const destination = queryIntent.extractedInfo?.destination || '';
    
    if (destination) {
      console.log('🔍 DEBUG: Fetching attractions for destination:', destination);
      try {
        // Get attractions using TripAdvisor API
        const attractionsData = await this.getNearbyAttractions(destination);
        
        if (attractionsData && attractionsData.length > 0) {
          // Check if we got good quality attractions (not random ones)
          const hasGoodAttractions = attractionsData.some(attr => 
            attr.rating && attr.rating > 0 && 
            attr.review_count && attr.review_count > 10 &&
            attr.address && attr.address !== 'Address not specified'
          );
          
          if (hasGoodAttractions) {
            console.log('🔍 DEBUG: Using real attractions data');
            const topAttractions = attractionsData.slice(0, 3); // Top 3 attractions
            
            let attractionsContent = `## 🏛️ Nearby Attractions\n\nDiscover the best attractions in ${destination}:\n\n`;
            
            // Add TripAdvisor search button
            const tripAdvisorUrl = `https://www.tripadvisor.com/Attractions-g${this.getTripAdvisorGeoId(destination)}-${destination.replace(/\s+/g, '_')}.html`;
            attractionsContent += `[🔍 Explore More on TripAdvisor](${tripAdvisorUrl})\n\n`;
            attractionsContent += `*Click the link above to discover more attractions and activities on TripAdvisor.*`;
            
            const attractionsMessage = {
              id: `msg_${Date.now()}_attractions`,
              role: 'assistant',
              content: attractionsContent,
              timestamp: Date.now(),
              type: 'attractions_recommendations',
              data: {
                attractions: topAttractions,
                tripAdvisorUrl: tripAdvisorUrl,
                destination: destination
              }
            };
            messages.push(attractionsMessage);
          } else {
            console.log('🔍 DEBUG: Real data quality poor, using mock data');
            // Fallback to mock data
            const mockAttractions = this.getMockAttractionsForDestination(destination);
            
            let attractionsContent = `## 🏛️ Nearby Attractions\n\nDiscover the best attractions in ${destination}:\n\n`;
            
            // Add TripAdvisor search button
            const tripAdvisorUrl = `https://www.tripadvisor.com/Attractions-g${this.getTripAdvisorGeoId(destination)}-${destination.replace(/\s+/g, '_')}.html`;
            attractionsContent += `[🔍 Explore More on TripAdvisor](${tripAdvisorUrl})\n\n`;
            attractionsContent += `*Click the link above to discover more attractions and activities on TripAdvisor.*`;
            
            const attractionsMessage = {
              id: `msg_${Date.now()}_attractions`,
              role: 'assistant',
              content: attractionsContent,
              timestamp: Date.now(),
              type: 'attractions_recommendations',
              data: {
                attractions: mockAttractions,
                tripAdvisorUrl: tripAdvisorUrl,
                destination: destination
              }
            };
            messages.push(attractionsMessage);
          }
        } else {
          console.log('🔍 DEBUG: Using mock attractions data');
          // Fallback: Create attractions message with mock data
          const mockAttractions = this.getMockAttractionsForDestination(destination);
          
          let attractionsContent = `## 🏛️ Nearby Attractions\n\nDiscover the best attractions in ${destination}:\n\n`;
          
          // Add TripAdvisor search button
          const tripAdvisorUrl = `https://www.tripadvisor.com/Attractions-g${this.getTripAdvisorGeoId(destination)}-${destination.replace(/\s+/g, '_')}.html`;
          attractionsContent += `[🔍 Explore More on TripAdvisor](${tripAdvisorUrl})\n\n`;
          attractionsContent += `*Click the link above to discover more attractions and activities on TripAdvisor.*`;
          
          const attractionsMessage = {
            id: `msg_${Date.now()}_attractions`,
            role: 'assistant',
            content: attractionsContent,
            timestamp: Date.now(),
            type: 'attractions_recommendations',
            data: {
              attractions: mockAttractions,
              tripAdvisorUrl: tripAdvisorUrl,
              destination: destination
            }
          };
          messages.push(attractionsMessage);
        }
      } catch (error) {
        console.error('🔍 DEBUG: Error fetching attractions:', error);
        // Fallback: Create attractions message with mock data
        const mockAttractions = this.getMockAttractionsForDestination(destination);
        
        let attractionsContent = `## 🏛️ Nearby Attractions\n\nDiscover the best attractions in ${destination}:\n\n`;
        
        // Add TripAdvisor search button
        const tripAdvisorUrl = `https://www.tripadvisor.com/Attractions-g${this.getTripAdvisorGeoId(destination)}-${destination.replace(/\s+/g, '_')}.html`;
        attractionsContent += `[🔍 Explore More on TripAdvisor](${tripAdvisorUrl})\n\n`;
        attractionsContent += `*Click the link above to discover more attractions and activities on TripAdvisor.*`;
        
        const attractionsMessage = {
          id: `msg_${Date.now()}_attractions`,
          role: 'assistant',
          content: attractionsContent,
          timestamp: Date.now(),
          type: 'attractions_recommendations',
          data: {
            attractions: mockAttractions,
            tripAdvisorUrl: tripAdvisorUrl,
            destination: destination
          }
        };
        messages.push(attractionsMessage);
      }
    }
    
    return messages;
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
      const queryIntent = await this.analyzeQueryIntent(userQuery, userContext, conversationHistory, effectiveSessionId);

      console.log(`   Intent detected: ${queryIntent.type}`);
      console.log(`   Needs flight data: ${queryIntent.needsFlightData}`);
      console.log(`   Needs hotel data: ${queryIntent.needsHotelData}`);

      // 4. Fetch real data if needed (flights/hotels)
      let realData = null;
      let tripAdvisorData = null; // enrichment data for attractions/restaurants
      
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
            passengers: {
              adults: queryIntent.extractedInfo.passengers || 1,
              children: 0,
              infants: 0
            }
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
          // Get currency from first destination's flight data
          const currency = multiFlightData[0]?.flightData?.currency || 'USD';
          console.log(`   💰 DEBUG: First flight data currency: ${multiFlightData[0]?.flightData?.currency}`);
          console.log(`   💰 DEBUG: Using currency: ${currency}`);
          
          realData = {
            type: 'multi_destination_comparison',
            destinations: multiFlightData,
            totalDestinations: multiFlightData.length,
            currency: currency  // Add currency to top level
          };
          console.log(`   ✅ Multi-destination data fetched (${currency}):`, multiFlightData.map(d => `${d.destination}: ${d.cheapestPrice}`).join(', '));
        }
      }
      // For trip planning, fetch both flights and hotels
      else if (queryIntent.needsFlightData && queryIntent.needsHotelData) {
        console.log('   📞 Fetching both flight and hotel data from APIs...');
        const flightData = await this.fetchFlightData(queryIntent.extractedInfo, userPreferences);
        
        // Calculate hotel check-in/check-out dates from trip duration
        const hotelInfo = { ...queryIntent.extractedInfo };
        if (hotelInfo.departureDate && !hotelInfo.checkIn) {
          // Check-in is the day after arrival (assuming 1 day travel time)
          const arrivalDate = new Date(hotelInfo.departureDate);
          arrivalDate.setDate(arrivalDate.getDate() + 1);
          hotelInfo.checkIn = arrivalDate.toISOString().split('T')[0];
          
          // Check-out is based on trip duration
          const tripDuration = userPreferences?.currentTripDuration || 5; // Default 5 days
          const checkoutDate = new Date(arrivalDate);
          checkoutDate.setDate(checkoutDate.getDate() + tripDuration);
          hotelInfo.checkOut = checkoutDate.toISOString().split('T')[0];
          
          console.log(`   🏨 Calculated hotel dates: Check-in ${hotelInfo.checkIn}, Check-out ${hotelInfo.checkOut}`);
        }
        
        const hotelData = await this.fetchHotelData(hotelInfo, userPreferences);
        
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
        // Check if user searched for a country instead of a city for flights
        const countriesRequiringSpecificCity = [
          'japan', 'china', 'india', 'thailand', 'malaysia', 'indonesia', 'philippines',
          'vietnam', 'south korea', 'korea', 'australia', 'united states', 'usa', 'america',
          'canada', 'brazil', 'mexico', 'uk', 'united kingdom', 'france', 'germany', 'italy',
          'spain', 'russia', 'saudi arabia', 'uae', 'egypt', 'south africa'
        ];
        
        const destination = queryIntent.extractedInfo?.destination?.toLowerCase() || '';
        const destinations = queryIntent.extractedInfo?.destinations?.map(d => d.toLowerCase()) || [];
        const allDestinations = destination ? [destination, ...destinations] : destinations;
        
        // Check if any destination is a country that needs clarification
        const countryDestinations = allDestinations.filter(dest => 
          countriesRequiringSpecificCity.includes(dest)
        );
        
        if (countryDestinations.length > 0) {
          console.log(`   ⚠️ Country destination detected: ${countryDestinations.join(', ')} - asking for specific city`);
          
          // Build suggestion list based on country
          const citySuggestions = {
            'japan': ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya', 'Sapporo', 'Fukuoka'],
            'china': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hong Kong'],
            'india': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'],
            'thailand': ['Bangkok', 'Phuket', 'Chiang Mai', 'Krabi', 'Pattaya'],
            'malaysia': ['Kuala Lumpur', 'Penang', 'Langkawi', 'Johor Bahru'],
            'indonesia': ['Jakarta', 'Bali', 'Yogyakarta', 'Surabaya'],
            'philippines': ['Manila', 'Cebu', 'Boracay', 'Palawan'],
            'vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Nha Trang'],
            'south korea': ['Seoul', 'Busan', 'Incheon', 'Jeju'],
            'korea': ['Seoul', 'Busan', 'Incheon', 'Jeju'],
            'australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
            'united states': ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Las Vegas'],
            'usa': ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Las Vegas'],
            'america': ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Las Vegas'],
            'canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
            'uk': ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Glasgow'],
            'united kingdom': ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Glasgow'],
            'france': ['Paris', 'Nice', 'Lyon', 'Marseille', 'Toulouse'],
            'germany': ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne'],
            'italy': ['Rome', 'Milan', 'Venice', 'Florence', 'Naples'],
            'spain': ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Málaga']
          };
          
          // Don't call API - instead set realData to null and add special guidance
          realData = {
            type: 'country_clarification_needed',
            country: countryDestinations[0],
            suggestions: citySuggestions[countryDestinations[0]] || []
          };
          
          console.log(`   💡 Will ask user to specify city in ${countryDestinations[0]}`);
        } else {
          console.log('   📞 Fetching flight data from API...');
          realData = await this.fetchFlightData(queryIntent.extractedInfo, userPreferences);
        }
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
          
          // Calculate hotel check-in/check-out dates from trip duration
          const hotelInfo = { ...queryIntent.extractedInfo };
          if (hotelInfo.departureDate && !hotelInfo.checkIn) {
            // Check-in is the day after arrival (assuming 1 day travel time)
            const arrivalDate = new Date(hotelInfo.departureDate);
            arrivalDate.setDate(arrivalDate.getDate() + 1);
            hotelInfo.checkIn = arrivalDate.toISOString().split('T')[0];
            
            // Check-out is based on trip duration
            const tripDuration = userPreferences?.currentTripDuration || 5; // Default 5 days
            const checkoutDate = new Date(arrivalDate);
            checkoutDate.setDate(checkoutDate.getDate() + tripDuration);
            hotelInfo.checkOut = checkoutDate.toISOString().split('T')[0];
            
            console.log(`   🏨 Calculated hotel dates: Check-in ${hotelInfo.checkIn}, Check-out ${hotelInfo.checkOut}`);
          }
          
          realData = await this.fetchHotelData(hotelInfo, userPreferences);
        }
      }

      // TripAdvisor enrichment: if we have a destination from intent or preferences
      const destinationForPOI = queryIntent.extractedInfo?.destination ||
        userPreferences?.currentTripDestination ||
        (Array.isArray(userPreferences?.preferredDestinations) && userPreferences.preferredDestinations[0]);
      if (destinationForPOI) {
        try {
          tripAdvisorData = await this.tripAdvisorService.getTravelDataForAI(destinationForPOI, {
            interests: userPreferences?.interests,
            cuisine: userPreferences?.hotelPreferences?.preferredAmenities?.includes('restaurant') ? 'local' : null,
            amenities: userPreferences?.hotelPreferences?.preferredAmenities,
            budget: userPreferences?.budget
          });
        } catch (e) {
          console.warn('⚠️ TripAdvisor enrichment failed:', e?.message);
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

      // 7. Build comprehensive context for Bedrock with user profile and conversation summary
      const userProfileSummary = this.getUserProfileSummary(userContextData);
      
      // Get conversation summary from queryIntent analysis (already created in analyzeQueryIntent)
      let conversationSummary = null;
      if (conversationHistory && conversationHistory.length > 0) {
        conversationSummary = await this.summarizeConversation(conversationHistory, userQuery);
      }
      
      const contextPrompt = this.buildContextPrompt(
        userQuery,
        conversationHistory,
        userPreferences,
        realData,
        queryIntent,
        userProfileSummary,
        conversationSummary,  // Pass summary to context prompt
        tripAdvisorData       // New enrichment block
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

      // 11. Prepare Google Flights button if no results found
      let googleFlightsButton = null;
      if (queryIntent.type === 'flight_search' && realData) {
        // Check if we have no flight results but have search parameters
        if ((realData.type === 'flight' && realData.totalResults === 0) || 
            (realData.type === 'country_clarification_needed')) {
          const origin = queryIntent.extractedInfo?.origin || '';
          const destination = queryIntent.extractedInfo?.destination || '';
          const depDate = queryIntent.extractedInfo?.departureDate || '';
          const retDate = queryIntent.extractedInfo?.returnDate || '';
          
          if (origin && destination && realData.type !== 'country_clarification_needed') {
            let googleFlightsUrl = 'https://www.google.com/travel/flights';
            if (retDate) {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}%20returning%20${retDate}`;
            } else if (depDate) {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}`;
            } else {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}`;
            }
            
            googleFlightsButton = {
              text: '🔍 Search on Google Flights',
              url: googleFlightsUrl,
              type: 'primary',
              searchParams: {
                origin,
                destination,
                departureDate: depDate,
                returnDate: retDate
              }
            };
            
            console.log('   🔘 Added Google Flights button:', googleFlightsUrl);
          }
        }
      }
      
      // 12. Generate 3 separate messages for trip planning
      if (queryIntent.type === 'trip_planning' && realData) {
        const multiMessages = await this.generateMultiMessageResponse(
          bedrockResponse,
          realData,
          tripAdvisorData,
          queryIntent,
          userPreferences,
          effectiveSessionId,
          effectiveUserId
        );
        
        return {
          role: 'ai',
          content: multiMessages,
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
            timestamp: new Date().toISOString(),
            multiMessage: true
          },
          realData,
          userPreferences,
          googleFlightsButton,
          learnedContext: this.getContextSummary(effectiveSessionId),
          conversationHistory: conversationHistory.slice(-5)
        };
      }

      // 12. Return comprehensive response with learned context (for non-trip planning)
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
        googleFlightsButton,  // Add button data here
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
  /**
   * Summarize conversation history using Nova Lite for better context awareness
   */
  async summarizeConversation(conversationHistory, currentQuery) {
    try {
      console.log('   📝 Creating conversation summary with Nova Lite...');
      
      // Format conversation history for Nova Lite
      const conversationText = conversationHistory.map((turn, i) => {
        return `Turn ${i + 1}:\nUser: ${turn.user}\nAssistant: ${turn.assistant?.slice(0, 300) || 'No response'}`;
      }).join('\n\n');
      
      const summaryPrompt = `Summarize this travel conversation in 2-3 sentences. Focus on:
1. What destination(s) the user is interested in
2. What dates/duration they mentioned
3. What they're looking for (flights, hotels, itinerary, etc.)
4. Any preferences (budget, interests, origin city)

Be concise and factual. Include specific details like city names and dates.

Conversation:
${conversationText}

Current query: "${currentQuery}"

Summary (2-3 sentences):`;

      const params = {
        modelId: 'us.amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [{ role: 'user', content: [{ text: summaryPrompt }] }],
          inferenceConfig: {
            maxTokens: 150,
            temperature: 0.3,
            topP: 0.9
          }
        })
      };

      const command = new InvokeModelCommand(params);
      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const summary = responseBody.output?.message?.content?.[0]?.text?.trim() || 'No previous context';
      
      console.log('   ✅ Summary created:', summary);
      return summary;
    } catch (error) {
      console.error('   ⚠️ Error creating conversation summary:', error.message);
      return null;
    }
  }

  async analyzeQueryWithNovaLite(query, conversationContext = null) {
    try {
      const analysisPrompt = `You are a smart travel query analyzer. Analyze this query and return ONLY valid JSON.

Analyze:
1. What is the user REALLY asking for?
2. Do we need to call flight/hotel APIs, or can we just answer conversationally?
3. Extract ANY AND ALL destinations, dates, preferences, origin cities mentioned FROM BOTH CURRENT QUERY AND CONVERSATION SUMMARY
4. Consider conversation context - is this a follow-up answer to a previous question?
5. USE THE CONVERSATION SUMMARY to understand what the user is planning

CRITICAL DESTINATION EXTRACTION RULES:
- Extract ALL city/destination names mentioned, not just the first one
- "barcelona, madrid, athens" = extractedDestinations: ["Barcelona", "Madrid", "Athens"]
- "flights to paris, london, and rome" = extractedDestinations: ["Paris", "London", "Rome"]
- "compare bali goa cebu" = extractedDestinations: ["Bali", "Goa", "Cebu"]
- If CONVERSATION SUMMARY mentions destinations (e.g., "user asked about Barcelona, Madrid, Athens"), extract those too
- List format like "barcelona,madrid,athens" or "barcelona, madrid, athens" = multiple destinations
- ALWAYS return an ARRAY in extractedDestinations, even if only one destination

CRITICAL INTENT RULES:
- "What can I carry on flights?" = general question (NO API needed)
- "Find flights to Paris" = flight_search (API needed)
- "Tell me about Bali" = destination_info (NO API needed)
- "Cheap hotels in Tokyo" = hotel_search (API needed)
- "What's the best time to visit Europe?" = general (NO API needed)
- "Compare flights to Bali, Goa, Cebu" = flight_search with multiple destinations (API needed)
- If previous message asked "Where are you flying from?" and user replies "Mumbai", that's the ORIGIN city (extractOrigin: "Mumbai")
- If user says "search flights from X to Y" with dates, extract EVERYTHING and set needsFlightAPI: true (DO NOT ask for confirmation)
- If query contains "from [city] to [city]" with dates like "dec 13 to dec 21", extract origin, destination, and dates - ready to search (needsFlightAPI: true)

CONVERSATION CONTEXT RULES:
- If assistant previously asked "Which city would you like me to check flight prices for?" and user lists cities = flight_search (API needed)
- If assistant previously asked "Where would you like to stay?" and user lists cities = hotel_search (API needed)
- If conversation is about FLIGHTS (user said "find flights", "cheap flights", "search for flights") and user lists cities = flight_search (API needed), NOT hotel_search
- If conversation is about HOTELS (user said "find hotels", "book hotel", "where to stay") and user lists cities = hotel_search (API needed)
- A simple list of city names in FLIGHT context = user wants to search flight prices for those destinations
- If user mentions "flights" or "fly" anywhere in conversation, listing cities = flight_search
- If user asks for "more options" or "show more flights" or "other airlines" for a destination = flight_search (API needed, extract destination from query)
- If assistant asked "Should I search from your home city" and user replies "yes" or "home city" or "sure" = user confirming to use home city (extractOrigin from previous context)
- If assistant asked for travel dates and user provides dates = extract those dates even if not in ISO format
- If conversation summary mentions dates (e.g., "December 24-31", "dec 24 to dec 31"), extract them as departureDate and returnDate
- **CRITICAL**: If user just says "yes" or "yeah" or "sure" after being asked confirmation questions about flight search, AND conversation summary shows they already provided origin, destination, and dates, then set needsFlightAPI: true and extract all info from conversation summary (DO NOT ask more questions!)

DATE EXTRACTION RULES:
- "dec 24 to dec 31" → departureDate: "2025-12-24", returnDate: "2025-12-31"
- "December 18 to 23" → departureDate: "2025-12-18", returnDate: "2025-12-23"
- "october 20" → departureDate: "2025-10-20"
- If only month/day provided, assume current year or next occurrence
- Always convert to ISO format (YYYY-MM-DD)
- Check BOTH current query AND conversation summary for date mentions

Return JSON format:
{
  "intent": "flight_search|hotel_search|trip_planning|destination_recommendation|budget_inquiry|public_transport|general_question|destination_info|travel_advice|origin_provided",
  "needsFlightAPI": true/false,
  "needsHotelAPI": true/false,
  "extractedDestinations": ["Paris", "London", "Rome"] (ALWAYS an array with ALL destinations found),
  "extractedOrigin": "Mumbai" (string, if user is providing origin city),
  "extractedDepartureDate": "2025-12-24" (ISO format, from current query OR conversation summary),
  "extractedReturnDate": "2025-12-31" (ISO format, if mentioned),
  "isComparison": true/false (true if multiple destinations for price comparison),
  "isFollowUpAnswer": true/false (if answering a question from previous turn),
  "queryType": "price_search|general_info|rules|recommendations|booking_help|providing_info",
  "reasoning": "brief explanation including HOW MANY destinations found"
}

===== CONVERSATION SUMMARY =====
${conversationContext?.conversationSummary || 'No previous conversation'}

===== RECENT MESSAGES =====
${conversationContext?.recentMessages?.map((msg, i) => `Turn ${i + 1}:\nUser: ${msg.user}\nAssistant: ${msg.assistant}`).join('\n\n') || 'None'}

===== CURRENT QUERY =====
"${query}"

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
        console.log('   🧠 Nova Lite Analysis:', {
          intent: analysis.intent,
          needsAPIs: { flight: analysis.needsFlightAPI, hotel: analysis.needsHotelAPI },
          destinations: analysis.extractedDestinations,
          origin: analysis.extractedOrigin,
          departureDate: analysis.extractedDepartureDate,
          returnDate: analysis.extractedReturnDate,
          destinationCount: analysis.extractedDestinations?.length || 0,
          isComparison: analysis.isComparison,
          isFollowUp: analysis.isFollowUpAnswer,
          reasoning: analysis.reasoning
        });
        
        // Log warning if destinations found but count seems wrong
        if (analysis.extractedDestinations && analysis.extractedDestinations.length === 1 && 
            (analysis.reasoning?.includes('multiple') || analysis.reasoning?.includes('three') || analysis.reasoning?.includes('comparison'))) {
          console.log('   ⚠️ WARNING: Nova Lite reasoning mentions multiple destinations but only extracted 1!');
        }
        
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
  async analyzeQueryIntent(query, userContext = null, conversationHistory = [], sessionId = null) {
    const lowerQuery = query.toLowerCase();

    const intent = {
      type: 'general',
      needsFlightData: false,
      needsHotelData: false,
      extractedInfo: {},
      multiDestination: false
    };
    
    // Step 1: Create conversation summary using Nova Lite for better context
    let conversationSummary = null;
    if (conversationHistory && conversationHistory.length > 0) {
      conversationSummary = await this.summarizeConversation(conversationHistory, query);
      console.log('   📝 Conversation Summary:', conversationSummary);
    }
    
    // Step 2: Use Nova Lite for intelligent analysis with full conversation context
    const contextForAnalysis = {
      userContext,
      conversationSummary,  // Include the summary
      recentMessages: conversationHistory.slice(-3).map(msg => ({
        user: msg.user,
        assistant: msg.assistant?.slice(0, 200) // Show more context
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
        
        // Save origin as homeCity for future searches
        const context = this.getUserContext(sessionId);
        if (!context.preferences.homeCity) {
          context.preferences.homeCity = novaAnalysis.extractedOrigin;
          console.log(`   🏠 Saved ${novaAnalysis.extractedOrigin} as home city for future searches`);
        }
        
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
      
      // Case 2: User confirming to use home city
      else if ((query.toLowerCase().includes('yes') || 
                query.toLowerCase().includes('home city') || 
                query.toLowerCase().includes('sure')) &&
               lastAssistant.includes('Should I search from your home city')) {
        const context = this.getUserContext(sessionId);
        if (context.preferences.homeCity) {
          console.log(`   🏠 User confirmed using home city: ${context.preferences.homeCity}`);
          intent.extractedInfo.origin = context.preferences.homeCity;
          intent.needsFlightData = true;
          intent.type = 'flight_search';
          
          // Look back for destination from previous query
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const turn = conversationHistory[i];
            if (turn && turn.user) {
              const prevDestinations = await this.extractDestinationsWithBedrock(turn.user);
              if (prevDestinations && prevDestinations.length > 0) {
                extractedDestinations = prevDestinations;
                console.log('   ✅ Recovered destination from previous query:', extractedDestinations);
                break;
              }
            }
          }
        }
      }
      
      // Case 3: User providing destination after being asked to specify city (e.g., "Tokyo" after "Japan" clarification)
      else if (extractedDestinations.length > 0 && 
               (lastAssistant.includes('could you specify which city') || 
                lastAssistant.includes('which city in') ||
                lastAssistant.includes('popular destinations in'))) {
        console.log('   ✈️ User provided specific city after country clarification:', extractedDestinations[0]);
        intent.extractedInfo.destination = extractedDestinations[0];
        intent.needsFlightData = true;
        intent.type = 'flight_search';
        console.log('   ✈️ Detected follow-up: city specified for flight search');
        
        // CRITICAL: Check if we have origin - if not, we need to ask for it
        // Look back through conversation for origin
        let foundOrigin = false;
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          const turn = conversationHistory[i];
          if (turn && turn.user) {
            // Check if this turn mentioned origin (contains "from")
            if (turn.user.toLowerCase().includes(' from ')) {
              const fromMatch = turn.user.match(/from\s+([a-z\s]+?)(?:\s+to|\s+for|$)/i);
              if (fromMatch) {
                const possibleOrigin = fromMatch[1].trim();
                // Verify it's not a date or number
                if (!/\d/.test(possibleOrigin) && possibleOrigin.length > 2) {
                  intent.extractedInfo.origin = possibleOrigin;
                  foundOrigin = true;
                  console.log(`   📍 Recovered origin from conversation: ${possibleOrigin}`);
                  break;
                }
              }
            }
          }
        }
        
        // If no origin found, check user context for home city
        if (!foundOrigin) {
          const context = this.getUserContext(sessionId);
          if (context.preferences.homeCity) {
            // Don't auto-use home city - ask user first
            console.log(`   🏠 Home city available (${context.preferences.homeCity}) but not auto-using - will ask user`);
          } else {
            console.log('   ⚠️ No origin found - will need to ask user');
          }
        }
      }
      
      // Case 4: User providing destination for hotel search
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
      
      // Case 5: User providing origin when asked "where are you flying from"
      else if (novaAnalysis.extractedOrigin && 
               (lastAssistant.includes('where are you flying from') || 
                lastAssistant.includes('where you are flying from') ||
                lastAssistant.includes('where are you traveling from'))) {
        console.log('   📍 User provided origin in response to question:', novaAnalysis.extractedOrigin);
        intent.extractedInfo.origin = novaAnalysis.extractedOrigin;
        intent.needsFlightData = true;
        intent.type = 'flight_search';
        
        // Try to recover destinations from previous query
        console.log('   🔍 Looking for destinations in previous conversation...');
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          const turn = conversationHistory[i];
          if (turn && turn.user && i < conversationHistory.length - 1) { // Don't check current query
            const prevDestinations = await this.extractDestinationsWithBedrock(turn.user);
            if (prevDestinations && prevDestinations.length > 0) {
              extractedDestinations = prevDestinations;
              console.log('   ✅ Recovered destinations from previous query:', extractedDestinations);
              break;
            }
          }
        }
      }
      
      // Case 6: User providing any other follow-up info
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
    
    // Extract dates AND origin from Nova Lite analysis if available
    const infoFromNova = {};
    if (novaAnalysis.extractedDepartureDate) {
      infoFromNova.departureDate = novaAnalysis.extractedDepartureDate;
      console.log('   📅 Nova Lite extracted departure date:', infoFromNova.departureDate);
    }
    if (novaAnalysis.extractedReturnDate) {
      infoFromNova.returnDate = novaAnalysis.extractedReturnDate;
      console.log('   📅 Nova Lite extracted return date:', infoFromNova.returnDate);
    }
    if (novaAnalysis.extractedOrigin) {
      infoFromNova.origin = novaAnalysis.extractedOrigin;
      console.log('   🏙️ Nova Lite extracted origin:', infoFromNova.origin);
    }
    
    // Helper function to merge objects, only overwriting with non-null/non-undefined values
    const smartMerge = (...objects) => {
      const result = {};
      for (const obj of objects) {
        for (const [key, value] of Object.entries(obj || {})) {
          if (value !== null && value !== undefined) {
            result[key] = value;
          } else if (!(key in result)) {
            // Keep null/undefined if no previous value exists
            result[key] = value;
          }
        }
      }
      return result;
    };
    
    // Extract detailed info based on intent
    // Note: When intent is preserved from follow-up, we should still extract info even if Nova says needsFlightAPI is false
    if (intent.type === 'flight_search' && (novaAnalysis.needsFlightAPI || intent.needsFlightData)) {
      // Extract flight info but preserve any info already set (like origin from follow-up)
      const extractedFlightInfo = this.extractFlightInfo(query, userContext, extractedDestinations);
      // Smart merge: Nova data + pattern-based + already set info (non-null values take priority)
      intent.extractedInfo = smartMerge(infoFromNova, extractedFlightInfo, intent.extractedInfo);
      console.log('   ✈️ Flight search with API call, extracted info:', intent.extractedInfo);
    } else if (intent.type === 'hotel_search' && (novaAnalysis.needsHotelAPI || intent.needsHotelData)) {
      const hotelInfo = await this.extractHotelInfo(query, extractedDestinations);
      // Smart merge: Nova data + hotel info + already set info (non-null values take priority)
      intent.extractedInfo = smartMerge(infoFromNova, hotelInfo, intent.extractedInfo);
      console.log('   🏨 Hotel search with API call, extracted info:', intent.extractedInfo);
    } else if (intent.type === 'trip_planning') {
      const flightInfo = this.extractFlightInfo(query, userContext, extractedDestinations);
      const hotelInfo = await this.extractHotelInfo(query, extractedDestinations);
      // Smart merge: Nova data + extracted info + already set info (non-null values take priority)
      intent.extractedInfo = smartMerge(infoFromNova, flightInfo, hotelInfo, intent.extractedInfo);
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
    
    // Extract date ranges like "dec 13 to dec 21" or "december 13 to 21"
    const dateRangeMatch = query.match(/(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:\s+to\s+|\s*-\s*)(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)?\s*(\d{1,2})/i);
    
    if (dateRangeMatch) {
      const startMonth = dateRangeMatch[1].toLowerCase();
      const startDay = parseInt(dateRangeMatch[2]);
      const endMonth = dateRangeMatch[3] ? dateRangeMatch[3].toLowerCase() : startMonth; // Same month if not specified
      const endDay = parseInt(dateRangeMatch[4]);
      
      const year = new Date().getFullYear();
      const startMonthNum = monthMap[startMonth];
      const endMonthNum = monthMap[endMonth];
      
      if (startMonthNum && endMonthNum) {
        info.departureDate = `${year}-${startMonthNum}-${String(startDay).padStart(2, '0')}`;
        info.returnDate = `${year}-${endMonthNum}-${String(endDay).padStart(2, '0')}`;
        console.log(`   📅 Extracted date range: ${info.departureDate} to ${info.returnDate}`);
      }
    }
    // If no date range found, look for single month mentions
    else {
      for (const [monthName, monthNum] of Object.entries(monthMap)) {
        if (lowerQuery.includes(monthName)) {
          const year = new Date().getFullYear();
          info.departureDate = `${year}-${monthNum}-01`;
          info.returnDate = `${year}-${monthNum}-07`; // 7-day default
          console.log(`   📅 Detected ${monthName} timeframe:`, info.departureDate);
          break;
        }
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
    
    // Also check user context for travelers (from trip planning form)
    if (userContext?.preferences?.travelers && !passengerMatch) {
      info.passengers = userContext.preferences.travelers;
      console.log('   👥 Using travelers from user context:', info.passengers);
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
        homeCity: userPreferences.homeCity,
        lastOrigin: userPreferences.lastOrigin,
        preferredCabinClass: userPreferences.preferredCabinClass,
        currency: userPreferences.currency 
      }, null, 2));
      
      // Check if we have both origin and destination - if not, don't search
      // Try homeCity first, then lastOrigin as fallback
      const origin = extractedInfo.origin || userPreferences.homeCity || userPreferences.lastOrigin;
      
      if (!origin) {
        console.log('   ⚠️ SKIPPING: No origin found in query, homeCity, or lastOrigin');
        console.log('🛫 ===== FLIGHT API FETCH END (NO ORIGIN) =====\n');
        return null;
      }
      
      if (!extractedInfo.destination) {
        console.log('   ⚠️ SKIPPING: No destination found in query');
        console.log('🛫 ===== FLIGHT API FETCH END (NO DESTINATION) =====\n');
        return null;
      }
      
      // Check if dates are missing - don't use defaults, ask user instead
      if (!extractedInfo.departureDate) {
        console.log('   ⚠️ SKIPPING: No departure date found in query');
        console.log('🛫 ===== FLIGHT API FETCH END (NO DATES) =====\n');
        return null;
      }
      
      // Use extracted info with homeCity as fallback
      const searchRequest = {
        origin: origin, // Already computed above
        destination: extractedInfo.destination,
        departureDate: extractedInfo.departureDate,
        returnDate: extractedInfo.returnDate, // Optional for one-way flights
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
        searchTime: results.searchTime,
        currency: results.currency || searchRequest.currency || 'USD', // Add currency field
        googleFlightsFallback: results.googleFlightsFallback // Pass through the fallback info
      };
      
      console.log('   ✅ Returning real flight data:', JSON.stringify({
        type: returnData.type,
        totalResults: returnData.totalResults,
        provider: returnData.provider,
        currency: returnData.currency,
        hasGoogleFallback: !!returnData.googleFlightsFallback
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
      
      // Check if dates are missing - don't use defaults, ask user instead
      if (!extractedInfo.checkIn || !extractedInfo.checkOut) {
        console.log('   ⚠️ SKIPPING: No check-in/check-out dates found in query');
        console.log('🏨 ===== HOTEL API FETCH END (NO DATES) =====\n');
        return null;
      }
      
      const searchRequest = {
        destination: extractedInfo.destination,
        checkIn: extractedInfo.checkIn,
        checkOut: extractedInfo.checkOut,
        adults: extractedInfo.guests || 1, // Default to 1 is reasonable for solo traveler
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
  buildContextPrompt(userQuery, conversationHistory, userPreferences, realData, queryIntent, userProfileSummary = '', conversationSummary = null, tripAdvisorData = null) {
    const lowerQuery = userQuery.toLowerCase(); // Define lowerQuery for use throughout method
    
    let contextPrompt = `You are an expert AI travel assistant helping users plan their perfect trips.

=== USER CONTEXT ===
`;

    // Add conversation summary FIRST (highest priority for context awareness)
    if (conversationSummary) {
      contextPrompt += `\n🗣️ CONVERSATION CONTEXT:\n${conversationSummary}\n\n`;
      contextPrompt += `IMPORTANT: Use this conversation context to understand what the user is planning. If they ask for "flights" and the context shows they're planning a trip to Japan, search for flights to Japan.\n\n`;
    }

    // Add learned user profile summary
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

    // Add conversation history with full context
    if (conversationHistory.length > 0) {
      contextPrompt += `\n=== RECENT CONVERSATION ===\n`;
      conversationHistory.slice(-5).forEach(turn => {
        contextPrompt += `User: ${turn.user}\n`;
        contextPrompt += `Assistant: ${turn.assistant.substring(0, 200)}${turn.assistant.length > 200 ? '...' : ''}\n\n`;
      });
      
      // Emphasize multi-destination context if detected
      if (queryIntent.multiDestination && queryIntent.extractedInfo.destinations) {
        contextPrompt += `\n🔍 CRITICAL CONTEXT: User asked about ${queryIntent.extractedInfo.destinations.length} destinations: ${queryIntent.extractedInfo.destinations.join(', ')}\n`;
        contextPrompt += `You MUST provide information about ALL ${queryIntent.extractedInfo.destinations.length} destinations mentioned, not just the first one!\n\n`;
      }
    }

    // Add real data if fetched
    if (realData && !realData.error) {
      contextPrompt += `\n=== REAL-TIME DATA ===\n`;
      
      // Handle combined flight + hotel data
      if (realData.type === 'combined') {
        // Add flight data
        if (realData.flights && realData.flights.results && realData.flights.results.length > 0) {
          contextPrompt += `\nFLIGHT OPTIONS (${realData.flights.totalResults} found):\n`;
          // Show all flights so AI can present complete options
          realData.flights.results.forEach((flight, idx) => {
            contextPrompt += `\nFlight Option ${idx + 1}:\n`;
            contextPrompt += `- Airline: ${flight.airline || 'N/A'} (${flight.flightNumber || 'N/A'})\n`;
            contextPrompt += `- Price: ${flight.price || 'N/A'} ${flight.currency || 'USD'}\n`;
            contextPrompt += `- Route: ${flight.origin || realData.flights.request.origin} → ${flight.destination || realData.flights.request.destination}\n`;
            contextPrompt += `- Departure: ${flight.departureDate || 'N/A'} at ${flight.departureTime || 'N/A'}\n`;
            contextPrompt += `- Arrival: ${flight.arrivalTime || 'N/A'}\n`;
            contextPrompt += `- Duration: ${flight.duration || 'N/A'}\n`;
            contextPrompt += `- Stops: ${flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}\n`;
            if (flight.stopDetails && flight.stopDetails.length > 0) {
              contextPrompt += `- Layovers: ${flight.stopDetails.map(s => `${s.airport || s.city} (${s.duration})`).join(', ')}\n`;
            }
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
        contextPrompt += `\n🚨 CRITICAL PRICE INSTRUCTION: All prices below are ALREADY in ${realData.currency || 'the correct currency'}. Display them EXACTLY as shown. DO NOT convert, multiply, or change the numbers in any way! If you see "45564 INR", display it as "45564 INR" or "₹45,564" - nothing else!\n\n`;
        if (realData.results.length > 0) {
          // Show all flights (not just 5) so AI can present them all
          realData.results.forEach((flight, idx) => {
            // Round price to integer
            const roundedPrice = Math.round(parseFloat(flight.price) || 0);
            // Format departure time (extract time from ISO string if needed)
            const departureTime = flight.departureTime ? 
              (flight.departureTime.includes('T') ? flight.departureTime.split('T')[1].substring(0, 5) : flight.departureTime) : 'N/A';
            const arrivalTime = flight.arrivalTime ? 
              (flight.arrivalTime.includes('T') ? flight.arrivalTime.split('T')[1].substring(0, 5) : flight.arrivalTime) : 'N/A';
            
            contextPrompt += `\nOption ${idx + 1}:\n`;
            contextPrompt += `- Airline: ${flight.airline || 'N/A'} (${flight.flightNumber || 'N/A'})\n`;
            contextPrompt += `- Price: ${roundedPrice} ${flight.currency || realData.currency || 'USD'} (IMPORTANT: Use this EXACT number - do NOT convert or multiply!)\n`;
            contextPrompt += `- Route: ${flight.origin || 'N/A'} → ${flight.destination || 'N/A'}\n`;
            contextPrompt += `- Departure: ${flight.departureDate || 'N/A'} at ${departureTime}\n`;
            contextPrompt += `- Arrival: ${arrivalTime}\n`;
            contextPrompt += `- Duration: ${flight.duration || 'N/A'}\n`;
            contextPrompt += `- Stops: ${flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}\n`;
            if (flight.stopDetails && flight.stopDetails.length > 0) {
              contextPrompt += `- Layovers: ${flight.stopDetails.map(s => `${s.airport || s.city} (${s.duration})`).join(', ')}\n`;
            }
          });
        } else if (realData.googleFlightsFallback) {
          // No results but Google Flights fallback available
          contextPrompt += `No flights found in our database.\n`;
          contextPrompt += `IMPORTANT: Tell the user you can help them search on Google Flights instead.\n`;
          contextPrompt += `Google Flights URL: ${realData.googleFlightsFallback.url}\n`;
          contextPrompt += `YOU MUST include this clickable link in your response so users can continue their search.\n`;
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
        // Get currency from top level (preferred) or first destination
        const currency = realData.currency || realData.destinations[0]?.flightData?.currency || 'USD';
        const currencySymbol = this.getCurrencySymbol(currency);
        
        console.log(`💰 Context building - Using currency: ${currency} → ${currencySymbol}`);
        
        contextPrompt += `\n=== REAL-TIME MULTI-DESTINATION FLIGHT COMPARISON ===\n`;
        contextPrompt += `Flight prices from ${realData.destinations[0]?.flightData?.request?.origin || 'origin'}:\n\n`;
        
        realData.destinations.forEach((dest, idx) => {
          const roundedPrice = Math.round(parseFloat(dest.cheapestPrice) || 0);
          contextPrompt += `${idx + 1}. ${dest.destination}: ${currencySymbol}${roundedPrice} (cheapest option)\n`;
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

    // Add TripAdvisor enrichment if available
    if (tripAdvisorData) {
      contextPrompt += `\n=== POINTS OF INTEREST (TripAdvisor) ===\n`;
      if (tripAdvisorData.location) {
        contextPrompt += `\nLocation: ${tripAdvisorData.location.name} (geoId: ${tripAdvisorData.location.geoId || tripAdvisorData.location.location_id || 'N/A'})\n`;
      }
      if (Array.isArray(tripAdvisorData.attractions) && tripAdvisorData.attractions.length > 0) {
        contextPrompt += `\nTop Attractions:\n`;
        tripAdvisorData.attractions.slice(0, 5).forEach((a, i) => {
          contextPrompt += `- ${a.name || 'Attraction'} | Rating: ${a.rating || 'N/A'} | Reviews: ${a.review_count || a.reviewCount || 0}${a.price_level ? ` | Price: ${a.price_level}` : ''}${a.category ? ` | Category: ${a.category}` : ''}\n`;
        });
      }
      if (Array.isArray(tripAdvisorData.restaurants) && tripAdvisorData.restaurants.length > 0) {
        contextPrompt += `\nPopular Restaurants:\n`;
        tripAdvisorData.restaurants.slice(0, 5).forEach((r, i) => {
          const cuisine = Array.isArray(r.cuisine) ? r.cuisine.join(', ') : (r.cuisine || '');
          contextPrompt += `- ${r.name || 'Restaurant'} | Rating: ${r.rating || 'N/A'} | Reviews: ${r.review_count || r.reviewCount || 0}${cuisine ? ` | Cuisine: ${cuisine}` : ''}${r.price_level ? ` | Price: ${r.price_level}` : ''}\n`;
        });
      }
      contextPrompt += `\nUse these attractions and restaurants to personalize the itinerary and recommendations.\n`;
    }

    contextPrompt += `\n=== CURRENT QUERY ===\n`;
    contextPrompt += `Query Type: ${queryIntent.type}\n`;
    contextPrompt += `User Question: ${userQuery}\n\n`;

    contextPrompt += `=== YOUR TASK ===\n`;
    
    // Category-specific instructions
    if (realData && realData.type === 'multi_destination_comparison') {
      // Get currency from top level (preferred) or first destination
      const comparisonCurrency = realData.currency || realData.destinations[0]?.flightData?.currency || 'USD';
      const comparisonSymbol = this.getCurrencySymbol(comparisonCurrency);
      
      console.log(`💰 Multi-destination comparison currency: ${comparisonCurrency} → Symbol: ${comparisonSymbol}`);
      
      contextPrompt += `MULTI-DESTINATION FLIGHT COMPARISON MODE - Real price data available!\n\n`;
      contextPrompt += `🚨 CRITICAL RULES - NO EXCEPTIONS:\n`;
      contextPrompt += `1. User asked about ${realData.destinations.length} destinations: ${realData.destinations.map(d => d.destination).join(', ')}\n`;
      contextPrompt += `2. You MUST show price comparison for ALL ${realData.destinations.length} destinations, not just the first one!\n`;
      contextPrompt += `3. All prices MUST use ${comparisonSymbol} symbol, NOT $ or any other symbol!\n`;
      contextPrompt += `4. Round ALL prices to integers (no decimals)\n`;
      contextPrompt += `5. The user wants to COMPARE prices side-by-side, not see detailed flight lists!\n\n`;
      contextPrompt += `Your ONLY job is to:\n`;
      contextPrompt += `1. START with a quick comparison summary showing ALL ${realData.destinations.length} destination prices side-by-side\n`;
      contextPrompt += `2. Rank ALL ${realData.destinations.length} destinations from CHEAPEST to most expensive\n`;
      contextPrompt += `3. Use ONLY the real prices from the data above with currency symbol: ${comparisonSymbol} (NOT $)\n`;
      contextPrompt += `4. After the comparison, briefly mention 1-2 best flights for the cheapest option\n`;
      contextPrompt += `5. Keep it SUPER concise - comparison should be ${realData.destinations.length} lines showing each destination\n`;
      contextPrompt += `6. DO NOT list all flights for all destinations - that's too much!\n`;
      contextPrompt += `7. NO EMOJIS - use plain text formatting only\n\n`;
      contextPrompt += `REQUIRED FORMAT (notice the ${comparisonSymbol} symbol, NOT $):\n\n`;
      contextPrompt += `"Real-time flight price comparison from [origin]:\n\n`;
      
      // Generate numbered list based on actual number of destinations
      const sortedDests = [...realData.destinations].sort((a, b) => a.cheapestPrice - b.cheapestPrice);
      sortedDests.forEach((dest, idx) => {
        const label = idx === 0 ? 'CHEAPEST: ' : (idx === sortedDests.length - 1 ? 'MOST EXPENSIVE: ' : '');
        const roundedPrice = Math.round(parseFloat(dest.cheapestPrice) || 0);
        contextPrompt += `${idx + 1}. ${label}${dest.destination} - ${comparisonSymbol}${roundedPrice}\n`;
      });
      
      contextPrompt += `\nBest Deal: ${sortedDests[0].destination} is the cheapest at ${comparisonSymbol}${Math.round(sortedDests[0].cheapestPrice)}. Here are the best options:\n`;
      if (sortedDests[0].flightData.results.length > 0) {
        const topFlight = sortedDests[0].flightData.results[0];
        contextPrompt += `- ${topFlight.airline || 'N/A'}, ${topFlight.stops === 0 ? 'Direct' : topFlight.stops + ' stop'}, ${topFlight.duration || 'N/A'}, Departs ${topFlight.departureTime || 'TBD'}\n`;
      }
      
      contextPrompt += `\nAll prices shown are for the best available flight options. Need more details about a specific destination? Just ask!"\n\n`;
      contextPrompt += `IMPORTANT: After your response, you MUST add Google Flights button markers using this EXACT FORMAT:\n\n`;
      contextPrompt += `Search more options:\n`;
      
      // Add Google Flights button markers for each destination
      if (realData.destinations && realData.destinations.length > 0) {
        realData.destinations.forEach(dest => {
          if (dest.flightData?.request) {
            const googleUrl = this.buildGoogleFlightsUrlSync(dest.flightData.request);
            contextPrompt += `- ${dest.destination}: [GOOGLE_FLIGHTS_BUTTON]${googleUrl}[/GOOGLE_FLIGHTS_BUTTON]\n`;
          }
        });
      }
      
      contextPrompt += `\n🚫 CRITICAL: Your response MUST END with the button markers - DO NOT add standalone numbers after them!\n`;
      contextPrompt += `REMEMBER: Use ${comparisonSymbol} for ALL prices, not $!\n`;
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
        
        // Add preference-aware intro message
        const prefs = userPreferences || {};
        let prefMessage = '';
        
        if (prefs.flightPreferences) {
          const fp = prefs.flightPreferences;
          const prefParts = [];
          
          if (fp.preferredCabinClass && fp.preferredCabinClass !== 'economy') {
            prefParts.push(`${fp.preferredCabinClass} class`);
          }
          if (fp.maxStops === 0) {
            prefParts.push('direct flights only');
          } else if (fp.maxStops === 1) {
            prefParts.push('max 1 stop');
          }
          if (fp.preferredAirlines && fp.preferredAirlines.length > 0) {
            prefParts.push(`preferred airlines: ${fp.preferredAirlines.slice(0, 2).join(', ')}`);
          }
          if (fp.preferredDepartureTime) {
            prefParts.push(`${fp.preferredDepartureTime} departures`);
          }
          
          if (prefParts.length > 0) {
            prefMessage = `Based on your profile preferences (${prefParts.join(', ')}), here are the best matching flight options`;
          }
        }
        
        if (!prefMessage) {
          prefMessage = 'Here are the top flight options';
        }
        
        contextPrompt += `CRITICAL FORMATTING RULES:\n`;
        contextPrompt += `1. Start with this intro: "${prefMessage} from [origin] to [destination] for [dates]:"\n`;
        contextPrompt += `2. Present each flight in this EXACT format:\n\n`;
        contextPrompt += `   Option X:\n`;
        contextPrompt += `   - Airline: [Name] (Flight [Number])\n`;
        contextPrompt += `   - Price: [ROUNDED_PRICE] ${realData.currency || 'USD'}\n`;
        contextPrompt += `   - Departure: [YYYY-MM-DD] at [HH:MM]\n`;
        contextPrompt += `   - Arrival: [HH:MM]\n`;
        contextPrompt += `   - Duration: [Hours]h [Minutes]m\n`;
        contextPrompt += `   - Stops: [Direct/1 stop/X stops] [If stops, show: "via [City]"]\n`;
        contextPrompt += `   - Why Choose: [Brief reason like "Cheapest option", "Fastest direct flight", "Most convenient timing"]\n\n`;
        contextPrompt += `3. CRITICAL: Round ALL prices to nearest integer (no decimals like 48362.981262)\n`;
        contextPrompt += `4. CRITICAL: Format dates as YYYY-MM-DD, times as HH:MM (not ISO timestamps like 2025-10-27T11:05:00)\n`;
        contextPrompt += `5. CRITICAL: Use currency ${realData.currency || 'USD'}, NOT USD\n`;
        contextPrompt += `6. Present ALL available flights from the data (typically 3-5+ options)\n`;
        contextPrompt += `7. After ALL flights, add this EXACT TEXT on a NEW LINE:\n\n`;
        contextPrompt += `   [GOOGLE_FLIGHTS_BUTTON]${this.buildGoogleFlightsUrlSync(realData.request)}[/GOOGLE_FLIGHTS_BUTTON]\n\n`;
        contextPrompt += `8. 🚫 CRITICAL: DO NOT add a list of standalone numbers after the button marker\n`;
        contextPrompt += `9. 🚫 CRITICAL: Your response MUST END with the button marker - nothing after it!\n`;
        contextPrompt += `10. DO NOT repeat prices in a list after the flights\n`;
        contextPrompt += `11. DO NOT create itineraries, mention hotels, or add day-by-day plans\n`;
        contextPrompt += `12. Use the EXACT flight data provided above - don't make up details\n`;
        contextPrompt += `13. The [GOOGLE_FLIGHTS_BUTTON] marker will be converted to a beautiful button by the frontend\n\n`;
        contextPrompt += `WRONG RESPONSE EXAMPLE (DO NOT DO THIS):\n`;
        contextPrompt += `Option 1: ... Price: 62491 USD\n`;
        contextPrompt += `[GOOGLE_FLIGHTS_BUTTON]...[/GOOGLE_FLIGHTS_BUTTON]\n`;
        contextPrompt += `62491\n`;  // ← 🚫 DO NOT ADD THESE NUMBERS!
        contextPrompt += `63203\n`;
        contextPrompt += `64106\n\n`;
        contextPrompt += `CORRECT RESPONSE EXAMPLE:\n`;
        contextPrompt += `Option 1: ... Price: 62491 USD\n`;
        contextPrompt += `[GOOGLE_FLIGHTS_BUTTON]...[/GOOGLE_FLIGHTS_BUTTON]\n`;  // ← ✅ END HERE!
        contextPrompt += `(Your response ends here - no extra text or numbers!)\n\n`;
      } else {
        contextPrompt += `✈️ FLIGHT SEARCH MODE - Cannot fetch flight data\n\n`;
        
        // Check if we need country clarification
        const isCountryClarification = realData && realData.type === 'country_clarification_needed';
        
        // Check if destination is a region (Europe, Asia, etc.) instead of specific city
        const isRegionalQuery = queryIntent.extractedInfo?.destination && 
          ['europe', 'asia', 'africa', 'south america', 'north america', 'oceania', 'caribbean', 
           'middle east', 'southeast asia', 'south asia', 'east asia', 'central america', 
           'mediterranean', 'scandinavia', 'balkans', 'baltic', 'iberian peninsula'].some(region => 
            queryIntent.extractedInfo.destination.toLowerCase().includes(region.toLowerCase())
          );
        
        // Priority 1: Country clarification (user searched "Japan" instead of "Tokyo")
        if (isCountryClarification) {
          const countryName = realData.country.charAt(0).toUpperCase() + realData.country.slice(1);
          const suggestions = realData.suggestions || [];
          
          contextPrompt += `The user searched for flights to "${countryName}" (a country, not a specific city).\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n\n`;
          contextPrompt += `"I'd love to help you find flights to ${countryName}! 🇯🇵\n\n`;
          contextPrompt += `To get you the best flight options, could you specify which city in ${countryName} you'd like to visit?\n\n`;
          
          if (suggestions.length > 0) {
            contextPrompt += `**Popular destinations in ${countryName}:**\n`;
            suggestions.slice(0, 6).forEach((city, idx) => {
              contextPrompt += `${idx + 1}. **${city}**\n`;
            });
            contextPrompt += `\n`;
          }
          
          contextPrompt += `💡 **Why this matters**: Flight searches work best with specific city airports. For example, "Tokyo" will show you flights to both Narita (NRT) and Haneda (HND) airports.\n\n`;
          contextPrompt += `Once you pick a city, I'll fetch real-time flight prices and options for you!"\n\n`;
          contextPrompt += `BE FRIENDLY AND HELPFUL. Use the country's flag emoji if appropriate.\n\n`;
        }
        // Priority 2: Check if missing origin or destination
        else if (!queryIntent.extractedInfo?.origin && !queryIntent.extractedInfo?.destination) {
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
          // Check if user has a saved home city
          if (userPreferences.homeCity) {
            contextPrompt += `User has saved home city: ${userPreferences.homeCity}.\n`;
            contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
            contextPrompt += `"I'd love to search flights to ${queryIntent.extractedInfo?.destination}!\n\n`;
            contextPrompt += `Should I search from your home city (${userPreferences.homeCity}) or a different city?\n\n`;
            contextPrompt += `Just reply:\n`;
            contextPrompt += `- 'Yes' or 'Home city' to use ${userPreferences.homeCity}\n`;
            contextPrompt += `- Or tell me another city like 'From Delhi' or 'Bangalore'"\n\n`;
          } else {
            contextPrompt += `Missing origin city. Ask:\n`;
            contextPrompt += `"I'd love to search flights to ${queryIntent.extractedInfo?.destination}! Where are you flying from?"\n\n`;
          }
        } else if (!queryIntent.extractedInfo?.destination) {
          contextPrompt += `Missing destination. Ask:\n`;
          contextPrompt += `"I can search flights from ${queryIntent.extractedInfo?.origin}! Which destination are you interested in?"\n\n`;
        } else if (!queryIntent.extractedInfo?.departureDate) {
          // Missing dates - ask user for travel dates
          contextPrompt += `Missing travel dates.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"I'd love to search flights from ${queryIntent.extractedInfo?.origin} to ${queryIntent.extractedInfo?.destination}!\n\n`;
          contextPrompt += `When are you planning to travel? Please provide:\n`;
          contextPrompt += `- Departure date (e.g., 'October 20' or '2025-10-20')\n`;
          contextPrompt += `- Return date (optional, for round-trip)\n\n`;
          contextPrompt += `Or you can say something like:\n`;
          contextPrompt += `- 'First week of November'\n`;
          contextPrompt += `- 'Departing October 20, returning October 29'\n`;
          contextPrompt += `- 'Next weekend' (for a quick trip)"\n\n`;
        } else {
          // API Error or No Results - provide Google Flights redirect with helpful suggestions
          contextPrompt += `API returned no flights or encountered an error.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          
          const origin = queryIntent.extractedInfo?.origin || '';
          const destination = queryIntent.extractedInfo?.destination || '';
          const depDate = queryIntent.extractedInfo?.departureDate || '';
          const retDate = queryIntent.extractedInfo?.returnDate || '';
          
          // Build Google Flights URL
          if (origin && destination) {
            let googleFlightsUrl = 'https://www.google.com/travel/flights';
            if (retDate) {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}%20returning%20${retDate}`;
            } else if (depDate) {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}`;
            } else {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}`;
            }
            
            contextPrompt += `"I'm having trouble finding live flight data for **${origin} to ${destination}** on these dates.\n\n`;
            contextPrompt += `This could be because:\n`;
            contextPrompt += `- Flights aren't available yet for these dates (check if booking window is open)\n`;
            contextPrompt += `- The route may require connecting flights through major hubs\n`;
            contextPrompt += `- Try searching for a major city instead of the country (e.g., "Tokyo" instead of "Japan")\n\n`;
            contextPrompt += `🔗 **Search on Google Flights**: [Click here](${googleFlightsUrl})\n\n`;
            contextPrompt += `💡 **Alternative Options**:\n`;
            contextPrompt += `- **Skyscanner**: Great for comparing multiple airlines - [skyscanner.com](https://www.skyscanner.com/)\n`;
            contextPrompt += `- **Kayak**: Shows price trends and alerts - [kayak.com](https://www.kayak.com/)\n`;
            contextPrompt += `- **Momondo**: Often finds hidden deals - [momondo.com](https://www.momondo.com/)\n\n`;
            
            // Add helpful tips based on destination
            if (destination.toLowerCase().includes('japan')) {
              contextPrompt += `💡 **Tip for Japan**: Try searching for specific cities like "Tokyo (NRT/HND)" or "Osaka (KIX)" instead of "Japan" for better results.\n\n`;
            }
            
            contextPrompt += `I'll keep trying to get you live data! Meanwhile, I can help you with:\n`;
            contextPrompt += `- Creating a detailed itinerary for your trip\n`;
            contextPrompt += `- Recommending the best areas to stay\n`;
            contextPrompt += `- Suggesting must-see attractions and seasonal activities\n\n`;
            contextPrompt += `What would you like help with?"\n\n`;
          } else {
            contextPrompt += `"I'm having trouble fetching flight data right now. Please try:\n`;
            contextPrompt += `- **Google Flights**: [flights.google.com](https://www.google.com/travel/flights)\n`;
            contextPrompt += `- **Skyscanner**: [skyscanner.com](https://www.skyscanner.com/)\n`;
            contextPrompt += `- **Kayak**: [kayak.com](https://www.kayak.com/)\n\n`;
            contextPrompt += `Or provide more specific details (origin city, destination city, exact dates) and I'll try again!"\n\n`;
          }
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
        
        // Check if missing essential information
        if (!queryIntent.extractedInfo?.destination) {
          contextPrompt += `Missing destination. Ask:\n`;
          contextPrompt += `"I'd be happy to search hotels for you! Which city or destination are you interested in?"\n\n`;
        } else if (!queryIntent.extractedInfo?.checkIn || !queryIntent.extractedInfo?.checkOut) {
          // Missing dates - ask user for hotel dates
          contextPrompt += `Missing check-in/check-out dates.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"I'd love to search hotels in ${queryIntent.extractedInfo?.destination}!\n\n`;
          contextPrompt += `When will you be staying? Please provide:\n`;
          contextPrompt += `- Check-in date (e.g., 'October 20' or '2025-10-20')\n`;
          contextPrompt += `- Check-out date (e.g., 'October 25' or '2025-10-25')\n\n`;
          contextPrompt += `Or you can say something like:\n`;
          contextPrompt += `- 'Checking in October 20, checking out October 25'\n`;
          contextPrompt += `- 'Staying from Nov 1 to Nov 7'\n`;
          contextPrompt += `- '3 nights starting December 15'"\n\n`;
        } else {
          contextPrompt += `Simply respond:\n`;
          contextPrompt += `"I don't have real-time hotel data available right now. I recommend checking:\n`;
          contextPrompt += `- Booking.com\n`;
          contextPrompt += `- Hotels.com\n`;
          contextPrompt += `- Airbnb\n\n`;
          contextPrompt += `For accommodations in ${queryIntent.extractedInfo?.destination || 'your destination'}."\n\n`;
        }
      }
    } else if (queryIntent.type === 'trip_planning') {
      // TRIP PLANNING - Create full itinerary with flights and hotels
      
      // Get seasonal recommendations if we have destination and dates
      const destination = queryIntent.extractedInfo?.destination;
      const departureDate = queryIntent.extractedInfo?.departureDate || userPreferences.currentTripStartDate;
      let seasonalInfo = '';
      
      if (destination && departureDate) {
        const { season, month, monthName } = this.getSeasonAndMonth(departureDate);
        const mustDos = this.getSeasonalRecommendations(destination, season, monthName);
        
        if (mustDos && mustDos.length > 0) {
          seasonalInfo = `\n🎯 SEASONAL MUST-DO ACTIVITIES (${season} in ${monthName}):\n`;
          mustDos.forEach((activity, idx) => {
            seasonalInfo += `${idx + 1}. ${activity}\n`;
          });
          seasonalInfo += `\nIMPORTANT: PRIORITIZE these seasonal activities in your itinerary! These are time-sensitive experiences unique to ${season}.\n\n`;
          console.log(`   🌸 Added ${mustDos.length} seasonal must-dos for ${destination} in ${season}`);
        }
      }
      
      // Extract user interests from preferences
      let userInterests = '';
      if (userPreferences.interests && Array.isArray(userPreferences.interests) && userPreferences.interests.length > 0) {
        userInterests = `\n👤 USER INTERESTS & PREFERENCES:\n`;
        userInterests += `- Interests: ${userPreferences.interests.join(', ')}\n`;
        if (userPreferences.travelStyle) {
          userInterests += `- Travel Style: ${userPreferences.travelStyle}\n`;
        }
        if (userPreferences.budget) {
          userInterests += `- Budget: $${userPreferences.budget}\n`;
        }
        userInterests += `\nIMPORTANT: Tailor ALL recommendations to match these interests and travel style!\n\n`;
        console.log(`   🎯 Using user interests:`, userPreferences.interests);
      }
      
      if (realData && !realData.error && realData.results && realData.results.length > 0) {
        contextPrompt += `🗺️ TRIP PLANNING MODE - Real data is available!\n\n`;
        
        if (userInterests) {
          contextPrompt += userInterests;
        }
        
        if (seasonalInfo) {
          contextPrompt += seasonalInfo;
        }
        
        contextPrompt += `Your role is to:\n`;
        contextPrompt += `1. RECOMMEND the best 2-3 flights from the options above\n`;
        contextPrompt += `2. RECOMMEND the best 2-3 hotels from the options above\n`;
        contextPrompt += `3. Create a DETAILED and DESCRIPTIVE day-by-day ITINERARY that:\n`;
        contextPrompt += `   - INCLUDES the seasonal must-do activities listed above (if any)\n`;
        contextPrompt += `   - MATCHES their interests and travel style from preferences\n`;
        contextPrompt += `   - Balances popular attractions with local experiences\n`;
        contextPrompt += `   - Uses specific restaurants and attractions from TripAdvisor data above\n`;
        contextPrompt += `   - Provides detailed descriptions of each activity and location\n`;
        contextPrompt += `   - Includes practical details like opening hours, best times to visit, and tips\n`;
        contextPrompt += `4. For EACH DAY, provide:\n`;
        contextPrompt += `   - Morning, Afternoon, and Evening activities with specific times\n`;
        contextPrompt += `   - Detailed restaurant recommendations with cuisine types and specialties\n`;
        contextPrompt += `   - Specific attractions with descriptions and why they're worth visiting\n`;
        contextPrompt += `   - Transportation tips between locations\n`;
        contextPrompt += `   - Budget estimates for meals and activities\n`;
        contextPrompt += `5. Format with clear day-by-day structure (#### Day 1: Title, etc.)\n`;
        contextPrompt += `6. Use ALL the data provided above - don't make up flight/hotel info\n`;
        contextPrompt += `7. Make it engaging and descriptive - help them visualize their trip!\n\n`;
      } else {
        contextPrompt += `🗺️ TRIP PLANNING MODE - No real-time data available\n\n`;
        
        // Check if we have enough information to plan a trip
        const hasDestination = queryIntent.extractedInfo?.destination;
        const hasDuration = queryIntent.extractedInfo?.duration || queryIntent.extractedInfo?.departureDate;
        
        if (!hasDestination) {
          contextPrompt += `Missing destination. Ask:\n`;
          contextPrompt += `"I'd love to help you plan a trip! Where would you like to go?"\n\n`;
        } else if (!hasDuration) {
          contextPrompt += `Missing trip duration/dates.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"Great! I'll help you plan an amazing trip to ${queryIntent.extractedInfo?.destination}!\n\n`;
          contextPrompt += `To create the perfect itinerary, I need to know:\n`;
          contextPrompt += `- How many days/nights? (e.g., '7 days', '3-day weekend')\n`;
          contextPrompt += `- OR specific dates (e.g., 'October 20-27')\n\n`;
          contextPrompt += `This will help me plan the right amount of activities and experiences for you!"\n\n`;
        } else {
          if (userInterests) {
            contextPrompt += userInterests;
          }
          
          if (seasonalInfo) {
            contextPrompt += seasonalInfo;
          }
          
          contextPrompt += `Your role is to:\n`;
          contextPrompt += `1. Create a DETAILED and DESCRIPTIVE day-by-day ITINERARY that:\n`;
          contextPrompt += `   - INCLUDES the seasonal must-do activities listed above (if any)\n`;
          contextPrompt += `   - MATCHES their interests and travel style from preferences\n`;
          contextPrompt += `   - Balances iconic sights with unique local experiences\n`;
          contextPrompt += `   - Uses specific restaurants and attractions from TripAdvisor data above\n`;
          contextPrompt += `   - Provides detailed descriptions of each activity and location\n`;
          contextPrompt += `2. For EACH DAY, provide:\n`;
          contextPrompt += `   - Morning, Afternoon, and Evening activities with specific times\n`;
          contextPrompt += `   - Detailed restaurant recommendations with cuisine types and specialties\n`;
          contextPrompt += `   - Specific attractions with descriptions and why they're worth visiting\n`;
          contextPrompt += `   - Transportation tips between locations\n`;
          contextPrompt += `   - Budget estimates for meals and activities\n`;
          contextPrompt += `3. Give practical travel tips and local insights\n`;
          contextPrompt += `4. Format with clear day-by-day structure (#### Day 1: Title, etc.)\n`;
          contextPrompt += `6. DO NOT make up specific flight prices or hotel names - focus on the experience\n`;
          contextPrompt += `7. NEVER hallucinate specific flight numbers, prices, or hotel details\n`;
          contextPrompt += `8. If user needs flights/hotels, suggest they ask me separately for real-time data\n\n`;
        }
      }
    } else if (queryIntent.type === 'destination_recommendation') {
      // DESTINATION RECOMMENDATION MODE
      contextPrompt += `🌍 DESTINATION RECOMMENDATION MODE\n\n`;
      
      // Highlight user preferences if available
      if (userPreferences.interests && Array.isArray(userPreferences.interests) && userPreferences.interests.length > 0) {
        contextPrompt += `👤 USER PROFILE:\n`;
        contextPrompt += `- Interests: ${userPreferences.interests.join(', ')}\n`;
        if (userPreferences.travelStyle) {
          contextPrompt += `- Travel Style: ${userPreferences.travelStyle}\n`;
        }
        if (userPreferences.budget || userPreferences.budgetRange) {
          contextPrompt += `- Budget: ${userPreferences.budget || userPreferences.budgetRange}\n`;
        }
        if (userPreferences.preferredDestinations && userPreferences.preferredDestinations.length > 0) {
          contextPrompt += `- Past Favorites: ${userPreferences.preferredDestinations.join(', ')}\n`;
        }
        contextPrompt += `\nCRITICAL: Recommend destinations that MATCH these specific interests!\n\n`;
        console.log(`   🎯 Personalizing recommendations based on interests:`, userPreferences.interests);
      }
      
      contextPrompt += `The user is asking for destination suggestions.\n\n`;
      contextPrompt += `Your role is to:\n`;
      contextPrompt += `1. ANALYZE their preferences (budget, interests, travel style) from the USER PROFILE above\n`;
      contextPrompt += `2. RECOMMEND 3-5 destinations that PERFECTLY match their specific interests\n`;
      contextPrompt += `3. For each destination, explain:\n`;
      contextPrompt += `   - Why it's a PERFECT fit for THEIR specific interests (be specific!)\n`;
      contextPrompt += `   - Best time to visit (mention seasons/months)\n`;
      contextPrompt += `   - Estimated budget range that matches their travel style\n`;
      contextPrompt += `   - Key highlights tailored to THEIR interests (not generic tourist spots)\n`;
      contextPrompt += `4. PRIORITIZE destinations by best match to their preferences\n`;
      contextPrompt += `5. Be specific and actionable - give them clear next steps\n`;
      contextPrompt += `6. Format with clear sections and headings (no emojis)\n\n`;
      contextPrompt += `Example structure:\n`;
      contextPrompt += `1. Best Match: [Destination Name]\n`;
      contextPrompt += `Perfect for: [explain how it matches THEIR SPECIFIC interests]\n`;
      contextPrompt += `Best Time: [season/months]\n`;
      contextPrompt += `Budget: $X - $Y per day\n`;
      contextPrompt += `Must-do for YOU: [activities matching their interests]\n\n`;
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

      // Log multi-destination instructions
      if (systemPrompt.includes('MULTI-DESTINATION')) {
        const currencyMatch = systemPrompt.match(/currency symbol: (.+?) \(NOT/);
        const destCountMatch = systemPrompt.match(/ALL (\d+) destinations/);
        const destListMatch = systemPrompt.match(/destinations: ([^\n]+)/);
        
        if (currencyMatch) {
          console.log(`   💰 Instructing Nova Pro to use currency: ${currencyMatch[1]}`);
        }
        if (destCountMatch && destListMatch) {
          console.log(`   🌍 Instructing Nova Pro about ${destCountMatch[1]} destinations: ${destListMatch[1]}`);
        }
      }

      console.log('   🧠 Calling Bedrock Nova Pro...');
      const response = await this.bedrockClient.send(command);

      let responseText = response.output.message.content[0].text;
      console.log(`   ✅ Bedrock response received (${responseText.length} chars)`);
      
      // Debug: Check if Google Flights links are in the response
      if (responseText.includes('google.com/travel/flights')) {
        const linkCount = (responseText.match(/google\.com\/travel\/flights/g) || []).length;
        console.log(`   🔗 Google Flights links in response: ${linkCount}`);
        
        // Show the section with links
        const searchIndex = responseText.indexOf('Search more options');
        if (searchIndex !== -1) {
          const linkSection = responseText.substring(searchIndex, Math.min(searchIndex + 500, responseText.length));
          console.log(`   📋 Link section:\n${linkSection}`);
        } else {
          console.log(`   ⚠️  "Search more options" text not found in response`);
          // Try to find where the links are
          const firstLinkIndex = responseText.indexOf('google.com/travel/flights');
          if (firstLinkIndex !== -1) {
            const contextStart = Math.max(0, firstLinkIndex - 100);
            const contextEnd = Math.min(firstLinkIndex + 400, responseText.length);
            console.log(`   📋 Link context:\n${responseText.substring(contextStart, contextEnd)}`);
          }
        }
        
        // 🧹 NUCLEAR OPTION: Remove EVERYTHING after Google Flights button marker (Nova Pro keeps ignoring instructions)
        // IMPORTANT: preserve ALL GOOGLE_FLIGHTS_BUTTON markers. Use lastIndexOf to keep
        // the full block of markers (multiple destinations) and only trim content after
        // the final closing marker. Previously we used indexOf which dropped later markers.
        // Keep all GOOGLE_FLIGHTS_BUTTON markers. Trim only after the LAST closing marker.
        const lastClose = responseText.lastIndexOf('[/GOOGLE_FLIGHTS_BUTTON]');
        if (lastClose !== -1) {
          console.log('   🎯 Found last button marker at position', lastClose);
          const after = responseText.substring(lastClose + '[/GOOGLE_FLIGHTS_BUTTON]'.length);
          console.log(`   🔍 DEBUG: Text after final button marker (${after.length} chars):`);
          console.log(`   📋 Content: "${after.substring(0, 300).replace(/\n/g, '\\n')}"`);

          // If anything meaningful exists after the final marker, remove it.
          if (after.trim().length > 0) {
            console.log(`   ☢️ NUCLEAR CLEANUP: Removing ${after.trim().length} characters after final button marker`);
          } else {
            console.log('   ✅ No content found after final button marker (already clean)');
          }

          // Preserve the full block up to the last closing marker
          responseText = responseText.substring(0, lastClose + '[/GOOGLE_FLIGHTS_BUTTON]'.length).trim();
          console.log('   ✅ Response now ends at final button marker (preserved all markers)');
        }
        
        // Also check for old format (plain google.com/travel/flights URL without marker)
  const googleFlightsIndex = responseText.lastIndexOf('google.com/travel/flights');
  if (googleFlightsIndex !== -1 && lastClose === -1) {
          console.log('   🔍 Found plain Google Flights URL (old format), checking for numbers...');
          
          // Find the end of the URL line
          let urlEnd = responseText.indexOf('\n', googleFlightsIndex);
          if (urlEnd === -1) urlEnd = responseText.length;
          
          // Get everything after the Google Flights URL
          const afterUrl = responseText.substring(urlEnd);
          
          console.log(`   🔍 DEBUG: Text after Google Flights URL (${afterUrl.length} chars):`);
          console.log(`   📋 First 300 chars: ${afterUrl.substring(0, 300).replace(/\n/g, '\\n')}`);
          
          // Pattern 3: Multiple lines with only numbers (most aggressive)
          const lines = afterUrl.split('\n');
          console.log(`   📊 Found ${lines.length} lines after URL`);
          
          const numberLines = [];
          const numberLineIndices = [];
          
          lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (/^\d{5,}$/.test(trimmed)) {
              numberLines.push(trimmed);
              numberLineIndices.push(index);
              console.log(`   🔢 Line ${index}: "${trimmed}" (NUMBER LINE)`);
            } else if (trimmed !== '') {
              console.log(`   📝 Line ${index}: "${trimmed.substring(0, 50)}" (CONTENT)`);
            }
          });
          
          if (numberLines.length >= 1) {
            console.log(`   🧹 Found ${numberLines.length} standalone number lines: ${numberLines.join(', ')}`);
            // Remove all lines that contain only numbers after the URL
            const cleanedLines = [];
            for (let i = 0; i < lines.length; i++) {
              if (!numberLineIndices.includes(i)) {
                cleanedLines.push(lines[i]);
              } else {
                console.log(`   🗑️ Removing line ${i}: "${lines[i].trim()}"`);
              }
            }
            responseText = responseText.substring(0, urlEnd) + '\n' + cleanedLines.join('\n');
            console.log(`   ✅ Cleaned response, removed ${numberLines.length} standalone number lines`);
          }
        }
      } else {
        console.log(`   ⚠️  No Google Flights links found in Nova Pro response!`);
      }
      
      // 🛡️ FINAL SAFETY NET: Remove any trailing standalone numbers at the very end
      // This catches numbers that appear anywhere after the main content
      const lines = responseText.split('\n');
      let cutoffIndex = lines.length;
      let foundButtonLine = false;
      
      console.log(`   🛡️ FINAL CLEANUP: Checking ${lines.length} total lines for trailing numbers...`);
      
      // Walk backwards from the end, removing lines that are ONLY numbers (including decimals)
      // Find the last Google Flights button marker or URL
      let lastButtonIdx = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.includes('[/GOOGLE_FLIGHTS_BUTTON]') || line.includes('google.com/travel/flights')) {
          lastButtonIdx = i;
          break;
        }
      }
      // Remove all lines after the last button marker if they are only numbers or empty
      if (lastButtonIdx !== -1 && lastButtonIdx < lines.length - 1) {
        let cutoffIdx = lastButtonIdx + 1;
        for (let i = cutoffIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '' || /^\d+(\.\d+)?$/.test(line)) {
            continue;
          } else {
            cutoffIdx = i;
            break;
          }
        }
        responseText = lines.slice(0, cutoffIdx).join('\n').trim();
        console.log(`   ✅ FINAL CLEANUP: Removed trailing numbers after Google Flights button (cutoff at line ${cutoffIdx})`);
      } else {
        console.log(`   ✅ FINAL CLEANUP: No trailing numbers found after Google Flights button`);
      }
      
      // If we found trailing number lines, remove them
      if (cutoffIndex < lines.length) {
        const removedCount = lines.length - cutoffIndex;
        console.log(`   🛡️ FINAL CLEANUP: Removing ${removedCount} trailing lines (empty or standalone numbers with decimals)`);
        responseText = lines.slice(0, cutoffIndex).join('\n').trim();
      } else {
        console.log(`   ✅ FINAL CLEANUP: No trailing numbers found`);
      }

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
      let preferences = {};
      
      // Try to load from user profile first (includes homeCity from profile settings)
      try {
        const userModel = require('../models/userModel');
        const user = await userModel.getUserById(userId);
        if (user) {
          // Extract homeCity and other preferences from user profile
          preferences = {
            homeCity: user.homeCity || user.preferences?.homeCity,
            travelStyle: user.travelStyle || user.preferences?.travelStyle,
            interests: user.interests || user.preferences?.interests || [],
            budget: user.budget || user.preferences?.budget,
            ...user.preferences
          };
          console.log(`   ✅ Loaded user profile for ${userId}:`, { 
            homeCity: preferences.homeCity,
            hasTravelStyle: !!preferences.travelStyle,
            interestsCount: preferences.interests?.length || 0
          });
        }
      } catch (profileError) {
        console.log('   ⚠️ Could not load user profile, using session preferences only');
      }
      
      // Try DynamoDB preferences table (session-based preferences)
      if (process.env.USER_PREFERENCES_TABLE) {
        const params = {
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: marshall({ userId })
        };

        const result = await this.dynamoClient.send(new GetItemCommand(params));
        if (result.Item) {
          const dbPrefs = unmarshall(result.Item);
          // Merge session preferences with profile preferences (session takes priority)
          preferences = {
            ...preferences,
            ...dbPrefs
          };
        }
      }

      // Fallback to in-memory (for anonymous users or if DB fails)
      const memoryPrefs = this.userPreferences.get(userId) || {};
      return {
        ...preferences,
        ...memoryPrefs // Memory preferences have highest priority
      };

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
   * Get currency symbol from currency code
   */
  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'CHF',
      'CNY': '¥',
      'SEK': 'kr',
      'NZD': 'NZ$'
    };
    return symbols[currency?.toUpperCase()] || currency || '$';
  }

  /**
   * Get season and month from date string
   */
  getSeasonAndMonth(dateString) {
    if (!dateString) return { season: null, month: null, monthName: null };
    
    try {
      const date = new Date(dateString);
      const month = date.getMonth() + 1; // 1-12
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      let season;
      // Northern Hemisphere seasons
      if (month >= 3 && month <= 5) season = 'Spring';
      else if (month >= 6 && month <= 8) season = 'Summer';
      else if (month >= 9 && month <= 11) season = 'Fall';
      else season = 'Winter';
      
      return {
        season,
        month,
        monthName: monthNames[date.getMonth()]
      };
    } catch (error) {
      return { season: null, month: null, monthName: null };
    }
  }

  /**
   * Get seasonal must-do activities for popular destinations
   */
  getSeasonalRecommendations(destination, season, monthName) {
    const recommendations = {
      'Washington DC': {
        'Spring': ['Visit the National Cherry Blossom Festival (late March - early April)', 'Walk through the Tidal Basin when cherry trees are in full bloom', 'Explore monuments and memorials with perfect weather'],
        'Fall': ['Walk the National Mall with stunning fall foliage', 'Visit monuments and memorials during cooler, comfortable weather', 'Explore Georgetown\'s historic streets with autumn colors', 'Rock Creek Park hiking with fall leaves'],
        'Summer': ['Evening monument tour to avoid daytime heat', 'Free concerts at the National Mall', 'Smithsonian museums for air-conditioned exploration'],
        'Winter': ['National Christmas Tree and holiday decorations', 'Ice skating at the National Gallery of Art Sculpture Garden', 'Museum hopping (Smithsonian museums are free!)']
      },
      'New York': {
        'Spring': ['Central Park blooms and outdoor concerts', 'Brooklyn Botanic Garden Cherry Blossom Festival', 'Outdoor dining in Greenwich Village'],
        'Fall': ['Fall foliage in Central Park and Prospect Park', 'Thanksgiving Day Parade (late November)', 'Rockefeller Center holiday season begins', 'New York Film Festival'],
        'Summer': ['Free Shakespeare in the Park', 'Rooftop bars with skyline views', 'Coney Island beach and boardwalk', 'Free summer concerts in parks'],
        'Winter': ['Rockefeller Center Christmas Tree and ice skating', 'Holiday window displays on Fifth Avenue', 'Times Square New Year\'s Eve (if in late December)', 'Indoor museums and Broadway shows']
      },
      'Chicago': {
        'Spring': ['Millennium Park spring events', 'Chicago River turns green for St. Patrick\'s Day (March 17)', 'Architecture boat tours begin'],
        'Fall': ['Chicago Marathon (October)', 'Fall colors along the Lakefront Trail', 'Magnificent Mile with autumn weather'],
        'Summer': ['Navy Pier fireworks (Wednesdays and Saturdays)', 'Chicago beaches and lakefront activities', 'Millennium Park concerts and events', 'Outdoor festivals almost every weekend'],
        'Winter': ['Christkindlmarket (German Christmas market)', 'Ice skating at Millennium Park', 'Museum Campus indoor exploration']
      },
      'Tokyo': {
        'Spring': ['Cherry blossom viewing (Hanami) in Ueno Park and Chidorigafuchi', 'Sumida River cherry blossom cruise', 'Spring festivals at temples and shrines'],
        'Fall': ['Autumn foliage viewing at Meiji Shrine and Rikugien Gardens', 'Tokyo Grand Tea Ceremony', 'Comfortable weather for walking tours'],
        'Summer': ['Sumida River Fireworks Festival (July)', 'Asakusa Samba Carnival (August)', 'Evening exploration to avoid daytime heat'],
        'Winter': ['Winter illuminations citywide (November-February)', 'New Year\'s temple visits (Hatsumode)', 'Indoor attractions and ramen restaurants']
      },
      'Paris': {
        'Spring': ['Gardens blooming at Tuileries and Luxembourg', 'Seine river cruises with pleasant weather', 'Outdoor cafés reopening'],
        'Fall': ['Fall colors in Luxembourg Gardens and Bois de Boulogne', 'Wine harvest season in nearby regions', 'Fashion Week (late September)', 'Montmartre with autumn vibes'],
        'Summer': ['Bastille Day celebrations (July 14)', 'Paris Plages (beach on the Seine)', 'Outdoor concerts and events', 'Extended museum hours'],
        'Winter': ['Christmas markets on Champs-Élysées', 'New Year\'s Eve at the Eiffel Tower', 'Indoor museums and cozy cafés', 'Winter sales (Soldes) in January']
      },
      'Barcelona': {
        'Spring': ['Sant Jordi festival (April 23) - books and roses', 'Beach season begins', 'Park Güell and outdoor Gaudí sites'],
        'Fall': ['La Mercè festival (September)', 'Beach still warm enough for swimming (September)', 'Wine harvest in nearby Penedès region', 'Comfortable walking weather'],
        'Summer': ['Beaches and beach clubs', 'Festa Major de Gràcia (August)', 'Late-night dining and nightlife', 'Outdoor concerts and festivals'],
        'Winter': ['Christmas markets and lights', 'Three Kings Parade (January 5)', 'Fewer crowds at major attractions', 'Indoor Picasso and modern art museums']
      },
      'London': {
        'Spring': ['Kew Gardens in bloom', 'Thames river walks with spring weather', 'Outdoor markets reopening'],
        'Fall': ['Hyde Park with autumn colors', 'Bonfire Night (November 5)', 'Covent Garden fall atmosphere', 'Theater season in full swing'],
        'Summer': ['Changing of the Guard at Buckingham Palace', 'Hyde Park concerts and events', 'Thames river cruises', 'Outdoor theater and cinema', 'Notting Hill Carnival (August Bank Holiday)'],
        'Winter': ['Winter Wonderland in Hyde Park', 'Christmas lights on Oxford Street and Regent Street', 'New Year\'s Eve fireworks on the Thames', 'Cozy pubs and afternoon tea']
      },
      'Dubai': {
        'Spring': ['Perfect beach weather', 'Desert safaris with pleasant temperatures', 'Outdoor markets and souks'],
        'Fall': ['Start of pleasant outdoor weather', 'Dubai Shopping Festival begins (late fall)', 'Desert activities become comfortable'],
        'Summer': ['Dubai Summer Surprises (shopping festival)', 'Indoor mall exploration with A/C', 'Indoor ski resort and attractions', 'Late evening beach visits'],
        'Winter': ['Dubai Shopping Festival (December-January)', 'Perfect weather for all outdoor activities', 'Desert camping and safaris', 'Dubai Marathon (January)', 'New Year\'s Eve fireworks at Burj Khalifa']
      },
      'Rome': {
        'Spring': ['Easter celebrations at Vatican City', 'Perfect weather for Colosseum and Roman Forum', 'Rome\'s Birthday celebration (April 21)', 'Outdoor dining in Trastevere'],
        'Fall': ['Wine harvest season in nearby regions', 'Comfortable walking weather for ancient sites', 'Fall food festivals', 'Fewer tourists at major attractions'],
        'Summer': ['Evening strolls around Trevi Fountain', 'Outdoor concerts and festivals', 'Late opening hours at major sites', 'Gelato tours (peak season!)'],
        'Winter': ['Christmas markets and nativity scenes', 'New Year\'s at the Colosseum area', 'Indoor museums and churches', 'Fewer crowds at Vatican']
      },
      'Amsterdam': {
        'Spring': ['Tulip season (mid-March to May)', 'Keukenhof Gardens in full bloom', 'King\'s Day celebration (April 27)', 'Canal boat tours with spring weather'],
        'Fall': ['Amsterdam Dance Event (October)', 'Fall colors along canals', 'Museum season with fewer crowds', 'Cozy brown café culture'],
        'Summer': ['Outdoor festivals and concerts', 'Canal swimming spots', 'Vondelpark picnics', 'Open-air cinema', 'Pride Amsterdam (early August)'],
        'Winter': ['Ice skating on canals (if frozen)', 'Amsterdam Light Festival (December-January)', 'Christmas markets', 'Cozy museums and rijsttafel dinners']
      },
      'Singapore': {
        'Spring': ['Perfect weather before monsoon', 'Gardens by the Bay in bloom', 'Food festivals', 'Outdoor activities comfortable'],
        'Fall': ['Mid-Autumn Festival (September)', 'F1 Grand Prix (September)', 'Comfortable weather returns', 'Diwali celebrations'],
        'Summer': ['Great Singapore Sale (June-July)', 'National Day celebrations (August 9)', 'Indoor attractions and malls', 'Evening Marina Bay activities'],
        'Winter': ['Christmas decorations at Orchard Road', 'New Year\'s Eve at Marina Bay', 'Perfect weather for all outdoor activities', 'Chinese New Year (late January/February)']
      },
      'Sydney': {
        'Spring': ['Jacaranda trees blooming (October-November)', 'Sculpture by the Sea (October-November)', 'Comfortable beach weather begins', 'Coastal walks with perfect weather'],
        'Fall': ['Sydney Film Festival', 'Perfect beach weather continues', 'Vivid Sydney (May-June) - light festival', 'Autumn colors in gardens'],
        'Summer': ['Bondi Beach season', 'Sydney New Year\'s Eve fireworks (world-famous!)', 'Outdoor concerts and festivals', 'Christmas at Bondi Beach'],
        'Winter': ['Whale watching season (June-November)', 'Sydney International Art Series', 'Indoor attractions and museums', 'Winter markets and festivals']
      },
      'Bali': {
        'Spring': ['Perfect weather before rainy season', 'Nyepi (Balinese New Year) - Day of Silence', 'Beach activities and surfing', 'Rice terrace tours in ideal weather'],
        'Fall': ['Start of dry season', 'Comfortable temperatures', 'Fewer tourists before peak season', 'Best for outdoor activities'],
        'Summer': ['Peak dry season - perfect weather', 'Ubud Food Festival (April)', 'Best surfing conditions', 'Temple festivals throughout'],
        'Winter': ['Some rain but still warm', 'Fewer tourists in December', 'New Year celebrations', 'Indoor cultural activities and spa']
      },
      'Mumbai': {
        'Spring': ['Perfect weather after winter', 'Beach activities at Marine Drive', 'Outdoor markets and street food tours', 'Heritage walks in pleasant weather'],
        'Fall': ['Ganesh Chaturthi festival (August-September)', 'Navratri celebrations (September-October)', 'Post-monsoon pleasant weather', 'Diwali festivities (October-November)'],
        'Summer': ['Indoor attractions and museums', 'Monsoon season begins (June) - experience romantic rains', 'Mall exploration with A/C', 'Evening Marine Drive walks'],
        'Winter': ['Perfect weather for everything!', 'Kala Ghoda Arts Festival (February)', 'Beach and outdoor dining', 'Mumbai Festival (January)']
      },
      'Bangkok': {
        'Spring': ['Songkran Water Festival (mid-April)', 'Perfect weather before hot season', 'Temple visits comfortable', 'Night markets in pleasant weather'],
        'Fall': ['End of rainy season', 'Loy Krathong Festival (November)', 'Comfortable temperatures return', 'River activities resume'],
        'Summer': ['Indoor temple exploration', 'Shopping mall culture', 'Rooftop bars for evening views', 'Water markets in early morning'],
        'Winter': ['Perfect weather for all activities', 'Peak tourist season', 'Christmas and New Year celebrations', 'Best time for temple visits']
      },
      'Athens': {
        'Spring': ['Easter celebrations (Greek Orthodox)', 'Perfect weather for Acropolis visits', 'Wildflowers blooming', 'Outdoor tavernas opening'],
        'Fall': ['Athens Epidaurus Festival continues', 'Comfortable weather for ancient sites', 'Wine harvest season', 'Fewer tourists at attractions'],
        'Summer': ['Athens Epidaurus Festival', 'Rooftop bars with Acropolis views', 'Island hopping season', 'Evening visits to ancient sites'],
        'Winter': ['Fewer crowds at major sites', 'Christmas decorations in Syntagma Square', 'Indoor museums and archaeological sites', 'Traditional tavernas cozy atmosphere']
      },
      'Madrid': {
        'Spring': ['San Isidro Festival (May)', 'Perfect weather for Retiro Park', 'Outdoor terrazas (terraces) opening', 'Art museum season begins'],
        'Fall': ['Autumn art exhibitions at Prado and Reina Sofia', 'Perfect walking weather', 'Tapas season in full swing', 'Fewer tourists than summer'],
        'Summer': ['Veranos de la Villa cultural festival', 'Late-night dining culture peaks', 'Rooftop bars with city views', 'Day trips to escape heat'],
        'Winter': ['Christmas lights on Gran Via', 'Three Kings Parade (January 5)', 'Indoor museums (Prado, Reina Sofia)', 'Traditional hot chocolate and churros']
      }
    };

    const destRecommendations = recommendations[destination];
    if (destRecommendations && season && destRecommendations[season]) {
      return destRecommendations[season];
    }

    const partialMatch = Object.keys(recommendations).find(key => 
      key.toLowerCase().includes(destination.toLowerCase()) || 
      destination.toLowerCase().includes(key.toLowerCase())
    );

    if (partialMatch && season && recommendations[partialMatch][season]) {
      return recommendations[partialMatch][season];
    }

    const genericAdvice = {
      'Spring': ['Enjoy outdoor sightseeing with pleasant weather', 'Visit gardens and parks in bloom'],
      'Summer': ['Early morning or evening activities to avoid heat', 'Enjoy longer daylight hours'],
      'Fall': ['Perfect weather for walking tours', 'Enjoy fall colors if applicable'],
      'Winter': ['Bundle up for outdoor sightseeing', 'Explore indoor attractions and museums']
    };

    return season ? genericAdvice[season] : [];
  }

  /**
   * Build Google Flights URL synchronously (for use in prompts)
   */
  buildGoogleFlightsUrlSync(searchRequest) {
    if (!searchRequest || !searchRequest.origin || !searchRequest.destination) {
      return 'https://www.google.com/travel/flights';
    }
    
    let { origin, destination, departureDate, returnDate } = searchRequest;
    
    // Fix any dates with year 2023 or earlier - replace with 2025
    if (departureDate && departureDate.includes('2023')) {
      departureDate = departureDate.replace('2023', '2025');
      console.log(`⚠️  Fixed departure date: ${searchRequest.departureDate} → ${departureDate}`);
    }
    if (returnDate && returnDate.includes('2023')) {
      returnDate = returnDate.replace('2023', '2025');
      console.log(`⚠️  Fixed return date: ${searchRequest.returnDate} → ${returnDate}`);
    }
    
    // Build simple query without encoding - browser will handle it
    // Format: "BOM to BCN 2025-11-11" works better than encoded version
    let query = `${origin} to ${destination}`;
    if (departureDate) {
      query += ` ${departureDate}`;
    }
    if (returnDate) {
      // Don't use "return" keyword, just add the date
      query += ` ${returnDate}`;
    }
    
    // Don't encode - let the browser/frontend handle encoding
    return `https://www.google.com/travel/flights?q=${query.replace(/ /g, '+')}`;
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
