// routes/globe.js
// Globe visualization and trip planning endpoints

const express = require('express');
const router = express.Router();
const geocodingService = require('../services/GeocodingService');
const agent = require('../services/BedrockAgentCore');

/**
 * POST /globe/route
 * Get coordinates for source and destination to display on globe
 */
router.post('/route', async (req, res) => {
  try {
    const { source, destination } = req.body;

    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination are required'
      });
    }

    console.log(`🌍 Globe route request: ${source} → ${destination}`);

    // Get coordinates for both locations
    const routeData = await geocodingService.getRouteCoordinates(source, destination);

    res.json({
      success: true,
      route: routeData,
      source: routeData.source,
      destination: routeData.destination
    });

  } catch (error) {
    console.error('❌ Globe route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get route coordinates',
      message: error.message
    });
  }
});

/**
 * POST /globe/plan-adventure
 * Plan complete trip with flights, hotels, and itinerary based on preferences
 */
router.post('/plan-adventure', async (req, res) => {
  try {
    const {
      source,
      destination,
      startDate,
      endDate,
      budget,
      preferences = {},
      userId = 'anonymous'
    } = req.body;

    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination are required'
      });
    }

    console.log(`🎒 Planning adventure: ${source} → ${destination}`);
    console.log(`📅 Dates: ${startDate} to ${endDate}`);
    console.log(`💰 Budget: $${budget}`);
    console.log(`⚙️ Preferences:`, preferences);

    // Build comprehensive trip planning message for the agent
    const planningMessage = `I want to plan a complete trip:

SOURCE: ${source}
DESTINATION: ${destination}
START DATE: ${startDate || 'Flexible'}
END DATE: ${endDate || 'Flexible'}
BUDGET: $${budget || 'Flexible'}

PREFERENCES:
${Object.entries(preferences).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Please help me with:
1. Find the best flight options from ${source} to ${destination}
2. Search for hotels in ${destination} that match my preferences
3. Create a detailed daily itinerary
4. Calculate the total trip budget
5. Check visa requirements if needed
6. Provide travel alerts and safety information

Give me a comprehensive travel plan with all details.`;

    // Use Agent Core with tools for complex trip planning
    const result = await agent.agentChat(
      planningMessage,
      `adventure_${Date.now()}`,
      [], // No conversation history for fresh planning
      userId
    );

    // Also get coordinates for globe visualization
    const routeData = await geocodingService.getRouteCoordinates(source, destination);

    res.json({
      success: true,
      plan: {
        message: result.response,
        toolsUsed: result.toolsUsed || [],
        toolResults: result.toolResults || []
      },
      route: routeData,
      source: routeData.source,
      destination: routeData.destination,
      dates: {
        start: startDate,
        end: endDate
      },
      budget: budget,
      preferences: preferences,
      model: result.model,
      sessionId: result.sessionId
    });

  } catch (error) {
    console.error('❌ Adventure planning error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to plan adventure',
      message: error.message
    });
  }
});

/**
 * POST /globe/geocode
 * Get coordinates for a single location
 */
router.post('/geocode', async (req, res) => {
  try {
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }

    console.log(`📍 Geocoding: ${location}`);

    const coords = await geocodingService.getCoordinates(location);

    res.json({
      success: true,
      location: location,
      coordinates: {
        lat: coords.latitude,
        lng: coords.longitude,
        name: coords.displayName
      }
    });

  } catch (error) {
    console.error('❌ Geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to geocode location',
      message: error.message
    });
  }
});

/**
 * POST /globe/batch-geocode
 * Get coordinates for multiple locations
 */
router.post('/batch-geocode', async (req, res) => {
  try {
    const { locations } = req.body;

    if (!locations || !Array.isArray(locations)) {
      return res.status(400).json({
        success: false,
        error: 'Locations array is required'
      });
    }

    console.log(`📍 Batch geocoding ${locations.length} locations`);

    const results = await geocodingService.getBatchCoordinates(locations);

    res.json({
      success: true,
      results: results.map((coords, index) => ({
        location: locations[index],
        coordinates: {
          lat: coords.latitude,
          lng: coords.longitude,
          name: coords.displayName
        }
      }))
    });

  } catch (error) {
    console.error('❌ Batch geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch geocode locations',
      message: error.message
    });
  }
});

module.exports = router;
