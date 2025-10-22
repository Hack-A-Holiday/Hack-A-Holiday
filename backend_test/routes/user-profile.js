const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');

// Get user profile by email
router.get('/:email', userProfileController.getProfileByEmail);

// Update travel preferences by email
router.put('/:email/preferences', userProfileController.updatePreferences);

// Update home city by email
router.put('/:email/home-city', userProfileController.updateHomeCity);

module.exports = router;