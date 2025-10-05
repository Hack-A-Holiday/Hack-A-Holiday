// backend_test/services/sagemakerService.js
const AWS = require('aws-sdk');

class SageMakerService {
  constructor() {
    this.sagemaker = new AWS.SageMakerRuntime({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.endpointName = process.env.SAGEMAKER_ENDPOINT_NAME || 'travel-assistant-endpoint';
  }

  /**
   * Analyze user message and generate AI response with recommendations
   */
  async processMessage(message, userId, preferences, conversationHistory = []) {
    try {
      // Detect intent from message
      const intent = this.detectIntent(message);
      
      // Build context for SageMaker
      const context = this.buildContext(userId, preferences, conversationHistory);
      
      // Prepare prompt for SageMaker
      const prompt = this.createPrompt(message, intent, context);
      
      // Call SageMaker endpoint
      const sagemakerResponse = await this.invokeSageMaker(prompt);
      
      // Parse and structure response
      const structuredResponse = this.structureResponse(sagemakerResponse, intent, preferences);
      
      return structuredResponse;
      
    } catch (error) {
      console.error('SageMaker processing error:', error);
      // Return fallback response
      return this.generateFallbackResponse(message);
    }
  }

  /**
   * Detect user intent from message
   */
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.match(/flight|fly|plane|ticket/i)) {
      return 'flight_search';
    }
    if (lowerMessage.match(/hotel|accommodation|stay|resort/i)) {
      return 'hotel_search';
    }
    if (lowerMessage.match(/destination|where|recommend|suggest|place/i)) {
      return 'destination_recommendation';
    }
    if (lowerMessage.match(/budget|cost|price|cheap|expensive/i)) {
      return 'budget_planning';
    }
    if (lowerMessage.match(/itinerary|plan|trip|schedule/i)) {
      return 'trip_planning';
    }
    
    return 'general_chat';
  }

  /**
   * Build context from user data
   */
  buildContext(userId, preferences, conversationHistory) {
    return {
      userId,
      preferences: {
        budget: preferences?.budget || 'mid-range',
        travelStyle: preferences?.travelStyle || 'mid-range',
        interests: preferences?.interests || [],
        destinations: preferences?.favoriteDestinations || [],
        groupSize: preferences?.travelers || 1,
        accommodationType: preferences?.accommodationType || 'hotel'
      },
      conversationHistory: conversationHistory.slice(-5) // Last 5 messages
    };
  }

  /**
   * Create prompt for SageMaker
   */
  createPrompt(message, intent, context) {
    const systemPrompt = `You are an expert AI travel assistant. Your goal is to help users plan their perfect trips.

User Preferences:
- Budget: ${context.preferences.budget}
- Travel Style: ${context.preferences.travelStyle}
- Interests: ${context.preferences.interests.join(', ') || 'not specified'}
- Group Size: ${context.preferences.groupSize}

Intent: ${intent}

Provide helpful, personalized responses with:
1. Specific recommendations
2. Price ranges when relevant
3. Links to booking sites
4. Practical travel tips

User Message: ${message}

Response:`;

    return systemPrompt;
  }

