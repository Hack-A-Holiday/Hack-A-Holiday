import React, { useRef } from 'react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  isDarkMode: boolean;
  isMobile: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onBackToWelcome: () => void;
  renderMessage: (message: ChatMessage) => React.ReactNode;
  suggestedPrompts: string[];
  onPromptClick: (prompt: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isDarkMode,
  isMobile,
  messages,
  isLoading,
  inputMessage,
  onInputChange,
  onSendMessage,
  onBackToWelcome,
  renderMessage,
  suggestedPrompts,
  onPromptClick
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 80px)',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '20px 16px' : '40px 24px'
    }}>
      {/* Chat Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: '24px',
        border: isDarkMode 
          ? '1px solid rgba(148, 163, 184, 0.1)' 
          : '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: isDarkMode 
          ? '0 25px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(148, 163, 184, 0.1)'
          : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        minHeight: '600px'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: isMobile ? '24px' : '32px 40px',
          borderBottom: isDarkMode 
            ? '1px solid rgba(148, 163, 184, 0.1)' 
            : '1px solid rgba(226, 232, 240, 0.8)',
          background: isDarkMode 
            ? 'rgba(15, 23, 42, 0.5)' 
            : 'rgba(248, 250, 252, 0.8)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <button
              onClick={onBackToWelcome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'transparent',
                border: isDarkMode 
                  ? '1px solid rgba(148, 163, 184, 0.2)' 
                  : '1px solid rgba(226, 232, 240, 0.8)',
                borderRadius: '12px',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode 
                  ? 'rgba(30, 41, 59, 0.5)' 
                  : 'rgba(241, 245, 249, 0.8)';
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = isDarkMode 
                  ? 'rgba(148, 163, 184, 0.2)' 
                  : 'rgba(226, 232, 240, 0.8)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{
                fontSize: isMobile ? '1.1rem' : '1.3rem',
                fontWeight: '700',
                color: isDarkMode ? '#f1f5f9' : '#0f172a'
              }}>
                AI Assistant Online
              </span>
            </div>
            
            <div style={{
              fontSize: '0.875rem',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
              </svg>
              Powered by Nova AI
            </div>
          </div>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            lineHeight: '1.5'
          }}>
            Ask me anything about travel planning, destinations, flights, or accommodations
          </p>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '20px' : '32px 40px',
          background: isDarkMode 
            ? 'linear-gradient(to bottom, rgba(15, 23, 42, 0.3) 0%, rgba(30, 41, 59, 0.3) 100%)' 
            : 'linear-gradient(to bottom, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.5) 100%)',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              opacity: 0.7
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 24px',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDarkMode ? '2px solid rgba(99, 102, 241, 0.2)' : '2px solid rgba(99, 102, 241, 0.1)'
              }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill={isDarkMode ? '#6366f1' : '#8b5cf6'}>
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H14L20 9H21Z"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                margin: '0 0 12px 0'
              }}>
                Welcome to AI Travel Assistant
              </h3>
              <p style={{
                color: isDarkMode ? '#94a3b8' : '#64748b',
                margin: 0,
                fontSize: '1rem',
                lineHeight: '1.5'
              }}>
                Start a conversation to get personalized travel recommendations, 
                plan itineraries, or ask about destinations worldwide.
              </p>
            </div>
          )}

          {messages.map(renderMessage)}
          
          {isLoading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start', 
              animation: 'fadeInUp 0.5s ease-out' 
            }}>
              <div style={{
                background: isDarkMode 
                  ? 'rgba(30, 41, 59, 0.8)' 
                  : 'rgba(255, 255, 255, 0.9)',
                border: isDarkMode 
                  ? '1px solid rgba(148, 163, 184, 0.1)' 
                  : '1px solid rgba(226, 232, 240, 0.6)',
                borderRadius: '24px',
                padding: '20px 28px',
                boxShadow: isDarkMode 
                  ? '0 10px 30px rgba(0, 0, 0, 0.3)'
                  : '0 10px 30px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                maxWidth: '320px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  alignItems: 'center' 
                }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        animation: `bounce 1.6s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  color: isDarkMode ? '#e2e8f0' : '#1e293b',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  Thinking...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts (show when no messages) */}
        {messages.length === 0 && (
          <div style={{
            padding: isMobile ? '20px 24px' : '24px 40px',
            borderTop: isDarkMode 
              ? '1px solid rgba(148, 163, 184, 0.1)' 
              : '1px solid rgba(226, 232, 240, 0.8)',
            background: isDarkMode 
              ? 'rgba(15, 23, 42, 0.5)' 
              : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(10px)'
          }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: isDarkMode ? '#f1f5f9' : '#334155',
              margin: '0 0 16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Popular Questions
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onPromptClick(prompt)}
                  style={{
                    padding: '16px 20px',
                    background: isDarkMode 
                      ? 'rgba(30, 41, 59, 0.6)' 
                      : 'rgba(255, 255, 255, 0.7)',
                    border: isDarkMode 
                      ? '1px solid rgba(148, 163, 184, 0.1)' 
                      : '1px solid rgba(226, 232, 240, 0.6)',
                    borderRadius: '16px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: isDarkMode ? '#e2e8f0' : '#334155',
                    fontWeight: '500',
                    textAlign: 'left',
                    backdropFilter: 'blur(10px)',
                    boxShadow: isDarkMode 
                      ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                      : '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = isDarkMode 
                      ? '0 8px 25px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.3)'
                      : '0 8px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isDarkMode 
                      ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                      : '0 4px 12px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.borderColor = isDarkMode 
                      ? 'rgba(148, 163, 184, 0.1)' 
                      : 'rgba(226, 232, 240, 0.6)';
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
          padding: isMobile ? '20px 24px' : '24px 40px',
          borderTop: isDarkMode 
            ? '1px solid rgba(148, 163, 184, 0.1)' 
            : '1px solid rgba(226, 232, 240, 0.8)',
          background: isDarkMode 
            ? 'rgba(15, 23, 42, 0.7)' 
            : 'rgba(248, 250, 252, 0.9)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'flex-end',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={inputMessage}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendMessage();
                  }
                }}
                placeholder="Ask me about destinations, flights, hotels, or anything travel-related..."
                disabled={isLoading}
                rows={1}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  paddingRight: '60px',
                  borderRadius: '24px',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  background: isDarkMode 
                    ? 'rgba(30, 41, 59, 0.8)' 
                    : 'rgba(255, 255, 255, 0.9)',
                  color: isDarkMode ? '#f1f5f9' : '#0f172a',
                  border: isDarkMode 
                    ? '2px solid rgba(148, 163, 184, 0.2)' 
                    : '2px solid rgba(226, 232, 240, 0.8)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isDarkMode 
                    ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                    : '0 4px 20px rgba(0, 0, 0, 0.08)',
                  minHeight: '56px',
                  maxHeight: '120px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = isDarkMode 
                    ? '0 8px 30px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(99, 102, 241, 0.1)'
                    : '0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode 
                    ? 'rgba(148, 163, 184, 0.2)' 
                    : 'rgba(226, 232, 240, 0.8)';
                  e.currentTarget.style.boxShadow = isDarkMode 
                    ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                    : '0 4px 20px rgba(0, 0, 0, 0.08)';
                }}
              />
              
              {/* Character counter */}
              {inputMessage.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '24px',
                  fontSize: '0.75rem',
                  color: isDarkMode ? '#64748b' : '#94a3b8',
                  background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  backdropFilter: 'blur(5px)'
                }}>
                  {inputMessage.length}
                </div>
              )}
            </div>
            
            <button
              onClick={onSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                border: 'none',
                background: inputMessage.trim() && !isLoading
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : (isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(148, 163, 184, 0.5)'),
                color: 'white',
                cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: inputMessage.trim() && !isLoading 
                  ? '0 8px 25px rgba(99, 102, 241, 0.4)'
                  : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (inputMessage.trim() && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(99, 102, 241, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = inputMessage.trim() && !isLoading 
                  ? '0 8px 25px rgba(99, 102, 241, 0.4)'
                  : 'none';
              }}
            >
              {isLoading ? (
                <div style={{ 
                  display: 'flex', 
                  gap: '3px', 
                  alignItems: 'center' 
                }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'currentColor',
                        animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};