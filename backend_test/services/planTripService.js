// Bedrock direct integration using AWS Nova Pro (JavaScript)
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const TripAdvisorService = require('./TripAdvisorService');

// You may want to move these to environment variables
const REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.amazon.nova-pro-v1:0'; // Using Nova Pro

const client = new BedrockRuntimeClient({ region: REGION });
const tripAdvisorService = new TripAdvisorService();

// Build trip planning prompt with BOTH user context AND TripAdvisor data
async function buildTripPlanningPrompt(preferences, userContext = null, tripAdvisorData = null) {
  let prompt = `You are an intelligent AI travel agent that learns and adapts to user preferences. Plan a comprehensive, personalized trip.\n\n`;
  
  // Add USER CONTEXT section (from YOUR work)
  if (userContext) {
    prompt += '--- USER CONTEXT & LEARNING ---\n';
    
    if (userContext.preferences?.homeCity) {
      prompt += `🏠 User's home city: ${userContext.preferences.homeCity}\n`;
    }
    
    if (userContext.preferences?.travelStyle) {
      prompt += `✈️ Preferred travel style: ${userContext.preferences.travelStyle}\n`;
    }
    
    if (userContext.preferences?.interests?.length > 0) {
      prompt += `❤️ Interests: ${userContext.preferences.interests.join(', ')}\n`;
    }
    
    if (userContext.preferences?.budget) {
      prompt += `💰 Typical budget: $${userContext.preferences.budget}\n`;
    }
    
    if (userContext.searchHistory?.length > 0) {
      const recentSearches = userContext.searchHistory.slice(-3);
      prompt += `📍 Recent searches:\n`;
      recentSearches.forEach(search => {
        prompt += `  - ${search.origin || '?'} → ${search.destination || '?'} (${search.type})\n`;
      });
    }
    
    if (userContext.tripHistory?.length > 0) {
      prompt += `🗺️ Previous trips: ${userContext.tripHistory.length} trips planned\n`;
    }
    
    prompt += '\nUSE THIS CONTEXT to personalize the trip plan! Consider their home location, past preferences, and interests.\n\n';
  }

  // Add current trip preferences
  prompt += `Current Trip Request: ${JSON.stringify(preferences, null, 2)}\n\n`;

  // Add TRIPADVISOR DATA section (from TEAMMATE'S work)
  if (tripAdvisorData) {
    prompt += `Real-time travel data from TripAdvisor:\n`;
    
    if (tripAdvisorData.location) {
      prompt += `Destination: ${tripAdvisorData.location.name}\n`;
      prompt += `Description: ${tripAdvisorData.location.description}\n`;
      prompt += `Overall Rating: ${tripAdvisorData.location.rating}/5 (${tripAdvisorData.location.review_count} reviews)\n\n`;
    }

    if (tripAdvisorData.attractions && tripAdvisorData.attractions.length > 0) {
      prompt += `Top Attractions:\n`;
      tripAdvisorData.attractions.forEach((attraction, index) => {
        prompt += `${index + 1}. ${attraction.name} - ${attraction.rating}/5 (${attraction.review_count} reviews)\n`;
        if (attraction.description) prompt += `   ${attraction.description}\n`;
        if (attraction.price_level) prompt += `   Price Level: ${attraction.price_level}\n`;
      });
      prompt += `\n`;
    }

    if (tripAdvisorData.restaurants && tripAdvisorData.restaurants.length > 0) {
      prompt += `Top Restaurants:\n`;
      tripAdvisorData.restaurants.forEach((restaurant, index) => {
        prompt += `${index + 1}. ${restaurant.name} - ${restaurant.rating}/5 (${restaurant.review_count} reviews)\n`;
        if (restaurant.cuisine) prompt += `   Cuisine: ${restaurant.cuisine.join(', ')}\n`;
        if (restaurant.price_level) prompt += `   Price Level: ${restaurant.price_level}\n`;
        if (restaurant.description) prompt += `   ${restaurant.description}\n`;
      });
      prompt += `\n`;
    }

    if (tripAdvisorData.hotels && tripAdvisorData.hotels.length > 0) {
      prompt += `Top Hotels:\n`;
      tripAdvisorData.hotels.forEach((hotel, index) => {
        prompt += `${index + 1}. ${hotel.name} - ${hotel.rating}/5 (${hotel.review_count} reviews)\n`;
        if (hotel.amenities) prompt += `   Amenities: ${hotel.amenities.join(', ')}\n`;
        if (hotel.price_level) prompt += `   Price Level: ${hotel.price_level}\n`;
        if (hotel.description) prompt += `   ${hotel.description}\n`;
      });
      prompt += `\n`;
    }
  }

  // JSON structure instructions
  prompt += `IMPORTANT: Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks, just pure JSON):

{
  "destination": "City, Country",
  "startDate": "YYYY-MM-DD",
  "duration": number_of_days,
  "dailyItinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "activities": [
        {
          "time": "HH:MM",
          "activity": "activity name",
          "description": "detailed description",
          "location": "specific location",
          "duration": "duration string",
          "cost": estimated cost,
          "rating": "rating if available from TripAdvisor",
          "reviewCount": "number of reviews if available"
        }
      ],
      "meals": {
        "breakfast": "Restaurant name and details (use TripAdvisor data)",
        "lunch": "Restaurant name and details (use TripAdvisor data)",
        "dinner": "Restaurant name and details (use TripAdvisor data)"
      },
      "accommodation": "Hotel name and details (use TripAdvisor data)",
      "totalCost": estimated daily cost
    }
  ],
  "budgetBreakdown": {
    "accommodation": estimated cost,
    "transportation": estimated cost,
    "food": estimated cost,
    "activities": estimated cost,
    "miscellaneous": estimated cost
  },
  "totalBudget": number,
  "transportation": "Transportation details",
  "tips": ["Tip 1", "Tip 2"],
  "travelTips": ["travel tip1", "travel tip2"],
  "culturalHighlights": ["cultural highlight1", "cultural highlight2"],
  "foodExperiences": ["food experience1", "food experience2"]
}

Use the real TripAdvisor data above to create specific, accurate recommendations with actual ratings and review counts.
Return only the JSON, no other text.`;

  return prompt;
}

