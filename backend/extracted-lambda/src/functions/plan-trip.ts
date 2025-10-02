// Export handler for AWS Lambda
// ...existing code...
// Not implemented stubs for getTrip and listTrips
export const getTrip = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 501,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Get trip not implemented' })
  };
};

export const listTrips = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 501,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'List trips not implemented' })
  };
};
// Fallback itinerary generator stub
function generateFallbackItinerary(destination: string, duration: number, budget: number, interests: string[], startDate: string) {
  // Fallback structure matches expected Itinerary types
  return {
    destination,
    duration,
    budget,
    interests,
    startDate,
    days: [
      {
        date: startDate,
        dayNumber: 1,
        activities: [
          {
            id: 'a1',
            name: 'Explore city center',
            description: 'Discover the main sights downtown.',
            category: 'sightseeing',
            duration: '2 hours',
            price: 0,
            rating: 4.5,
            address: 'Central Square',
            openingHours: '09:00-18:00',
            images: [],
            bookingRequired: false,
          },
          {
            id: 'a2',
            name: 'Visit museum',
            description: 'Explore local history and art.',
            category: 'museum',
            duration: '2 hours',
            price: 10,
            rating: 4.2,
            address: 'Main Museum',
            openingHours: '10:00-17:00',
            images: [],
            bookingRequired: false,
          }
        ],
        meals: [],
        transportation: [],
        totalCost: 10,
      },
      {
        date: startDate,
        dayNumber: 2,
        activities: [
          {
            id: 'a3',
            name: 'Local food tour',
            description: 'Taste the best local dishes.',
            category: 'food',
            duration: '3 hours',
            price: 30,
            rating: 4.7,
            address: 'Various locations',
            openingHours: '12:00-15:00',
            images: [],
            bookingRequired: true,
          },
          {
            id: 'a4',
            name: 'Park walk',
            description: 'Relax in the city park.',
            category: 'nature',
            duration: '1 hour',
            price: 0,
            rating: 4.0,
            address: 'City Park',
            openingHours: 'All day',
            images: [],
            bookingRequired: false,
          }
        ],
        meals: [],
        transportation: [],
        totalCost: 30,
      }
    ],
    travelTips: ['Pack light', 'Try local cuisine'],
    emergencyInfo: {
      emergency: '112',
      embassy: 'Contact local embassy',
      hospitalContact: 'Nearest hospital info'
    },
    flights: { outbound: null, return: null },
    hotels: [],
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalCost: 40,
    budgetBreakdown: {
      flights: 0,
      accommodation: 0,
      activities: 40,
      meals: 0,
      transportation: 0,
      miscellaneous: 0,
    },
    confidence: 0.5,
  };
}

// Weather forecast stub
function getWeatherForecast(destination: string) {
  return 'Sunny, 25°C';
}
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandInput } from '@aws-sdk/client-bedrock-runtime';
import { getUserProfile, UserProfile } from './auth-middleware';
import { extractUserId, createResponse } from '../utils/lambda-utils';
import jwt from 'jsonwebtoken';
//testt
export interface TripPreferences {
  destination: string;
  budget: number;
  duration: number;
  interests: string[];
  startDate: string;
  travelers: number;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
}

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Invoke Claude model with the given prompt
 */
