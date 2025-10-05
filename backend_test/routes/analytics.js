// Analytics API Routes
// Exposes chat analytics and user insights

const express = require('express');
const router = express.Router();
const ChatAnalyticsService = require('../services/ChatAnalyticsService');

const analyticsService = new ChatAnalyticsService();

/**
 * POST /api/analytics/analyze-chat
 * Analyze a chat session and return insights
 */
router.post('/analyze-chat', async (req, res) => {
  try {
    const { sessionId, messages, userId } = req.body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, messages (array)'
      });
    }

    // Analyze the chat
    const analysis = await analyticsService.analyzeChat(sessionId, messages, userId);
    
    // Generate recommendations based on analysis
    const recommendations = analyticsService.generateRecommendations(analysis);

    res.json({
      success: true,
      analysis,
      recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in analyze-chat:', error);
    res.status(500).json({
      error: 'Failed to analyze chat',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/user-profile/:userId
 * Get aggregated user profile from all their sessions
 */
router.get('/user-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const profile = await analyticsService.generateUserProfile(userId);

    res.json({
      success: true,
      profile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in user-profile:', error);
    res.status(500).json({
      error: 'Failed to generate user profile',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/user-history/:userId
 * Get chat history analytics for a user
 */
router.get('/user-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const history = await analyticsService.getUserAnalytics(userId, parseInt(limit));

    res.json({
      success: true,
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in user-history:', error);
    res.status(500).json({
      error: 'Failed to get user history',
      message: error.message
    });
  }
});

/**
 * POST /api/analytics/get-recommendations
 * Get personalized recommendations based on analysis
 */
router.post('/get-recommendations', async (req, res) => {
  try {
    const { analysis } = req.body;

    if (!analysis) {
      return res.status(400).json({ error: 'analysis object is required' });
    }

    const recommendations = analyticsService.generateRecommendations(analysis);

    res.json({
      success: true,
      recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in get-recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/insights
 * Get overall analytics insights (dashboard data)
 */
router.get('/insights', async (req, res) => {
  try {
    // This would aggregate data from all users
    // Placeholder for now - would implement with real queries
    
    const insights = {
      totalUsers: 0,
      totalSessions: 0,
      totalMessages: 0,
      topDestinations: [],
      budgetDistribution: {
        low: 0,
        medium: 0,
        high: 0
      },
      travelStyleDistribution: {},
      averageConfidence: 0,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Error in insights:', error);
    res.status(500).json({
      error: 'Failed to get insights',
      message: error.message
    });
  }
});

module.exports = router;
