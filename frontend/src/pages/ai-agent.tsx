import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import UserContextService from '../services/UserContextService';

interface Message {
  role: 'user' | 'ai' | 'system';
  content: string | Record<string, any>;
  timestamp: number;
  id: string;
}

interface LocalUserContext {
  sessionId: string;
  userId?: string;
  preferences?: Record<string, any>;
  currentTrip?: Record<string, any>;
  tripHistory?: Record<string, any>[];
  messageCount?: number;
}

// Message Component to reduce complexity
const MessageItem: React.FC<{ 
  msg: Message;
}> = ({ msg }) => {
  const content = msg.content;
  const isItinerary = typeof content === 'object' && content !== null && 
    ((content as any).dailyItinerary || (content as any).dailyPlans);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '10px'
    }}>
      {/* Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: getAvatarBackground(msg.role),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.2rem',
        fontWeight: '600',
        flexShrink: 0
      }}>
        {getAvatarIcon(msg.role)}
      </div>

      {/* Message Bubble */}
      <div style={{
        background: getMessageBackground(msg.role),
        color: msg.role === 'user' ? 'white' : '#333',
        borderRadius: '18px',
        padding: '15px 20px',
        maxWidth: '70%',
        boxShadow: msg.role === 'user' 
          ? '0 4px 12px rgba(102,126,234,0.3)' 
          : '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '1rem',
        lineHeight: '1.5',
        whiteSpace: 'pre-line',
        wordWrap: 'break-word'
      }}>
        {isItinerary && typeof content === 'object' && content !== null ? (
          <ItineraryContent content={content as any} role={msg.role} />
        ) : (
          <div>
            {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
          </div>
        )}
        
        {/* Timestamp */}
        <div style={{ 
          fontSize: '0.75rem', 
          opacity: 0.7, 
          marginTop: '8px',
          textAlign: msg.role === 'user' ? 'right' : 'left'
        }}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Itinerary Content Component
const ItineraryContent: React.FC<{ content: any; role: string }> = ({ content, role }) => (
  <div>
    <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '12px', color: role === 'user' ? 'white' : '#2c3e50' }}>
      🗺️ Your Trip Plan
    </div>
    <div style={{ fontSize: '0.95rem', marginBottom: '12px', lineHeight: '1.6' }}>
      <div><strong>📍 Destination:</strong> {content.destination || 'N/A'}</div>
      <div><strong>📅 Duration:</strong> {content.duration || 'N/A'} days</div>
      <div><strong>👥 Travelers:</strong> {content.travelers || 'N/A'}</div>
      <div><strong>💰 Budget:</strong> ${content.totalBudget || content.budget || 'N/A'}</div>
      <div><strong>🎯 Style:</strong> {content.travelStyle || 'N/A'}</div>
    </div>
    
    {(content.dailyItinerary || content.dailyPlans) && (
      <DailyItinerary 
        dailyData={content.dailyItinerary || content.dailyPlans} 
        role={role} 
      />
    )}

    {content.tips && Array.isArray(content.tips) && (
      <TravelTips tips={content.tips} role={role} />
    )}
  </div>
);

// Daily Itinerary Component
const DailyItinerary: React.FC<{ dailyData: any[]; role: string }> = ({ dailyData, role }) => (
  <div>
    <div style={{ fontWeight: '600', marginBottom: '8px', color: role === 'user' ? 'white' : '#2c3e50' }}>
      📋 Daily Itinerary:
    </div>
    <div style={{ fontSize: '0.9rem' }}>
      {dailyData.map((day: any, idx: number) => {
        const dayKey = day.id || `day_${day.day || idx + 1}_${Date.now()}`;
        return (
          <div key={dayKey} style={{ 
            marginBottom: '8px', 
            padding: '8px 12px',
            background: role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: '8px'
          }}>
            <div style={{ fontWeight: '600' }}>
              Day {day.day || idx + 1}: {day.title || day.theme || 'Exploring'}
            </div>
            {renderActivities(day.activities, role)}
          </div>
        );
      })}
    </div>
  </div>
);

