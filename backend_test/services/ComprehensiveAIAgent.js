const axios = require('axios');
const RecommendationEngine = require('./RecommendationEngine');
const TripAdvisorService = require('./TripAdvisorService');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

/**
 * Comprehensive AI Agent Service
 * Integrates chat analysis, SageMaker, and personalized recommendations
 */
class ComprehensiveAIAgent {
  constructor() {
    this.recommendationEngine = new RecommendationEngine();
    this.tripAdvisorService = new TripAdvisorService();
    this.conversationHistory = new Map(); // Store conversation contexts
    this.userProfiles = new Map(); // Store user profiles
    this.sagemakerEndpoint = process.env.SAGEMAKER_ENDPOINT_NAME || 'travel-assistant-endpoint';
    this.bedrockRegion = process.env.AWS_REGION || 'us-east-1';
    this.bedrockModelId = process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1';
    this.bedrockClient = new BedrockRuntimeClient({ region: this.bedrockRegion });
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
   * Process request through Bedrock with enhanced context and TripAdvisor data
   */
  async processBedrockRequest(messages, userContext, analysis, userProfile) {
    try {
      // Extract location and travel intent from messages
      const location = this.extractLocationFromMessages(messages);
      const travelIntent = this.extractTravelIntentFromMessages(messages);
      
      // Get TripAdvisor data if location is mentioned
      let tripAdvisorData = null;
      if (location) {
        try {
          tripAdvisorData = await this.tripAdvisorService.getTravelDataForAI(location, userProfile);
          console.log('TripAdvisor data retrieved for:', location);
        } catch (error) {
          console.error('TripAdvisor data retrieval failed:', error.message);
          // Continue without TripAdvisor data
        }
      }

      // Enhanced prompt for Bedrock with TripAdvisor data
      const enhancedPrompt = this.createEnhancedPrompt(messages, userContext, analysis, userProfile, tripAdvisorData);

      const bedrockPayload = {
        inputText: enhancedPrompt,
        textGenerationConfig: {
          maxTokenCount: 1000,
          temperature: 0.7,
          topP: 0.9
        }
      };

      // Call Bedrock API
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
   * Get default analysis when errors occur
   */
  getDefaultAnalysis() {
    return {
      preferences: {
        budget: 'medium',
        interests: [],
        travelStyle: 'general'
      },
      travelIntent: {
        isPlanning: false,
        destination: null,
        budget: null,
        timeframe: 'flexible',
        travelStyle: 'general',
        urgency: 'low'
      },
      flightNeeds: {
        needsFlights: false,
        preferences: {
          class: 'economy',
          direct: false,
          flexible: false
        },
        flexibility: 'medium'
      },
      personalizationLevel: 0.3
    };
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

  extractTravelStyle(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    if (text.includes('adventure') || text.includes('hiking') || text.includes('outdoor')) return 'adventure';
    if (text.includes('luxury') || text.includes('premium') || text.includes('5-star')) return 'luxury';
    if (text.includes('budget') || text.includes('cheap') || text.includes('affordable')) return 'budget';
    if (text.includes('family') || text.includes('kids')) return 'family';
    if (text.includes('romantic') || text.includes('honeymoon')) return 'romantic';
    return 'general';
  }

  assessUrgency(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately')) return 'high';
    if (text.includes('soon') || text.includes('next week')) return 'medium';
    return 'low';
  }

  extractFlightPreferences(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    const preferences = {
      class: 'economy',
      direct: false,
      flexible: false
    };

    if (text.includes('business class') || text.includes('first class')) preferences.class = 'business';
    if (text.includes('direct') || text.includes('non-stop')) preferences.direct = true;
    if (text.includes('flexible') || text.includes('any time')) preferences.flexible = true;

    return preferences;
  }

  assessFlexibility(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    if (text.includes('flexible') || text.includes('any time') || text.includes('whenever')) return 'high';
    if (text.includes('specific') || text.includes('exact') || text.includes('must be')) return 'low';
    return 'medium';
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
    try {
      const input = {
        modelId: this.bedrockModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      };

      const command = new InvokeModelCommand(input);
      const response = await this.bedrockClient.send(command);
      
      let responseBody = response?.body?.toString('utf-8') || '{}';
      
      // If response is a comma-separated list of numbers, decode as ASCII
      if (/^[0-9]+(,[0-9]+)*$/.test(responseBody.trim())) {
        const asciiArr = responseBody.split(',').map(Number);
        responseBody = String.fromCharCode(...asciiArr);
      }
      
      const parsedResponse = JSON.parse(responseBody);
      
      // Extract content from Nova response
      let content = '';
      if (parsedResponse.output && parsedResponse.output.message && parsedResponse.output.message.content) {
        content = parsedResponse.output.message.content;
      } else {
        content = parsedResponse.content || 'I apologize, but I had trouble processing your request.';
      }
      
      return {
        content: content,
        usage: parsedResponse.usage || { input_tokens: 100, output_tokens: 150 }
      };
      
    } catch (error) {
      console.error('Bedrock API call error:', error);
      throw error;
    }
  }

  getDefaultAnalysis() {
    return {
      preferences: {
        interests: [],
        budget: null,
        travelStyle: 'mid-range',
        duration: null
      },
      travelIntent: {
        isPlanning: false,
        destination: null,
        budget: null,
        timeframe: null,
        travelStyle: 'mid-range',
        urgency: 'low'
      },
      flightNeeds: {
        needsFlights: false,
        preferences: {},
        flexibility: 'medium'
      },
      personalizationLevel: 0
    };
  }

  /**
   * Extract location from user messages
   */
  extractLocationFromMessages(messages) {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content) return null;

    const content = lastMessage.content.toLowerCase();
    
    // Common location patterns
    const locationPatterns = [
      /(?:in|to|at|visit|going to|travel to|trip to)\s+([a-zA-Z\s,]+?)(?:\s|$|,|\.|!|\?)/,
      /([a-zA-Z\s]+?)\s+(?:restaurants|hotels|attractions|activities|things to do)/,
      /(?:what's|what are|tell me about)\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!|\?)/
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Filter out common words that aren't locations
        if (location.length > 2 && !['the', 'a', 'an', 'some', 'any', 'good', 'best'].includes(location)) {
          return location;
        }
      }
    }

    return null;
  }

  /**
   * Extract travel intent from user messages
   */
  extractTravelIntentFromMessages(messages) {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content) return {};

    const content = lastMessage.content.toLowerCase();
    
    return {
      wantsRestaurants: /restaurant|food|eat|dining|cuisine|meal/.test(content),
      wantsAttractions: /attraction|sightseeing|visit|see|tourist|landmark|museum/.test(content),
      wantsHotels: /hotel|accommodation|stay|sleep|room|booking/.test(content),
      wantsActivities: /activity|things to do|fun|entertainment|adventure/.test(content),
      wantsRecommendations: /recommend|suggest|best|good|popular|top/.test(content)
    };
  }

  /**
   * Create enhanced prompt with TripAdvisor data
   */
  createEnhancedPrompt(messages, userContext, analysis, userProfile, tripAdvisorData) {
    const lastMessage = messages[messages.length - 1];
    let prompt = `You are a helpful travel assistant. Respond to the user's message: "${lastMessage.content}"\n\n`;

    // Add user context
    if (userProfile && Object.keys(userProfile).length > 0) {
      prompt += `User Profile: ${JSON.stringify(userProfile, null, 2)}\n\n`;
    }

    // Add TripAdvisor data if available
    if (tripAdvisorData) {
      prompt += `Real-time travel data from TripAdvisor:\n`;
      
      if (tripAdvisorData.location) {
        prompt += `Location: ${tripAdvisorData.location.name} - ${tripAdvisorData.location.description}\n`;
        prompt += `Rating: ${tripAdvisorData.location.rating}/5 (${tripAdvisorData.location.review_count} reviews)\n\n`;
      }

      if (tripAdvisorData.attractions && tripAdvisorData.attractions.length > 0) {
        prompt += `Top Attractions:\n`;
        tripAdvisorData.attractions.forEach((attraction, index) => {
          prompt += `${index + 1}. ${attraction.name} - ${attraction.rating}/5 (${attraction.review_count} reviews)\n`;
          if (attraction.description) prompt += `   ${attraction.description}\n`;
        });
        prompt += `\n`;
      }

      if (tripAdvisorData.restaurants && tripAdvisorData.restaurants.length > 0) {
        prompt += `Top Restaurants:\n`;
        tripAdvisorData.restaurants.forEach((restaurant, index) => {
          prompt += `${index + 1}. ${restaurant.name} - ${restaurant.rating}/5 (${restaurant.review_count} reviews)\n`;
          if (restaurant.cuisine) prompt += `   Cuisine: ${restaurant.cuisine.join(', ')}\n`;
          if (restaurant.description) prompt += `   ${restaurant.description}\n`;
        });
        prompt += `\n`;
      }

      if (tripAdvisorData.hotels && tripAdvisorData.hotels.length > 0) {
        prompt += `Top Hotels:\n`;
        tripAdvisorData.hotels.forEach((hotel, index) => {
          prompt += `${index + 1}. ${hotel.name} - ${hotel.rating}/5 (${hotel.review_count} reviews)\n`;
          if (hotel.amenities) prompt += `   Amenities: ${hotel.amenities.join(', ')}\n`;
          if (hotel.description) prompt += `   ${hotel.description}\n`;
        });
        prompt += `\n`;
      }
    }

    // Add conversation analysis
    if (analysis) {
      prompt += `Conversation Analysis: ${JSON.stringify(analysis, null, 2)}\n\n`;
    }

    prompt += `Provide a helpful, personalized response based on the real-time data above. Be specific and mention actual places, ratings, and reviews when relevant.`;

    return prompt;
  }

  getFallbackResponse(analysis) {
    return {
      role: 'ai',
      content: 'I apologize for the technical difficulty. I\'m here to help you plan your perfect trip! What destination interests you?',
      metadata: { model: 'fallback', analysisUsed: false }
    };
  }

  getFallbackRecommendations() {
    return {
      role: 'ai',
      content: 'I can help you with personalized travel recommendations! Tell me about your travel preferences, budget, and dream destinations.',
      metadata: { model: 'fallback' },
      recommendations: {
        destinations: [],
        flights: [],
        activities: [],
        travelTips: ['Start by telling me about your travel preferences!'],
        budgetAdvice: [],
        timingRecommendations: []
      }
    };
  }

  async generateActivityRecommendations(interests, destination) {
    return interests.map(interest => ({
      activity: `${interest} activity in ${destination || 'your destination'}`,
      description: `Enjoy ${interest}-related experiences`,
      estimatedCost: '$50-100'
    }));
  }

  async generatePersonalizedTips(analysis, userProfile) {
    const tips = [];

    if (analysis.travelIntent?.budget === 'low') {
      tips.push('💰 Book accommodations with free cancellation for flexibility');
      tips.push('🍽️ Try local street food for authentic and affordable meals');
    } else if (analysis.travelIntent?.budget === 'high') {
      tips.push('✨ Consider concierge services for a seamless experience');
      tips.push('🏨 Book early for exclusive hotel perks and upgrades');
    }

    if (analysis.travelIntent?.travelStyle === 'adventure') {
      tips.push('🎒 Pack light and bring versatile clothing');
      tips.push('📱 Download offline maps for remote areas');
    } else if (analysis.travelIntent?.travelStyle === 'family') {
      tips.push('👨‍👩‍👧‍👦 Look for family-friendly hotels with kids activities');
      tips.push('🎡 Book attractions in advance to avoid long queues');
    }

    if (analysis.travelIntent?.urgency === 'high') {
      tips.push('⚡ Consider travel insurance for last-minute trips');
      tips.push('📞 Contact airlines directly for better last-minute deals');
    }

    if (tips.length === 0) {
      tips.push('🌍 Research visa requirements early');
      tips.push('💳 Notify your bank before traveling abroad');
      tips.push('📱 Download useful travel apps before departure');
    }

    return tips.slice(0, 5);
  }

  async generateBudgetAdvice(budget, destination) {
    const advice = [];

    if (budget === 'low') {
      advice.push('Consider traveling during off-peak seasons for better rates');
      advice.push('Look for package deals that bundle flights and hotels');
      advice.push('Use public transportation to save on local travel');
    } else if (budget === 'high') {
      advice.push('Invest in premium experiences for lasting memories');
      advice.push('Consider private tours for personalized attention');
      advice.push('Book luxury hotels with inclusive amenities');
    } else {
      advice.push('Balance splurge experiences with budget-friendly options');
      advice.push('Allocate more budget to unique experiences');
      advice.push('Look for mid-range hotels with good reviews');
    }

    if (destination) {
      advice.push(`Research average costs in ${destination} before booking`);
    }

    return advice;
  }

  async performDeepAnalysis(messages, userProfile, userContext) {
    return {
      role: 'ai',
      content: 'Deep analysis feature coming soon! For now, I can help with travel planning and recommendations.',
      metadata: { model: 'analysis', feature: 'in-development' }
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