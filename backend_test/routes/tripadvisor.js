const express = require('express');
const router = express.Router();
const BedrockAgentCore = require('../services/BedrockAgentCore');
const TripAdvisorRapidAPIService = require('../services/TripAdvisorRapidAPIService');

// Initialize the Bedrock Agent Core
const agent = new BedrockAgentCore();

// Initialize TripAdvisor service
const tripAdvisorService = new TripAdvisorRapidAPIService();

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
 * Get location details using TripAdvisor Content API
 * GET /api/tripadvisor/location/:locationId/details
 */
router.get('/location/:locationId/details', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { language = 'en', currency = 'USD' } = req.query;
    
    // Validate locationId
    if (!locationId || locationId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Location ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`📍 Getting location details for: ${locationId}`);
    
    const details = await tripAdvisorService.getLocationDetails(locationId, language, currency);
    
    res.json({
      success: true,
      data: details,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting location details:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Rate limit')) {
      statusCode = 429;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error retrieving location details',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get location photos using TripAdvisor Content API
 * GET /api/tripadvisor/location/:locationId/photos
 */
router.get('/location/:locationId/photos', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { limit = 5, language = 'en' } = req.query;
    
    // Validate locationId
    if (!locationId || locationId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Location ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate limit
    const photoLimit = parseInt(limit);
    if (isNaN(photoLimit) || photoLimit < 1 || photoLimit > 20) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 20',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`📸 Getting photos for location: ${locationId} (limit: ${photoLimit})`);
    
    const photos = await tripAdvisorService.getLocationPhotos(locationId, photoLimit, language);
    
    res.json({
      success: true,
      data: photos,
      count: photos.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting location photos:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Rate limit')) {
      statusCode = 429;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error retrieving location photos',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get location reviews using TripAdvisor Content API
 * GET /api/tripadvisor/location/:locationId/reviews
 */
router.get('/location/:locationId/reviews', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { limit = 5, language = 'en' } = req.query;
    
    // Validate locationId
    if (!locationId || locationId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Location ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate limit
    const reviewLimit = parseInt(limit);
    if (isNaN(reviewLimit) || reviewLimit < 1 || reviewLimit > 20) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 20',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`📝 Getting reviews for location: ${locationId} (limit: ${reviewLimit})`);
    
    const reviews = await tripAdvisorService.getLocationReviews(locationId, reviewLimit, language);
    
    res.json({
      success: true,
      data: reviews,
      count: reviews.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting location reviews:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Rate limit')) {
      statusCode = 429;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error retrieving location reviews',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Search for locations using TripAdvisor Content API
 * GET /api/tripadvisor/location/search
 */
router.get('/location/search', async (req, res) => {
  try {
    const { searchQuery, limit = 10, language = 'en' } = req.query;
    
    // Validate searchQuery
    if (!searchQuery || searchQuery.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate limit
    const searchLimit = parseInt(limit);
    if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 20) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 20',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🔍 Searching locations for: ${searchQuery} (limit: ${searchLimit})`);
    
    const locations = await tripAdvisorService.searchLocations(searchQuery, searchLimit, language);
    
    res.json({
      success: true,
      data: locations,
      count: locations.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error searching locations:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Rate limit')) {
      statusCode = 429;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error searching locations',
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
    availableTools: agent.tools.map(t => t.name),
    features: {
      locationDetails: !!process.env.TRIPADVISOR_API_KEY,
      locationPhotos: !!process.env.TRIPADVISOR_API_KEY,
      locationSearch: !!process.env.TRIPADVISOR_API_KEY,
      attractions: true,
      restaurants: true
    }
  });
});

module.exports = router;
