const axios = require('axios');
const RecommendationEngine = require('./RecommendationEngine');

/**
 * Comprehensive AI Agent Service
 * Integrates chat analysis, SageMaker, and personalized recommendations
 */
class ComprehensiveAIAgent {
  constructor() {
    this.recommendationEngine = new RecommendationEngine();
    this.conversationHistory = new Map(); // Store conversation contexts
    this.userProfiles = new Map(); // Store user profiles
    this.sagemakerEndpoint = process.env.SAGEMAKER_ENDPOINT_NAME || 'travel-assistant-endpoint';
    this.bedrockRegion = process.env.AWS_REGION || 'us-east-1';
  }

  /**
   * Main AI Agent Handler - Routes to appropriate AI service
   */
  async processUserMessage(messageData) {
    try {
      const {
        messages = [],
        userContext = {},
        aiModel = 'bedrock',
        requestType = 'chat', // chat, recommendation, analysis
        userId,
        sessionId
      } = messageData;

      // Update conversation history
      await this.updateConversationHistory(sessionId || userId, messages);

      // Get user profile and preferences
      const userProfile = await this.getUserProfile(sessionId || userId);

      // Analyze conversation for travel intent
      const conversationAnalysis = await this.analyzeConversationIntent(messages, userContext);

      let response;

      switch (requestType) {
        case 'recommendation':
          response = await this.generatePersonalizedRecommendations(
            conversationAnalysis,
            userProfile,
            userContext
          );
          break;

        case 'analysis':
          response = await this.performDeepAnalysis(
            messages,
            userProfile,
            userContext
          );
          break;

        case 'chat':
        default:
          // Route to appropriate AI model
          if (aiModel === 'sagemaker') {
            response = await this.processSageMakerRequest(
              messages,
              userContext,
              conversationAnalysis,
              userProfile
            );
          } else {
            response = await this.processBedrockRequest(
              messages,
              userContext,
              conversationAnalysis,
              userProfile
            );
          }
          break;
      }

      // Update user profile based on interaction
      await this.updateUserProfile(sessionId || userId, conversationAnalysis, response);

      return {
        ...response,
        conversationAnalysis,
        userInsights: this.generateUserInsights(userProfile, conversationAnalysis),
        recommendedActions: await this.generateRecommendedActions(conversationAnalysis, userProfile)
      };

    } catch (error) {
      console.error('ComprehensiveAIAgent Error:', error);
      throw error;
    }
  }

