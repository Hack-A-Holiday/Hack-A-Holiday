// User Context Service for AI Agent
// Manages conversation history, user preferences, and session persistence

export interface UserContext {
  sessionId: string;
  userId?: string;
  preferences?: {
    budget?: number;
    travelStyle?: 'budget' | 'mid-range' | 'luxury';
    interests?: string[];
    destinations?: string[];
    accommodationType?: string;
    dietaryRestrictions?: string[];
  };
  currentTrip?: {
    destination?: string;
    dates?: {
      start: string;
      end: string;
    };
    travelers?: number;
    budget?: number;
    status?: 'planning' | 'booked' | 'completed';
  };
  tripHistory?: Array<{
    id: string;
    destination: string;
    dates: {
      start: string;
      end: string;
    };
    satisfaction?: number; // 1-5 rating
    feedback?: string;
  }>;
  conversationHistory?: Array<{
    sessionId: string;
    timestamp: number;
    messageCount: number;
    topics: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
  }>;
  aiPreferences?: {
    preferredModel?: 'bedrock' | 'sagemaker';
    responseStyle?: 'detailed' | 'concise' | 'casual';
    includeEmojis?: boolean;
  };
}

class UserContextService {
  private static instance: UserContextService;
  private contexts: Map<string, UserContext> = new Map();

