// pages/ai-travel-agent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// Define types for itinerary and messages
interface Itinerary {
  destination: string;
  duration: number;
  estimatedCost: number;
  currency: string;
  dailyItinerary: Array<{
    day: number;
    title: string;
    activities: Array<{
      time: string;
      activity: string;
    }>;
  }>;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | Itinerary;
  type?: 'itinerary';
}

// A new component to display the itinerary nicely
const ItineraryDisplay = ({ itinerary }: { itinerary: Itinerary }) => {
  if (!itinerary) return null;
  // This is a simplified display. You can make it as detailed as you like.
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#f9f9f9' }}>
      <h2>Your Trip to {itinerary.destination}</h2>
      <p><strong>Duration:</strong> {itinerary.duration} days</p>
      <p><strong>Estimated Cost:</strong> ${itinerary.estimatedCost} {itinerary.currency}</p>
      <hr />
      <h3>Daily Plan</h3>
      {itinerary.dailyItinerary?.map((day) => (
        <div key={day.day} style={{ marginBottom: '15px' }}>
          <h4>Day {day.day}: {day.title}</h4>
          <ul>
            {day.activities.map((act, idx) => (
              <li key={`${day.day}-${idx}`}>{act.time} - {act.activity}</li>
            ))}
          </ul>
        </div>
      ))}
      <p style={{ marginTop: '20px', fontStyle: 'italic' }}>
        You can now ask me to make changes, get more details, or book flights and hotels!
      </p>
    </div>
  );
};

// Define a TypeScript interface to validate the structure of the itinerary
interface TripPlan {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  travelers: number;
  totalBudget: number;
  estimatedCost: number;
  currency: string;
  travelStyle: string;
  interests: string[];
  budgetBreakdown: {
    accommodation: number;
    food: number;
    activities: number;
    transportation: number;
    shopping: number;
  };
  accommodation: {
    name: string;
    type: string;
    location: string;
    pricePerNight: number;
    totalCost: number;
    amenities: string[];
  };
  dailyItinerary: Array<{
    day: number;
    date: string;
    title: string;
    activities: Array<{
      time: string;
      activity: string;
      description: string;
      cost: number;
      duration: string;
    }>;
    totalDayCost: number;
    meals: string[];
  }>;
  transportation: {
    airportTransfers: number;
    localTransport: number;
    dayTripTransport: number;
    totalCost: number;
  };
  recommendedRestaurants: Array<{
    name: string;
    cuisine: string;
    priceRange: string;
    specialty: string;
  }>;
  culturalHighlights: string[];
  packingRecommendations: string[];
  seasonalNotes: {
    weather: string;
    crowds: string;
    specialEvents: string;
  };
  budgetTips: string[];
}

// Function to validate the structure of the itinerary
const validateItinerary = (data: any): data is TripPlan => {
  // Add validation logic here if needed, e.g., checking required fields
  return (
    typeof data.tripId === 'string' &&
    typeof data.destination === 'string' &&
    Array.isArray(data.dailyItinerary) &&
    data.dailyItinerary.every((day: any) =>
      typeof day.day === 'number' &&
      typeof day.date === 'string' &&
      Array.isArray(day.activities)
    )
  );
};

export default function AiAgentPage() {
  const router = useRouter();
  const { itinerary } = router.query;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // This effect runs only once on page load
  useEffect(() => {
    if (itinerary) {
      const parsedItinerary = JSON.parse(itinerary as string);
      if (validateItinerary(parsedItinerary)) {
        const systemMessage: Message = {
          role: 'system',
          content: `You are an expert AI travel agent. The user has just generated the following trip itinerary. Your task is to help them refine it. The itinerary is: ${JSON.stringify(parsedItinerary)}`,
        };

        const assistantMessage: Message = {
          role: 'assistant',
          type: 'itinerary',
          content: parsedItinerary,
        };

        setMessages([systemMessage, assistantMessage]);
      } else {
        console.error('Invalid itinerary structure:', parsedItinerary);
      }
    }
  }, [itinerary]);

  // Update the AI agent page to display the forwarded data
  useEffect(() => {
    console.log('Router query:', router.query);
    if (router.query.itinerary) {
      const parsedItinerary = JSON.parse(router.query.itinerary as string);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: parsedItinerary,
          type: 'itinerary',
        },
      ]);
    }
  }, [router.query.itinerary]);

  // Effect to auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // The API call now sends the entire history for context
      const response = await axios.post('/api/ai-agent', {
        messages: [...messages, userMessage], // Send the full conversation history
      });

      const aiMessage: Message = response.data; // Assuming the API returns a message object { role: 'assistant', content: '...' }
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error communicating with AI:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', margin: '20px 0' }}>AI Travel Agent 🤖</h1>
      
      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '10px' }}>
        {messages.map((msg, index) => {
          // Don't render system messages
          if (msg.role === 'system') return null; 

          const isUser = msg.role === 'user';
          
          return (
            <div key={`${msg.role}-${index}`} style={{
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
              marginBottom: '12px',
            }}>
              <div style={{
                background: isUser ? '#007bff' : '#e9ecef',
                color: isUser ? 'white' : 'black',
                padding: '10px 15px',
                borderRadius: '20px',
                maxWidth: '70%',
              }}>
                <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>{' '}
                {msg.type === 'itinerary' ? (
                  <ItineraryDisplay itinerary={msg.content as Itinerary} />
                ) : (
                  <span>{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}</span>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && <div style={{textAlign: 'center', color: '#666'}}>AI is typing...</div>}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input Form */}
      <div style={{ padding: '20px', borderTop: '1px solid #ccc', background: '#f8f9fa' }}>
        <div style={{ display: 'flex', maxWidth: '800px', margin: 'auto' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask to change your plan, find flights, etc..."
            style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ccc', marginRight: '10px' }}
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading} style={{ padding: '12px 20px', borderRadius: '25px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer' }}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};