import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

export default function ChatPopup() {
  const { state } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Don't show on login/signup pages or if user is not logged in
  const shouldShowWidget = state.user && !['/login', '/', '/signup'].includes(router.pathname);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when first opened
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'ai',
        content: `Hi ${state.user?.name || 'there'}! 👋 I'm your AI travel assistant. I can help you with:\n\n🌍 Trip planning advice\n🎯 Destination recommendations\n💰 Budget suggestions\n✈️ Travel tips\n\nWhat can I help you with today?`,
        timestamp: Date.now()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]); // Removed messages.length and state.user?.name to prevent infinite loop

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      // Use Bedrock by default for the popup (faster response)
      const requestBody = {
        messages: [...messages, userMessage],
        userContext: {
          userId: state.user.id,
          sessionId: `popup_${Date.now()}`,
          preferences: {},
          mode: 'chat',
          userProfile: {
            name: state.user.name,
            email: state.user.email
          }
        },
        metadata: {
          source: 'chat-popup',
          model: 'bedrock',
          timestamp: Date.now()
        }
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai-agent`,
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
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Show notification if chat is minimized
      if (isMinimized) {
        setHasNewMessage(true);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again or visit the full AI chat for more features.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
    setHasNewMessage(false);
  };

  const minimizeChat = () => {
    setIsMinimized(true);
    setHasNewMessage(false);
  };

  const openFullChat = () => {
    router.push('/ai-chat');
  };

  if (!shouldShowWidget) {
    return null;
  }

  return (
    <>
      {/* Chat Widget */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        fontFamily: 'inherit'
      }}>
        {/* Chat Button */}
        {(!isOpen || isMinimized) && (
          <button
            onClick={toggleChat}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.3s ease',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(79, 70, 229, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.3)';
            }}
          >
            🤖
            {hasNewMessage && (
              <div style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '12px',
                height: '12px',
                background: '#ef4444',
                borderRadius: '50%',
                border: '2px solid white'
              }} />
            )}
          </button>
        )}

        {/* Chat Window */}
        {isOpen && !isMinimized && (
          <div style={{
            width: '350px',
            height: '500px',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: '10px',
            border: '1px solid #e5e7eb'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white',
              padding: '15px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  🤖 AI Assistant
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                  Quick help & advice
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={openFullChat}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                  title="Open full chat"
                >
                  🔍
                </button>
                <button
                  onClick={minimizeChat}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Minimize"
                >
                  −
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '15px',
              background: '#f8fafc'
            }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '12px'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: '16px',
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                        : message.role === 'system'
                        ? '#f59e0b'
                        : 'white',
                      color: message.role === 'user' || message.role === 'system' ? 'white' : '#1f2937',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {message.content}
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.7,
                      marginTop: '4px',
                      textAlign: 'right'
                    }}>
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '16px',
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #e5e7eb',
                      borderTop: '2px solid #4f46e5',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '15px',
              background: 'white',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about travel..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    minHeight: '36px',
                    maxHeight: '80px',
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '18px',
                    fontSize: '14px',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  style={{
                    padding: '8px 12px',
                    background: !inputMessage.trim() || isLoading 
                      ? '#d1d5db' 
                      : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '18px',
                    cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                >
                  {isLoading ? '⏳' : '🚀'}
                </button>
              </div>
              
              <div style={{
                textAlign: 'center',
                marginTop: '8px'
              }}>
                <button
                  onClick={openFullChat}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Open full AI chat for advanced features
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}