// Travel Tips Component  
const TravelTips: React.FC<{ tips: string[]; role: string }> = ({ tips, role }) => (
  <div style={{ marginTop: '12px' }}>
    <div style={{ fontWeight: '600', marginBottom: '6px', color: role === 'user' ? 'white' : '#2c3e50' }}>
      💡 Travel Tips:
    </div>
    <ul style={{ paddingLeft: '20px', fontSize: '0.9rem' }}>
      {tips.slice(0, 3).map((tip: string, i: number) => {
        const tipKey = `tip_${i}_${tip.substring(0, 10).replace(/\s/g, '_')}`;
        return (
          <li key={tipKey} style={{ marginBottom: '4px' }}>{tip}</li>
        );
      })}
    </ul>
  </div>
);

// Helper functions to reduce cognitive complexity
const getAvatarBackground = (role: string): string => {
  if (role === 'user') return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  if (role === 'system') return '#ff6b6b';
  return '#4ecdc4';
};

const getAvatarIcon = (role: string): string => {
  if (role === 'user') return '👤';
  if (role === 'system') return '⚠️';
  return '🤖';
};

const getMessageBackground = (role: string): string => {
  if (role === 'user') return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  if (role === 'system') return '#ffe3e3';
  return '#f8f9fa';
};

const renderActivities = (activities: any, role: string) => {
  if (!activities) return null;
  
  return (
    <div style={{ marginTop: '4px', fontSize: '0.85rem', opacity: 0.9 }}>
      {Array.isArray(activities) 
        ? activities.slice(0, 3).map((act: any, i: number) => {
            const actKey = `act_${i}_${(act.activity || act.name || act).toString().substring(0, 10).replace(/\s/g, '_')}`;
            return (
              <div key={actKey}>• {act.activity || act.name || act}</div>
            );
          })
        : Object.entries(activities).map(([time, acts]) => {
            const timeKey = `time_${time.replace(/\s/g, '_')}`;
            return (
              <div key={timeKey}>
                <strong>{time}:</strong> {Array.isArray(acts) 
                  ? acts.map((a: any) => a.name || a.activity || a).join(', ') 
                  : String(acts)
                }
              </div>
            );
          })
      }
    </div>
  );
};

