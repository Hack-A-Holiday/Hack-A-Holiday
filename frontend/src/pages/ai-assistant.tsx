import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../components/layout/Navbar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Swal from 'sweetalert2';

// Utility function to render formatted text (bold support)
// Helper to render inline bold within text
const renderInlineBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
};

const renderFormattedText = (text: string | any) => {
  if (typeof text !== 'string') return text;
  
  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, lineIdx) => {
        // Handle markdown headers (#### Header)
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2];
          
          // Map header levels to styles
          const headerStyles: { [key: number]: string } = {
            1: 'text-2xl font-bold mt-6 mb-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400',
            2: 'text-xl font-bold mt-5 mb-2 text-indigo-300',
            3: 'text-lg font-bold mt-4 mb-2 text-indigo-200',
            4: 'text-base font-semibold mt-3 mb-1 text-indigo-100',
            5: 'text-sm font-semibold mt-2 mb-1 text-gray-200',
            6: 'text-sm font-medium mt-2 mb-1 text-gray-300'
          };
          
          return (
            <div key={lineIdx} className={headerStyles[level] || headerStyles[4]}>
              {renderInlineBold(headerText)}
            </div>
          );
        }
        
        // Regular line with bold support
        if (line.trim()) {
          return (
            <div key={lineIdx} className="leading-relaxed">
              {renderInlineBold(line)}
            </div>
          );
        }
        
        // Empty line
        return <div key={lineIdx} className="h-2" />;
      })}
    </div>
  );
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'recommendation' | 'link';
  data?: any;
}

interface Recommendation {
  type: 'destination' | 'flight' | 'hotel';
  title: string;
  description: string;
  link?: string;
  price?: string;
  rating?: number;
  image?: string;
}

