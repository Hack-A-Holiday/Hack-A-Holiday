import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/layout/Navbar';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import Swal from 'sweetalert2';

import { ChatMessage } from './types';
import { renderFormattedText } from './utils';
import {
  WelcomeScreen,
  ChatInterface,
  ItineraryContent,
  FlightRecommendations,
  HotelRecommendations,
  HotelCards,
  AttractionsRecommendations
} from './components';

export default function AIAssistant() {
  const { isDarkMode } = useDarkMode();
  const { state } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = useCallback(() => {
    // Check for messages or itinerary data from URL query parameters
    let initialMessages: ChatMessage[] = [];
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const messagesStr = params.get('messages');
      const itineraryStr = params.get('itinerary');
      const convId = params.get('conversationId');
      
      if (convId) {
        setConversationId(convId);
      }
      
      if (messagesStr) {
        // Multi-message response from trip planning
        console.log('Found messages in URL:', messagesStr);
        try {
          const messages = JSON.parse(messagesStr);
          console.log('Parsed messages:', messages);
          console.log('Number of messages:', messages.length);
          initialMessages = messages.map((msg: any, index: number) => ({
            id: msg.id || `msg_${Date.now()}_${index}`,
            role: msg.role || 'assistant',
            content: msg.content,
            timestamp: msg.timestamp || Date.now(),
            type: msg.type || 'text',
            data: msg.data
          }));
          console.log('Mapped initial messages:', initialMessages);
        } catch (e) {
          console.error('Error parsing messages:', e);
        }
      } else if (itineraryStr) {
        // Single itinerary response (backward compatibility)
        try {
          const itineraryObj = JSON.parse(itineraryStr);
          // Convert itinerary object to formatted text for display in chat
          let itineraryText = `🎉 Here's your personalized travel itinerary!\n\n`;
          
          if (itineraryObj.aiResponse) {
            itineraryText += itineraryObj.aiResponse;
          } else {
            // Fallback: create a basic itinerary from the object
            itineraryText += `**Trip Details:**\n`;
            if (itineraryObj.destination) {
              itineraryText += `📍 Destination: ${itineraryObj.destination}\n`;
            }
            if (itineraryObj.duration) {
              itineraryText += `⏱️ Duration: ${itineraryObj.duration} days\n`;
            }
            if (itineraryObj.budget) {
              itineraryText += `💰 Budget: $${itineraryObj.budget}\n`;
            }
            itineraryText += `\nI've prepared a detailed itinerary for your trip. Feel free to ask me any questions about your travel plans!`;
          }
          
          initialMessages = [{ 
            role: 'assistant', 
            content: itineraryText, 
            timestamp: Date.now(),
            id: `msg_${Date.now()}_itinerary`,
            type: 'text'
          }];
        } catch (e) {
          console.error('Error parsing itinerary:', e);
        }
      }
    }

    // If no conversation ID set, create a new one
    if (!conversationId) {
      const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(convId);
    }

    // Set initial messages
    console.log('Setting initial messages. Count:', initialMessages.length);
    if (initialMessages.length > 0) {
      // We have messages from trip planning - use them directly
      console.log('Setting messages from trip planning:', initialMessages);
      setMessages(initialMessages);
    } else {
      // No initial messages - show welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `👋 Hello ${state.user?.name || 'there'}! I'm your AI Travel Assistant.

I can help you with:
✈️ **Flight Search** - Real-time flight availability and pricing from our API
🏨 **Hotel Search** - Live hotel recommendations with real-time data
🌍 **Destination Ideas** - Personalized travel recommendations based on your preferences
🎯 **Trip Planning** - Complete itinerary creation with context-aware AI
💰 **Budget Optimization** - Get the most value for your money
🧠 **Smart Context** - I remember our conversation and your preferences

Just tell me what you're looking for, and I'll search real-time data and use AI to plan your perfect trip!`,
        timestamp: Date.now(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  }, [state.user, conversationId]);

  useEffect(() => {
    // Debug auth state
    console.log('AI Assistant - Auth State:', {
      hasUser: !!state.user,
      hasToken: !!state.token,
      userName: state.user?.name,
      userEmail: state.user?.email
    });

    // Check screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [state.user, state.token]);

  useEffect(() => {
    // Initialize conversation only if user is present
    if (state.user && !showChat) {
      initializeConversation();
    }
  }, [state.user, showChat, conversationId, initializeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get API URL from environment or use default
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://hack-travel-backend.onrender.com'
        : 'http://localhost:4000';

      console.log('Sending message to API:', {
        message: userMessage.content,
        conversationId: conversationId,
        userId: state.user?.id,
        userEmail: state.user?.email,
        userName: state.user?.name
      });

      // Send request to AI agent
      const response = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': state.token ? `Bearer ${state.token}` : ''
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationId,
          userId: state.user?.id,
          userEmail: state.user?.email,
          userName: state.user?.name
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success && data.data?.response) {
        // Handle multiple message response
        if (Array.isArray(data.data.response)) {
          const aiMessages: ChatMessage[] = data.data.response.map((msg: any) => ({
            id: `ai_${Date.now()}_${Math.random()}`,
            role: 'assistant',
            content: msg.content || msg,
            timestamp: Date.now(),
            type: msg.type || 'text',
            data: msg.data || null
          }));
          setMessages(prev => [...prev, ...aiMessages]);
        } else {
          // Handle single message response
          const aiMessage: ChatMessage = {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: data.data.response,
            timestamp: Date.now(),
            type: 'text'
          };
          setMessages(prev => [...prev, aiMessage]);
        }

        // Update conversation ID if provided
        if (data.data.conversationId) {
          setConversationId(data.data.conversationId);
        }
      } else {
        // Fallback for any response format issues
        const fallbackMessage = generateFallbackResponse(typeof userMessage.content === 'string' ? userMessage.content : '');
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me something else about your travel plans.

In the meantime, I can still help you with general travel advice and planning!`,
        timestamp: Date.now(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (userInput: string): ChatMessage => {
    const lowerInput = userInput.toLowerCase();
    
    let response = "I understand you're interested in travel planning! ";
    
    if (lowerInput.includes('flight')) {
      response += "For flight searches, I can help you find the best options. Try asking me about specific routes like 'flights from New York to Paris' with your travel dates.";
    } else if (lowerInput.includes('hotel')) {
      response += "I can help you find great accommodations! Try asking me about hotels in a specific city with your check-in and check-out dates.";
    } else if (lowerInput.includes('destination') || lowerInput.includes('where')) {
      response += "I'd love to help you discover amazing destinations! Tell me about your interests, budget, or the type of experience you're looking for.";
    } else if (lowerInput.includes('budget')) {
      response += "Budget planning is important! Let me know your destination and budget range, and I can suggest the best ways to make your money stretch.";
    } else {
      response += "I'm here to help with all your travel needs - flights, hotels, destinations, itineraries, and more. What would you like to explore?";
    }
    
    return {
      id: `fallback_${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      type: 'text'
    };
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} style={{ 
        display: 'flex', 
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        animation: 'fadeInUp 0.5s ease-out',
        marginBottom: '24px' // Better spacing between messages
      }}>
        <div style={{
          maxWidth: isMobile ? '95%' : '80%',
          background: isUser 
            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            : (isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
          color: isUser ? 'white' : (isDarkMode ? '#e2e8f0' : '#1e293b'),
          borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
          padding: isMobile ? '18px 22px' : '24px 32px',
          border: isUser 
            ? 'none'
            : (isDarkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(226, 232, 240, 0.6)'),
          boxShadow: isUser
            ? '0 8px 25px rgba(99, 102, 241, 0.3)'
            : (isDarkMode ? '0 8px 25px rgba(0, 0, 0, 0.2)' : '0 8px 25px rgba(0, 0, 0, 0.08)'),
          backdropFilter: 'blur(10px)',
          position: 'relative'
        }}>
          {/* Render different content types */}
          {message.type === 'recommendation' && message.data?.recommendations ? (
            <div>
              <div style={{ marginBottom: '16px', fontWeight: '600', fontSize: '1.1rem' }}>
                🎯 Travel Recommendations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {message.data.recommendations.map((rec: any, idx: number) => (
                  <div key={idx} style={{
                    padding: '12px',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderRadius: '8px',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {rec.type === 'flight' && '✈️ '}
                      {rec.type === 'hotel' && '🏨 '}
                      {rec.type === 'destination' && '🌍 '}
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.8 }}>
                      {rec.description}
                    </div>
                    {rec.price && (
                      <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
                        💰 {rec.price}
                      </div>
                    )}
                    {rec.link && (
                      <a href={rec.link} target="_blank" rel="noopener noreferrer" 
                         style={{ fontSize: '14px', color: '#6366f1', marginTop: '4px', display: 'block' }}>
                        View Details →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : message.type === 'hotel_cards' && message.data?.hotels ? (
            <HotelCards 
              hotels={message.data.hotels} 
              role={message.role} 
              isDarkMode={isDarkMode}
              bookingUrl={message.data.bookingUrl}
            />
          ) : message.type === 'flight_recommendations' && message.data?.flights ? (
            <FlightRecommendations 
              flights={message.data.flights} 
              role={message.role} 
              isDarkMode={isDarkMode}
              googleFlightsUrl={message.data.googleFlightsUrl}
              origin={message.data.origin}
              destination={message.data.destination}
              depDate={message.data.depDate}
              retDate={message.data.retDate}
            />
          ) : message.type === 'attractions_recommendations' && message.data?.attractions ? (
            <AttractionsRecommendations 
              attractions={message.data.attractions}
              role={message.role} 
              isDarkMode={isDarkMode}
              tripAdvisorUrl={message.data.tripAdvisorUrl}
              destination={message.data.destination}
            />
          ) : message.type === 'itinerary' && (typeof message.content === 'object') ? (
            <ItineraryContent content={message.content} role={message.role} isDarkMode={isDarkMode} />
          ) : (
            // Default text content with enhanced formatting
            <div style={{ 
              whiteSpace: 'pre-wrap',
              fontSize: isMobile ? '15px' : '17px',
              lineHeight: '1.7',
              color: isUser ? 'white' : (isDarkMode ? '#e2e8f0' : '#2d3748'),
              letterSpacing: '0.3px'
            }}>
              {renderFormattedText(typeof message.content === 'string' ? message.content : JSON.stringify(message.content))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const suggestedPrompts = [
    "Plan a 7-day trip to Japan for $3000",
    "Find flights from NYC to Paris in March",
    "Recommend hotels in Bali under $100/night", 
    "What are the best destinations for adventure travel?",
    "Create an itinerary for a romantic weekend in Italy",
    "Find budget-friendly accommodations in Thailand"
  ];

  const handlePromptClick = (prompt: string) => {
    setInputMessage(prompt);
  };

  const handleStartChat = () => {
    setShowChat(true);
    // Initialize conversation when starting chat
    if (state.user) {
      initializeConversation();
    }
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>AI Travel Assistant - HackTravel</title>
        <meta name="description" content="Get personalized travel recommendations powered by AI" />
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        background: isDarkMode 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        position: 'relative'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0
        }}>
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: '200px',
            height: '200px',
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 8s ease-in-out infinite reverse'
          }} />
        </div>

        <Navbar />

        {!showChat ? (
          <WelcomeScreen
            isDarkMode={isDarkMode}
            isMobile={isMobile}
            onStartChat={handleStartChat}
          />
        ) : (
          <ChatInterface
            isDarkMode={isDarkMode}
            isMobile={isMobile}
            messages={messages}
            isLoading={isLoading}
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onBackToWelcome={() => setShowChat(false)}
            renderMessage={renderMessage}
            suggestedPrompts={suggestedPrompts}
            onPromptClick={handlePromptClick}
            showSidebar={showSidebar}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
          />
        )}

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes bounce {
            0%, 80%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            40% {
              transform: translateY(-8px);
              opacity: 1;
            }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            33% {
              transform: translateY(-30px) rotate(2deg);
            }
            66% {
              transform: translateY(-20px) rotate(-2deg);
            }
          }

          /* Smooth scrollbar styling */
          div::-webkit-scrollbar {
            width: 8px;
          }

          div::-webkit-scrollbar-track {
            background: transparent;
          }

          div::-webkit-scrollbar-thumb {
            background: ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)'};
            border-radius: 20px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: ${isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.6)'};
          }

          /* Auto-resize textarea */
          textarea {
            resize: none;
            overflow: hidden;
          }

          /* Glass morphism effect */
          .glass {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }

          /* Smooth transitions for all elements */
          * {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}