const AiAgentPage = () => {
  const { state } = useAuth();
  const contextService = UserContextService.getInstance();
  const [userContext, setUserContext] = useState<LocalUserContext>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get itinerary from query if present
  let itineraryMsg: Message | null = null;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const itineraryStr = params.get('itinerary');
    if (itineraryStr) {
      try {
        const itineraryObj = JSON.parse(itineraryStr);
        itineraryMsg = { 
          role: 'ai', 
          content: itineraryObj, 
          timestamp: Date.now(),
          id: `msg_${Date.now()}_itinerary`
        };
      } catch {}
    }
  }

  const [messages, setMessages] = useState<Message[]>([
    itineraryMsg || { 
      role: 'ai', 
      content: `Welcome to your AI Travel Agent! 🌍✈️\n\nI'm powered by AWS Bedrock and can help you with:\n• Trip planning and modifications\n• Destination recommendations\n• Travel tips and advice\n• Itinerary adjustments\n• Real-time travel information\n\nHow can I assist you today?`,
      timestamp: Date.now(),
      id: `msg_${Date.now()}_welcome`
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiModel, setAiModel] = useState<'bedrock' | 'sagemaker'>('bedrock');

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user context from profile
  useEffect(() => {
    if (state?.user) {
      const updatedContext = contextService.getOrCreateContext(
        userContext.sessionId, 
        state.user.email
      );
      
      // Update context with user preferences
      if (state.user.preferences) {
        contextService.updatePreferencesFromProfile(userContext.sessionId, state.user.preferences);
      }
      
      setUserContext(updatedContext);
    }
  }, [state?.user, userContext.sessionId, contextService]);

  // Save conversation to localStorage for persistence
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(`ai_chat_${userContext.sessionId}`, JSON.stringify({
        messages,
        userContext,
        timestamp: Date.now()
      }));
    }
  }, [messages, userContext]);

  const createMessage = (role: 'user' | 'ai' | 'system', content: string | Record<string, any>): Message => ({
    role,
    content,
    timestamp: Date.now(),
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  });

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = createMessage('user', input);
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    
    // Extract topics and update context
    const topics = contextService.extractTopics(input);
    contextService.addConversationEntry(userContext.sessionId, messages.length + 1, topics);
    
    try {
      // Get enhanced context for AI
      const enhancedContext = contextService.getOrCreateContext(userContext.sessionId, state?.user?.email);
      const personalizedPrompt = contextService.getPersonalizedPrompt(userContext.sessionId);
      
      const requestPayload = {
        messages: [...messages, userMessage],
        userContext: {
          ...enhancedContext,
          personalizedPrompt
        },
        aiModel,
        userId: state?.user?.email || 'anonymous'
      };

      const response = await axios.post('/api/ai-agent', requestPayload);
      const aiMessage = createMessage('ai', response.data.content || response.data);
      setMessages((prev) => [...prev, aiMessage]);

      // Update context with successful interaction
      contextService.updateContext(userContext.sessionId, {
        ...enhancedContext
      });
      
    } catch (error) {
      console.error('Error communicating with AI:', error);
      const errorMessage = createMessage('system', 'Sorry, something went wrong. Please try again.');
      setMessages((prev) => [...prev, errorMessage]);
    }
    setInput('');
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const welcomeMessage = createMessage('ai', `Chat cleared! 🧹\n\nHow can I help you with your travel plans?`);
    setMessages([welcomeMessage]);
    setUserContext(prev => ({
      ...prev,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }));
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>AI Travel Agent - HackTravel</title>
        <meta name="description" content="AI-powered travel assistant with Claude 4 and SageMaker" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        
        <main style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px',
          paddingTop: '80px'
        }}>
          {/* AI Model Selector */}
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto 20px auto',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '15px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span style={{ color: 'white', fontWeight: '600' }}>AI Model:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer' }}>
              <input
                type="radio"
                value="bedrock"
                checked={aiModel === 'bedrock'}
                onChange={(e) => setAiModel(e.target.value as 'bedrock' | 'sagemaker')}
                style={{ accentColor: '#667eea' }}
              />
              AWS Bedrock (Claude-4)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer' }}>
              <input
                type="radio"
                value="sagemaker"
                checked={aiModel === 'sagemaker'}
                onChange={(e) => setAiModel(e.target.value as 'bedrock' | 'sagemaker')}
                style={{ accentColor: '#667eea' }}
              />
              SageMaker Endpoint
            </label>
          </div>

          {/* Chat Container */}
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto', 
            background: 'rgba(255,255,255,0.95)', 
            borderRadius: '20px', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)', 
            overflow: 'hidden',
            height: 'calc(100vh - 200px)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Chat Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '1.8rem', 
                  fontWeight: '700' 
                }}>
                  🤖 AI Travel Agent
                </h1>
                <p style={{ 
                  margin: '5px 0 0 0', 
                  opacity: 0.9,
                  fontSize: '0.9rem'
                }}>
                  Powered by {aiModel === 'bedrock' ? 'AWS Bedrock (Claude-4)' : 'SageMaker'} • Session: {userContext.sessionId.split('_')[1]}
                </p>
              </div>
              <button
                onClick={clearChat}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                🧹 Clear Chat
              </button>
            </div>

            {/* Messages Container */}
            <div style={{ 
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              {messages.map((msg) => (
                <MessageItem key={msg.id} msg={msg} />
              ))}
              
              {loading && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '15px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#4ecdc4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem'
                  }}>
                    🤖
                  </div>
                  <div style={{
                    background: '#f8f9fa',
                    borderRadius: '18px',
                    padding: '15px 20px',
                    fontSize: '1rem',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4ecdc4',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}></div>
                    AI is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ 
              padding: '20px',
              borderTop: '1px solid #e9ecef',
              background: 'white'
            }}>
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                alignItems: 'flex-end'
              }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me about your travel plans, destinations, or any travel-related questions..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    minHeight: '50px',
                    maxHeight: '120px',
                    padding: '15px 20px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '25px',
                    fontSize: '1rem',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    background: loading ? '#f8f9fa' : 'white',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    background: loading || !input.trim() 
                      ? '#ccc' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '15px 20px',
                    borderRadius: '25px',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    minWidth: '80px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {loading ? '⏳' : '📤'}
                </button>
              </div>
              
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#666', 
                marginTop: '8px',
                textAlign: 'center'
              }}>
                💡 Tip: Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `
      }} />
    </ProtectedRoute>
  );
};

export default AiAgentPage;