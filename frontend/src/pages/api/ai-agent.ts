import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Set your backend base URL here (adjust port if needed)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userContext, aiModel = 'bedrock', userId } = req.body;

  try {
    // Enhanced request payload with comprehensive user context
    const requestPayload = {
      messages,
      userContext: {
        ...userContext,
        userId,
        timestamp: Date.now(),
        sessionId: userContext.sessionId || `session_${Date.now()}`
      },
      aiModel,
      // Add conversation metadata
      metadata: {
        conversationLength: messages.length,
        lastMessageTime: messages[messages.length - 1]?.timestamp,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      }
    };

    console.log('🤖 Routing to Express backend AI agent:', requestPayload);

    // Route to Express backend AI agent
    const response = await axios.post(`${BACKEND_URL}/ai-agent/chat`, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      timeout: 60000 // 60 second timeout for AI responses
    });

    // Enhanced response with metadata
    const aiResponse = {
      ...response.data,
      metadata: {
        ...response.data.metadata,
        model: aiModel,
        responseTime: Date.now(),
        enhanced: true,
        backend: 'express'
      }
    };

    res.status(200).json(aiResponse);
    
  } catch (error: any) {
    console.error('Error communicating with Express backend:', error);
    
    // Enhanced error handling
    let errorMessage = 'Sorry, something went wrong. Please try again.';
    let errorCode = 500;
    
    if (error.response) {
      errorCode = error.response.status;
      errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
      
      if (errorCode === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
      } else if (errorCode === 503) {
        errorMessage = 'AI service is temporarily unavailable. Please try again in a few minutes.';
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The AI might be processing a complex request.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to AI service. Please check your connection.';
    }

    res.status(errorCode).json({ 
      role: 'system', 
      content: errorMessage,
      error: {
        type: error.code || 'UNKNOWN_ERROR',
        message: errorMessage,
        timestamp: Date.now(),
        backend: 'express'
      }
    });
  }
}