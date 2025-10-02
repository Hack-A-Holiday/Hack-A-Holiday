  message: 'AI-powered travel itinerary created for ' + (formattedItinerary.destination || '') + '!',
// DEPLOY TEST: This line is added to force a Lambda redeploy
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandInput } from '@aws-sdk/client-bedrock-runtime';
import { getUserProfile } from '../services/user-service';
import { AuthService } from '../services/auth-service';
import { UserProfile } from '../types';

export type TravelStyle = 'budget' | 'mid-range' | 'luxury';

export interface TripPreferences {
  destination: string;
  budget: number;
  duration: number;
  interests: string[];
  startDate: string;
  travelers: number;
  travelStyle: TravelStyle;
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

    const userProfile: Partial<UserProfile> = await getUserProfile(userId);
    const savedPreferences: UserProfile['preferences'] = userProfile.preferences || {
      defaultBudget: 1000,
      favoriteDestinations: [],
      interests: [],
      travelStyle: 'mid-range',
      dietaryRestrictions: [],
      accessibility: [],
    };

  return {
    destination: bodyPreferences.destination || savedPreferences.favoriteDestinations?.[0] || 'Paris, France',
    budget: bodyPreferences.budget || savedPreferences.budget || savedPreferences.defaultBudget || 1000,
    duration: bodyPreferences.duration || 5, // Default duration
    interests: bodyPreferences.interests || savedPreferences.interests || ['culture', 'food'],
    startDate: bodyPreferences.startDate || new Date().toISOString().split('T')[0],
  travelers: bodyPreferences.travelers || savedPreferences.travelers || 1, // Default travelers
    travelStyle: (bodyPreferences.travelStyle || savedPreferences.travelStyle || 'mid-range'),
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  function corsResponse(statusCode: number, body: any) {
    return {
      statusCode,
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    };
    try {
      console.log('🤖 AI-Powered planTrip handler started with Claude Bedrock');

      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,HEAD,OPTIONS'
      };
      console.log('Event received:', JSON.stringify({
        httpMethod: event.httpMethod,
        path: event.path,
        body: event.body ? event.body.substring(0, 200) : 'no body'
      }));

      let body;
      if (event.body) {
        body = JSON.parse(event.body);
      }

      // Try to get userId from x-user-id header, else from JWT cookie (case-insensitive), else from Authorization header
      let userId: string | null = null;
      const cookieHeader = event.headers['cookie'] || event.headers['Cookie'];
      if (event.headers?.['x-user-id']) {
        userId = event.headers['x-user-id'];
      } else if (cookieHeader) {
        const authService = new AuthService();
        const token = authService.extractTokenFromCookie(cookieHeader);
        if (token) {
          const payload = authService.verifyToken(token);
          userId = payload?.sub || null;
        }
      }

      // Get trip preferences
      const preferences = await getPreferences(userId, body || {});
      const { destination, budget, duration, interests, startDate, travelers, travelStyle } = preferences;

      // Build prompt
      const prompt = `You are a local travel expert. Create a detailed travel itinerary for ${travelers} traveler(s) visiting ${destination} for ${duration} days, starting on ${startDate}, with a total budget of $${budget}. Interests: ${interests.join(', ')}. Travel style: ${travelStyle}.`;

      // Call Claude Bedrock
      let aiResponse;
      try {
        console.log('🤖 Calling Claude Bedrock for AI-generated itinerary...');
        aiResponse = await invokeModel(prompt);
      } catch (bedrockError) {
        console.error('❌ Bedrock service error:', bedrockError);
        return corsResponse(500, {
          success: false,
          error: 'Failed to plan trip with Bedrock',
          message: 'Claude Bedrock service error',
          bedrockRaw: typeof aiResponse !== 'undefined' ? aiResponse : null
        });
      }

    // Always decode comma-separated byte string if needed
    let decodedResponse = aiResponse;
    if (typeof aiResponse === 'string' && aiResponse.match(/^([0-9]+,)+[0-9]+$/)) {
      const byteArr = aiResponse.split(',').map(Number);
      decodedResponse = Buffer.from(byteArr).toString('utf8');
      console.log('Decoded AI response from comma-separated bytes:', decodedResponse);
    } else {
      console.log('Raw AI response:', decodedResponse);
    }

    // Try to extract JSON from decoded response
    let itinerary;
    let errorExtracting = null;
    try {
      const firstCurly = decodedResponse.indexOf('{');
      const lastCurly = decodedResponse.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1) {
        const jsonString = decodedResponse.substring(firstCurly, lastCurly + 1);
        itinerary = JSON.parse(jsonString);
      } else {
        throw new Error('No JSON object found in Claude response');
      }
    } catch (jsonErr) {
      errorExtracting = jsonErr;
      console.error('❌ Error extracting JSON from Claude response:', jsonErr);
    }
    if (!itinerary) {
      return corsResponse(500, {
        success: false,
        error: 'Failed to parse Claude response as JSON',
        rawClaudeResponse: decodedResponse,
        errorExtracting: errorExtracting ? String(errorExtracting) : undefined,
        bedrockRaw: typeof aiResponse !== 'undefined' ? aiResponse : null
      });
    }

    // Reformat itinerary for frontend
    const formattedItinerary = {
      ...itinerary,
      summary: itinerary.summary || itinerary.overview || '',
      days: Array.isArray(itinerary.dailyPlans) ? itinerary.dailyPlans.map((day: any, idx: number) => ({
        day: idx + 1,
        activities: day.activities || [],
        notes: day.notes || ''
      })) : Array.isArray(itinerary.dailyItinerary) ? itinerary.dailyItinerary.map((day: any, idx: number) => ({
        day: idx + 1,
        activities: day.activities || [],
        notes: day.notes || ''
      })) : [],
    };
    const mapped = {
      success: true,
      destination: formattedItinerary.destination,
          const mapped = {
            success: true,
            destination: formattedItinerary.destination,
            totalBudget: formattedItinerary.totalCost || formattedItinerary.totalBudget,
            days: formattedItinerary.days,
            summary: formattedItinerary.summary,
            travelTips: formattedItinerary.travelTips,
            emergencyInfo: formattedItinerary.emergencyInfo,
            message: 'AI-powered travel itinerary created for ' + (formattedItinerary.destination || '') + '!',
            bedrockRaw: typeof aiResponse !== 'undefined' ? aiResponse : null
          };
          console.log('Returning response:', JSON.stringify(mapped));
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(mapped)
          };

        errorExtracting = jsonErr;
        console.error('❌ Error extracting JSON from Claude response:', jsonErr);
      }
      if (!itinerary) {
        return corsResponse(500, {
          success: false,
          error: 'Failed to parse Claude response as JSON',
          rawClaudeResponse: decodedResponse,
          errorExtracting: errorExtracting ? String(errorExtracting) : undefined
        });
      }
      // Modify the response to include only relevant fields
      const detailedResponse = {
        success: true,
          const mapped = {
          const mapped = {
            success: true,
            destination: formattedItinerary.destination,
            totalBudget: formattedItinerary.totalCost || formattedItinerary.totalBudget,
            days: formattedItinerary.days,
            summary: formattedItinerary.summary,
            travelTips: formattedItinerary.travelTips,
            emergencyInfo: formattedItinerary.emergencyInfo,
            message: 'AI-powered travel itinerary created for ' + (formattedItinerary.destination || '') + '!',
            bedrockRaw: typeof aiResponse !== 'undefined' ? aiResponse : null
          };
          console.log('Returning response:', JSON.stringify(mapped));
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(mapped)
          };
        message: 'Claude Bedrock service error',
      });
    }

  } catch (error) {
    console.error('💥 Error in AI travel planner:', error);
    return corsResponse(500, {
      success: false,
  error: 'Internal error: ' + error,
      timestamp: new Date().toISOString()
    });
  }


}
// Fallback itinerary generator
function generateFallbackItinerary(destination: string, duration: number, budget: number, interests: string[], startDate: string) {
  const dailyBudget = Math.round(budget / duration);
  
  return {
    destination: destination,
    duration: duration,
    totalCost: budget,
    overview: {
      destination: destination,
      bestTimeToVisit: "Spring to Fall",
      currency: "Local currency",
      language: "Local language",
      topHighlights: ["City center", "Cultural attractions", "Local cuisine"]
    },
    dailyPlans: Array.from({ length: duration }, (_, index) => {
      const day = index + 1;
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      
      return {
        day: day,
        date: date.toISOString().split('T')[0],
        theme: getGenericDayTheme(day, duration),
        activities: {
          morning: [{
            name: 'Morning ' + (interests[0] || 'sightseeing') + ' activity',
            description: 'Explore ' + destination + "'s " + (interests[0] || 'main attractions'),
            duration: "3 hours"
          }],
          afternoon: [{
            name: 'Afternoon ' + (interests[1] || 'cultural') + ' experience',
            description: 'Discover local ' + (interests[1] || 'culture and history'),
            duration: "4 hours"
          }],
          evening: [{
            name: "Evening dining and relaxation",
            description: "Experience local cuisine and atmosphere",
            duration: "2 hours"
          }]
        },
        meals: {
          breakfast: {
            name: "Local breakfast spot",
            cuisine: "Local",
            description: "Start your day with authentic local breakfast"
          },
          lunch: {
            name: "Traditional restaurant",
            cuisine: "Traditional",
            description: "Authentic local lunch experience"
          },
          dinner: {
            name: "Recommended dinner venue",
            cuisine: "Local specialties",
            description: "End your day with signature local dishes"
          }
        },
        transportation: "Public transport and walking",
        totalCost: dailyBudget
      };
    }),
    travelTips: [
      "Research local customs and etiquette",
      "Keep important documents safe",
      "Learn basic local phrases",
      "Stay hydrated and dress appropriately"
    ],
    emergencyInfo: {
      emergency: "Contact local emergency services",
      embassy: "Contact your embassy",
      hospitalContact: "Local hospital information"
    }
  };
}

