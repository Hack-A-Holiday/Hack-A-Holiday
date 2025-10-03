import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const sagemakerClient = new SageMakerRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// SageMaker endpoint name - you'll need to deploy a model endpoint first
const SAGEMAKER_ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME || 'travel-assistant-endpoint';
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || 'Users';
const CHAT_HISTORY_TABLE_NAME = process.env.CHAT_HISTORY_TABLE_NAME || 'ChatHistory';

interface UserPreferences {
  destinations?: string[];
  budget?: { min: number; max: number };
  travelStyle?: 'budget' | 'mid-range' | 'luxury';
  interests?: string[];
  groupSize?: number;
  preferredDuration?: number;
  seasonPreference?: string[];
  accommodationType?: string[];
  transportPreference?: string[];
  dietaryRestrictions?: string[];
  accessibility?: string[];
  lastUpdated?: number;
}

interface UserContext {
  userId: string;
  sessionId: string;
  preferences: UserPreferences;
  mode: 'chat' | 'analyze' | 'recommend';
  userProfile: {
    name?: string;
    email?: string;
    previousTrips?: any[];
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,HEAD,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { messages = [], userContext = {}, metadata = {} }: {
      messages: any[];
      userContext: UserContext;
      metadata: any;
    } = body;

    console.log('SageMaker Agent Request:', {
      userId: userContext.userId,
      mode: userContext.mode,
      messageCount: messages.length,
      endpoint: SAGEMAKER_ENDPOINT_NAME
    });

    // Load user profile and preferences from DynamoDB
    const userProfile = await getUserProfile(userContext.userId);
    const enhancedUserContext = {
      ...userContext,
      preferences: { ...userProfile?.preferences, ...userContext.preferences },
      userProfile: { ...userProfile, ...userContext.userProfile }
    };

    // Format conversation for SageMaker
    const conversation = messages.map((msg: any) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: msg.timestamp
    }));

    // Create specialized prompts based on mode
    let systemPrompt = '';
    
    switch (enhancedUserContext.mode) {
      case 'analyze':
        systemPrompt = createAnalysisPrompt(enhancedUserContext, conversation);
        break;
      case 'recommend':
        systemPrompt = createRecommendationPrompt(enhancedUserContext, conversation);
        break;
      default:
        systemPrompt = createChatPrompt(enhancedUserContext, conversation);
    }

    // Prepare SageMaker request payload
    const sagemakerPayload = {
      inputs: systemPrompt,
      parameters: {
        max_new_tokens: enhancedUserContext.mode === 'analyze' ? 1500 : 1000,
        temperature: enhancedUserContext.mode === 'recommend' ? 0.8 : 0.7,
        top_p: 0.9,
        do_sample: true,
        repetition_penalty: 1.1
      },
      userContext: enhancedUserContext,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        endpoint: SAGEMAKER_ENDPOINT_NAME,
        mode: enhancedUserContext.mode
      }
    };

    // Invoke SageMaker endpoint
    const command = new InvokeEndpointCommand({
      EndpointName: SAGEMAKER_ENDPOINT_NAME,
      ContentType: 'application/json',
      Accept: 'application/json',
      Body: JSON.stringify(sagemakerPayload)
    });

    const response = await sagemakerClient.send(command);
    
    if (!response.Body) {
      throw new Error('No response body from SageMaker endpoint');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.Body));
    
    // Extract the generated text from SageMaker response
    let aiText = responseBody.generated_text || responseBody.outputs || responseBody.response || 'No response generated';
    
    // Clean up the response if needed
    if (typeof aiText === 'string' && aiText.includes(systemPrompt)) {
      aiText = aiText.replace(systemPrompt, '').trim();
    }

    // Extract and update user preferences if the AI suggested changes
    const updatedPreferences = extractPreferencesFromResponse(aiText, enhancedUserContext.preferences);
    if (updatedPreferences && Object.keys(updatedPreferences).length > 0) {
      await updateUserPreferences(enhancedUserContext.userId, updatedPreferences);
    }

    // Enhanced response with metadata
    const enhancedResponse = {
      role: 'ai',
      content: aiText,
      metadata: {
        model: 'sagemaker',
        endpoint: SAGEMAKER_ENDPOINT_NAME,
        tokenUsage: responseBody.token_usage || null,
        responseTime: Date.now(),
        confidence: responseBody.confidence || null,
        mode: enhancedUserContext.mode,
        preferencesUpdated: !!updatedPreferences
      },
      userContext: {
        ...enhancedUserContext,
        lastInteraction: Date.now()
      },
      updatedPreferences
    };

    // Save chat interaction for learning
    await saveChatInteraction({
      userId: enhancedUserContext.userId,
      sessionId: enhancedUserContext.sessionId,
      userMessage: conversation[conversation.length - 1],
      aiResponse: enhancedResponse,
      mode: enhancedUserContext.mode,
      timestamp: Date.now()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(enhancedResponse)
    };

  } catch (error: any) {
    console.error('SageMaker AI Agent Error:', error);

    // Enhanced error handling
    let errorMessage = 'Sorry, I encountered an issue. Please try again.';
    let statusCode = 500;

    if (error.name === 'ValidationException') {
      errorMessage = 'Invalid request format. Please check your input.';
      statusCode = 400;
    } else if (error.name === 'ModelError') {
      errorMessage = 'The AI model is currently experiencing issues. Please try again later.';
      statusCode = 503;
    } else if (error.name === 'ThrottlingException') {
      errorMessage = 'Too many requests. Please wait a moment before trying again.';
      statusCode = 429;
    } else if (error.message?.includes('endpoint') || error.message?.includes('EndpointName')) {
      errorMessage = 'SageMaker endpoint is not available. Please contact support.';
      statusCode = 503;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        role: 'system', 
        content: errorMessage,
        error: {
          type: error.name || 'SAGEMAKER_ERROR',
          message: errorMessage,
          endpoint: SAGEMAKER_ENDPOINT_NAME,
          timestamp: Date.now()
        }
      })
    };
  }
};