  /**
   * Process request through SageMaker with enhanced context
   */
  async processSageMakerRequest(messages, userContext, analysis, userProfile) {
    try {
      // Enhanced prompt with comprehensive context
      const enhancedPrompt = this.createEnhancedPrompt(messages, userContext, analysis, userProfile);

      const sagemakerPayload = {
        inputs: enhancedPrompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true,
          repetition_penalty: 1.1
        },
        userContext: {
          ...userContext,
          travelProfile: userProfile.travelProfile,
          preferences: userProfile.preferences,
          conversationAnalysis: analysis
        }
      };

      // Call SageMaker endpoint
      const response = await this.callSageMakerEndpoint(sagemakerPayload);

      // Post-process response with travel-specific enhancements
      const enhancedResponse = await this.enhanceSageMakerResponse(
        response,
        analysis,
        userProfile
      );

      return {
        role: 'ai',
        content: enhancedResponse.content,
        metadata: {
          model: 'sagemaker',
          endpoint: this.sagemakerEndpoint,
          analysisUsed: true,
          personalizedScore: enhancedResponse.personalizedScore,
          responseTime: Date.now()
        }
      };

    } catch (error) {
      console.error('SageMaker processing error:', error);
      // Fallback to Bedrock
      return await this.processBedrockRequest(messages, userContext, analysis, userProfile);
    }
  }

  /**
   * Process request through Bedrock with enhanced context
   */
  async processBedrockRequest(messages, userContext, analysis, userProfile) {
    try {
      // Enhanced prompt for Bedrock
      const enhancedPrompt = this.createEnhancedPrompt(messages, userContext, analysis, userProfile);

      const bedrockPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: enhancedPrompt
          }
        ]
      };

      // Call Bedrock API (simplified - you'd use AWS SDK in practice)
      const response = await this.callBedrockEndpoint(bedrockPayload);

      return {
        role: 'ai',
        content: response.content,
        metadata: {
          model: 'bedrock',
          analysisUsed: true,
          responseTime: Date.now()
        }
      };

    } catch (error) {
      console.error('Bedrock processing error:', error);
      return this.getFallbackResponse(analysis);
    }
  }

  /**
   * Analyze conversation for travel intent and preferences
   */
  async analyzeConversationIntent(messages, userContext) {
    try {
      const analysis = await this.recommendationEngine.analyzeChatHistory(messages, userContext);

      // Enhanced analysis with AI-powered insights
      const enhancedAnalysis = {
        ...analysis,
        travelIntent: {
          isPlanning: this.detectTravelPlanning(messages),
          destination: this.extractDestination(messages),
          budget: this.extractBudget(messages),
          timeframe: this.extractTimeframe(messages),
          travelStyle: this.extractTravelStyle(messages),
          urgency: this.assessUrgency(messages)
        },
        flightNeeds: {
          needsFlights: this.detectFlightNeeds(messages),
          preferences: this.extractFlightPreferences(messages),
          flexibility: this.assessFlexibility(messages)
        },
        personalizationLevel: this.calculatePersonalizationLevel(messages, userContext)
      };

      return enhancedAnalysis;

    } catch (error) {
      console.error('Conversation analysis error:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Generate personalized recommendations based on conversation analysis
   */
  async generatePersonalizedRecommendations(analysis, userProfile, userContext) {
    try {
      const recommendations = {
        destinations: [],
        flights: [],
        activities: [],
        travelTips: [],
        budgetAdvice: [],
        timingRecommendations: []
      };

      // Destination recommendations
      if (analysis.travelIntent.isPlanning && !analysis.travelIntent.destination) {
        recommendations.destinations = await this.recommendationEngine.recommendDestinations(
          analysis.preferences,
          userContext,
          analysis.travelIntent.budget
        );
      }

      // Flight recommendations
      if (analysis.flightNeeds.needsFlights) {
        recommendations.flights = await this.recommendationEngine.generateFlightRecommendations({
          destination: analysis.travelIntent.destination,
          analyzedPreferences: analysis.preferences,
          userContext,
          budget: analysis.travelIntent.budget
        });
      }

      // Activity recommendations based on interests
      if (analysis.preferences.interests.length > 0) {
        recommendations.activities = await this.generateActivityRecommendations(
          analysis.preferences.interests,
          analysis.travelIntent.destination
        );
      }

      // Personalized travel tips
      recommendations.travelTips = await this.generatePersonalizedTips(analysis, userProfile);

      // Budget advice
      if (analysis.travelIntent.budget) {
        recommendations.budgetAdvice = await this.generateBudgetAdvice(
          analysis.travelIntent.budget,
          analysis.travelIntent.destination
        );
      }

      return {
        role: 'ai',
        content: this.formatRecommendationsResponse(recommendations, analysis),
        metadata: {
          model: 'comprehensive-ai',
          recommendationsGenerated: true,
          personalizationScore: analysis.personalizationLevel
        },
        recommendations
      };

    } catch (error) {
      console.error('Recommendation generation error:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Create enhanced prompt with full context
   */
  createEnhancedPrompt(messages, userContext, analysis, userProfile) {
    const latestMessage = messages[messages.length - 1]?.content || '';
    
    const contextPrompt = `You are an expert AI travel assistant with deep knowledge of destinations, flights, and personalized travel planning.

USER PROFILE:
- Travel Style: ${userProfile.travelProfile?.style || 'Not determined'}
- Budget Preference: ${analysis.preferences?.budget || 'Medium'}
- Interests: ${analysis.preferences?.interests?.join(', ') || 'General travel'}
- Previous Destinations: ${userProfile.travelHistory?.map(t => t.destination)?.join(', ') || 'None recorded'}

CONVERSATION ANALYSIS:
- Travel Intent: ${analysis.travelIntent?.isPlanning ? 'Planning a trip' : 'General inquiry'}
- Destination Interest: ${analysis.travelIntent?.destination || 'Not specified'}
- Budget Range: ${analysis.travelIntent?.budget || 'Not specified'}
- Urgency: ${analysis.travelIntent?.urgency || 'Low'}
- Flight Needs: ${analysis.flightNeeds?.needsFlights ? 'Yes' : 'No'}

PERSONALIZATION LEVEL: ${analysis.personalizationLevel || 0.5}/1.0

CONVERSATION HISTORY:
${messages.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT QUESTION: ${latestMessage}

Please provide a helpful, personalized response that:
1. Addresses the user's specific question
2. Takes into account their travel preferences and style
3. Provides actionable advice and recommendations
4. Includes relevant flight information if applicable
5. Suggests next steps if planning a trip

Respond in a friendly, knowledgeable tone with specific details and practical advice.`;

    return contextPrompt;
  }

  /**
   * Enhance SageMaker response with travel-specific information
   */
  async enhanceSageMakerResponse(response, analysis, userProfile) {
    try {
      let content = response.generated_text || response.content || '';

      // Add personalized recommendations if relevant
      if (analysis.travelIntent?.isPlanning && !content.includes('recommend')) {
        const quickRecs = await this.getQuickRecommendations(analysis);
        content += `\n\n💡 Based on your preferences, I'd also suggest:\n${quickRecs.join('\n')}`;
      }

      // Add flight tips if flight-related
      if (analysis.flightNeeds?.needsFlights && !content.includes('flight')) {
        content += `\n\n✈️ Flight tip: ${this.getContextualFlightTip(analysis)}`;
      }

      const personalizedScore = this.calculateResponsePersonalization(content, analysis);

      return {
        content,
        personalizedScore,
        enhancementsApplied: ['travel_context', 'personalization', 'recommendations']
      };

    } catch (error) {
      console.error('Response enhancement error:', error);
      return {
        content: response.generated_text || response.content || 'I apologize, but I encountered an issue processing your request.',
        personalizedScore: 0.3
      };
    }
  }

  /**
   * Update user profile based on interactions
   */
  async updateUserProfile(userId, analysis, response) {
    try {
      const currentProfile = this.userProfiles.get(userId) || this.createEmptyProfile();

      // Update travel preferences
      if (analysis.preferences) {
        currentProfile.preferences = {
          ...currentProfile.preferences,
          ...analysis.preferences
        };
      }

      // Update travel style
      if (analysis.travelIntent?.travelStyle) {
        currentProfile.travelProfile.style = analysis.travelIntent.travelStyle;
      }

      // Track interests
      if (analysis.preferences?.interests) {
        analysis.preferences.interests.forEach(interest => {
          currentProfile.interests[interest] = (currentProfile.interests[interest] || 0) + 1;
        });
      }

      // Update activity timestamp
      currentProfile.lastActivity = new Date().toISOString();
      currentProfile.totalInteractions = (currentProfile.totalInteractions || 0) + 1;

      this.userProfiles.set(userId, currentProfile);

    } catch (error) {
      console.error('Profile update error:', error);
    }
  }

  /**
   * Generate user insights for personalization
   */
  generateUserInsights(userProfile, analysis) {
    const insights = {
      travelPersonality: this.determineTravelPersonality(userProfile, analysis),
      recommendationStrength: this.calculateRecommendationStrength(userProfile),
      nextSuggestedActions: [],
      personalizationOpportunities: []
    };

    // Suggest actions based on analysis
    if (analysis.travelIntent?.isPlanning) {
      insights.nextSuggestedActions.push('Consider flight price monitoring');
      insights.nextSuggestedActions.push('Explore destination guides');
    }

    if (!userProfile.travelProfile?.style) {
      insights.personalizationOpportunities.push('Travel style assessment');
    }

    return insights;
  }

  /**
   * Generate recommended actions based on conversation
   */
  async generateRecommendedActions(analysis, userProfile) {
    const actions = [];

    if (analysis.travelIntent?.isPlanning) {
      actions.push({
        type: 'flight_search',
        title: 'Search for flights',
        description: 'Find the best flight deals for your trip',
        priority: 'high'
      });
    }

    if (analysis.flightNeeds?.needsFlights) {
      actions.push({
        type: 'price_alert',
        title: 'Set up price alerts',
        description: 'Get notified when flight prices drop',
        priority: 'medium'
      });
    }

    if (!userProfile.preferences?.budget) {
      actions.push({
        type: 'budget_planning',
        title: 'Create travel budget',
        description: 'Plan your trip expenses',
        priority: 'low'
      });
    }

    return actions;
  }

  // Helper methods for analysis
  detectTravelPlanning(messages) {
    const planningKeywords = ['plan', 'trip', 'vacation', 'travel', 'visit', 'go to'];
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    return planningKeywords.some(keyword => text.includes(keyword));
  }

  extractDestination(messages) {
    const destinations = ['paris', 'tokyo', 'new york', 'london', 'bali', 'rome', 'barcelona'];
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    return destinations.find(dest => text.includes(dest)) || null;
  }

  extractBudget(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    if (text.includes('budget') || text.includes('cheap')) return 'low';
    if (text.includes('luxury') || text.includes('premium')) return 'high';
    return 'medium';
  }

  extractTimeframe(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    if (text.includes('next week') || text.includes('soon')) return 'immediate';
    if (text.includes('next month')) return 'short-term';
    if (text.includes('next year')) return 'long-term';
    return 'flexible';
  }

  detectFlightNeeds(messages) {
    const flightKeywords = ['flight', 'fly', 'airline', 'airport', 'booking'];
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    return flightKeywords.some(keyword => text.includes(keyword));
  }

  calculatePersonalizationLevel(messages, userContext) {
    let score = 0.3; // Base score
    
    if (userContext.preferences) score += 0.2;
    if (userContext.travelHistory?.length > 0) score += 0.2;
    if (messages.length > 3) score += 0.1;
    if (userContext.sessionId) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  createEmptyProfile() {
    return {
      preferences: {},
      travelProfile: { style: null },
      interests: {},
      travelHistory: [],
      totalInteractions: 0,
      createdAt: new Date().toISOString()
    };
  }

  async getUserProfile(userId) {
    return this.userProfiles.get(userId) || this.createEmptyProfile();
  }

  async updateConversationHistory(sessionId, messages) {
    // Store conversation for context
    this.conversationHistory.set(sessionId, {
      messages: messages.slice(-10), // Keep last 10 messages
      lastUpdated: new Date().toISOString()
    });
  }

  // Mock API calls (replace with actual AWS SDK calls)
  async callSageMakerEndpoint(payload) {
    // This would be replaced with actual SageMaker Runtime invoke
    return {
      generated_text: "Based on your preferences, I recommend...",
      token_usage: { input: 100, output: 150 }
    };
  }

  async callBedrockEndpoint(payload) {
    // This would be replaced with actual Bedrock API call
    return {
      content: "I'd be happy to help you plan your trip...",
      usage: { input_tokens: 100, output_tokens: 150 }
    };
  }

  getFallbackResponse(analysis) {
    return {
      role: 'ai',
      content: 'I apologize for the technical difficulty. I\'m here to help you plan your perfect trip! What destination interests you?',
      metadata: { model: 'fallback', analysisUsed: false }
    };
  }

  formatRecommendationsResponse(recommendations, analysis) {
    let response = "Based on our conversation, here are my personalized recommendations:\n\n";

    if (recommendations.destinations.length > 0) {
      response += "🌍 **Recommended Destinations:**\n";
      recommendations.destinations.forEach(dest => {
        response += `• ${dest.destination} - ${dest.whyRecommended}\n`;
      });
      response += "\n";
    }

    if (recommendations.flights.preferredRoutes?.length > 0) {
      response += "✈️ **Flight Recommendations:**\n";
      recommendations.flights.preferredRoutes.forEach(route => {
        response += `• ${route.destination}: Best to book ${route.bestBookingTime}\n`;
      });
      response += "\n";
    }

    if (recommendations.travelTips.length > 0) {
      response += "💡 **Personalized Tips:**\n";
      recommendations.travelTips.forEach(tip => {
        response += `• ${tip}\n`;
      });
    }

    return response;
  }

  async getQuickRecommendations(analysis) {
    const recs = [];
    
    if (analysis.preferences?.budget === 'low') {
      recs.push('• Consider booking flights 6-8 weeks in advance for better deals');
    }
    
    if (analysis.travelIntent?.destination) {
      recs.push(`• Check visa requirements for ${analysis.travelIntent.destination}`);
    }
    
    return recs;
  }

  getContextualFlightTip(analysis) {
    if (analysis.preferences?.budget === 'low') {
      return 'Book on Tuesdays or Wednesdays for the best deals!';
    }
    return 'Consider booking direct flights for convenience and comfort.';
  }

  calculateResponsePersonalization(content, analysis) {
    let score = 0.5;
    
    if (content.includes(analysis.travelIntent?.destination || '')) score += 0.2;
    if (content.includes(analysis.preferences?.budget || '')) score += 0.1;
    if (analysis.preferences?.interests?.some(interest => content.includes(interest))) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  determineTravelPersonality(userProfile, analysis) {
    const interactions = userProfile.totalInteractions || 0;
    const style = userProfile.travelProfile?.style || analysis.preferences?.travelStyle;
    
    if (interactions < 3) return 'New Explorer';
    if (style === 'adventure') return 'Adventure Seeker';
    if (style === 'luxury') return 'Luxury Traveler';
    if (style === 'budget') return 'Smart Saver';
    return 'Balanced Traveler';
  }

  calculateRecommendationStrength(userProfile) {
    const factors = [
      userProfile.preferences ? 0.3 : 0,
      userProfile.travelHistory?.length > 0 ? 0.3 : 0,
      userProfile.totalInteractions > 5 ? 0.2 : 0,
      userProfile.interests ? Object.keys(userProfile.interests).length * 0.05 : 0
    ];
    
    return Math.min(factors.reduce((sum, factor) => sum + factor, 0), 1.0);
  }
}

module.exports = ComprehensiveAIAgent;