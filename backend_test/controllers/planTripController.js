// Plan Trip Controller
const planTripService = require('../services/planTripService');

exports.planTrip = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const preferences = req.body.preferences;
    // Get token from cookie or header
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    const result = await planTripService.planTrip(userId, preferences, token);

    // Ensure the result is correctly formatted before sending it to the frontend
    if (!result.tripId || !result.dailyItinerary) {
      return res.status(500).json({ error: 'Invalid trip plan response' });
    }

    res.status(201).json(result);
  } catch (err) {
    const errorResponse = { error: err.message || 'Failed to plan trip' };
    // Do NOT include bedrockRaw in error response
    res.status(500).json(errorResponse);
  }
};
