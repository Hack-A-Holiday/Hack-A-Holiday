/**
 * AWS Bedrock Agent Core API Routes
 * 
 * Endpoints for autonomous travel agent with reasoning capabilities
 */

const express = require('express');
const router = express.Router();
const BedrockAgentCore = require('../services/BedrockAgentCore');

// Initialize Bedrock Agent
const agent = new BedrockAgentCore();

/**
 * Main agent endpoint - Autonomous request processing
 * POST /bedrock-agent/process
 */
router.post('/process', async (req, res) => {
  try {
    const {
      message,
      userId = 'anonymous',
      sessionId,
      conversationHistory = [],
      requireHumanApproval = false,
      maxIterations = 10
    } = req.body;

    console.log('🤖 Bedrock Agent request:', { message, userId, sessionId });

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Process with autonomous agent
    const result = await agent.processRequest({
      message,
      userId,
      sessionId,
      conversationHistory,
      requireHumanApproval,
      maxIterations
    });

    res.json(result);

  } catch (error) {
    console.error('Bedrock agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Agent processing failed',
      message: error.message,
      fallback: {
        response: 'I apologize for the technical issue. I\'m here to help you plan your trip. What would you like to know?',
        toolsAvailable: agent.tools.map(t => t.name)
      }
    });
  }
});

/**
 * Execute specific tool directly
 * POST /bedrock-agent/tool/:toolName
 */
router.post('/tool/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const input = req.body;

    console.log(`🔧 Direct tool execution: ${toolName}`);

    const result = await agent.executeToolCall({
      name: toolName,
      input
    });

    res.json({
      success: true,
      tool: toolName,
      result
    });

  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Tool execution failed',
      message: error.message
    });
  }
});

/**
 * Get available tools and their schemas
 * GET /bedrock-agent/tools
 */
router.get('/tools', (req, res) => {
  res.json({
    success: true,
    tools: agent.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    })),
    totalTools: agent.tools.length
  });
});

/**
 * Get session information
 * GET /bedrock-agent/session/:sessionId
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = agent.sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        messageCount: session.history.length,
        createdAt: session.createdAt,
        lastMessage: session.history[session.history.length - 1]
      }
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session',
      message: error.message
    });
  }
});

/**
 * Multi-turn conversation endpoint with HYBRID routing
 * POST /bedrock-agent/chat
 * 
 * Uses intelligent routing:
 * - Simple queries → Direct Bedrock (1 API call, faster)
 * - Complex queries → Agent with tools (2 API calls, powerful)
 */
router.post('/chat', async (req, res) => {
  try {
    const {
      message,
      userId = 'anonymous',
      sessionId,
      conversationHistory = [],
      forceAgentMode = false // Optional: force agent mode even for simple queries
    } = req.body;

    console.log('💬 Chat Request:', { message, sessionId, userId });

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    let result;

    // Intelligent routing based on query complexity
    if (forceAgentMode) {
      console.log('🔧 Forced Agent Mode');
      result = await agent.agentChat(
        message,
        sessionId || `session_${Date.now()}`,
        conversationHistory,
        userId
      );
    } else {
      // Analyze query complexity
      const complexity = agent.analyzeComplexity(message);
      
      if (complexity.isComplex) {
        // Use Agent Core with tools (complex queries)
        result = await agent.agentChat(
          message,
          sessionId || `session_${Date.now()}`,
          conversationHistory,
          userId
        );
      } else {
        // Use Simple Chat without tools (simple queries)
        result = await agent.simpleChat(
          message,
          sessionId || `session_${Date.now()}`,
          conversationHistory,
          userId
        );
      }
    }

    res.json({
      success: true,
      message: result.response,
      toolsUsed: result.toolsUsed || [],
      toolResults: result.toolResults || [],
      model: result.model,
      sessionId: result.sessionId,
      agentMode: result.agentMode || false,
      simpleMode: result.simpleMode || false
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat processing failed',
      message: error.message
    });
  }
});

/**
 * Plan a complete trip autonomously
 * POST /bedrock-agent/plan-trip
 */
router.post('/plan-trip', async (req, res) => {
  try {
    const {
      destination,
      duration,
      budget,
      interests = [],
      travelers = 1,
      startDate,
      userId = 'anonymous'
    } = req.body;

    console.log('🧳 Planning complete trip:', { destination, duration, budget });

    if (!destination || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Destination and duration are required'
      });
    }

    // Create comprehensive planning message
    const message = `Plan a complete ${duration}-day trip to ${destination} for ${travelers} ${travelers === 1 ? 'person' : 'people'} with a ${budget || 'moderate'} budget. ${interests.length > 0 ? `Interests: ${interests.join(', ')}.` : ''} ${startDate ? `Starting ${startDate}.` : 'Flexible dates.'} Include flights, hotels, daily itinerary, budget breakdown, and travel tips.`;

    const result = await agent.processRequest({
      message,
      userId,
      sessionId: `trip_${Date.now()}`,
      requireHumanApproval: false,
      maxIterations: 15 // More iterations for complete planning
    });

    res.json({
      success: true,
      tripPlan: result.response,
      reasoning: result.reasoning,
      toolsUsed: result.toolsUsed,
      confidence: result.confidence,
      executionPlan: result.executionPlan,
      sessionId: result.sessionId
    });

  } catch (error) {
    console.error('Trip planning error:', error);
    res.status(500).json({
      success: false,
      error: 'Trip planning failed',
      message: error.message
    });
  }
});

/**
 * Get personalized recommendations
 * POST /bedrock-agent/recommend
 */
router.post('/recommend', async (req, res) => {
  try {
    const {
      type, // 'destination', 'flights', 'hotels', 'activities'
      preferences = {},
      userId = 'anonymous',
      context = {}
    } = req.body;

    console.log(`💡 Getting recommendations: ${type}`);

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation type is required'
      });
    }

    const message = `Based on my preferences ${JSON.stringify(preferences)}, recommend ${type} for my trip. ${context.destination ? `I'm considering ${context.destination}.` : ''} ${context.budget ? `My budget is ${context.budget}.` : ''}`;

    const result = await agent.processRequest({
      message,
      userId,
      sessionId: `recommend_${Date.now()}`,
      requireHumanApproval: false,
      maxIterations: 8
    });

    res.json({
      success: true,
      recommendations: result.response,
      reasoning: result.reasoning,
      toolsUsed: result.toolsUsed,
      confidence: result.confidence
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Recommendation generation failed',
      message: error.message
    });
  }
});

/**
 * Health check
 * GET /bedrock-agent/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Bedrock Agent Core',
    status: 'operational',
    capabilities: {
      reasoning: true,
      autonomous: true,
      toolCalling: true,
      multiTurn: true
    },
    tools: agent.tools.length,
    activeSessions: agent.sessions.size,
    models: {
      reasoning: agent.reasoningModel,
      standard: agent.sonnetModel,
      fast: agent.fastModel
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
