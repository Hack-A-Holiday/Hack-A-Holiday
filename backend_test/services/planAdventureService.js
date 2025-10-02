// Bedrock direct integration (JavaScript)
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514-v1:0';

const client = new BedrockRuntimeClient({ region: REGION });

function buildAdventurePlanningPrompt(preferences) {
  return `You are an adventure travel expert AI. Plan an adventure for the following preferences as a JSON itinerary.\nPreferences: ${JSON.stringify(preferences, null, 2)}`;
}

exports.planAdventure = async (userId, preferences, token) => {
  const prompt = buildAdventurePlanningPrompt(preferences);
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
    responseBody = response?.body?.toString('utf-8') || '{}';
    console.log('Raw Bedrock response:', responseBody);

    // Clean and parse Bedrock response
    let cleaned = responseBody.replace(/^\uFEFF/, '');
    if (typeof cleaned === 'string' && /^[0-9]+(,[0-9]+)*$/.test(cleaned.trim())) {
      const asciiArr = cleaned.split(',').map(Number);
      cleaned = String.fromCharCode(...asciiArr);
    }
    if (typeof cleaned === 'string' && cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
    }
    cleaned = cleaned.replace(/\n/g, '').trim();
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