export default function AIAssistant() {
  const { state } = useAuth();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

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

    // Initialize conversation only if user is present
    if (state.user) {
      initializeConversation();
    }

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [state.user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = () => {
    const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(convId);

    // Welcome message with user's preferences
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
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build messages array with conversation history for context
      const messagesForAPI = [
        ...messages
          .filter(m => m.role !== 'system') // Exclude system messages
          .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
        { role: 'user', content: inputMessage }
      ];

      // Call Integrated AI Travel Agent via /api/ai/chat
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      console.log('Calling API:', `${apiUrl}/api/ai/chat`);
      console.log('Token:', state.token ? 'Present' : 'Missing');
      
      const response = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include', // Send cookies with request
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          messages: messagesForAPI, // Send full conversation history
          conversationId: conversationId,
          preferences: state.user?.preferences || {},
          userContext: {
            userId: state.user?.id || 'anonymous',
            email: state.user?.email,
            name: state.user?.name,
            sessionId: conversationId
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      console.log('Backend response:', data); // Debug log

      // Add AI response from Integrated AI Travel Agent
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.success ? (data.data?.response || data.message) : (data.message || 'I apologize, but I encountered an error.'),
        timestamp: Date.now(),
        type: data.data?.recommendations?.length > 0 ? 'recommendation' : 'text',
        data: {
          recommendations: data.data?.recommendations || [],
          realData: data.data?.realData,
          intent: data.data?.intent,
          conversationId: data.data?.conversationId,
          sessionId: data.data?.conversationId
        }
      };

      // Update conversation ID if returned from backend
      if (data.data?.conversationId && data.data.conversationId !== conversationId) {
        setConversationId(data.data.conversationId);
      }

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      console.error('API URL:', process.env.NEXT_PUBLIC_API_URL);
      console.error('Token available:', !!state.token);
      console.error('User:', state.user);
      
      // Show actual error instead of fallback for debugging
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Connection Error: Unable to reach the AI Travel Agent.\n\nPlease check:\n• Backend server is running (port 4000)\n• Network connection is active\n• You are logged in\n\nAPI endpoint: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/ai/chat\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry refreshing the page and logging in again.`,
        timestamp: Date.now(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (userInput: string): ChatMessage => {
    const input = userInput.toLowerCase();

    // Detect intent
    if (input.includes('flight') || input.includes('fly')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I can help you find flights! 🛫

Based on your preferences, here are some options:`,
        timestamp: Date.now(),
        type: 'recommendation',
        data: {
          recommendations: [
            {
              type: 'flight',
              title: 'Economy Flight to Paris',
              description: 'Direct flight with great timing',
              price: '$450',
              link: 'https://www.skyscanner.com',
              rating: 4.5
            },
            {
              type: 'flight',
              title: 'Business Class to Tokyo',
              description: 'Comfortable with lounge access',
              price: '$2,100',
              link: 'https://www.skyscanner.com',
              rating: 4.8
            }
          ]
        }
      };
    }

    if (input.includes('hotel') || input.includes('accommodation')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Here are some hotel recommendations for you! 🏨`,
        timestamp: Date.now(),
        type: 'recommendation',
        data: {
          recommendations: [
            {
              type: 'hotel',
              title: 'Luxury Resort & Spa',
              description: 'Beachfront property with amazing views',
              price: '$180/night',
              link: 'https://www.booking.com',
              rating: 4.7
            },
            {
              type: 'hotel',
              title: 'Downtown Business Hotel',
              description: 'Modern amenities in city center',
              price: '$120/night',
              link: 'https://www.booking.com',
              rating: 4.3
            }
          ]
        }
      };
    }

    if (input.includes('destination') || input.includes('where') || input.includes('recommend')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Based on your preferences, I recommend these destinations! 🌍`,
        timestamp: Date.now(),
        type: 'recommendation',
        data: {
          recommendations: [
            {
              type: 'destination',
              title: 'Bali, Indonesia',
              description: 'Tropical paradise with beautiful beaches and rich culture',
              link: 'https://www.lonelyplanet.com/indonesia/bali',
              rating: 4.8
            },
            {
              type: 'destination',
              title: 'Paris, France',
              description: 'City of lights with iconic landmarks and cuisine',
              link: 'https://www.lonelyplanet.com/france/paris',
              rating: 4.9
            },
            {
              type: 'destination',
              title: 'Tokyo, Japan',
              description: 'Blend of traditional and modern culture',
              link: 'https://www.lonelyplanet.com/japan/tokyo',
              rating: 4.7
            }
          ]
        }
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `I understand you're interested in travel! I can help you with:

🎯 **Destination Recommendations** - Tell me your interests
✈️ **Flight Bookings** - Share your travel dates
🏨 **Hotel Suggestions** - Let me know your preferences
💰 **Budget Planning** - I'll find the best deals

What would you like to explore?`,
      timestamp: Date.now(),
      type: 'text'
    };
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '16px',
          animation: 'fadeIn 0.3s ease-in'
        }}
      >
        <div
          style={{
            maxWidth: isMobile ? '85%' : '70%',
            padding: '12px 16px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isUser
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : isDarkMode ? '#2d3548' : '#f0f2f5',
            color: isUser ? 'white' : (isDarkMode ? '#e8eaed' : '#333'),
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
            border: (!isUser && isDarkMode) ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            wordBreak: 'break-word'
          }}
        >
          {message.type === 'recommendation' && message.data?.recommendations ? (
            <div>
              <div style={{ marginBottom: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {renderFormattedText(message.content)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {message.data.recommendations.map((rec: Recommendation, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0',
                      color: '#333'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#667eea' }}>
                        {rec.type === 'flight' && '✈️ '}
                        {rec.type === 'hotel' && '🏨 '}
                        {rec.type === 'destination' && '🌍 '}
                        {rec.title}
                      </h4>
                      {rec.rating && (
                        <span style={{ fontSize: '0.85rem', color: '#ffc107' }}>
                          ⭐ {rec.rating}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '8px 0', fontSize: '0.9rem', color: '#666' }}>
                      {rec.description}
                    </p>
                    {rec.price && (
                      <p style={{ margin: '8px 0', fontSize: '1rem', fontWeight: 'bold', color: '#28a745' }}>
                        {rec.price}
                      </p>
                    )}
                    {rec.link && (
                      <a
                        href={rec.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          marginTop: '8px',
                          padding: '8px 16px',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{renderFormattedText(message.content)}</div>
          )}
          <div
            style={{
              fontSize: '0.7rem',
              opacity: 0.7,
              marginTop: '8px',
              textAlign: 'right'
            }}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    );
  };

  const suggestedPrompts = [
    "🌴 Suggest beach destinations for my budget",
    "✈️ Find cheap flights to Europe",
    "🏨 Recommend luxury hotels in Bali",
    "🎯 Plan a 7-day trip to Japan"
  ];

  const handlePromptClick = (prompt: string) => {
    setInputMessage(prompt);
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
          ? 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Navbar />

        <main style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: isMobile ? '10px' : '15px'
        }}>
          <div style={{
            background: isDarkMode ? '#252d3d' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: isDarkMode ? '0 20px 60px rgba(0,0,0,0.8)' : '0 20px 60px rgba(0,0,0,0.2)',
            height: isMobile ? 'calc(100vh - 80px)' : 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: isMobile ? '16px 20px' : '20px 32px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: isMobile ? '1.3rem' : '1.6rem', 
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: isMobile ? '1.5rem' : '1.8rem' }}>🤖</span>
                <span>AI Travel Assistant</span>
              </h1>
              <p style={{ 
                margin: '3px 0 0 0', 
                opacity: 0.9, 
                fontSize: '0.85rem' 
              }}>
                Your intelligent travel planning assistant • AI-Powered
              </p>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: isDarkMode ? '#1e2433' : '#fafafa'
            }}>
              {messages.map(renderMessage)}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px', animation: 'fadeIn 0.3s ease-in' }}>
                  <div style={{
                    padding: '18px 24px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #f0f2f5 0%, #e8eaf0 100%)',
                    color: '#667eea',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '500'
                  }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    Planning your adventure...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts (show when no messages except welcome) */}
            {messages.length <= 1 && (
              <div style={{
                padding: '16px 20px',
                background: isDarkMode ? '#252d3d' : 'white',
                borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  color: isDarkMode ? '#9ca3af' : '#666',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  💡 Try asking:
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '24px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        color: 'white',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div style={{
              padding: isMobile ? '12px' : '16px 20px',
              background: isDarkMode ? '#252d3d' : 'white',
              borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything about your travel plans..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '25px',
                    border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid #e0e0e0',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: isLoading ? (isDarkMode ? '#1e2433' : '#f5f5f5') : (isDarkMode ? '#1e2433' : 'white'),
                    color: isDarkMode ? '#e8eaed' : '#333'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#e0e0e0'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  style={{
                    padding: '14px 28px',
                    background: inputMessage.trim() && !isLoading
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    boxShadow: inputMessage.trim() && !isLoading ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '120px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (inputMessage.trim() && !isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = inputMessage.trim() && !isLoading ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none';
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'white',
                              animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Send 📤
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
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
              transform: translateY(-10px);
              opacity: 1;
            }
          }

          .typing-indicator {
            display: flex;
            gap: 4px;
            align-items: center;
          }

          .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #667eea;
            animation: typing 1.4s infinite;
          }

          .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