// Helper Functions

async function getUserProfile(userId: string): Promise<any> {
  try {
    const command = new GetItemCommand({
      TableName: USERS_TABLE_NAME,
      Key: marshall({ id: userId })
    });

    const result = await dynamoClient.send(command);
    return result.Item ? unmarshall(result.Item) : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

async function updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
  try {
    const command = new UpdateItemCommand({
      TableName: USERS_TABLE_NAME,
      Key: marshall({ id: userId }),
      UpdateExpression: 'SET preferences = :prefs, updatedAt = :timestamp',
      ExpressionAttributeValues: marshall({
        ':prefs': { ...preferences, lastUpdated: Date.now() },
        ':timestamp': new Date().toISOString()
      })
    });

    await dynamoClient.send(command);
    console.log('User preferences updated for:', userId);
  } catch (error) {
    console.error('Error updating user preferences:', error);
  }
}

async function saveChatInteraction(interaction: any): Promise<void> {
  try {
    const command = new PutItemCommand({
      TableName: CHAT_HISTORY_TABLE_NAME,
      Item: marshall({
        id: `${interaction.userId}_${interaction.timestamp}`,
        userId: interaction.userId,
        sessionId: interaction.sessionId,
        userMessage: interaction.userMessage,
        aiResponse: interaction.aiResponse,
        mode: interaction.mode,
        timestamp: interaction.timestamp,
        createdAt: new Date().toISOString()
      })
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error('Error saving chat interaction:', error);
  }
}

function createAnalysisPrompt(userContext: UserContext, conversation: any[]): string {
  return `You are an advanced AI Travel Analyst powered by SageMaker. Analyze the user's travel behavior and preferences to provide deep insights.

**USER PROFILE ANALYSIS:**
- User ID: ${userContext.userId}
- Name: ${userContext.userProfile.name || 'Unknown'}
- Current Preferences: ${JSON.stringify(userContext.preferences, null, 2)}
- Previous Trips: ${JSON.stringify(userContext.userProfile.previousTrips || [], null, 2)}

**ANALYSIS FRAMEWORK:**
1. **Travel Personality Assessment**
   - Identify travel style patterns (adventurous, comfort-focused, cultural, etc.)
   - Budget behavior analysis
   - Destination preference patterns

2. **Behavioral Insights**
   - Seasonal travel patterns
   - Group vs solo travel preferences
   - Activity and interest analysis
   - Accommodation and transport preferences

3. **Predictive Modeling**
   - Suggest potential new interests based on patterns
   - Identify gaps in travel experiences
   - Recommend optimal trip timing and duration

4. **Personalization Opportunities**
   - Areas where preferences could be refined
   - New destinations that match their profile
   - Budget optimization suggestions

**CONVERSATION HISTORY:**
${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\\n')}

Please provide a comprehensive analysis that includes:
- Travel personality profile
- Key behavioral patterns
- Actionable insights
- Personalized recommendations for improvement
- Confidence scores for your assessments

Use data-driven insights and be specific with examples from their travel history.`;
}

function createRecommendationPrompt(userContext: UserContext, conversation: any[]): string {
  return `You are an Expert AI Travel Recommendation Engine powered by SageMaker. Create highly personalized trip recommendations based on deep user analysis.

**USER PROFILE:**
- User ID: ${userContext.userId}
- Name: ${userContext.userProfile.name || 'Unknown'}
- Travel Preferences: ${JSON.stringify(userContext.preferences, null, 2)}
- Travel History: ${JSON.stringify(userContext.userProfile.previousTrips || [], null, 2)}

**RECOMMENDATION CRITERIA:**
1. **Personalization Factors**
   - Budget constraints and spending patterns
   - Preferred travel style and comfort level
   - Interest alignment and activity preferences
   - Group size and travel companion considerations
   - Seasonal and timing preferences

2. **Recommendation Types**
   - **Similar Comfort Zone**: Destinations matching known preferences
   - **Stretch Recommendations**: Slightly outside comfort zone for growth
   - **Discovery Picks**: Completely new experiences based on hidden interests

3. **Practical Considerations**
   - Accessibility requirements
   - Dietary restrictions and special needs
   - Transportation preferences
   - Accommodation style preferences

**CONVERSATION CONTEXT:**
${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\\n')}

**OUTPUT FORMAT:**
For each recommendation, provide:
1. **Destination & Duration**
2. **Why It Matches** (specific to their profile)
3. **Estimated Budget Breakdown**
4. **Key Experiences & Activities**
5. **Best Time to Visit**
6. **Confidence Score** (1-10)
7. **Personalization Notes**

Provide 3-5 recommendations ranging from safe choices to adventurous options. Include specific details about costs, activities, and logistics.`;
}

function createChatPrompt(userContext: UserContext, conversation: any[]): string {
  return `You are an Expert AI Travel Assistant powered by SageMaker. Provide helpful, personalized travel advice based on the user's profile and preferences.

**USER CONTEXT:**
- User: ${userContext.userProfile.name || 'Traveler'}
- Travel Style: ${userContext.preferences.travelStyle || 'Not specified'}
- Budget Range: ${userContext.preferences.budget ? `$${userContext.preferences.budget.min}-$${userContext.preferences.budget.max}` : 'Not specified'}
- Interests: ${userContext.preferences.interests?.join(', ') || 'Not specified'}
- Previous Destinations: ${userContext.preferences.destinations?.join(', ') || 'None recorded'}

**GUIDELINES:**
1. Be helpful, enthusiastic, and knowledgeable about travel
2. Reference their specific preferences when giving advice
3. Provide practical, actionable information
4. Consider their budget and travel style
5. Suggest ways to enhance their travel experiences
6. Use emojis appropriately to make responses engaging
7. If discussing costs, be specific and realistic
8. Always prioritize safety and practical considerations

**CONVERSATION HISTORY:**
${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\\n')}

Respond as a knowledgeable travel expert who understands this user's specific needs and preferences. Be conversational but informative.`;
}

function extractPreferencesFromResponse(aiResponse: string, currentPreferences: UserPreferences): UserPreferences | null {
  // Simple preference extraction logic - can be enhanced with ML
  const updatedPreferences: UserPreferences = {};
  let hasUpdates = false;

  // Extract budget mentions
  const budgetMatch = aiResponse.match(/budget.*\$(\d+).*\$(\d+)/i);
  if (budgetMatch) {
    updatedPreferences.budget = {
      min: parseInt(budgetMatch[1]),
      max: parseInt(budgetMatch[2])
    };
    hasUpdates = true;
  }

  // Extract destination interests
  const destinationPattern = /(?:interested in|visit|travel to|consider)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const destinations: string[] = [];
  let match;
  while ((match = destinationPattern.exec(aiResponse)) !== null) {
    destinations.push(match[1]);
  }
  if (destinations.length > 0) {
    updatedPreferences.destinations = [...(currentPreferences.destinations || []), ...destinations];
    hasUpdates = true;
  }

  // Extract travel style mentions
  const styleMatch = aiResponse.match(/\b(budget|mid-range|luxury)\s+travel/i);
  if (styleMatch) {
    updatedPreferences.travelStyle = styleMatch[1].toLowerCase() as 'budget' | 'mid-range' | 'luxury';
    hasUpdates = true;
  }

  return hasUpdates ? updatedPreferences : null;
}