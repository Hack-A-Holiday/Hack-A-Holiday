const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile (including home city)
router.put('/profile', userController.updateProfile);

// Update home city specifically
router.put('/profile/home-city', userController.updateHomeCity);

// Delete account (soft delete with 30-day retention)
router.delete('/account', userController.deleteAccount);

module.exports = router;