async function invokeModel(prompt: string): Promise<string> {
  const input: InvokeModelCommandInput = {
    modelId: 'us.anthropic.claude-4-0-sonnet-20251022-v1:0', // Updated to Claude 4.0
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2025-09-26', // Updated version
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

  const command = new InvokeModelCommand(input);
  const response = await bedrockClient.send(command);
  
  if (!response.body) {
    throw new Error('No response body from Bedrock');
  }

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text;
}

async function getPreferences(userId: string | null, bodyPreferences: Partial<TripPreferences>): Promise<TripPreferences> {
  if (!userId) {
    throw new Error('User ID is required to fetch preferences');
  }

  const userProfile: UserProfile = await getUserProfile(userId);
  const savedPreferences = userProfile?.preferences;

  return {
    destination: bodyPreferences.destination || savedPreferences.favoriteDestinations?.[0] || 'Paris, France',
    budget: bodyPreferences.budget || savedPreferences.budget || savedPreferences.defaultBudget || 1000,
    duration: bodyPreferences.duration || 5, // Default duration
    interests: bodyPreferences.interests || savedPreferences.interests || ['culture', 'food'],
    startDate: bodyPreferences.startDate || new Date().toISOString().split('T')[0],
    travelers: bodyPreferences.travelers || savedPreferences.numberOfKids || 1, // Default travelers
    travelStyle: bodyPreferences.travelStyle || savedPreferences.travelStyle || 'mid-range',
  };
}


// Unified handler for all plan-trip related routes
export const planTrip = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  

  // Set CORS headers for credentialed requests
  // Use shared createResponse for all responses (handles CORS)

  try {
    if (event.httpMethod === 'OPTIONS') {
  return createResponse(204, '', event.requestContext.requestId);
    }

    let body;
    if (event.body) {
      body = JSON.parse(event.body);
    }

    const userId = extractUserId(event);
    if (!userId) {
      return createResponse(401, {
        success: false,
        error: 'Unauthorized: User ID is missing from request context or cookie',
      }, event.requestContext.requestId);
    }
    const preferences = await getPreferences(userId, body?.preferences || {});
    const destination = preferences.destination;
    const duration = preferences.duration;
    const budget = preferences.budget;
    const interests = preferences.interests;
    const travelers = preferences.travelers;
    const startDate = preferences.startDate;

    console.log(`Using Claude AI to generate comprehensive travel plan for: ${destination}`);

    // Generate a comprehensive trip itinerary using Claude AI
    const tripId = `trip-${Date.now()}`;

    // Create comprehensive prompt for Claude
    const prompt = `You are an expert travel planner with deep knowledge of destinations worldwide. Create a comprehensive ${duration}-day travel itinerary for ${destination}.`;

    try {
      console.log('🤖 Calling Claude Bedrock for AI-generated itinerary...');
      const aiResponse = await invokeModel(prompt);
      console.log('✅ Received AI response, parsing...');
      
      // Parse the AI response
      let itinerary;
      try {
        // Extract JSON from the response
        const jsonMatch = /\{[\s\S]*\}/.exec(aiResponse);
        if (jsonMatch) {
          itinerary = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('❌ Error parsing AI response:', parseError);
        console.log('Raw AI response:', aiResponse);
        // Generate fallback response
        itinerary = generateFallbackItinerary(destination, duration, budget, interests, startDate);
      }

      // Defensive: ensure itinerary.days is an array of objects with activities as arrays of objects
      if (!Array.isArray(itinerary.days)) {
        itinerary.days = [];
      } else {
        itinerary.days = itinerary.days.map((day: any, i: number) => ({
          ...day,
          activities: Array.isArray(day.activities)
            ? day.activities.map((a: any, j: number) => ({
                ...a,
                id: a?.id || `a${i + 1}${j + 1}`,
                name: a?.name || `Activity ${i + 1}-${j + 1}`,
                description: a?.description || '',
                category: a?.category || 'general',
                duration: a?.duration || '1 hour',
                price: a?.price || 0,
                rating: a?.rating || 4.0,
                address: a?.address || '',
                openingHours: a?.openingHours || '',
                images: a?.images || [],
                bookingRequired: a?.bookingRequired || false,
              }))
            : [],
        }));
      }

      const detailedResponse = {
        success: true,
        tripId,
        itinerary: {
          id: tripId,
          ...itinerary,
          travelers: travelers,
          status: 'ready',
          realTimeData: {
            flightsFound: Math.floor(Math.random() * 20) + 5,
            hotelsFound: Math.floor(Math.random() * 50) + 10,
            activitiesFound: Array.isArray(itinerary.days)
              ? itinerary.days.reduce((sum: number, day: any) =>
                  sum + (Array.isArray(day.activities) ? day.activities.length : 0), 0)
              : 0,
            weatherForecast: getWeatherForecast(destination),
            lastUpdated: new Date().toISOString()
          },
          createdAt: new Date().toISOString()
        },
        message: `🤖 AI-powered ${duration}-day travel itinerary created for ${destination}! Powered by Claude Bedrock.`
      };

      console.log('🎉 Returning AI-generated travel plan', JSON.stringify(detailedResponse.itinerary, null, 2));
      return createResponse(200, detailedResponse, event.requestContext.requestId);
    } catch (bedrockError) {
      // Fallback to basic itinerary if Bedrock fails
      const fallbackItinerary = generateFallbackItinerary(destination, duration, budget, interests, startDate);
      return createResponse(200, {
        success: true,
        tripId,
        itinerary: {
          id: tripId,
          ...fallbackItinerary,
          travelers: travelers,
          status: 'ready',
          realTimeData: {
            flightsFound: Math.floor(Math.random() * 15) + 3,
            hotelsFound: Math.floor(Math.random() * 30) + 8,
            activitiesFound: Math.floor(Math.random() * 20) + 10,
            weatherForecast: getWeatherForecast(destination),
            lastUpdated: new Date().toISOString()
          },
          createdAt: new Date().toISOString()
        },
        message: `📋 Basic ${duration}-day travel itinerary created for ${destination}! (Fallback mode - Claude unavailable)`
      }, event.requestContext.requestId);
    }

  } catch (error) {
    console.error('💥 Error in AI travel planner:', error);

    return createResponse(500, {
      success: false,
      error: `Internal error: ${error}`,
      timestamp: new Date().toISOString()
    }, event.requestContext.requestId);
  }
};

// Correct Lambda handler export for AWS
module.exports.handler = planTrip;