  /**
   * Invoke SageMaker endpoint
   */
  async invokeSageMaker(prompt) {
    try {
      const params = {
        EndpointName: this.endpointName,
        Body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true
          }
        }),
        ContentType: 'application/json',
        Accept: 'application/json'
      };

      const response = await this.sagemaker.invokeEndpoint(params).promise();
      const result = JSON.parse(response.Body.toString());
      
      return result[0]?.generated_text || result.generated_text || '';
      
    } catch (error) {
      console.error('SageMaker invocation error:', error);
      throw error;
    }
  }

  /**
   * Structure the AI response with recommendations
   */
  structureResponse(aiText, intent, preferences) {
    const response = {
      response: aiText,
      type: 'text',
      intent: intent
    };

    // Add recommendations based on intent
    if (intent === 'flight_search') {
      response.type = 'recommendation';
      response.recommendations = this.generateFlightRecommendations(preferences);
    } else if (intent === 'hotel_search') {
      response.type = 'recommendation';
      response.recommendations = this.generateHotelRecommendations(preferences);
    } else if (intent === 'destination_recommendation') {
      response.type = 'recommendation';
      response.recommendations = this.generateDestinationRecommendations(preferences);
    }

    return response;
  }

  /**
   * Generate flight recommendations
   */
  generateFlightRecommendations(preferences) {
    const budget = preferences?.budget || 1000;
    
    return [
      {
        type: 'flight',
        title: 'Economy Flight Option',
        description: 'Best value with good timing and minimal layovers',
        price: `$${Math.floor(budget * 0.4)}`,
        link: 'https://www.skyscanner.com',
        rating: 4.3
      },
      {
        type: 'flight',
        title: 'Premium Economy',
        description: 'Extra comfort with more legroom and better service',
        price: `$${Math.floor(budget * 0.6)}`,
        link: 'https://www.skyscanner.com',
        rating: 4.6
      },
      {
        type: 'flight',
        title: 'Business Class',
        description: 'Luxury travel with lounge access and lie-flat seats',
        price: `$${Math.floor(budget * 1.5)}`,
        link: 'https://www.skyscanner.com',
        rating: 4.9
      }
    ];
  }

  /**
   * Generate hotel recommendations
   */
  generateHotelRecommendations(preferences) {
    const budget = preferences?.budget || 1000;
    const dailyBudget = Math.floor(budget / 7); // Assume 7-day trip
    
    const accommodationType = preferences?.accommodationType || 'hotel';
    
    return [
      {
        type: 'hotel',
        title: `Budget ${accommodationType}`,
        description: 'Clean, comfortable, and well-located for budget travelers',
        price: `$${Math.floor(dailyBudget * 0.3)}/night`,
        link: 'https://www.booking.com',
        rating: 4.0
      },
      {
        type: 'hotel',
        title: `Mid-Range ${accommodationType}`,
        description: 'Great amenities, central location, excellent service',
        price: `$${Math.floor(dailyBudget * 0.5)}/night`,
        link: 'https://www.booking.com',
        rating: 4.5
      },
      {
        type: 'hotel',
        title: `Luxury ${accommodationType}`,
        description: 'Premium experience with spa, pool, and gourmet dining',
        price: `$${Math.floor(dailyBudget * 0.8)}/night`,
        link: 'https://www.booking.com',
        rating: 4.8
      }
    ];
  }

  /**
   * Generate destination recommendations
   */
  generateDestinationRecommendations(preferences) {
    const interests = preferences?.interests || [];
    const travelStyle = preferences?.travelStyle || 'mid-range';
    
    const destinations = [
      {
        type: 'destination',
        title: 'Bali, Indonesia',
        description: 'Tropical paradise with stunning beaches, temples, and rice terraces. Perfect for relaxation and culture.',
        link: 'https://www.lonelyplanet.com/indonesia/bali',
        rating: 4.8,
        matchScore: interests.includes('beach') || interests.includes('culture') ? 0.9 : 0.7
      },
      {
        type: 'destination',
        title: 'Tokyo, Japan',
        description: 'Vibrant city blending ancient traditions with cutting-edge technology. Amazing food and culture.',
        link: 'https://www.lonelyplanet.com/japan/tokyo',
        rating: 4.9,
        matchScore: interests.includes('culture') || interests.includes('food') ? 0.95 : 0.75
      },
      {
        type: 'destination',
        title: 'Paris, France',
        description: 'City of lights with iconic landmarks, world-class museums, and incredible cuisine.',
        link: 'https://www.lonelyplanet.com/france/paris',
        rating: 4.7,
        matchScore: interests.includes('culture') || interests.includes('art') ? 0.9 : 0.7
      },
      {
        type: 'destination',
        title: 'Iceland',
        description: 'Land of fire and ice with dramatic landscapes, Northern Lights, and geothermal spas.',
        link: 'https://www.lonelyplanet.com/iceland',
        rating: 4.8,
        matchScore: interests.includes('nature') || interests.includes('adventure') ? 0.95 : 0.6
      },
      {
        type: 'destination',
        title: 'New Zealand',
        description: 'Breathtaking scenery with mountains, fjords, and adventure activities.',
        link: 'https://www.lonelyplanet.com/new-zealand',
        rating: 4.9,
        matchScore: interests.includes('adventure') || interests.includes('nature') ? 0.95 : 0.65
      }
    ];

    // Sort by match score and return top 3
    return destinations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)
      .map(({ matchScore, ...dest }) => dest);
  }

  /**
   * Generate fallback response when SageMaker fails
   */
  generateFallbackResponse(message) {
    return {
      response: `I understand you're asking about: "${message}"

I'm here to help with your travel planning! I can assist with:
- Finding flights and hotels
- Recommending destinations
- Planning itineraries
- Budget optimization

Could you provide more details about what you're looking for?`,
      type: 'text',
      intent: 'general_chat'
    };
  }
}

module.exports = new SageMakerService();
