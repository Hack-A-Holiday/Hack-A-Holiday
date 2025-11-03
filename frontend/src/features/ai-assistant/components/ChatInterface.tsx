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
  showSidebar: boolean;
  onToggleSidebar: () => void;
  onNewChat?: () => void;
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
  onPromptClick,
  showSidebar,
  onToggleSidebar,
  onNewChat
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Custom scrollbar styles */}
      <style jsx>{`
        .messages-container::-webkit-scrollbar {
          width: 8px;
        }
        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .messages-container::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4a5568' : '#cbd5e1'};
          border-radius: 4px;
        }
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#6b7280' : '#9ca3af'};
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
      `}</style>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: isDarkMode ? '#0a0f1c' : '#f8fafc'
      }}>


      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden' // Prevent scrollbar on main container
      }}>
        {/* Top Header Bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: isDarkMode ? 'rgba(10, 15, 28, 0.95)' : 'rgba(248, 250, 252, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
            {/* Sidebar Toggle */}
            <button
              onClick={onToggleSidebar}
              title="Double-click to access chat history"
              style={{
                padding: '8px',
                background: 'transparent',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              {/* Double-click indicator */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '16px',
                height: '16px',
                background: '#6366f1',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'white',
                fontWeight: 'bold',
                animation: 'pulse 2s infinite'
              }}>
                2×
              </div>
            </button>

            {/* Back Button */}
            <button
              onClick={onBackToWelcome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'transparent',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </button>
            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'transparent',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              New Chat
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
            }} />
            <span style={{
              fontSize: isMobile ? '0.95rem' : '1rem',
              fontWeight: '600',
              color: isDarkMode ? '#f1f5f9' : '#0f172a'
            }}>
              {isMobile ? 'AI Assistant' : 'AI Assistant Online'}
            </span>
            {!isMobile && (
              <span style={{
                fontSize: '0.8rem',
                color: isDarkMode ? '#64748b' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
                </svg>
                Nova AI
              </span>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-container" style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isMobile ? '20px 16px' : '40px 32px',
          paddingBottom: isMobile ? '100px' : '160px', // Space for sticky input
          maxWidth: '1100px',
          margin: '0 auto',
          width: '100%',
          // Custom scrollbar styles for Firefox
          scrollbarWidth: 'thin',
          scrollbarColor: isDarkMode ? '#4a5568 transparent' : '#cbd5e1 transparent'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: isMobile ? '40px 16px' : '80px 24px',
              opacity: 0.8
            }}>
              <div style={{
                width: isMobile ? '60px' : '80px',
                height: isMobile ? '60px' : '80px',
                margin: isMobile ? '0 auto 16px' : '0 auto 24px',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDarkMode ? '2px solid rgba(99, 102, 241, 0.2)' : '2px solid rgba(99, 102, 241, 0.1)'
              }}>
                <svg width={isMobile ? "32" : "40"} height={isMobile ? "32" : "40"} viewBox="0 0 24 24" fill={isDarkMode ? '#6366f1' : '#8b5cf6'}>
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H14L20 9H21Z"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                margin: '0 0 16px 0',
                letterSpacing: '0.5px'
              }}>
                How can I help you today?
              </h3>
              <p style={{
                color: isDarkMode ? '#94a3b8' : '#64748b',
                margin: '0 0 20px 0',
                fontSize: isMobile ? '1rem' : '1.1rem',
                lineHeight: '1.6',
                letterSpacing: '0.3px'
              }}>
                Ask me about travel planning, destinations, flights, or accommodations
              </p>
              
              {/* Chat History Hint */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px',
                padding: isMobile ? '10px 16px' : '12px 20px',
                background: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                border: isDarkMode ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(99, 102, 241, 0.1)',
                borderRadius: '25px',
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                color: isDarkMode ? '#a5b4fc' : '#6366f1',
                fontWeight: '500',
                animation: 'pulse 3s infinite',
                textAlign: 'center'
              }}>
                <svg width={isMobile ? "14" : "16"} height={isMobile ? "14" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                  <polyline points="9,11 12,14 15,11"/>
                  <line x1="12" y1="14" x2="12" y2="3"/>
                </svg>
                {isMobile ? '💡 Double-tap menu for chat history' : '💡 Tip: Double-click the menu button (☰) to access your chat history'}
              </div>
            </div>
          )}

          {messages.map(renderMessage)}
          
          {isLoading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start', 
              animation: 'fadeInUp 0.5s ease-out',
              marginTop: '24px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                border: isDarkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(226, 232, 240, 0.6)',
                borderRadius: '18px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                maxWidth: '200px'
              }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        animation: `bounce 1.6s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  color: isDarkMode ? '#e2e8f0' : '#1e293b',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  Thinking...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />

          {/* Suggested Prompts (show when no messages) */}
          {messages.length === 0 && (
            <div style={{
              marginTop: '40px',
              maxWidth: '700px',
              margin: '40px auto 0'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: isDarkMode ? '#f1f5f9' : '#334155',
                margin: '0 0 16px 0',
                textAlign: 'center'
              }}>
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
                      background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                      border: isDarkMode ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(226, 232, 240, 0.6)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: isDarkMode ? '#e2e8f0' : '#334155',
                      fontWeight: '500',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = isDarkMode 
                        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                        : '0 4px 20px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor = '#6366f1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
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
        </div>

        {/* Fixed Input Area at Bottom (Claude-style) */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          background: isDarkMode ? 'rgba(10, 15, 28, 0.95)' : 'rgba(248, 250, 252, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '20px 24px',
          zIndex: 10
        }}>
          <div style={{
            maxWidth: isMobile ? '100%' : '900px',
            margin: '0 auto',
            display: 'flex',
            gap: isMobile ? '8px' : '12px',
            alignItems: 'flex-end'
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
                placeholder={isMobile ? "Ask about travel..." : "Ask me about destinations, flights, hotels, or anything travel-related..."}
                disabled={isLoading}
                rows={1}
                style={{
                  width: '100%',
                  padding: isMobile ? '14px 16px' : '16px 20px',
                  paddingRight: isMobile ? '50px' : '60px',
                  borderRadius: isMobile ? '16px' : '20px',
                  fontSize: isMobile ? '16px' : '1rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  background: isDarkMode ? '#1e293b' : '#ffffff',
                  color: isDarkMode ? '#f1f5f9' : '#0f172a',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #d1d5db',
                  transition: 'all 0.2s ease',
                  minHeight: isMobile ? '48px' : '52px',
                  maxHeight: isMobile ? '100px' : '120px',
                  touchAction: 'manipulation'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              
              {/* Character counter */}
              {inputMessage.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '20px',
                  fontSize: '0.75rem',
                  color: isDarkMode ? '#64748b' : '#94a3b8',
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {inputMessage.length}
                </div>
              )}
            </div>
            
            <button
              onClick={onSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                width: isMobile ? '48px' : '52px',
                height: isMobile ? '48px' : '52px',
                minWidth: isMobile ? '48px' : '52px',
                borderRadius: isMobile ? '14px' : '16px',
                border: 'none',
                background: inputMessage.trim() && !isLoading
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : (isDarkMode ? '#374151' : '#e5e7eb'),
                color: 'white',
                cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'manipulation',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (inputMessage.trim() && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: 'currentColor',
                        animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};