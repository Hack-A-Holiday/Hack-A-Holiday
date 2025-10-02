import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';

const sagemakerClient = new SageMakerRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// SageMaker endpoint name - you'll need to deploy a model endpoint first
const SAGEMAKER_ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME || 'travel-assistant-endpoint';

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

    // Format conversation for SageMaker
    const conversation = messages.map((msg: any) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: msg.timestamp
    }));

    // Create enhanced prompt with user context
    const systemPrompt = `You are an expert AI travel assistant powered by SageMaker. You help users plan trips, provide travel advice, and answer travel-related questions.

User Context:
- Session ID: ${userContext.sessionId || 'unknown'}
- User Preferences: ${JSON.stringify(userContext.preferences || {})}
- Current Trip: ${JSON.stringify(userContext.currentTrip || {})}
- Trip History: ${JSON.stringify(userContext.tripHistory || [])}

Guidelines:
1. Be helpful, informative, and enthusiastic about travel
2. Provide specific, actionable advice
3. Consider the user's preferences and context
4. Use emojis appropriately to make responses engaging
5. If discussing itineraries, be detailed about activities, timing, and costs
6. Always prioritize safety and practical considerations

Conversation History:
${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Please provide a helpful response as a travel assistant.`;

    // Prepare SageMaker request payload
    const sagemakerPayload = {
      inputs: systemPrompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        repetition_penalty: 1.1
      },
      userContext,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        endpoint: SAGEMAKER_ENDPOINT_NAME
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
    // The exact structure depends on your model deployment
    let aiText = responseBody.generated_text || responseBody.outputs || responseBody.response || 'No response generated';
    
    // Clean up the response if needed
    if (typeof aiText === 'string' && aiText.includes(systemPrompt)) {
      // Remove the system prompt from the response if it's included
      aiText = aiText.replace(systemPrompt, '').trim();
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
        confidence: responseBody.confidence || null
      },
      userContext: {
        ...userContext,
        lastInteraction: Date.now()
      }
    };

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