const express = require('express');
const router = express.Router();
const googleAuthController = require('../controllers/googleAuthController');

// POST /auth/google-user
router.post('/google-user', googleAuthController.googleUser);

module.exports = router;
