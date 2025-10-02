import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandInput } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

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
    const { messages = [], userContext = {}, metadata = {} } = body;

    // Create enhanced system prompt with user context
    const systemPrompt = `You are an expert AI travel assistant powered by Claude-4 on AWS Bedrock. You help users plan trips, provide travel advice, and answer travel-related questions.

User Context:
- Session ID: ${userContext.sessionId || 'unknown'}
- User Preferences: ${JSON.stringify(userContext.preferences || {})}
- Current Trip: ${JSON.stringify(userContext.currentTrip || {})}
- Trip History: ${JSON.stringify(userContext.tripHistory || [])}

Guidelines:
1. Be helpful, informative, and enthusiastic about travel
2. Provide specific, actionable advice with real details
3. Consider the user's preferences and past conversations
4. Use emojis appropriately to make responses engaging
5. If discussing itineraries, be detailed about activities, timing, and realistic costs
6. Always prioritize safety and practical considerations
7. Maintain conversation context and refer to previous discussions when relevant
8. Provide personalized recommendations based on user context

Please respond as a knowledgeable travel assistant, keeping the conversation natural and helpful.`;

    // Format messages for Claude
    const formattedMessages = [
      { role: 'user', content: systemPrompt }
    ];

    // Add conversation history
    messages.forEach((msg: any) => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        formattedMessages.push({
          role: msg.role === 'ai' ? 'assistant' : msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        });
      }
    });

    const input: InvokeModelCommandInput = {
      modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', // Updated to latest Claude model
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9,
        messages: formattedMessages,
        system: "You are a helpful travel assistant. Always provide accurate, practical, and engaging travel advice."
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    
    if (!response.body) {
      throw new Error('No response body from Bedrock');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    let aiText = responseBody.content?.[0]?.text || 'No response generated';

    // Decode comma-separated byte string if needed (legacy support)
    if (typeof aiText === 'string' && aiText.match(/^([0-9]+,)+[0-9]+$/)) {
      const byteArr = aiText.split(',').map(Number);
      aiText = Buffer.from(byteArr).toString('utf8');
    }

    // Enhanced response with metadata and user context
    const enhancedResponse = {
      role: 'ai',
      content: aiText,
      metadata: {
        model: 'bedrock-claude-4',
        tokenUsage: {
          inputTokens: responseBody.usage?.input_tokens || null,
          outputTokens: responseBody.usage?.output_tokens || null,
          totalTokens: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0)
        },
        responseTime: Date.now(),
        stopReason: responseBody.stop_reason || null
      },
      userContext: {
        ...userContext,
        lastInteraction: Date.now(),
        messageCount: (userContext.messageCount || 0) + 1
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(enhancedResponse)
    };

  } catch (error: any) {
    console.error('Bedrock AI Agent Error:', error);

    // Enhanced error handling
    let errorMessage = 'Sorry, I encountered an issue. Please try again.';
    let statusCode = 500;

    if (error.name === 'ValidationException') {
      errorMessage = 'Invalid request format. Please check your input.';
      statusCode = 400;
    } else if (error.name === 'ThrottlingException') {
      errorMessage = 'Too many requests. Please wait a moment before trying again.';
      statusCode = 429;
    } else if (error.name === 'ModelTimeoutException') {
      errorMessage = 'The AI model is taking too long to respond. Please try again.';
      statusCode = 504;
    } else if (error.name === 'ServiceUnavailableException') {
      errorMessage = 'The AI service is temporarily unavailable. Please try again in a few minutes.';
      statusCode = 503;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        role: 'system', 
        content: errorMessage,
        error: {
          type: error.name || 'BEDROCK_ERROR',
          message: errorMessage,
          model: 'bedrock-claude-4',
          timestamp: Date.now()
        }
      })
    };
  }
};
