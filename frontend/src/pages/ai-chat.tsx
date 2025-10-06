import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  metadata?: any;
}

interface UserPreferences {
  destinations?: string[];
  budget?: { min: number; max: number };
  travelStyle?: 'budget' | 'mid-range' | 'luxury';
  interests?: string[];
  groupSize?: number;
  preferredDuration?: number;
  seasonPreference?: string[];
  accommodationType?: string[];
  transportPreference?: string[];
  dietaryRestrictions?: string[];
  accessibility?: string[];
}

export default function AIChat() {
  const { state } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiModel, setAiModel] = useState<'bedrock' | 'sagemaker'>('sagemaker');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [analysisMode, setAnalysisMode] = useState<'chat' | 'analyze' | 'recommend'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.user) {
      router.push('/login');
      return;
    }

    // Load user preferences and chat history
    loadUserPreferences();
    loadChatHistory();

    // Welcome message
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'ai',
      content: `Hi ${state.user.name || 'there'}! 👋 I'm your AI Travel Assistant powered by SageMaker. I can help you:

🌍 **Analyze** your travel patterns
🎯 **Recommend** personalized trips
💬 **Chat** about travel plans

What would you like to explore today?`,
      timestamp: Date.now(),
      metadata: { type: 'welcome' }
    };
    
    setMessages([welcomeMessage]);
  }, [state.user, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserPreferences = async () => {
    if (!state.user?.id) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const prefs = await response.json();
        setUserPreferences(prefs);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!state.user?.id) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai-chat/history`,
        {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const history = await response.json();
        if (history.messages && history.messages.length > 0) {
          setMessages(prev => [...prev, ...history.messages]);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !state.user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiEndpoint = aiModel === 'sagemaker' 
        ? '/ai-agent-sagemaker' 
        : '/ai-agent';

      const requestBody = {
        messages: [...messages, userMessage],
        userContext: {
          userId: state.user.id,
          sessionId: `chat_${Date.now()}`,
          preferences: userPreferences,
          mode: analysisMode,
          userProfile: {
            name: state.user.name,
            email: state.user.email,
            previousTrips: [] // We'll get this from preferences later
          }
        },
        metadata: {
          source: 'ai-chat-page',
          model: aiModel,
          analysisMode,
          timestamp: Date.now()
        }
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${apiEndpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'ai',
        content: aiResponse.content || aiResponse.message || 'Sorry, I couldn\'t process that request.',
        timestamp: Date.now(),
        metadata: aiResponse.metadata || {}
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save updated preferences if returned by AI
      if (aiResponse.updatedPreferences) {
        setUserPreferences(aiResponse.updatedPreferences);
        await saveUserPreferences(aiResponse.updatedPreferences);
      }

      // Save chat message
      await saveChatMessage(userMessage);
      await saveChatMessage(aiMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        metadata: { error: true }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserPreferences = async (preferences: UserPreferences) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(preferences)
        }
      );
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const saveChatMessage = async (message: ChatMessage) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai-chat/save`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            userId: state.user?.id
          })
        }
      );
    } catch (error) {
      console.error('Failed to save chat message:', error);
    }
  };

  const analyzeUserBehavior = () => {
    setAnalysisMode('analyze');
    setInputMessage('Analyze my travel preferences and behavior patterns');
    // Don't auto-send, let user click send
  };

  const getRecommendations = () => {
    setAnalysisMode('recommend');
    setInputMessage('Based on my preferences and travel history, recommend some personalized trips for me');
    // Don't auto-send, let user click send
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'ai',
      content: 'Chat cleared! How can I help you today?',
      timestamp: Date.now()
    }]);
  };

  if (!state.user) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        height: 'calc(100vh - 40px)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
              🤖 AI Travel Assistant
            </h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
              Powered by {aiModel === 'sagemaker' ? 'AWS SageMaker' : 'AWS Bedrock'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Analysis Mode Selector */}
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => setAnalysisMode('chat')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '20px',
                  background: analysisMode === 'chat' ? 'white' : 'rgba(255,255,255,0.2)',
                  color: analysisMode === 'chat' ? '#4f46e5' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                💬 Chat
              </button>
              <button
                onClick={analyzeUserBehavior}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '20px',
                  background: analysisMode === 'analyze' ? 'white' : 'rgba(255,255,255,0.2)',
                  color: analysisMode === 'analyze' ? '#4f46e5' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                📊 Analyze
              </button>
              <button
                onClick={getRecommendations}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '20px',
                  background: analysisMode === 'recommend' ? 'white' : 'rgba(255,255,255,0.2)',
                  color: analysisMode === 'recommend' ? '#4f46e5' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                🎯 Recommend
              </button>
            </div>

            {/* AI Model Selector */}
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value as 'bedrock' | 'sagemaker')}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '20px',
                background: 'white',
                color: '#4f46e5',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <option value="sagemaker">🧠 SageMaker</option>
              <option value="bedrock">☁️ Bedrock</option>
            </select>

            <button
              onClick={clearChat}
              style={{
                padding: '8px 16px',
                border: '2px solid white',
                borderRadius: '20px',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div style={{
          height: 'calc(100% - 180px)',
          overflowY: 'auto',
          padding: '20px 30px',
          background: '#f8fafc'
        }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '20px'
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '15px 20px',
                  borderRadius: '20px',
                  background: message.role === 'user' 
                    ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    : message.role === 'system'
                    ? '#f59e0b'
                    : 'white',
                  color: message.role === 'user' || message.role === 'system' ? 'white' : '#1f2937',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}
              >
                {message.role === 'ai' && (
                  <div style={{
                    fontSize: '12px',
                    opacity: 0.7,
                    marginBottom: '8px',
                    fontWeight: '600'
                  }}>
                    🤖 AI Assistant {message.metadata?.model && `(${message.metadata.model})`}
                  </div>
                )}
                
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {message.content}
                </div>
                
                {message.metadata?.tokenUsage && (
                  <div style={{
                    fontSize: '11px',
                    opacity: 0.6,
                    marginTop: '8px',
                    textAlign: 'right'
                  }}>
                    Tokens: {message.metadata.tokenUsage.input_tokens || 0} + {message.metadata.tokenUsage.output_tokens || 0}
                  </div>
                )}
                
                <div style={{
                  fontSize: '11px',
                  opacity: 0.6,
                  marginTop: '5px',
                  textAlign: 'right'
                }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '15px 20px',
                borderRadius: '20px',
                background: 'white',
                boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #4f46e5',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ color: '#6b7280' }}>AI is thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '20px 30px',
          background: 'white',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about travel, or let me analyze your preferences..."
                disabled={isLoading}
                style={{
                  width: '100%',
                  minHeight: '50px',
                  maxHeight: '120px',
                  padding: '15px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '25px',
                  fontSize: '16px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                padding: '15px 25px',
                background: !inputMessage.trim() || isLoading 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                minWidth: '100px'
              }}
            >
              {isLoading ? '⏳' : '🚀 Send'}
            </button>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}