// Main planTrip function - integrates BOTH features
exports.planTrip = async (userId, preferences, token, userContext = null) => {
  console.log('   🧠 Building AI-personalized trip plan with user context AND TripAdvisor data');
  
  // Get TripAdvisor data for the destination (TEAMMATE'S work)
  let tripAdvisorData = null;
  if (preferences.destination) {
    try {
      tripAdvisorData = await tripAdvisorService.getTravelDataForAI(preferences.destination, preferences);
      console.log('✅ TripAdvisor data retrieved for destination:', preferences.destination);
    } catch (error) {
      console.error('⚠️ TripAdvisor data retrieval failed:', error.message);
      // Continue without TripAdvisor data
    }
  }

  // Build prompt with BOTH user context AND TripAdvisor data
  const prompt = await buildTripPlanningPrompt(preferences, userContext, tripAdvisorData);
  
  // Use Converse API (recommended for Nova models)
  const input = {
    modelId: MODEL_ID,
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }]
      }
    ],
    inferenceConfig: {
      maxTokens: 4000,
      temperature: 0.7,
      topP: 0.9
    }
  };

  let responseText = '';
  try {
    const command = new ConverseCommand(input);
    const response = await client.send(command);
    
    // Extract text from Converse API response (Nova Pro format)
    if (response.output && response.output.message && response.output.message.content) {
      for (const content of response.output.message.content) {
        if (content.text) {
          responseText += content.text;
        }
      }
    }
    
    console.log('Nova Pro response received:', responseText.substring(0, 200) + '...');

    // Clean and parse response
    let cleaned = responseText.replace(/^\uFEFF/, '').trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
    }
    
    // Try to parse JSON
    let itinerary;
    try {
      itinerary = JSON.parse(cleaned);
    } catch (err) {
      console.error('Failed to parse JSON from Nova Pro:', err.message);
      // Extract JSON from text if embedded
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          itinerary = JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw {
            message: 'Invalid JSON format in Nova Pro response',
            cleanedText: cleaned
          };
        }
      } else {
        throw {
          message: 'No JSON found in Nova Pro response',
          cleanedText: cleaned
        };
      }
    }
    
    console.log('Parsed itinerary from Nova Pro');
    console.log('Itinerary Object:', JSON.stringify(itinerary, null, 2));
    console.log('Top-level keys:', Object.keys(itinerary));

      // Validate and map all required fields
      let destination = preferences.destination || itinerary.destination;
      if (!destination && itinerary.tripPlan?.destination) {
        // Nova Pro format: { tripPlan: { destination: "..." } }
        destination = itinerary.tripPlan.destination;
      }
      if (!destination && itinerary.tripOverview?.destination) {
        destination = itinerary.tripOverview.destination;
      }
      if (!destination || typeof destination !== 'string') {
        console.error('Missing or invalid destination:', destination);
        throw new Error('Invalid destination field');
      }

      // Destructure itinerary object for dailyItinerary
      // Nova Pro returns different field names, try multiple possibilities
      let dailyItinerary = Array.isArray(itinerary.dailyItinerary) ? itinerary.dailyItinerary : undefined;
      if (!dailyItinerary && Array.isArray(itinerary.itinerary?.dailyItinerary)) {
        dailyItinerary = itinerary.itinerary.dailyItinerary;
      }
      if (!dailyItinerary && Array.isArray(itinerary.tripPlan?.itinerary)) {
        // Nova Pro format: { tripPlan: { itinerary: [...] } }
        dailyItinerary = itinerary.tripPlan.itinerary;
      }
      if (!dailyItinerary && Array.isArray(itinerary.tripPlan?.dailyItinerary)) {
        dailyItinerary = itinerary.tripPlan.dailyItinerary;
      }
      if (!dailyItinerary && Array.isArray(itinerary.tripOverview?.dailyItinerary)) {
        dailyItinerary = itinerary.tripOverview.dailyItinerary;
      }
      // Try additional possible field names
      if (!dailyItinerary && Array.isArray(itinerary.days)) {
        dailyItinerary = itinerary.days;
      }
      if (!dailyItinerary && Array.isArray(itinerary.daily)) {
        dailyItinerary = itinerary.daily;
      }
      if (!dailyItinerary && Array.isArray(itinerary.dayByDay)) {
        dailyItinerary = itinerary.dayByDay;
      }
      if (!dailyItinerary && Array.isArray(itinerary.schedule)) {
        dailyItinerary = itinerary.schedule;
      }
      if (!dailyItinerary && Array.isArray(itinerary.plan)) {
        dailyItinerary = itinerary.plan;
      }
      if (!Array.isArray(dailyItinerary)) {
        console.error('Missing or invalid dailyItinerary:', dailyItinerary);
        console.error('Full itinerary object keys:', Object.keys(itinerary));
        if (itinerary.tripPlan) console.error('tripPlan keys:', Object.keys(itinerary.tripPlan));
        console.error('Full itinerary structure:', JSON.stringify(itinerary, null, 2));
        throw new Error('Invalid dailyItinerary structure');
      }

      // Robust startDate extraction: from itinerary, tripOverview, or preferences
      let startDate = itinerary.startDate || (itinerary.tripOverview && itinerary.tripOverview.startDate);
      if (!startDate || typeof startDate !== 'string') {
        // Try to extract from preferences
        startDate = preferences.startDate;
      }
      if (!startDate || typeof startDate !== 'string') {
        // Fallback: use date from first dailyItinerary entry if available
        if (Array.isArray(dailyItinerary) && dailyItinerary.length > 0 && dailyItinerary[0].date) {
          startDate = dailyItinerary[0].date;
        }
      }
      if (!startDate || typeof startDate !== 'string') {
        console.error('Missing or invalid startDate:', startDate);
        throw new Error('Invalid startDate field');
      }

      // Robust endDate extraction: from itinerary, tripOverview, or compute from startDate + duration
      let endDate = itinerary.endDate || (itinerary.tripOverview && itinerary.tripOverview.endDate);
      if (!endDate || typeof endDate !== 'string') {
        // Try to compute from startDate and duration
        let durationDays = itinerary.duration || (itinerary.tripOverview && itinerary.tripOverview.duration);
        if (startDate && typeof startDate === 'string' && durationDays && !isNaN(Number(durationDays))) {
          // Parse startDate as YYYY-MM-DD
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            start.setDate(start.getDate() + Number(durationDays));
            // Format as YYYY-MM-DD
            const yyyy = start.getFullYear();
            const mm = String(start.getMonth() + 1).padStart(2, '0');
            const dd = String(start.getDate()).padStart(2, '0');
            endDate = `${yyyy}-${mm}-${dd}`;
          }
        }
      }
      // If endDate is missing, calculate it from startDate + duration
      if (!endDate || typeof endDate !== 'string') {
        const duration = itinerary.tripPlan?.duration || itinerary.duration || 5;
        const startDateObj = new Date(startDate);
        startDateObj.setDate(startDateObj.getDate() + duration);
        const yyyy = startDateObj.getFullYear();
        const mm = String(startDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(startDateObj.getDate()).padStart(2, '0');
        endDate = `${yyyy}-${mm}-${dd}`;
        console.log(`✅ Calculated endDate from duration: ${endDate}`);
      }

      // Try multiple budget field locations (Nova Pro uses tripPlan.budget)
      let totalBudget = itinerary.totalBudget || itinerary.budget || 
                        itinerary.tripPlan?.budget || 
                        (itinerary.tripOverview && itinerary.tripOverview.budget);
      
      if (!totalBudget || typeof totalBudget !== 'number') {
        // Calculate from budgetBreakdown if available
        const breakdown = itinerary.tripPlan?.budgetBreakdown || itinerary.budgetBreakdown;
        if (breakdown) {
          totalBudget = Object.values(breakdown).reduce((sum, val) => sum + (Number(val) || 0), 0);
          console.log(`✅ Calculated totalBudget from breakdown: ${totalBudget}`);
        } else {
          totalBudget = 1000; // Default fallback
          console.warn('⚠️  Using default budget: 1000');
        }
      }

    // Validate and map recommendations with fallback for missing fields
    const recommendations = itinerary.recommendations || itinerary.tips || {};
    const packingTips = Array.isArray(recommendations.packingTips) ? recommendations.packingTips : (Array.isArray(recommendations) ? recommendations : []);
    const culturalTips = Array.isArray(recommendations.culturalTips) ? recommendations.culturalTips : [];
    const safetyTips = Array.isArray(recommendations.safetyTips) ? recommendations.safetyTips : [];

    // Fallback for endDate: if missing, use startDate + duration
    let computedEndDate = endDate;
    if (!computedEndDate || typeof computedEndDate !== 'string') {
      // Try to compute from startDate and duration
      let durationDays = itinerary.duration || (itinerary.tripOverview && itinerary.tripOverview.duration);
      if (startDate && typeof startDate === 'string' && durationDays && !isNaN(Number(durationDays))) {
        // Parse startDate as YYYY-MM-DD
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          start.setDate(start.getDate() + Number(durationDays));
          // Format as YYYY-MM-DD
          const yyyy = start.getFullYear();
          const mm = String(start.getMonth() + 1).padStart(2, '0');
          const dd = String(start.getDate()).padStart(2, '0');
          computedEndDate = `${yyyy}-${mm}-${dd}`;
        }
      }
    }
    // Format the response for the ai-agent/chatbot: send all mapped fields from itinerary
    // Use extracted/validated variables instead of raw itinerary fields
    return {
      tripId: itinerary.tripId,
      destination: destination,  // Use validated variable
      startDate: startDate,       // Use validated variable
      endDate: computedEndDate,   // Use computed variable
      duration: itinerary.duration || preferences.duration,
      travelers: itinerary.travelers || preferences.travelers,
      totalBudget: totalBudget,   // Use validated variable
      estimatedCost: itinerary.estimatedCost || totalBudget,
      currency: itinerary.currency || 'USD',
      travelStyle: itinerary.travelStyle || preferences.travelStyle,
      seasonNote: itinerary.seasonNote,
      dailyItinerary: dailyItinerary,  // Use validated variable
      budgetBreakdown: itinerary.budgetBreakdown || itinerary.tripPlan?.budgetBreakdown,
      accommodationDetails: itinerary.accommodationDetails,
      culturalHighlights: itinerary.culturalHighlights,
      foodExperiences: itinerary.foodExperiences,
      practicalInfo: itinerary.practicalInfo,
      tips: itinerary.tips || [],
      transportation: itinerary.transportation,
      // fallback fields for compatibility
      importantNotes: itinerary.importantNotes || [],
      packingRecommendations: packingTips,
      accommodation: itinerary.accommodation || {},
      recommendations: {
        packingTips: packingTips,
        culturalTips: culturalTips,
        safetyTips: safetyTips
      },
      existingUserPreferences: preferences.existingUserPreferences || {},
      interests: preferences.interests || []
    };
  } catch (err) {
    console.error('Error calling Bedrock:', err);
    // Do NOT attach bedrockRaw to error object or response
    throw err;
  }
};

