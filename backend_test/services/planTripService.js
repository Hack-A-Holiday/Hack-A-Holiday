// Bedrock direct integration (JavaScript)
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// You may want to move these to environment variables
const REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514-v1:0';

const client = new BedrockRuntimeClient({ region: REGION });

function buildTripPlanningPrompt(preferences) {
  // You can expand this prompt as needed
  return `You are a travel expert AI. Plan a trip for the following preferences as a JSON itinerary.\nPreferences: ${JSON.stringify(preferences, null, 2)}`;
}

exports.planTrip = async (userId, preferences, token) => {
  const prompt = buildTripPlanningPrompt(preferences);
  const input = {
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
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

      // Always parse itinerary JSON from content[0].text if present
      let itinerary = parsedResponse;
      if (parsedResponse.content && Array.isArray(parsedResponse.content) && parsedResponse.content[0]?.text) {
        let text = parsedResponse.content[0].text;
        if (typeof text === 'string' && text.startsWith('```')) {
          text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
        }
        try {
          itinerary = JSON.parse(text);
        } catch (err) {
          throw {
            message: 'Invalid JSON format in Claude content.text',
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
