import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../components/layout/Navbar';
import Swal from 'sweetalert2';

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
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!state.user) {
      router.push('/');
      return;
    }

    // Check screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    // Initialize conversation
    initializeConversation();

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [state.user, router]);

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
      content: `👋 Hello ${state.user?.name || 'there'}! I'm your AI Travel Assistant powered by AWS Bedrock and Claude 4 Opus.

I can help you with:
✈️ **Flight Recommendations** - Find the best flights for your budget
🏨 **Hotel Suggestions** - Discover perfect accommodations
🌍 **Destination Ideas** - Personalized travel recommendations based on your query
🎯 **Trip Planning** - Complete itinerary creation with autonomous reasoning
💰 **Budget Optimization** - Get the most value for your money

Just tell me what you're looking for, and I'll use advanced AI reasoning to plan your perfect trip!`,
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
      // Call Bedrock Agent Core endpoint with Claude 4 Opus
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bedrock-agent/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId: conversationId,
          userId: state.user?.id || 'anonymous',
          conversationHistory: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      console.log('Backend response:', data); // Debug log

      // Add AI response from Bedrock Agent Core (Claude 4 Opus)
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.success ? (data.message || data.response) : (data.message || 'I apologize, but I encountered an error.'),
        timestamp: Date.now(),
        type: 'text',
        data: data.toolsUsed ? { 
          tools: data.toolsUsed, 
          reasoning: data.reasoning,
          sessionId: data.sessionId
        } : undefined
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show actual error instead of fallback for debugging
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Connection Error: Unable to reach the AI service. Please check:\n\n• Backend server is running (port 4000)\n• Network connection\n• API endpoint: ${process.env.NEXT_PUBLIC_API_URL}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
              : '#f0f2f5',
            color: isUser ? 'white' : '#333',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            wordBreak: 'break-word'
          }}
        >
          {message.type === 'recommendation' && message.data?.recommendations ? (
            <div>
              <div style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                {message.content}
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
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
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
    <>
      <Head>
        <title>AI Travel Assistant - HackTravel</title>
        <meta name="description" content="Get personalized travel recommendations powered by AI" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />

        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '20px' : '40px 20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            height: isMobile ? 'calc(100vh - 100px)' : '75vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '20px',
              color: 'white'
            }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
                🤖 AI Travel Assistant
              </h1>
              <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                Powered by Amazon SageMaker | Real-time recommendations
              </p>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: '#fafafa'
            }}>
              {messages.map(renderMessage)}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '18px',
                    background: '#f0f2f5',
                    color: '#666'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      AI is thinking...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts (show when no messages except welcome) */}
            {messages.length <= 1 && (
              <div style={{
                padding: '16px 20px',
                background: 'white',
                borderTop: '1px solid #e0e0e0'
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
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
                        padding: '8px 16px',
                        background: '#f0f2f5',
                        border: '1px solid #e0e0e0',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: '#333'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#667eea';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#f0f2f5';
                        e.currentTarget.style.color = '#333';
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
              padding: '20px',
              background: 'white',
              borderTop: '1px solid #e0e0e0'
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
                    border: '2px solid #e0e0e0',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: isLoading ? '#f5f5f5' : 'white'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
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
                    transition: 'all 0.2s',
                    boxShadow: inputMessage.trim() && !isLoading ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
                  }}
                >
                  {isLoading ? '...' : 'Send 📤'}
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
    </>
  );
}
