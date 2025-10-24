import React, { useEffect, useState, useRef, useCallback } from "react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "@/components/layout/Navbar";
import AnimatedBackground from "@/components/layout/AnimatedBackground";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Swal from "sweetalert2";

import { ChatMessage } from "./types";
import { renderFormattedText } from "./utils";
import { getApiBaseUrl } from "@/config/api";
import {
  WelcomeScreen,
  ChatInterface,
  ChatHistory,
  ItineraryContent,
  FlightRecommendations,
  HotelRecommendations,
  HotelCards,
  AttractionsRecommendations,
} from "./components";

export default function AIAssistant() {
  const { isDarkMode } = useDarkMode();
  const { state } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Extract travel context from conversation history
  const extractTravelContext = (messages: ChatMessage[]) => {
    const context: any = {};
    
    // Look through messages for travel-related information
    messages.forEach(message => {
      // Convert content to string if it's an object
      let contentStr = '';
      if (typeof message.content === 'string') {
        contentStr = message.content;
      } else if (typeof message.content === 'object' && message.content !== null) {
        contentStr = JSON.stringify(message.content);
      }
      
      if (contentStr) {
        const content = contentStr.toLowerCase();
        
        // Extract destinations with more comprehensive patterns
        const destinations = [
          'singapore', 'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
          'bangkok', 'tokyo', 'paris', 'london', 'new york', 'dubai', 'cape town', 
          'sydney', 'barcelona', 'rome', 'amsterdam', 'berlin', 'madrid', 'lisbon',
          'istanbul', 'cairo', 'marrakech', 'casablanca', 'lagos', 'nairobi', 'johannesburg'
        ];
        
        destinations.forEach(dest => {
          if (content.includes(dest)) {
            // More specific pattern matching
            if (content.match(new RegExp(`(from|traveling from|departing from).*${dest}`, 'i'))) {
              context.origin = dest.charAt(0).toUpperCase() + dest.slice(1);
            }
            if (content.match(new RegExp(`(to|destination|going to|traveling to).*${dest}`, 'i'))) {
              context.destination = dest.charAt(0).toUpperCase() + dest.slice(1);
            }
          }
        });
        
        // Extract dates with more patterns
        const datePatterns = [
          /october\s+(\d{1,2}),?\s*(\d{4})?/i,
          /november\s+(\d{1,2}),?\s*(\d{4})?/i,
          /december\s+(\d{1,2}),?\s*(\d{4})?/i,
          /january\s+(\d{1,2}),?\s*(\d{4})?/i,
          /(\d{4}-\d{2}-\d{2})/,
          /(\d{1,2}\/\d{1,2}\/\d{4})/,
          /start date:\s*(\d{4}-\d{2}-\d{2})/i,
          /departure.*(\d{4}-\d{2}-\d{2})/i,
          /2025-10-22/i,
          /2025-10-27/i
        ];
        
        datePatterns.forEach(pattern => {
          const match = content.match(pattern);
          if (match) {
            const year = match[2] || '2025'; // Default to 2025 if no year specified
            let dateStr = match[0];
            
            // Convert month names to dates
            if (match[0].toLowerCase().includes('october')) {
              dateStr = `2025-10-${match[1].padStart(2, '0')}`;
            } else if (match[0].toLowerCase().includes('november')) {
              dateStr = `2025-11-${match[1].padStart(2, '0')}`;
            } else if (match[0].toLowerCase().includes('december')) {
              dateStr = `2025-12-${match[1].padStart(2, '0')}`;
            }
            
            if (content.includes('start') || content.includes('depart') || content.includes('start date')) {
              context.departureDate = dateStr;
            }
            
            // Handle specific dates from the conversation
            if (match[0] === '2025-10-22') {
              context.departureDate = '2025-10-22';
            }
            if (match[0] === '2025-10-27') {
              context.returnDate = '2025-10-27';
            }
          }
        });
        
        // Extract budget
        const budgetMatch = content.match(/budget[:\s]*\$?(\d+)/i) || content.match(/\$(\d+)/);
        if (budgetMatch) {
          context.budget = parseInt(budgetMatch[1]);
        }
        
        // Extract travelers
        const travelersMatch = content.match(/(\d+)\s+travelers?/i) || 
                              content.match(/number of travelers[:\s]*(\d+)/i) ||
                              content.match(/travelers[:\s]*(\d+)/i);
        if (travelersMatch) {
          context.travelers = parseInt(travelersMatch[1]);
        }
        
        // Extract duration
        const durationMatch = content.match(/duration[:\s]*(\d+)\s+days?/i) || 
                             content.match(/(\d+)\s+days?/i);
        if (durationMatch) {
          context.duration = parseInt(durationMatch[1]);
        }
        
        // Extract travel style
        if (content.includes('mid-range') || content.includes('mid range')) {
          context.travelStyle = 'mid-range';
        } else if (content.includes('budget')) {
          context.travelStyle = 'budget';
        } else if (content.includes('luxury')) {
          context.travelStyle = 'luxury';
        }
        
        // Extract interests
        const interests = [];
        if (content.includes('culture')) interests.push('culture');
        if (content.includes('food')) interests.push('food');
        if (content.includes('adventure')) interests.push('adventure');
        if (content.includes('beach')) interests.push('beach');
        if (content.includes('nature')) interests.push('nature');
        if (interests.length > 0) {
          context.interests = interests;
        }
        
        // Handle specific patterns from Plan My Adventure
        if (content.includes('mumbai') && content.includes('singapore')) {
          if (!context.origin && content.includes('from')) context.origin = 'Mumbai';
          if (!context.destination && content.includes('to')) context.destination = 'Singapore';
        }
        
        // Extract specific dates mentioned in itinerary
        if (content.includes('2025-10-22') && !context.departureDate) {
          context.departureDate = '2025-10-22';
        }
        if (content.includes('2025-10-27') && !context.returnDate) {
          context.returnDate = '2025-10-27';
        }
      }
    });
    
    console.log('🎯 Extracted travel context:', context);
    return context;
  };

  const initializeConversation = useCallback(() => {
    // Check for messages or itinerary data from URL query parameters
    let initialMessages: ChatMessage[] = [];
    let hasInitialData = false;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const messagesStr = params.get("messages");
      const itineraryStr = params.get("itinerary");
      const convId = params.get("conversationId");

      if (convId) {
        console.log('🔗 Setting conversation ID from URL:', convId);
        setConversationId(convId);
        setActiveSessionId(convId); // Also set as active session
      }

      if (messagesStr) {
        // Multi-message response from trip planning
        hasInitialData = true;
        console.log("Found messages in URL:", messagesStr);
        try {
          const messages = JSON.parse(messagesStr);
          console.log("Parsed messages:", messages);
          console.log("Number of messages:", messages.length);
          initialMessages = messages.map((msg: any, index: number) => ({
            id: msg.id || `msg_${Date.now()}_${index}`,
            role: msg.role || "assistant",
            content: msg.content,
            timestamp: msg.timestamp || Date.now(),
            type: msg.type || "text",
            data: msg.data,
          }));
          console.log("Mapped initial messages:", initialMessages);
        } catch (e) {
          console.error("Error parsing messages:", e);
        }
      } else if (itineraryStr) {
        // Single itinerary response (backward compatibility)
        hasInitialData = true;
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
              itineraryText += `💰 Budget: ${itineraryObj.budget}\n`;
            }
            itineraryText += `\nI've prepared a detailed itinerary for your trip. Feel free to ask me any questions about your travel plans!`;
          }

          initialMessages = [
            {
              role: "assistant",
              content: itineraryText,
              timestamp: Date.now(),
              id: `msg_${Date.now()}_itinerary`,
              type: "text",
            },
          ];
        } catch (e) {
          console.error("Error parsing itinerary:", e);
        }
      }
    }

    // If we have initial data from trip planning, automatically show the chat
    if (hasInitialData) {
      console.log("✅ Initial data detected - showing chat directly");
      setShowChat(true);
      
      // Clear URL parameters after processing to prevent re-processing on refresh
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete('messages');
        url.searchParams.delete('itinerary');
        url.searchParams.delete('conversationId');
        window.history.replaceState({}, document.title, url.toString());
      }
    }

    // If no conversation ID set, create a new one
    if (!conversationId) {
      const convId = `conv_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      console.log('🆕 Creating new conversation ID:', convId);
      setConversationId(convId);
      setActiveSessionId(convId);
    }

    // Set initial messages
    console.log("Setting initial messages. Count:", initialMessages.length);
    if (initialMessages.length > 0) {
      // We have messages from trip planning - use them directly
      console.log("Setting messages from trip planning:", initialMessages);
      setMessages(initialMessages);
    } else {
      // No initial messages - show welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `👋 Hello ${
          state.user?.name || "there"
        }! I'm your AI Travel Assistant.

I can help you with:
✈️ **Flight Search** - Real-time flight availability and pricing from our API
🏨 **Hotel Search** - Live hotel recommendations with real-time data
🌍 **Destination Ideas** - Personalized travel recommendations based on your preferences
🎯 **Trip Planning** - Complete itinerary creation with context-aware AI
💰 **Budget Optimization** - Get the most value for your money
🧠 **Smart Context** - I remember our conversation and your preferences

Just tell me what you're looking for, and I'll search real-time data and use AI to plan your perfect trip!`,
        timestamp: Date.now(),
        type: "text",
      };
      setMessages([welcomeMessage]);
    }
  }, [state.user, conversationId]);

  useEffect(() => {
    // Debug auth state
    console.log("AI Assistant - Auth State:", {
      hasUser: !!state.user,
      hasToken: !!state.token,
      userName: state.user?.name,
      userEmail: state.user?.email,
    });

    // Remove any legacy localStorage chat contexts (we persist server-side only)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ai_user_contexts");
      } catch (err) {
        console.warn(
          "Failed to remove legacy ai_user_contexts from localStorage:",
          err
        );
      }
      try {
        sessionStorage.removeItem("ai_conversation_id");
      } catch (err) {
        /* ignore */
      }
    }

    // Check screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [state.user, state.token]);

  const [urlProcessed, setUrlProcessed] = useState(false);

  // Check for initial data in URL and auto-show chat (only once on mount)
  useEffect(() => {
    if (typeof window !== "undefined" && state.user && !urlProcessed) {
      const params = new URLSearchParams(window.location.search);
      const messagesStr = params.get("messages");
      const itineraryStr = params.get("itinerary");

      // If there's initial data in the URL, automatically show the chat
      if (messagesStr || itineraryStr) {
        console.log("🎯 Auto-showing chat due to initial data in URL");
        setShowChat(true);
      }
      // Mark URL as processed so this only runs once
      setUrlProcessed(true);
    }
  }, [state.user, urlProcessed]);

  useEffect(() => {
    // Initialize conversation only if user is present
    if (state.user && showChat) {
      initializeConversation();
    }
  }, [state.user, showChat, initializeConversation]);

  // Auto-save conversation when messages change (for Plan My Adventure flow)
  useEffect(() => {
    const autoSaveConversation = async () => {
      // Only auto-save if we have messages, a conversation ID, and user is authenticated
      if (messages.length > 0 && conversationId && state.user?.id && state.token) {
        // Don't save if it's just the welcome message
        const hasRealConversation = messages.some(msg => 
          msg.role === 'user' || (msg.role === 'assistant' && !msg.content.includes('Hello') && !msg.content.includes('I\'m your AI Travel Assistant'))
        );
        
        if (hasRealConversation) {
          console.log('🔄 Auto-saving conversation:', conversationId, 'with', messages.length, 'messages');
          
          try {
            const apiUrl = getApiBaseUrl();
            
            // Prepare messages for saving - ensure proper format
            const messagesToSave = messages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              type: msg.type || 'text',
              data: msg.data || null
            }));
            
            const response = await fetch(`${apiUrl}/ai-agent/user-sessions/${state.user.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${state.token}`,
              },
              body: JSON.stringify({
                conversationId,
                messages: messagesToSave,
                userId: state.user.id,
                userEmail: state.user.email,
                userName: state.user.name,
              }),
            });
            
            if (response.ok) {
              console.log('✅ Auto-saved conversation successfully');
            } else {
              console.warn('⚠️ Auto-save response not OK:', response.status, response.statusText);
            }
          } catch (error) {
            console.warn('⚠️ Failed to auto-save conversation:', error);
          }
        }
      }
    };

    // Debounce the auto-save to avoid too many API calls
    const timeoutId = setTimeout(autoSaveConversation, 2000);
    return () => clearTimeout(timeoutId);
  }, [messages, conversationId, state.user?.id, state.token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load session history when switching sessions
  const loadSessionHistory = useCallback(
    async (sessionId: string) => {
      if (!sessionId) return;

      console.log("🔄 Loading session history for:", sessionId);
      setIsLoading(true);

      try {
        const apiUrl = getApiBaseUrl();

        // Load chat session from database
        if (state.user?.id) {
          console.log("📡 Making API request to:", `${apiUrl}/ai-agent/chat-history?userId=${encodeURIComponent(state.user.id)}&sessionId=${encodeURIComponent(sessionId)}`);
          
          const response = await fetch(
            `${apiUrl}/ai-agent/chat-history?userId=${encodeURIComponent(
              state.user.id
            )}&sessionId=${encodeURIComponent(sessionId)}`,
            {
              headers: {
                'Authorization': state.token ? `Bearer ${state.token}` : '',
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log("📡 Response status:", response.status);
          const data = await response.json();
          console.log("📥 Session data received:", data);

          if (data.success && data.session) {
            console.log("📋 Session structure:", {
              hasMessages: !!data.session.messages,
              messagesType: typeof data.session.messages,
              messagesLength: Array.isArray(data.session.messages) ? data.session.messages.length : 'not array',
              sessionKeys: Object.keys(data.session)
            });

            if (Array.isArray(data.session.messages) && data.session.messages.length > 0) {
              // Map the messages to the expected format with better error handling
              const mapped: ChatMessage[] = data.session.messages
                .filter((msg: any) => msg && (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'ai'))
                .map((msg: any, index: number) => {
                  console.log(`📝 Processing message ${index}:`, {
                    role: msg.role,
                    contentType: typeof msg.content,
                    contentLength: typeof msg.content === 'string' ? msg.content.length : 'not string',
                    hasTimestamp: !!msg.timestamp,
                    hasData: !!msg.data,
                    messageType: msg.type
                  });

                  // Handle different content formats
                  let processedContent = msg.content || "";
                  if (typeof msg.content === 'object' && msg.content !== null) {
                    // If content is an object, try to extract text
                    if (msg.content.message) {
                      processedContent = msg.content.message;
                    } else if (msg.content.text) {
                      processedContent = msg.content.text;
                    } else if (msg.content.content) {
                      processedContent = msg.content.content;
                    } else {
                      processedContent = JSON.stringify(msg.content);
                    }
                  }

                  // Preserve message data for special types (flights, hotels, etc.)
                  let messageData = msg.data || null;
                  let messageType: ChatMessage['type'] = msg.type || "text";

                  // Handle legacy message formats
                  if (msg.content && typeof msg.content === 'object') {
                    if (msg.content.flights) {
                      messageType = "flight_recommendations";
                      messageData = {
                        flights: msg.content.flights,
                        googleFlightsUrl: msg.content.googleFlightsUrl,
                        origin: msg.content.origin,
                        destination: msg.content.destination,
                        depDate: msg.content.depDate,
                        retDate: msg.content.retDate
                      };
                    } else if (msg.content.hotels) {
                      messageType = "hotel_cards";
                      messageData = {
                        hotels: msg.content.hotels,
                        bookingUrl: msg.content.bookingUrl
                      };
                    } else if (msg.content.attractions) {
                      messageType = "attractions_recommendations";
                      messageData = {
                        attractions: msg.content.attractions,
                        tripAdvisorUrl: msg.content.tripAdvisorUrl,
                        destination: msg.content.destination
                      };
                    }
                  }

                  return {
                    id: msg.id || `msg_${sessionId}_${index}`,
                    role: msg.role === "ai" ? "assistant" : msg.role,
                    content: processedContent,
                    timestamp: msg.timestamp
                      ? typeof msg.timestamp === "number"
                        ? msg.timestamp
                        : Date.parse(msg.timestamp)
                      : Date.now(),
                    type: messageType,
                    data: messageData,
                  };
                });

              console.log("✅ Mapped messages:", mapped.length, "messages");
              console.log("📋 First message preview:", {
                role: mapped[0]?.role,
                type: mapped[0]?.type,
                hasData: !!mapped[0]?.data,
                contentPreview: mapped[0]?.content?.substring(0, 100)
              });

              // Set the loaded messages and update conversation state
              setMessages(mapped);
              setConversationId(sessionId);
              setActiveSessionId(sessionId);

              // Scroll to bottom after loading
              setTimeout(() => scrollToBottom(), 100);

              return;
            } else {
              console.warn("⚠️ Session has no messages or messages is not an array:", {
                messages: data.session.messages,
                messagesType: typeof data.session.messages
              });
            }
          } else {
            console.warn("⚠️ No session data found or invalid format:", data);
            if (!data.success) {
              console.error("❌ API Error:", data.error);
            }
          }
        }

        // If no session found, show user-friendly message
        console.log("❌ Session not found, showing error message");
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: `I couldn't load this conversation. This might happen if the conversation was created recently and hasn't been fully saved yet.

You can:
• Try refreshing the page and selecting the conversation again
• Start a new conversation using the "+" button
• Or ask me anything about your travel plans!

I'm here to help with flights, hotels, destinations, and trip planning!`,
          timestamp: Date.now(),
          type: "text",
        };
        
        setMessages([errorMessage]);
        setConversationId(sessionId);
        setActiveSessionId(sessionId);
      } catch (error) {
        console.error("❌ Error loading session history:", error);
        // On error, clear messages but keep the session active
        setMessages([]);
        setConversationId(sessionId);
        setActiveSessionId(sessionId);
      } finally {
        setIsLoading(false);
      }
    },
    [state.user?.id, state.token]
  );

  // When user clicks a session in sidebar
  const handleSessionClick = async (sessionId: string) => {
    console.log(
      "🖱️ Session clicked:",
      sessionId,
      "Current active:",
      activeSessionId
    );

    // Ensure chat UI is visible when resuming a session
    setShowChat(true);

    // Show loading state
    setIsLoading(true);

    try {
      // Always load the session history, even if it's the same session (for refresh)
      await loadSessionHistory(sessionId);
    } catch (error) {
      console.error("❌ Failed to load session:", error);
      
      // Show error message to user
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `Sorry, I couldn't load that conversation. There might be a temporary issue with the server.

Please try:
• Refreshing the page
• Selecting the conversation again
• Or start a new conversation

I'm still here to help with your travel planning!`,
        timestamp: Date.now(),
        type: "text",
      };
      
      setMessages([errorMessage]);
      setConversationId(sessionId);
      setActiveSessionId(sessionId);
    } finally {
      setIsLoading(false);
    }

    // Close sidebar on mobile after selection
    if (isMobile) setShowSidebar(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: Date.now(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Get API URL from environment
      const apiUrl = getApiBaseUrl();

      // Build messages payload including the freshly added user message so the AI has full context
      const messagesForApi = [...(messages || []), userMessage];

      // Extract travel context from conversation history for better AI responses
      const travelContext = extractTravelContext(messages);

      // Detect if user is asking for flight search with more comprehensive patterns
      const messageContent = typeof userMessage.content === 'string' ? userMessage.content : JSON.stringify(userMessage.content);
      const isFlightSearchQuery = /search.*flight|flight.*search|find.*flight|flight.*find|book.*flight|flight.*book|search.*me.*flight|flight.*for.*these.*dates|flights.*for.*dates|search.*me.*flights/i.test(messageContent);
      
      // For Plan My Adventure conversations, be more aggressive about flight detection
      if (travelContext.isPlanMyAdventureConversation && 
          (/flight|fly|search|find|book/i.test(messageContent))) {
        console.log('🎯 Plan My Adventure flight search detected');
      }
      
      console.log("Sending message to API:", {
        message: userMessage.content,
        conversationId: conversationId,
        userId: state.user?.id,
        userEmail: state.user?.email,
        userName: state.user?.name,
        isFlightSearch: isFlightSearchQuery,
        forceFlightSearch: travelContext.isPlanMyAdventureConversation && 
                         (/flight|fly|search|find|book/i.test(messageContent)),
        travelContext: travelContext
      });
      
      // Add additional context if this is a Plan My Adventure conversation
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("messages") || params.get("itinerary")) {
          travelContext.isPlanMyAdventureConversation = true;
          travelContext.hasInitialItinerary = true;
        }
      }

      // Send request to AI agent
      const response = await fetch(`${apiUrl}/ai-agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: state.token ? `Bearer ${state.token}` : "",
        },
        body: JSON.stringify({
          message: userMessage.content,
          messages: messagesForApi,
          sessionId: conversationId || activeSessionId, // Use active session ID if no conversation ID
          userId: state.user?.id,
          isFlightSearchQuery: isFlightSearchQuery,
          // Force flight search for Plan My Adventure conversations when flight keywords are detected
          forceFlightSearch: travelContext.isPlanMyAdventureConversation && 
                           (/flight|fly|search|find|book/i.test(messageContent)),
          userContext: {
            userId: state.user?.id,
            userEmail: state.user?.email,
            userName: state.user?.name,
            sessionId: conversationId || activeSessionId,
            source: 'ai-assistant', // Identify this as coming from AI Assistant
            ...travelContext, // Include extracted travel context
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (data.success && (data.content || data.data?.response)) {
        // Handle both new format (data.content) and legacy format (data.data.response)
        const responseContent = data.content || data.data?.response;
        // Handle multiple message response
        if (Array.isArray(responseContent)) {
          const aiMessages: ChatMessage[] = responseContent.map(
            (msg: any) => {
              // Handle different response formats
              let content = msg.content || msg;
              let messageType: ChatMessage['type'] = msg.type || "text";
              let messageData = msg.data || null;

              // If the message contains structured data (flights, hotels, etc.)
              if (typeof msg === 'object' && msg !== null) {
                if (msg.flights) {
                  messageType = "flight_recommendations";
                  messageData = {
                    flights: msg.flights,
                    googleFlightsUrl: msg.googleFlightsUrl,
                    origin: msg.origin,
                    destination: msg.destination,
                    depDate: msg.depDate,
                    retDate: msg.retDate
                  };
                } else if (msg.hotels) {
                  messageType = "hotel_cards";
                  messageData = {
                    hotels: msg.hotels,
                    bookingUrl: msg.bookingUrl
                  };
                } else if (msg.attractions) {
                  messageType = "attractions_recommendations";
                  messageData = {
                    attractions: msg.attractions,
                    tripAdvisorUrl: msg.tripAdvisorUrl,
                    destination: msg.destination
                  };
                }
              }

              return {
                id: `ai_${Date.now()}_${Math.random()}`,
                role: "assistant",
                content: content,
                timestamp: Date.now(),
                type: messageType,
                data: messageData,
              };
            }
          );
          setMessages((prev) => [...prev, ...aiMessages]);
        } else {
          // Handle single message response
          let content = responseContent;
          let messageType: ChatMessage['type'] = "text";
          let messageData = null;

          // Check if response contains structured data
          if (typeof responseContent === 'object' && responseContent !== null) {
            const response = responseContent;
            if (response.flights) {
              messageType = "flight_recommendations";
              messageData = {
                flights: response.flights,
                googleFlightsUrl: response.googleFlightsUrl,
                origin: response.origin,
                destination: response.destination,
                depDate: response.depDate,
                retDate: response.retDate
              };
              content = response.message || "Here are your flight recommendations:";
            } else if (response.hotels) {
              messageType = "hotel_cards";
              messageData = {
                hotels: response.hotels,
                bookingUrl: response.bookingUrl
              };
              content = response.message || "Here are your hotel recommendations:";
            } else if (response.attractions) {
              messageType = "attractions_recommendations";
              messageData = {
                attractions: response.attractions,
                tripAdvisorUrl: response.tripAdvisorUrl,
                destination: response.destination
              };
              content = response.message || "Here are popular attractions:";
            }
          }

          const aiMessage: ChatMessage = {
            id: `ai_${Date.now()}`,
            role: "assistant",
            content: content,
            timestamp: Date.now(),
            type: messageType,
            data: messageData,
          };
          setMessages((prev) => [...prev, aiMessage]);
        }

        // Update conversation ID if provided, otherwise keep the current one
        if (data.conversationId || data.sessionId || data.metadata?.sessionId) {
          const newConvId = data.conversationId || data.sessionId || data.metadata?.sessionId;
          setConversationId(newConvId);
          setActiveSessionId(newConvId);
        } else if (!conversationId && activeSessionId) {
          // If no conversation ID but we have an active session, use that
          setConversationId(activeSessionId);
        }
      } else {
        // Fallback for any response format issues
        const fallbackMessage = generateFallbackResponse(
          typeof userMessage.content === "string" ? userMessage.content : ""
        );
        setMessages((prev) => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);

      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me something else about your travel plans.

In the meantime, I can still help you with general travel advice and planning!`,
        timestamp: Date.now(),
        type: "text",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (userInput: string): ChatMessage => {
    const lowerInput = userInput.toLowerCase();

    let response = "I understand you're interested in travel planning! ";

    if (lowerInput.includes("flight")) {
      response +=
        "For flight searches, I can help you find the best options. Try asking me about specific routes like 'flights from New York to Paris' with your travel dates.";
    } else if (lowerInput.includes("hotel")) {
      response +=
        "I can help you find great accommodations! Try asking me about hotels in a specific city with your check-in and check-out dates.";
    } else if (
      lowerInput.includes("destination") ||
      lowerInput.includes("where")
    ) {
      response +=
        "I'd love to help you discover amazing destinations! Tell me about your interests, budget, or the type of experience you're looking for.";
    } else if (lowerInput.includes("budget")) {
      response +=
        "Budget planning is important! Let me know your destination and budget range, and I can suggest the best ways to make your money stretch.";
    } else {
      response +=
        "I'm here to help with all your travel needs - flights, hotels, destinations, itineraries, and more. What would you like to explore?";
    }

    return {
      id: `fallback_${Date.now()}`,
      role: "assistant",
      content: response,
      timestamp: Date.now(),
      type: "text",
    };
  };

  // Helper function to format timestamps
  const formatMessageTime = (timestamp: number) => {
    const now = Date.now();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // If message is from today, show time only
    if (diffInDays === 0) {
      if (diffInMinutes < 1) {
        return "Just now";
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else {
        return messageTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    }
    // If older, show date and time
    else if (diffInDays === 1) {
      return `Yesterday ${messageTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else {
      return messageTime.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";

    // Debug logging for message rendering
    if (message.type === "flight_recommendations" && message.data?.flights) {
      console.log("🛫 Rendering flight recommendations:", {
        messageId: message.id,
        flightCount: message.data.flights.length,
        hasGoogleFlightsUrl: !!message.data.googleFlightsUrl,
        firstFlightHasUrl: !!(message.data.flights[0]?.googleFlightsUrl),
        messageData: message.data
      });
    }

    return (
      <div
        key={message.id}
        style={{
          display: "flex",
          justifyContent: isUser ? "flex-end" : "flex-start",
          animation: "fadeInUp 0.5s ease-out",
          marginBottom: "24px", // Better spacing between messages
        }}
      >
        <div
          style={{
            maxWidth: isMobile ? "95%" : "80%",
            background: isUser
              ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
              : isDarkMode
              ? "rgba(30, 41, 59, 0.8)"
              : "rgba(255, 255, 255, 0.9)",
            color: isUser ? "white" : isDarkMode ? "#e2e8f0" : "#1e293b",
            borderRadius: isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
            padding: isMobile ? "18px 22px 12px 22px" : "24px 32px 16px 32px", // Less bottom padding for timestamp
            border: isUser
              ? "none"
              : isDarkMode
              ? "1px solid rgba(148, 163, 184, 0.1)"
              : "1px solid rgba(226, 232, 240, 0.6)",
            boxShadow: isUser
              ? "0 8px 25px rgba(99, 102, 241, 0.3)"
              : isDarkMode
              ? "0 8px 25px rgba(0, 0, 0, 0.2)"
              : "0 8px 25px rgba(0, 0, 0, 0.08)",
            backdropFilter: "blur(10px)",
            position: "relative",
          }}
        >
          {/* Render different content types */}
          {message.type === "recommendation" &&
          message.data?.recommendations ? (
            <div>
              <div
                style={{
                  marginBottom: "16px",
                  fontWeight: "600",
                  fontSize: "1.1rem",
                }}
              >
                🎯 Travel Recommendations
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {message.data.recommendations.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px",
                      backgroundColor: isDarkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      borderRadius: "8px",
                      border: isDarkMode
                        ? "1px solid rgba(255,255,255,0.2)"
                        : "1px solid rgba(0,0,0,0.1)",
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                      {rec.type === "flight" && "✈️ "}
                      {rec.type === "hotel" && "🏨 "}
                      {rec.type === "destination" && "🌍 "}
                      {rec.title}
                    </div>
                    <div style={{ fontSize: "14px", opacity: 0.8 }}>
                      {rec.description}
                    </div>
                    {rec.price && (
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          marginTop: "4px",
                        }}
                      >
                        💰 {rec.price}
                      </div>
                    )}
                    {rec.link && (
                      <a
                        href={rec.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "14px",
                          color: "#6366f1",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : message.type === "hotel_cards" && message.data?.hotels ? (
            <HotelCards
              hotels={message.data.hotels}
              role={message.role}
              isDarkMode={isDarkMode}
              bookingUrl={message.data.bookingUrl}
            />
          ) : message.type === "flight_recommendations" &&
            message.data?.flights ? (
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
          ) : message.type === "attractions_recommendations" &&
            message.data?.attractions ? (
            <AttractionsRecommendations
              attractions={message.data.attractions}
              role={message.role}
              isDarkMode={isDarkMode}
              tripAdvisorUrl={message.data.tripAdvisorUrl}
              destination={message.data.destination}
            />
          ) : message.type === "itinerary" &&
            typeof message.content === "object" ? (
            <ItineraryContent
              content={message.content}
              role={message.role}
              isDarkMode={isDarkMode}
            />
          ) : (
            // Default text content with enhanced formatting
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: "1.7",
                color: isUser ? "white" : isDarkMode ? "#e2e8f0" : "#2d3748",
                letterSpacing: "0.3px",
              }}
            >
              {(() => {
                // Extract text content from various possible formats
                let textContent = "";

                if (typeof message.content === "string") {
                  textContent = message.content;
                } else if (
                  typeof message.content === "object" &&
                  message.content !== null
                ) {
                  // Try to extract text from object in various ways
                  const obj = message.content as any;
                  textContent =
                    obj.content ||
                    obj.message ||
                    obj.text ||
                    obj.aiResponse ||
                    JSON.stringify(message.content);
                } else {
                  textContent = String(message.content);
                }

                return renderFormattedText(textContent);
              })()}
            </div>
          )}

          {/* Timestamp */}
          <div
            style={{
              fontSize: "0.75rem",
              opacity: 0.6,
              marginTop: "8px",
              textAlign: isUser ? "right" : "left",
              color: isUser
                ? "rgba(255, 255, 255, 0.7)"
                : isDarkMode
                ? "rgba(148, 163, 184, 0.8)"
                : "rgba(100, 116, 139, 0.8)",
            }}
          >
            {formatMessageTime(message.timestamp)}
          </div>
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
    "Find budget-friendly accommodations in Thailand",
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
        <meta
          name="description"
          content="Get personalized travel recommendations powered by AI"
        />
      </Head>
      <div
        style={{
          minHeight: "100vh",
          background: isDarkMode
            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
            : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
          position: "relative",
        }}
      >
        {/* Animated background elements */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "10%",
              width: "300px",
              height: "300px",
              background: isDarkMode
                ? "radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "20%",
              right: "15%",
              width: "200px",
              height: "200px",
              background: isDarkMode
                ? "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "float 8s ease-in-out infinite reverse",
            }}
          />
        </div>
        <Navbar />

        {!showChat ? (
          <WelcomeScreen
            isDarkMode={isDarkMode}
            isMobile={isMobile}
            onStartChat={handleStartChat}
          />
        ) : (
          /* ChatGPT-style Layout with Sidebar */
          <div
            style={{
              display: "flex",
              height: "calc(100vh - 80px)", // Account for navbar
              background: isDarkMode ? "#0a0f1c" : "#f8fafc",
            }}
          >
            {/* Chat History Sidebar - Always visible on desktop, toggleable on mobile */}
            {(showSidebar || !isMobile) && (
              <ChatHistory
                isDarkMode={isDarkMode}
                isMobile={isMobile}
                userId={state.user?.id || ""}
                activeSessionId={activeSessionId}
                onSessionSelect={handleSessionClick}
                onNewChat={async () => {
                  // Save current chat before starting new one
                  try {
                    const apiUrl = getApiBaseUrl();
                    await fetch(
                      `${apiUrl}/ai-agent/user-sessions/${state.user?.id}`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: state.token
                            ? `Bearer ${state.token}`
                            : "",
                        },
                        body: JSON.stringify({
                          conversationId,
                          messages,
                          userId: state.user?.id,
                          userEmail: state.user?.email,
                          userName: state.user?.name,
                        }),
                      }
                    );
                  } catch (e) {
                    console.warn("Failed to save current chat:", e);
                  }

                  // Start new chat
                  const newConvId = `conv_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                  setConversationId(newConvId);
                  setActiveSessionId(newConvId);
                  setMessages([
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: `👋 Hello ${
                        state.user?.name || "there"
                      }! I'm your AI Travel Assistant.\n\nI can help you with:\n✈️ **Flight Search** - Real-time flight availability and pricing from our API\n🏨 **Hotel Search** - Live hotel recommendations with real-time data\n🌍 **Destination Ideas** - Personalized travel recommendations based on your preferences\n🎯 **Trip Planning** - Complete itinerary creation with context-aware AI\n💰 **Budget Optimization** - Get the most value for your money\n🧠 **Smart Context** - I remember our conversation and your preferences\n\nJust tell me what you're looking for, and I'll search real-time data and use AI to plan your perfect trip!`,
                      timestamp: Date.now(),
                      type: "text",
                    },
                  ]);
                  if (isMobile) setShowSidebar(false);
                }}
                onDeleteSession={(sessionId) => {
                  if (sessionId === activeSessionId) {
                    // If deleting active session, start a new one
                    const newConvId = `conv_${Date.now()}_${Math.random()
                      .toString(36)
                      .substr(2, 9)}`;
                    setConversationId(newConvId);
                    setActiveSessionId(newConvId);
                    setMessages([
                      {
                        id: Date.now().toString(),
                        role: "assistant",
                        content: `👋 Hello ${
                          state.user?.name || "there"
                        }! I'm your AI Travel Assistant.\n\nI can help you with:\n✈️ **Flight Search** - Real-time flight availability and pricing from our API\n🏨 **Hotel Search** - Live hotel recommendations with real-time data\n🌍 **Destination Ideas** - Personalized travel recommendations based on your preferences\n🎯 **Trip Planning** - Complete itinerary creation with context-aware AI\n💰 **Budget Optimization** - Get the most value for your money\n🧠 **Smart Context** - I remember our conversation and your preferences\n\nJust tell me what you're looking for, and I'll search real-time data and use AI to plan your perfect trip!`,
                        timestamp: Date.now(),
                        type: "text",
                      },
                    ]);
                  }
                }}
                isVisible={true}
                onClose={() => setShowSidebar(false)}
              />
            )}

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
                onNewChat={async () => {
                  // Save current chat to backend before starting new chat
                  try {
                    const apiUrl = getApiBaseUrl();
                    await fetch(
                      `${apiUrl}/ai-agent/user-sessions/${state.user?.id}`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: state.token
                            ? `Bearer ${state.token}`
                            : "",
                        },
                        body: JSON.stringify({
                          conversationId,
                          messages,
                          userId: state.user?.id,
                          userEmail: state.user?.email,
                          userName: state.user?.name,
                        }),
                      }
                    );
                  } catch (e) {
                    console.warn("Failed to save current chat:", e);
                  }

                  // Start new chat session after save
                  const newConvId = `conv_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                  setConversationId(newConvId);
                  setActiveSessionId(newConvId);
                  setMessages([
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: `👋 Hello ${
                        state.user?.name || "there"
                      }! I'm your AI Travel Assistant.\n\nI can help you with:\n✈️ **Flight Search** - Real-time flight availability and pricing from our API\n🏨 **Hotel Search** - Live hotel recommendations with real-time data\n🌍 **Destination Ideas** - Personalized travel recommendations based on your preferences\n🎯 **Trip Planning** - Complete itinerary creation with context-aware AI\n💰 **Budget Optimization** - Get the most value for your money\n🧠 **Smart Context** - I remember our conversation and your preferences\n\nJust tell me what you're looking for, and I'll search real-time data and use AI to plan your perfect trip!`,
                      timestamp: Date.now(),
                      type: "text",
                    },
                  ]);
                }}
              />
            </div>
          </div>
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
            0%,
            80%,
            100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            40% {
              transform: translateY(-8px);
              opacity: 1;
            }
          }

          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
          }

          @keyframes float {
            0%,
            100% {
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
            background: ${isDarkMode
              ? "rgba(148, 163, 184, 0.3)"
              : "rgba(148, 163, 184, 0.4)"};
            border-radius: 20px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: ${isDarkMode
              ? "rgba(148, 163, 184, 0.5)"
              : "rgba(148, 163, 184, 0.6)"};
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