function getGenericDayTheme(day: number, totalDays: number): string {
  const themes = [
    'Arrival & City Overview',
    'Cultural Exploration', 
    'Local Experiences',
    'Adventure & Discovery',
    'Relaxation & Shopping',
    'Hidden Gems',
    'Departure & Last Discoveries'
  ];
  
  if (day === 1) return 'Arrival & City Overview';
  if (day === totalDays) return 'Departure & Last Discoveries';
  
  return themes[day % themes.length] || 'Exploration Day';
}

function getWeatherForecast(destination: string): string {
  const weather: Record<string, string> = {
    'Mumbai': 'Warm and humid, 28-32°C',
    'Paris': 'Mild and pleasant, 18-22°C',
    'Tokyo': 'Comfortable, 20-25°C',
    'Marrakech': 'Warm and dry, 25-30°C',
    'London': 'Cool and cloudy, 12-18°C',
    'New York': 'Variable, 15-23°C',
    'Barcelona': 'Mediterranean, 20-26°C'
  };
  
  const cityName = destination.split(',')[0];
  return weather[cityName] || 'Pleasant weather expected';
}

// Stub exports for other functions
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

export async function planTripWithPreferences(userId: string, destination: string, requestData: Partial<TripPreferences>) {
  const userProfile = await getUserProfile(userId);

  // Merge user preferences with request data
  const tripPreferences: TripPreferences = {
    destination,
    budget: requestData.budget ?? userProfile.preferences.budget ?? 1000,
    duration: requestData.duration ?? userProfile.preferences.duration ?? 7,
    interests: requestData.interests ?? userProfile.preferences.interests ?? [],
    startDate: requestData.startDate ?? userProfile.preferences.startDate ?? new Date().toISOString(),
    travelers: requestData.travelers ?? userProfile.preferences.travelers ?? 1,
  travelStyle: (requestData.travelStyle ?? userProfile.preferences.travelStyle ?? 'mid-range'),
  };

  // Validate preferences
  if (!tripPreferences.budget || !tripPreferences.duration) {
    throw new Error('Missing required preferences: budget or duration');
  }

  if (!destination) {
    throw new Error('Destination is required');
  }

  tripPreferences.destination = destination;

  // Plan trip logic
  const tripPlan = await generateTripPlan(destination, tripPreferences);

  return tripPlan;
}

async function generateTripPlan(destination: string, preferences: TripPreferences) {
  // Simulate trip planning logic
  return {
    destination,
    preferences,
    itinerary: ['Day 1: Explore', 'Day 2: Adventure'],
  };
}
