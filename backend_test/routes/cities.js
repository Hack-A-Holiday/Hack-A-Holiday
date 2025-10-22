const express = require('express');
const router = express.Router();
const citiesController = require('../controllers/citiesController');

// Search cities for autocomplete
router.get('/search', citiesController.searchCities);

module.exports = router;