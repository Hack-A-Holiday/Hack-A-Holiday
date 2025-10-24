import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/config/api';

interface ChatSession {
  _id: string;
  user_id: string;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  messageCount: number;
}

export const useChatSessions = (userId: string) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = getApiBaseUrl();

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/ai-agent/user-sessions/${userId}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      } else {
        setError('Failed to load chat sessions');
      }
    } catch (err) {
      setError('Network error while loading chat sessions');
      console.error('Failed to fetch chat sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, apiUrl]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!userId) return false;
    
    try {
      const response = await fetch(`${apiUrl}/ai-agent/user-sessions/${userId}/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s._id !== sessionId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete session:', err);
      return false;
    }
  }, [userId, apiUrl]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    if (!userId || !title.trim()) return false;
    
    try {
      const response = await fetch(`${apiUrl}/ai-agent/user-sessions/${userId}/${sessionId}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      });
      
      if (response.ok) {
        setSessions(prev => prev.map(s => 
          s._id === sessionId ? { ...s, title: title.trim() } : s
        ));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update session title:', err);
      return false;
    }
  }, [userId, apiUrl]);

  const searchSessions = useCallback(async (query: string) => {
    if (!userId || !query.trim()) return [];
    
    try {
      const response = await fetch(`${apiUrl}/ai-agent/user-sessions/${userId}/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.sessions)) {
        return data.sessions;
      }
      return [];
    } catch (err) {
      console.error('Failed to search sessions:', err);
      return [];
    }
  }, [userId, apiUrl]);

  const refreshSessions = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    deleteSession,
    updateSessionTitle,
    searchSessions,
    refreshSessions
  };
};