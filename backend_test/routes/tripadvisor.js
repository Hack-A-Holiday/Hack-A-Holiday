const express = require('express');
const router = express.Router();
const BedrockAgentCore = require('../services/BedrockAgentCore');

// Initialize the Bedrock Agent Core
const agent = new BedrockAgentCore();

/**
 * Search for attractions near a location
 */
router.get('/attractions/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    console.log(`🏛️ Searching attractions in ${location}`);
    
    const result = await agent.executeToolCall({
      name: 'search_attractions',
      input: { location, limit }
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error searching attractions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Search for restaurants near a location
 */
router.get('/restaurants/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    console.log(`🍽️ Searching restaurants in ${location}`);
    
    const result = await agent.executeToolCall({
      name: 'search_restaurants',
      input: { location, limit }
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error searching restaurants:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get detailed information about a specific attraction
 */
router.get('/attractions/details/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    console.log(`🏛️ Getting attraction details for ${contentId}`);
    
    const result = await agent.executeToolCall({
      name: 'get_attraction_details',
      input: { contentId }
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting attraction details:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get detailed information about a specific restaurant
 */
router.get('/restaurants/details/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    console.log(`🍽️ Getting restaurant details for ${contentId}`);
    
    const result = await agent.executeToolCall({
      name: 'get_restaurant_details',
      input: { contentId }
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting restaurant details:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * AI Agent endpoint for natural language queries about attractions and restaurants
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, userId = 'anonymous', sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🤖 Processing AI request: ${message}`);
    
    const result = await agent.processRequest({
      message,
      userId,
      sessionId: sessionId || `session_${Date.now()}`,
      conversationHistory: [],
      requireHumanApproval: false,
      maxIterations: 5
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing AI request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TripAdvisor RapidAPI integration is healthy',
    timestamp: new Date().toISOString(),
    availableTools: agent.tools.map(t => t.name)
  });
});

module.exports = router;