  private constructor() {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
    }
  }

  static getInstance(): UserContextService {
    if (!UserContextService.instance) {
      UserContextService.instance = new UserContextService();
    }
    return UserContextService.instance;
  }

  // Create or get user context
  getOrCreateContext(sessionId: string, userId?: string): UserContext {
    let context = this.contexts.get(sessionId);
    
    if (!context) {
      context = {
        sessionId,
        userId,
        preferences: {},
        aiPreferences: {
          preferredModel: 'bedrock',
          responseStyle: 'detailed',
          includeEmojis: true
        },
        conversationHistory: []
      };
      this.contexts.set(sessionId, context);
    }

    return context;
  }

  // Update user context
  updateContext(sessionId: string, updates: Partial<UserContext>): UserContext {
    const context = this.getOrCreateContext(sessionId);
    const updatedContext = { ...context, ...updates };
    this.contexts.set(sessionId, updatedContext);
    this.saveToLocalStorage();
    return updatedContext;
  }

  // Add message to conversation history
  addConversationEntry(sessionId: string, messageCount: number, topics: string[] = []): void {
    const context = this.getOrCreateContext(sessionId);
    
    if (!context.conversationHistory) {
      context.conversationHistory = [];
    }

    context.conversationHistory.push({
      sessionId,
      timestamp: Date.now(),
      messageCount,
      topics
    });

    // Keep only last 10 conversation sessions
    if (context.conversationHistory.length > 10) {
      context.conversationHistory = context.conversationHistory.slice(-10);
    }

    this.updateContext(sessionId, { conversationHistory: context.conversationHistory });
  }

  // Update user preferences from profile
  updatePreferencesFromProfile(sessionId: string, profilePreferences: any): void {
    if (!profilePreferences) return;

    const updates: Partial<UserContext> = {
      preferences: {
        budget: profilePreferences.budget,
        travelStyle: profilePreferences.travelStyle,
        interests: profilePreferences.interests,
        destinations: profilePreferences.favoriteDestinations,
        accommodationType: profilePreferences.accommodationType,
        dietaryRestrictions: profilePreferences.dietaryRestrictions
      }
    };

    this.updateContext(sessionId, updates);
  }

  // Add completed trip to history
  addTripToHistory(sessionId: string, trip: {
    destination: string;
    dates: { start: string; end: string };
    satisfaction?: number;
    feedback?: string;
  }): void {
    const context = this.getOrCreateContext(sessionId);
    
    if (!context.tripHistory) {
      context.tripHistory = [];
    }

    const tripEntry = {
      id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...trip
    };

    context.tripHistory.push(tripEntry);

    // Keep only last 20 trips
    if (context.tripHistory.length > 20) {
      context.tripHistory = context.tripHistory.slice(-20);
    }

    this.updateContext(sessionId, { tripHistory: context.tripHistory });
  }

  // Get personalized prompt based on context
  getPersonalizedPrompt(sessionId: string): string {
    const context = this.getOrCreateContext(sessionId);
    const prompts: string[] = [];

    prompts.push(this.getPreferencesPrompt(context.preferences));
    prompts.push(this.getCurrentTripPrompt(context.currentTrip));
    prompts.push(this.getTripHistoryPrompt(context.tripHistory));
    prompts.push(this.getConversationHistoryPrompt(context.conversationHistory));

    return prompts.filter(p => p.length > 0).join('\n');
  }

  private getPreferencesPrompt(preferences?: UserContext['preferences']): string {
    if (!preferences) return '';
    
    const items: string[] = [];
    if (preferences.budget) items.push(`Budget preference: $${preferences.budget}`);
    if (preferences.travelStyle) items.push(`Travel style: ${preferences.travelStyle}`);
    if (preferences.interests?.length) items.push(`Interests: ${preferences.interests.join(', ')}`);
    if (preferences.destinations?.length) items.push(`Favorite destinations: ${preferences.destinations.join(', ')}`);
    
    return items.length > 0 ? `User Preferences:\n- ${items.join('\n- ')}\n` : '';
  }

  private getCurrentTripPrompt(currentTrip?: UserContext['currentTrip']): string {
    if (!currentTrip) return '';
    
    const items: string[] = [];
    if (currentTrip.destination) items.push(`Destination: ${currentTrip.destination}`);
    if (currentTrip.dates) items.push(`Dates: ${currentTrip.dates.start} to ${currentTrip.dates.end}`);
    if (currentTrip.travelers) items.push(`Number of travelers: ${currentTrip.travelers}`);
    
    return items.length > 0 ? `\nCurrent Trip Planning:\n- ${items.join('\n- ')}\n` : '';
  }

  private getTripHistoryPrompt(tripHistory?: UserContext['tripHistory']): string {
    if (!tripHistory?.length) return '';
    
    const recentTrips = tripHistory.slice(-3).map(trip => {
      let line = `${trip.destination} (${trip.dates.start})`;
      if (trip.satisfaction) line += ` - Rating: ${trip.satisfaction}/5`;
      return line;
    });
    
    return `\nPrevious Trips:\n- ${recentTrips.join('\n- ')}\n`;
  }

  private getConversationHistoryPrompt(conversationHistory?: UserContext['conversationHistory']): string {
    if (!conversationHistory?.length) return '';
    
    const recentTopics = conversationHistory
      .slice(-3)
      .flatMap(conv => conv.topics)
      .filter((topic, index, arr) => arr.indexOf(topic) === index);
    
    return recentTopics.length > 0 ? `\nRecent conversation topics: ${recentTopics.join(', ')}\n` : '';
  }

  // Extract topics from message content
  extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();

    // Travel-related keywords
    const travelKeywords = {
      destinations: ['paris', 'tokyo', 'london', 'new york', 'rome', 'bali', 'thailand', 'japan', 'italy', 'france'],
      activities: ['museum', 'beach', 'hiking', 'shopping', 'restaurant', 'hotel', 'flight', 'cruise'],
      planning: ['budget', 'itinerary', 'booking', 'reservation', 'schedule', 'plan'],
      accommodation: ['hotel', 'airbnb', 'resort', 'hostel', 'villa'],
      transport: ['flight', 'train', 'car rental', 'bus', 'taxi', 'uber']
    };

    Object.entries(travelKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
          topics.push(category);
        }
      });
    });

    return Array.from(new Set(topics)); // Remove duplicates
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const contextData = Object.fromEntries(this.contexts);
        localStorage.setItem('ai_user_contexts', JSON.stringify(contextData));
      } catch (error) {
        console.warn('Failed to save user contexts to localStorage:', error);
      }
    }
  }

  // Load from localStorage
  private loadFromLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ai_user_contexts');
        if (saved) {
          const contextData = JSON.parse(saved);
          this.contexts = new Map(Object.entries(contextData));
        }
      } catch (error) {
        console.warn('Failed to load user contexts from localStorage:', error);
      }
    }
  }

  // Clear old contexts (cleanup)
  cleanupOldContexts(maxAge: number = 7 * 24 * 60 * 60 * 1000): void { // 7 days default
    const now = Date.now();
    
    this.contexts.forEach((context, sessionId) => {
      const lastActivity = context.conversationHistory?.slice(-1)[0]?.timestamp || 0;
      
      if (now - lastActivity > maxAge) {
        this.contexts.delete(sessionId);
      }
    });
    
    this.saveToLocalStorage();
  }

  // Get all contexts (for debugging)
  getAllContexts(): Map<string, UserContext> {
    return new Map(this.contexts);
  }

  // Export user data
  exportUserData(sessionId: string): string {
    const context = this.getOrCreateContext(sessionId);
    return JSON.stringify(context, null, 2);
  }

  // Import user data
  importUserData(sessionId: string, data: string): boolean {
    try {
      const imported = JSON.parse(data) as UserContext;
      imported.sessionId = sessionId; // Ensure correct session ID
      this.contexts.set(sessionId, imported);
      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }
}

export default UserContextService;