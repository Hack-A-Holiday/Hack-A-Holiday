// Bedrock direct integration using AWS Nova Pro (JavaScript)
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.amazon.nova-pro-v1:0'; // Using Nova Pro

const client = new BedrockRuntimeClient({ region: REGION });

function buildAdventurePlanningPrompt(preferences) {
  return `You are an adventure travel expert AI powered by AWS Nova Pro. Plan an exciting adventure based on these preferences and return a detailed JSON itinerary.

Preferences: ${JSON.stringify(preferences, null, 2)}

Create a comprehensive adventure plan with:
- Day-by-day itinerary
- Activities and experiences
- Accommodation suggestions
- Budget estimates
- Safety tips
- Packing recommendations

Format as valid JSON.`;
}

exports.planAdventure = async (userId, preferences, token) => {
  const prompt = buildAdventurePlanningPrompt(preferences);
  
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
    
    // Extract text from Converse API response
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
    console.log('Cleaned Bedrock response:', cleaned);
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleaned);
    } catch (err) {
      throw {
        message: 'Invalid JSON format in cleaned Bedrock response',
        bedrockRaw: responseBody,
        cleanedText: cleaned
      };
    }
    console.log('Parsing attempt completed for cleaned response.');

    const itinerary = parsedResponse.itinerary || parsedResponse;
    console.log('Parsed Response:', parsedResponse);
    console.log('Itinerary Object:', itinerary);

    let destination = itinerary.destination;
    if (!destination && itinerary.tripOverview && itinerary.tripOverview.destination) {
      destination = itinerary.tripOverview.destination;
    }
    if (!destination || typeof destination !== 'string') {
      console.error('Missing or invalid destination:', destination);
      const error = new Error('Invalid destination field');
      error.bedrockRaw = responseBody;
      throw error;
    }

    const startDate = itinerary.startDate || (itinerary.tripOverview && itinerary.tripOverview.startDate);
    if (!startDate || typeof startDate !== 'string') {
      console.error('Missing or invalid startDate:', startDate);
      const error = new Error('Invalid startDate field');
      error.bedrockRaw = responseBody;
      throw error;
    }

    const endDate = itinerary.endDate || (itinerary.tripOverview && itinerary.tripOverview.endDate);
    if (!endDate || typeof endDate !== 'string') {
      console.error('Missing or invalid endDate:', endDate);
      const error = new Error('Invalid endDate field');
      error.bedrockRaw = responseBody;
      throw error;
    }

    const totalBudget = itinerary.totalBudget || itinerary.budget || (itinerary.tripOverview && itinerary.tripOverview.budget);
    if (!totalBudget || typeof totalBudget !== 'number') {
      console.error('Missing or invalid totalBudget:', totalBudget);
      const error = new Error('Invalid totalBudget field');
      error.bedrockRaw = responseBody;
      throw error;
    }

    const dailyItinerary = itinerary.dailyItinerary || itinerary.itinerary || (itinerary.tripOverview && itinerary.tripOverview.dailyItinerary);
    if (!dailyItinerary || !Array.isArray(dailyItinerary)) {
      console.error('Missing or invalid dailyItinerary:', dailyItinerary);
      const error = new Error('Invalid dailyItinerary structure');
      error.bedrockRaw = responseBody;
      throw error;
    }

    const recommendations = itinerary.recommendations || itinerary.tips || {};
    const packingTips = Array.isArray(recommendations.packingTips) ? recommendations.packingTips : (Array.isArray(recommendations) ? recommendations : []);
    const culturalTips = Array.isArray(recommendations.culturalTips) ? recommendations.culturalTips : [];
    const safetyTips = Array.isArray(recommendations.safetyTips) ? recommendations.safetyTips : [];

    return {
      destination: destination,
      startDate: startDate,
      endDate: endDate,
      totalBudget: totalBudget,
      dailyItinerary: dailyItinerary,
      recommendations: {
        packingTips: packingTips,
        culturalTips: culturalTips,
        safetyTips: safetyTips
      },
      totalCost: itinerary.totalCost || itinerary.totalEstimatedCost,
      budgetRemaining: itinerary.budgetRemaining,
      seasonalNote: itinerary.seasonalNote
    };
  } catch (err) {
    console.error('Error calling Bedrock:', err);
    if (err && responseBody) {
      err.bedrockRaw = responseBody;
    }
    throw err;
  }
};
