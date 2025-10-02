const express = require('express');
const router = express.Router();
const planTripController = require('../controllers/planTripController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /plan-trip (requires auth)
router.post('/plan-trip', authMiddleware, planTripController.planTrip);

module.exports = router;
