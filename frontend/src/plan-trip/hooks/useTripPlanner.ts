import { useState } from 'react';
import { useRouter } from 'next/router';
import { TripPreferences, ApiResponse, Itinerary } from '../types';
import { parseItineraryFromAI, buildItineraryObject, buildConversationalMessage } from '../utils';

interface UseTripPlannerProps {
  userToken?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPreferences?: any;
}

export const useTripPlanner = ({
  userToken,
  userId,
  userEmail,
  userName,
  userPreferences
}: UseTripPlannerProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planTrip = async (
    tripPreferences: TripPreferences,
    travelPrefs: any,
    originCity?: string
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(userToken && { Authorization: `Bearer ${userToken}` }),
    };

    // Build the trip message
    const tripMessage = `I want to plan a trip with the following details:
- Traveling from: ${originCity || 'Not specified'}
- Destination: ${tripPreferences.destination}
- Duration: ${tripPreferences.duration} days
- Budget: $${tripPreferences.budget}
- Number of travelers: ${tripPreferences.travelers}
- Start date: ${tripPreferences.startDate}
- Travel style: ${tripPreferences.travelStyle}
- Interests: ${tripPreferences.interests.join(', ')}

Please help me create a detailed itinerary for this trip from ${originCity || 'my location'} to ${tripPreferences.destination}. Include daily activities, recommendations for hotels and flights${originCity ? ` (departing from ${originCity})` : ''}, and make sure it fits within my budget and preferences.`;

    const requestBody = {
      message: tripMessage,
      conversationId: `trip_${Date.now()}`,
      preferences: {
        ...travelPrefs,
        budget: tripPreferences.budget,
        travelers: tripPreferences.travelers,
        travelStyle: tripPreferences.travelStyle,
        interests: tripPreferences.interests,
        existingUserPreferences: userPreferences || {},
      },
      userContext: {
        userId: userId || 'anonymous',
        email: userEmail,
        name: userName,
        tripDetails: {
          ...tripPreferences,
          origin: originCity
        }
      }
    };

    try {
      const response = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });
      
      if (!response.ok) {
        let errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        console.error('API Error Response:', errorData);
        throw new Error(`API responded with status ${response.status}: ${response.statusText} - ${errorData.message || errorData.error}`);
      }
      
      const data = await response.json();
      
      console.log('AI Chat Response:', data);
      console.log('Response type:', typeof data.data?.response);
      console.log('Is array:', Array.isArray(data.data?.response));

      // Parse AI response to extract daily itinerary
      let aiResponseText;
      if (Array.isArray(data.data?.response)) {
        aiResponseText = data.data.response[0]?.content || 'Trip planned successfully!';
      } else {
        aiResponseText = data.data?.response || data.message || 'Trip planned successfully!';
      }
      
      const dailyPlans = parseItineraryFromAI(aiResponseText, tripPreferences.duration);

      // Build itinerary object
      const itinerary = buildItineraryObject(data.data, {
        ...tripPreferences,
        origin: originCity
      }, dailyPlans);

      setResult({ success: true, itinerary });
      
      // Redirect to AI Assistant with the response
      if (Array.isArray(data.data?.response)) {
        console.log('Redirecting with multi-message response');
        router.push({ 
          pathname: '/ai-assistant', 
          query: { 
            messages: JSON.stringify(data.data.response),
            conversationId: data.data?.conversationId || `trip_${Date.now()}`
          } 
        });
      } else {
        console.log('Redirecting with single response');
        router.push({ 
          pathname: '/ai-assistant', 
          query: { 
            itinerary: JSON.stringify(itinerary),
            conversationId: data.data?.conversationId || `trip_${Date.now()}`
          } 
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      console.error('Trip planning error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    result,
    error,
    planTrip
  };
};
