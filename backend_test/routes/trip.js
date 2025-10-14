const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

// Legacy route (kept for backward compatibility)
router.post('/plan', tripController.planTrip);

// Create a new trip
router.post('/', tripController.createTrip);

// Get all trips for a user
router.get('/user/:userId', tripController.getUserTrips);

// Get a single trip by ID
router.get('/:userId/:tripId', tripController.getTripById);

// Cancel a trip with reason
router.post('/:userId/:tripId/cancel', tripController.cancelTrip);

// Delete a trip permanently
router.delete('/:userId/:tripId', tripController.deleteTrip);

// Update trip status
router.patch('/:userId/:tripId/status', tripController.updateTripStatus);

// Cleanup expired trips (admin/scheduled task)
router.post('/cleanup', tripController.cleanupExpiredTrips);

module.exports = router;
