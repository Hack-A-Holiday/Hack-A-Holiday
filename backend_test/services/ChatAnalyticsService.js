// Chat Analytics Service - Student-Friendly, FREE, Production-Ready
// Analyzes user chat data for personalized recommendations

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

class ChatAnalyticsService {
  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.dynamodb = DynamoDBDocumentClient.from(client);
    
    this.chatHistoryTable = process.env.CHAT_HISTORY_TABLE || 'TravelCompanion-ChatHistory-dev';
    this.analyticsCache = new Map(); // In-memory cache for fast access
    
    // Keyword dictionaries for pattern detection
    this.keywords = {
      budget: {
        low: ['cheap', 'budget', 'affordable', 'economical', 'save money', 'backpacker'],
        medium: ['reasonable', 'moderate', 'mid-range', 'average'],
        high: ['luxury', 'premium', 'expensive', 'high-end', 'business class', 'first class']
      },
      travelStyle: {
        adventure: ['adventure', 'hiking', 'trekking', 'outdoor', 'extreme', 'backpacking'],
        relaxation: ['relax', 'spa', 'beach', 'resort', 'peaceful', 'quiet', 'chill'],
        cultural: ['culture', 'museum', 'history', 'art', 'heritage', 'traditional'],
        romantic: ['romantic', 'honeymoon', 'couple', 'anniversary', 'intimate'],
        family: ['family', 'kids', 'children', 'family-friendly', 'playground']
      },
      interests: {
        food: ['food', 'restaurant', 'cuisine', 'culinary', 'dining', 'eat'],
        nature: ['nature', 'wildlife', 'mountains', 'forest', 'scenery', 'landscape'],
        beach: ['beach', 'ocean', 'sea', 'coast', 'island', 'sand'],
        city: ['city', 'urban', 'nightlife', 'shopping', 'downtown'],
        sports: ['sports', 'skiing', 'surfing', 'diving', 'climbing']
      },
      urgency: {
        high: ['urgent', 'asap', 'immediately', 'soon', 'quick', 'emergency'],
        medium: ['next week', 'next month', 'planning'],
        low: ['someday', 'eventually', 'thinking about', 'maybe']
      }
    };
  }

  /**
   * Analyze chat messages and extract insights
   * FREE - Uses only JavaScript, no external APIs
   */
  async analyzeChat(sessionId, messages, userId) {
    try {
      const analysis = {
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
        
        // User preferences extracted from chat
        preferences: {
          budget: this.detectBudget(messages),
          travelStyle: this.detectTravelStyle(messages),
          interests: this.detectInterests(messages),
          destinations: this.extractDestinations(messages),
          timing: this.extractTiming(messages),
          groupSize: this.detectGroupSize(messages)
        },
        
        // User intent and behavior
        intent: {
          lookingForFlights: this.detectIntent(messages, 'flight'),
          lookingForHotels: this.detectIntent(messages, 'hotel'),
          planningTrip: this.detectIntent(messages, 'trip'),
          comparingOptions: this.detectIntent(messages, 'compare'),
          readyToBook: this.detectBookingIntent(messages)
        },
        
        // Sentiment analysis (simple but effective)
        sentiment: this.analyzeSentiment(messages),
        
        // User engagement metrics
        engagement: {
          avgMessageLength: this.calculateAvgMessageLength(messages),
          questionCount: this.countQuestions(messages),
          responseTime: this.calculateResponseTime(messages),
          conversationDepth: messages.length
        },
        
        // Confidence score for recommendations
        confidenceScore: 0.5,
        
        // Extracted entities
        entities: {
          destinations: [],
          dates: [],
          people: [],
          budgets: []
        }
      };

      // Calculate confidence based on data quality
      analysis.confidenceScore = this.calculateConfidence(analysis);
      
      // Save analysis to DynamoDB
      await this.saveAnalysis(analysis);
      
      // Cache for fast access
      this.analyticsCache.set(sessionId, analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('Error analyzing chat:', error);
      return this.getDefaultAnalysis(sessionId, userId);
    }
  }

  /**
   * Detect budget level from messages
   * Returns: 'low', 'medium', 'high'
   */
  detectBudget(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    
    let scores = { low: 0, medium: 0, high: 0 };
    
    // Check for budget keywords
    Object.entries(this.keywords.budget).forEach(([level, keywords]) => {
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          scores[level]++;
        }
      });
    });
    
    // Extract numbers that might be budgets
    const numbers = text.match(/\$?\d+,?\d*/g);
    if (numbers) {
      numbers.forEach(num => {
        const value = parseInt(num.replace(/[^0-9]/g, ''));
        if (value < 1000) scores.low++;
        else if (value < 3000) scores.medium++;
        else scores.high++;
      });
    }
    
    // Return highest scoring category
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Detect travel style from messages
   * Returns: 'adventure', 'relaxation', 'cultural', 'romantic', 'family', 'mixed'
   */
  detectTravelStyle(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    
    let scores = {};
    
    Object.entries(this.keywords.travelStyle).forEach(([style, keywords]) => {
      scores[style] = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          scores[style]++;
        }
      });
    });
    
    const topScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([, score]) => score > 0);
    
    if (topScores.length === 0) return 'balanced';
    if (topScores.length > 2) return 'mixed';
    
    return topScores[0][0];
  }

  /**
   * Detect user interests from messages
   * Returns: Array of interests
   */
  detectInterests(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    const interests = [];
    
    Object.entries(this.keywords.interests).forEach(([interest, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        interests.push({
          interest,
          confidence: matches.length / keywords.length,
          keywords: matches
        });
      }
    });
    
    // Sort by confidence and return top interests
    return interests
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(item => item.interest);
  }

  /**
   * Extract destination mentions from messages
   * Returns: Array of destinations with confidence scores
   */
  extractDestinations(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    
    // Common travel destinations (expandable)
    const destinations = [
      'paris', 'london', 'tokyo', 'new york', 'barcelona', 'rome', 'dubai',
      'bali', 'thailand', 'singapore', 'maldives', 'hawaii', 'iceland',
      'amsterdam', 'berlin', 'prague', 'vienna', 'budapest', 'lisbon',
      'mumbai', 'delhi', 'bangalore', 'goa', 'kerala', 'rajasthan'
    ];
    
    const found = [];
    
    destinations.forEach(dest => {
      const count = (text.match(new RegExp(dest, 'gi')) || []).length;
      if (count > 0) {
        found.push({
          destination: dest.charAt(0).toUpperCase() + dest.slice(1),
          mentions: count,
          confidence: Math.min(count / 3, 1.0)
        });
      }
    });
    
    return found.sort((a, b) => b.mentions - a.mentions);
  }

  /**
   * Extract timing information (dates, seasons, urgency)
   */
  extractTiming(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    
    const timing = {
      urgency: 'medium',
      season: null,
      monthsAhead: null,
      specificDates: []
    };
    
    // Detect urgency
    Object.entries(this.keywords.urgency).forEach(([level, keywords]) => {
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          timing.urgency = level;
        }
      });
    });
    
    // Detect seasons
    const seasons = {
      summer: ['summer', 'june', 'july', 'august'],
      winter: ['winter', 'december', 'january', 'february'],
      spring: ['spring', 'march', 'april', 'may'],
      fall: ['fall', 'autumn', 'september', 'october', 'november']
    };
    
    Object.entries(seasons).forEach(([season, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        timing.season = season;
      }
    });
    
    // Extract time references
    if (text.includes('next week')) timing.monthsAhead = 0.25;
    if (text.includes('next month')) timing.monthsAhead = 1;
    if (text.includes('few months')) timing.monthsAhead = 3;
    if (text.includes('next year')) timing.monthsAhead = 12;
    
    return timing;
  }

  /**
   * Detect group size (solo, couple, family, group)
   */
  detectGroupSize(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    
    if (text.match(/solo|alone|myself|just me/i)) return { type: 'solo', size: 1 };
    if (text.match(/couple|two of us|partner|spouse/i)) return { type: 'couple', size: 2 };
    if (text.match(/family|kids|children/i)) return { type: 'family', size: 4 };
    if (text.match(/group|friends|together/i)) return { type: 'group', size: 6 };
    
    // Extract numbers
    const numberMatch = text.match(/(\d+)\s*(people|person|travelers|of us)/i);
    if (numberMatch) {
      const size = parseInt(numberMatch[1]);
      let type = 'group';
      if (size === 1) type = 'solo';
      else if (size === 2) type = 'couple';
      else if (size <= 4) type = 'family';
      
      return { type, size };
    }
    
    return { type: 'unknown', size: 1 };
  }

  /**
   * Detect specific intent (flight, hotel, trip, etc.)
   */
  detectIntent(messages, intentType) {
    const text = this.combineMessages(messages).toLowerCase();
    
    const intentKeywords = {
      flight: ['flight', 'fly', 'plane', 'airline', 'ticket', 'departure', 'arrival'],
      hotel: ['hotel', 'accommodation', 'stay', 'resort', 'room', 'booking'],
      trip: ['trip', 'vacation', 'holiday', 'travel', 'tour', 'itinerary'],
      compare: ['compare', 'versus', 'vs', 'better', 'cheaper', 'alternative']
    };
    
    const keywords = intentKeywords[intentType] || [];
    const matches = keywords.filter(keyword => text.includes(keyword));
    
    return {
      detected: matches.length > 0,
      confidence: matches.length / keywords.length,
      keywords: matches
    };
  }

  /**
   * Detect booking readiness
   */
  detectBookingIntent(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    
    const bookingKeywords = [
      'book', 'reserve', 'purchase', 'buy', 'confirm', 
      'ready to book', 'want to book', 'how do i book'
    ];
    
    const score = bookingKeywords.filter(keyword => text.includes(keyword)).length;
    
    return {
      ready: score > 0,
      urgency: score > 2 ? 'high' : score > 0 ? 'medium' : 'low',
      score: Math.min(score / 3, 1.0)
    };
  }

  /**
   * Simple sentiment analysis (positive, neutral, negative)
   */
  analyzeSentiment(messages) {
    const text = this.combineMessages(messages).toLowerCase();
    
    // Positive words
    const positiveWords = [
      'love', 'great', 'amazing', 'beautiful', 'wonderful', 'excellent',
      'perfect', 'best', 'awesome', 'excited', 'happy', 'nice'
    ];
    
    // Negative words
    const negativeWords = [
      'hate', 'bad', 'terrible', 'awful', 'horrible', 'worst',
      'disappointed', 'boring', 'expensive', 'waste', 'poor'
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      positiveScore += (text.match(new RegExp(word, 'gi')) || []).length;
    });
    
    negativeWords.forEach(word => {
      negativeScore += (text.match(new RegExp(word, 'gi')) || []).length;
    });
    
    const totalScore = positiveScore - negativeScore;
    
    return {
      sentiment: totalScore > 2 ? 'positive' : totalScore < -2 ? 'negative' : 'neutral',
      score: totalScore,
      positiveCount: positiveScore,
      negativeCount: negativeScore,
      confidence: Math.min((positiveScore + negativeScore) / 10, 1.0)
    };
  }

  /**
   * Calculate confidence score for the analysis
   */
  calculateConfidence(analysis) {
    let score = 0.3; // Base confidence
    
    // More messages = higher confidence
    if (analysis.messageCount > 5) score += 0.2;
    if (analysis.messageCount > 10) score += 0.1;
    
    // Detected preferences increase confidence
    if (analysis.preferences.destinations.length > 0) score += 0.15;
    if (analysis.preferences.budget !== 'medium') score += 0.1;
    if (analysis.preferences.interests.length > 0) score += 0.1;
    
    // Clear intent increases confidence
    if (analysis.intent.planningTrip.detected) score += 0.1;
    if (analysis.intent.readyToBook.ready) score += 0.15;
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate personalized recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = {
      destinations: [],
      flightTips: [],
      budgetAdvice: [],
      timingAdvice: [],
      personalizedMessage: ''
    };
    
    // Destination recommendations
    if (analysis.preferences.destinations.length === 0) {
      // Recommend based on interests and style
      recommendations.destinations = this.getDestinationsByPreferences(
        analysis.preferences.travelStyle,
        analysis.preferences.interests,
        analysis.preferences.budget
      );
    }
    
    // Budget advice
    if (analysis.preferences.budget === 'low') {
      recommendations.budgetAdvice = [
        'Consider traveling during off-peak seasons',
        'Book flights 6-8 weeks in advance',
        'Look for package deals',
        'Consider budget airlines'
      ];
    }
    
    // Timing advice
    if (analysis.preferences.timing.urgency === 'high') {
      recommendations.timingAdvice = [
        'Last-minute deals are available',
        'Be flexible with dates for better prices',
        'Check multiple airlines'
      ];
    }
    
    // Personalized message
    recommendations.personalizedMessage = this.createPersonalizedMessage(analysis);
    
    return recommendations;
  }

  /**
   * Save analysis to DynamoDB
   */
  async saveAnalysis(analysis) {
    try {
      const params = {
        TableName: this.chatHistoryTable,
        Item: {
          sessionId: analysis.sessionId,
          userId: analysis.userId,
          timestamp: analysis.timestamp,
          analysis: analysis,
          ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
        }
      };
      
      await this.dynamodb.put(params).promise();
      console.log('✅ Analysis saved to DynamoDB');
      
    } catch (error) {
      console.error('Error saving analysis:', error);
      // Don't throw - analytics shouldn't break the app
    }
  }

  /**
   * Get analytics for a user
   */
  async getUserAnalytics(userId, limit = 10) {
    try {
      const params = {
        TableName: this.chatHistoryTable,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        Limit: limit
      };
      
      const result = await this.dynamodb.scan(params).promise();
      return result.Items || [];
      
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return [];
    }
  }

  /**
   * Generate user profile summary
   */
  async generateUserProfile(userId) {
    const analytics = await this.getUserAnalytics(userId, 20);
    
    if (analytics.length === 0) {
      return this.getDefaultProfile(userId);
    }
    
    // Aggregate data from all sessions
    const profile = {
      userId,
      totalSessions: analytics.length,
      totalMessages: 0,
      preferences: {
        budget: {},
        travelStyle: {},
        interests: [],
        destinations: []
      },
      behavior: {
        avgSessionLength: 0,
        bookingReadiness: 0,
        preferredTiming: {}
      },
      lastActivity: null,
      createdAt: new Date().toISOString()
    };
    
    // Aggregate preferences
    analytics.forEach(session => {
      const analysis = session.analysis;
      profile.totalMessages += analysis.messageCount;
      
      // Count budget preferences
      const budget = analysis.preferences.budget;
      profile.preferences.budget[budget] = (profile.preferences.budget[budget] || 0) + 1;
      
      // Count travel styles
      const style = analysis.preferences.travelStyle;
      profile.preferences.travelStyle[style] = (profile.preferences.travelStyle[style] || 0) + 1;
      
      // Collect interests
      analysis.preferences.interests.forEach(interest => {
        if (!profile.preferences.interests.includes(interest)) {
          profile.preferences.interests.push(interest);
        }
      });
      
      // Collect destinations
      analysis.preferences.destinations.forEach(dest => {
        const existing = profile.preferences.destinations.find(
          d => d.destination === dest.destination
        );
        if (existing) {
          existing.mentions += dest.mentions;
        } else {
          profile.preferences.destinations.push({ ...dest });
        }
      });
    });
    
    // Calculate averages
    profile.behavior.avgSessionLength = profile.totalMessages / profile.totalSessions;
    
    // Sort destinations by mentions
    profile.preferences.destinations.sort((a, b) => b.mentions - a.mentions);
    
    return profile;
  }

  // Helper methods
  combineMessages(messages) {
    return messages
      .map(msg => typeof msg === 'string' ? msg : msg.content)
      .join(' ');
  }

  calculateAvgMessageLength(messages) {
    const totalLength = messages.reduce((sum, msg) => {
      const content = typeof msg === 'string' ? msg : msg.content;
      return sum + content.length;
    }, 0);
    return Math.round(totalLength / messages.length);
  }

  countQuestions(messages) {
    return messages.filter(msg => {
      const content = typeof msg === 'string' ? msg : msg.content;
      return content.includes('?');
    }).length;
  }

  calculateResponseTime(messages) {
    // Placeholder - would calculate based on timestamps
    return 0;
  }

  getDestinationsByPreferences(style, interests, budget) {
    // Simplified - would use a more comprehensive database
    const recommendations = [
      { name: 'Bali', style: ['relaxation', 'adventure'], budget: 'low' },
      { name: 'Paris', style: ['cultural', 'romantic'], budget: 'high' },
      { name: 'Tokyo', style: ['cultural', 'adventure'], budget: 'medium' },
      { name: 'Iceland', style: ['adventure'], budget: 'high' },
      { name: 'Thailand', style: ['adventure', 'relaxation'], budget: 'low' }
    ];
    
    return recommendations
      .filter(dest => dest.style.includes(style) || style === 'mixed')
      .filter(dest => dest.budget === budget || budget === 'medium')
      .slice(0, 3);
  }

  createPersonalizedMessage(analysis) {
    const { travelStyle, budget, destinations } = analysis.preferences;
    const { planningTrip, readyToBook } = analysis.intent;
    
    let message = "Based on our conversation, ";
    
    if (destinations.length > 0) {
      message += `I see you're interested in ${destinations[0].destination}. `;
    }
    
    if (travelStyle && travelStyle !== 'balanced') {
      message += `Your ${travelStyle} travel style suggests `;
    }
    
    if (readyToBook.ready) {
      message += "you're ready to book. Let me show you the best options!";
    } else if (planningTrip.detected) {
      message += "you're in the planning phase. I can help you explore more options.";
    } else {
      message += "I'd love to help you plan your perfect trip!";
    }
    
    return message;
  }

  getDefaultAnalysis(sessionId, userId) {
    return {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      messageCount: 0,
      preferences: {
        budget: 'medium',
        travelStyle: 'balanced',
        interests: [],
        destinations: []
      },
      intent: {
        lookingForFlights: { detected: false },
        planningTrip: { detected: false }
      },
      sentiment: { sentiment: 'neutral', score: 0 },
      confidenceScore: 0.3
    };
  }

  getDefaultProfile(userId) {
    return {
      userId,
      totalSessions: 0,
      totalMessages: 0,
      preferences: {
        budget: {},
        travelStyle: {},
        interests: [],
        destinations: []
      },
      behavior: {
        avgSessionLength: 0,
        bookingReadiness: 0
      },
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = ChatAnalyticsService;
