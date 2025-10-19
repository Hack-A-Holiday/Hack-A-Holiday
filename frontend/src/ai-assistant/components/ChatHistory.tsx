import React, { useState, useEffect } from 'react';
import { useChatSessions } from '../hooks/useChatSessions';

interface ChatSession {
  _id: string;
  user_id: string;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  messageCount: number;
}

interface ChatHistoryProps {
  isDarkMode: boolean;
  isMobile: boolean;
  userId: string;
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  isDarkMode,
  isMobile,
  userId,
  activeSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
  isVisible,
  onClose
}) => {
  const {
    sessions,
    loading,
    deleteSession,
    updateSessionTitle,
    searchSessions: searchSessionsHook,
    refreshSessions
  } = useChatSessions(userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatSession[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Search sessions
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchSessionsHook(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search sessions:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    const success = await deleteSession(sessionId);
    if (success) {
      setSearchResults(prev => prev.filter(s => s._id !== sessionId));
      onDeleteSession(sessionId);
    }
  };

  // Update session title
  const handleUpdateTitle = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    const success = await updateSessionTitle(sessionId, newTitle);
    if (success) {
      setSearchResults(prev => prev.map(s => 
        s._id === sessionId ? { ...s, title: newTitle.trim() } : s
      ));
      setEditingSessionId(null);
      setEditingTitle('');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  useEffect(() => {
    if (isVisible) {
      refreshSessions();
    }
  }, [isVisible, refreshSessions]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const displaySessions = searchQuery.trim() ? searchResults : sessions;

  if (!isVisible) return null;

  return (
    <div style={{
      position: isMobile ? 'fixed' : 'relative',
      top: isMobile ? 0 : 'auto',
      left: isMobile ? 0 : 'auto',
      width: isMobile ? '100vw' : '320px',
      height: '100vh',
      background: isDarkMode ? '#1e293b' : '#ffffff',
      borderRight: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
      zIndex: isMobile ? 1000 : 'auto',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: isMobile ? '0 0 20px rgba(0,0,0,0.3)' : 'none',
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: '600',
          color: isDarkMode ? '#f1f5f9' : '#1e293b'
        }}>
          Chat History
        </h2>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onNewChat}
            style={{
              padding: '8px',
              background: 'transparent',
              border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="New Chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                background: 'transparent',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: isDarkMode ? '1px solid #374151' : '1px solid #d1d5db',
              borderRadius: '8px',
              background: isDarkMode ? '#0f172a' : '#f9fafb',
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              fontSize: '14px',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
            }}
          />
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={isDarkMode ? '#64748b' : '#9ca3af'} 
            strokeWidth="2"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        
        {searchQuery && (
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: isDarkMode ? '#64748b' : '#9ca3af'
          }}>
            {isSearching ? 'Searching...' : `${displaySessions.length} result${displaySessions.length !== 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 20px 20px'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 0',
            color: isDarkMode ? '#64748b' : '#9ca3af'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid transparent',
              borderTop: '2px solid currentColor',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ marginLeft: '8px' }}>Loading...</span>
          </div>
        ) : displaySessions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: isDarkMode ? '#64748b' : '#9ca3af'
          }}>
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          displaySessions.map((session) => (
            <div
              key={session._id}
              style={{
                marginBottom: '8px',
                borderRadius: '8px',
                background: session._id === activeSessionId 
                  ? (isDarkMode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)')
                  : 'transparent',
                border: session._id === activeSessionId
                  ? (isDarkMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)')
                  : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                group: true
              }}
              onClick={() => {
                console.log('🖱️ ChatHistory: Session clicked:', session._id);
                onSessionSelect(session._id);
              }}
              onMouseEnter={(e) => {
                if (session._id !== activeSessionId) {
                  e.currentTarget.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (session._id !== activeSessionId) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ padding: '12px' }}>
                {/* Title */}
                {editingSessionId === session._id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleUpdateTitle(session._id, editingTitle)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateTitle(session._id, editingTitle);
                      } else if (e.key === 'Escape') {
                        setEditingSessionId(null);
                        setEditingTitle('');
                      }
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      border: '1px solid #6366f1',
                      borderRadius: '4px',
                      background: isDarkMode ? '#0f172a' : '#ffffff',
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  />
                ) : (
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    marginBottom: '4px',
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {session.title}
                  </div>
                )}

                {/* Preview */}
                <div style={{
                  fontSize: '12px',
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  marginBottom: '6px',
                  lineHeight: '1.3',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {session.preview}
                </div>

                {/* Meta info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: isDarkMode ? '#64748b' : '#9ca3af'
                }}>
                  <span>{formatDate(session.updated_at || session.created_at)}</span>
                  <span>{session.messageCount} messages</span>
                </div>
              </div>

              {/* Action buttons (show on hover) */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                gap: '4px',
                opacity: 0,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSessionId(session._id);
                    setEditingTitle(session.title);
                  }}
                  style={{
                    padding: '4px',
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Rename"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session._id);
                  }}
                  style={{
                    padding: '4px',
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        div:hover .group {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};