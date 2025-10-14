const tripModel = require('../models/tripModel');

/**
 * Create a new trip
 */
exports.createTrip = async (req, res) => {
  try {
    const { userId, origin, destination, departureDate, returnDate, type, details } = req.body;

    // Validate required fields
    if (!userId || !origin || !destination || !departureDate || !type) {
      return res.status(400).json({
        error: 'Missing required fields: userId, origin, destination, departureDate, type'
      });
    }

    // Validate type
    const validTypes = ['flight', 'package', 'hotel', 'vacation'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const trip = await tripModel.createTrip({
      userId,
      origin,
      destination,
      departureDate,
      returnDate,
      type,
      details,
      status: 'planned'
    });

    console.log('✅ Trip created successfully:', trip.id);
    res.status(201).json({
      success: true,
      trip
    });
  } catch (error) {
    console.error('❌ Error creating trip:', error);
    res.status(500).json({
      error: 'Failed to create trip',
      message: error.message
    });
  }
};

/**
 * Get all trips for a user
 */
exports.getUserTrips = async (req, res) => {
  try {
    const { userId } = req.params;
    const includeExpired = req.query.includeExpired === 'true';

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      });
    }

    const trips = await tripModel.getTripsByUserId(userId, includeExpired);
    const stats = await tripModel.getTripStats(userId);

    res.json({
      success: true,
      trips,
      stats
    });
  } catch (error) {
    console.error('❌ Error fetching trips:', error);
    res.status(500).json({
      error: 'Failed to fetch trips',
      message: error.message
    });
  }
};

/**
 * Get a single trip by ID
 */
exports.getTripById = async (req, res) => {
  try {
    const { userId, tripId } = req.params;

    if (!userId || !tripId) {
      return res.status(400).json({
        error: 'Missing userId or tripId parameter'
      });
    }

    const trip = await tripModel.getTripById(userId, tripId);

    if (!trip) {
      return res.status(404).json({
        error: 'Trip not found'
      });
    }

    res.json({
      success: true,
      trip
    });
  } catch (error) {
    console.error('❌ Error fetching trip:', error);
    res.status(500).json({
      error: 'Failed to fetch trip',
      message: error.message
    });
  }
};

/**
 * Cancel a trip with reason
 */
exports.cancelTrip = async (req, res) => {
  try {
    const { userId, tripId } = req.params;
    const { reason } = req.body;

    if (!userId || !tripId) {
      return res.status(400).json({
        error: 'Missing userId or tripId parameter'
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: 'Missing cancellation reason'
      });
    }

    const trip = await tripModel.cancelTrip(userId, tripId, reason);

    console.log(`✅ Trip ${tripId} cancelled by user ${userId}`);
    res.json({
      success: true,
      trip,
      message: 'Trip cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error cancelling trip:', error);
    res.status(500).json({
      error: 'Failed to cancel trip',
      message: error.message
    });
  }
};

/**
 * Delete a trip permanently
 */
exports.deleteTrip = async (req, res) => {
  try {
    const { userId, tripId } = req.params;

    if (!userId || !tripId) {
      return res.status(400).json({
        error: 'Missing userId or tripId parameter'
      });
    }

    await tripModel.deleteTrip(userId, tripId);

    console.log(`✅ Trip ${tripId} deleted by user ${userId}`);
    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting trip:', error);
    res.status(500).json({
      error: 'Failed to delete trip',
      message: error.message
    });
  }
};

/**
 * Update trip status
 */
exports.updateTripStatus = async (req, res) => {
  try {
    const { userId, tripId } = req.params;
    const { status } = req.body;

    if (!userId || !tripId) {
      return res.status(400).json({
        error: 'Missing userId or tripId parameter'
      });
    }

    const validStatuses = ['planned', 'booked', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const trip = await tripModel.updateTripStatus(userId, tripId, status);

    console.log(`✅ Trip ${tripId} status updated to: ${status}`);
    res.json({
      success: true,
      trip
    });
  } catch (error) {
    console.error('❌ Error updating trip status:', error);
    res.status(500).json({
      error: 'Failed to update trip status',
      message: error.message
    });
  }
};

/**
 * Cleanup expired trips (admin/scheduled task)
 */
exports.cleanupExpiredTrips = async (req, res) => {
  try {
    const deletedCount = await tripModel.cleanupExpiredTrips();

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} expired trips`
    });
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      error: 'Failed to cleanup expired trips',
      message: error.message
    });
  }
};

/**
 * Legacy planTrip endpoint (kept for backward compatibility)
 */
exports.planTrip = async (req, res) => {
  // Dummy implementation
  const { preferences } = req.body;
  res.json({
    message: 'Trip planned!',
    itinerary: {
      destination: preferences.destination || 'Paris, France',
      days: 5,
      activities: ['Sightseeing', 'Museum', 'Food tour']
    }
  });
};
