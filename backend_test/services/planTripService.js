// Bedrock direct integration (JavaScript)
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const TripAdvisorService = require('./TripAdvisorService');

// You may want to move these to environment variables
const REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1';

const client = new BedrockRuntimeClient({ region: REGION });
const tripAdvisorService = new TripAdvisorService();

async function buildTripPlanningPrompt(preferences, tripAdvisorData = null) {
  let prompt = `You are a travel expert AI. Plan a comprehensive trip itinerary as a JSON object for the following preferences:\n\n`;
  prompt += `Travel Preferences: ${JSON.stringify(preferences, null, 2)}\n\n`;

  // Add TripAdvisor data if available
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

  prompt += `Create a detailed daily itinerary JSON with the following structure:
{
  "destination": "destination name",
  "duration": number of days,
  "budget": total budget,
  "dailyItinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "HH:MM",
          "activity": "activity name",
          "description": "detailed description",
          "location": "specific location",
          "cost": estimated cost,
          "rating": "rating if available",
          "reviewCount": "number of reviews if available"
        }
      ],
      "totalCost": estimated daily cost
    }
  ],
  "budgetBreakdown": {
    "accommodation": estimated cost,
    "food": estimated cost,
    "activities": estimated cost,
    "transportation": estimated cost,
    "miscellaneous": estimated cost
  },
  "travelTips": ["tip1", "tip2", "tip3"],
  "culturalHighlights": ["highlight1", "highlight2"],
  "foodExperiences": ["experience1", "experience2"]
}

Use the real TripAdvisor data above to create specific, accurate recommendations with actual ratings and review counts.`;

  return prompt;
}

exports.planTrip = async (userId, preferences, token) => {
  // Get TripAdvisor data for the destination
  let tripAdvisorData = null;
  if (preferences.destination) {
    try {
      tripAdvisorData = await tripAdvisorService.getTravelDataForAI(preferences.destination, preferences);
      console.log('TripAdvisor data retrieved for destination:', preferences.destination);
    } catch (error) {
      console.error('TripAdvisor data retrieval failed:', error.message);
      // Continue without TripAdvisor data
    }
  }

  const prompt = await buildTripPlanningPrompt(preferences, tripAdvisorData);
  const input = {
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: 4000,
        temperature: 0.7,
        topP: 0.9
      }
    })
  };

  let responseBody = '';
  try {
    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    let responseBody = response?.body?.toString('utf-8') || '{}';
    // If response is a comma-separated list of numbers, decode as ASCII
    if (/^[0-9]+(,[0-9]+)*$/.test(responseBody.trim())) {
      const asciiArr = responseBody.split(',').map(Number);
      responseBody = String.fromCharCode(...asciiArr);
    }
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseBody);
    } catch (err) {
      throw {
        message: 'Invalid JSON format in Bedrock response',
        cleanedText: responseBody
      };
    }

      // Parse itinerary JSON from Titan response
      let itinerary = parsedResponse;
      if (parsedResponse.results && parsedResponse.results[0] && parsedResponse.results[0].outputText) {
        let text = parsedResponse.results[0].outputText;
        if (typeof text === 'string' && text.startsWith('```')) {
          text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
        }
        try {
          itinerary = JSON.parse(text);
        } catch (err) {
          throw {
            message: 'Invalid JSON format in Titan response',
            cleanedText: text
          };
        }
      }
      console.log('Parsed Response:', parsedResponse);
      console.log('Itinerary Object:', itinerary);

      // Validate and map all required fields
      let destination = preferences.destination || itinerary.destination;
      if (!destination && itinerary.tripOverview && itinerary.tripOverview.destination) {
        destination = itinerary.tripOverview.destination;
      }
      if (!destination || typeof destination !== 'string') {
        console.error('Missing or invalid destination:', destination);
        throw new Error('Invalid destination field');
      }

      // Destructure itinerary object for dailyItinerary
      let dailyItinerary = Array.isArray(itinerary.dailyItinerary) ? itinerary.dailyItinerary : undefined;
      if (!dailyItinerary && Array.isArray(itinerary.itinerary?.dailyItinerary)) {
        dailyItinerary = itinerary.itinerary.dailyItinerary;
      }
      if (!dailyItinerary && Array.isArray(itinerary.tripOverview?.dailyItinerary)) {
        dailyItinerary = itinerary.tripOverview.dailyItinerary;
      }
      if (!Array.isArray(dailyItinerary)) {
        console.error('Missing or invalid dailyItinerary:', dailyItinerary);
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
      if (!endDate || typeof endDate !== 'string') {
        console.error('Missing or invalid endDate:', endDate);
        throw new Error('Invalid endDate field');
      }

      const totalBudget = itinerary.totalBudget || itinerary.budget || (itinerary.tripOverview && itinerary.tripOverview.budget);
      if (!totalBudget || typeof totalBudget !== 'number') {
        console.error('Missing or invalid totalBudget:', totalBudget);
        throw new Error('Invalid totalBudget field');
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
    return {
      tripId: itinerary.tripId,
      destination: itinerary.destination,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      duration: itinerary.duration,
      travelers: itinerary.travelers,
      totalBudget: itinerary.totalBudget,
      estimatedCost: itinerary.estimatedCost,
      currency: itinerary.currency,
      travelStyle: itinerary.travelStyle,
      seasonNote: itinerary.seasonNote,
      dailyItinerary: itinerary.dailyItinerary,
      budgetBreakdown: itinerary.budgetBreakdown,
      accommodationDetails: itinerary.accommodationDetails,
      culturalHighlights: itinerary.culturalHighlights,
      foodExperiences: itinerary.foodExperiences,
      practicalInfo: itinerary.practicalInfo,
      tips: itinerary.tips,
      // fallback fields for compatibility
      importantNotes: itinerary.importantNotes || [],
      packingRecommendations: itinerary.packingRecommendations || [],
      accommodation: itinerary.accommodation || {},
      recommendations: itinerary.recommendations || {},
      existingUserPreferences: preferences.existingUserPreferences || {},
      interests: preferences.interests || []
    };
  } catch (err) {
    console.error('Error calling Bedrock:', err);
    // Do NOT attach bedrockRaw to error object or response
    throw err;
  }
};

