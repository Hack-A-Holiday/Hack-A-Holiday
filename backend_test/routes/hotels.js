const express = require('express');
const router = express.Router();
const HotelService = require('../services/HotelService');

// Initialize hotel service with config
const hotelService = new HotelService({
  bookingApiKey: process.env.BOOKING_API_KEY,
  rapidApiKey: process.env.RAPIDAPI_KEY,
  bookingApiHost: process.env.BOOKING_API_HOST || 'booking-com15.p.rapidapi.com'
});

/**
 * POST /api/hotels/search
 * Search for hotels with fallback support
 */
router.post('/search', async (req, res) => {
  try {
    console.log('🏨 Hotel search request received:', req.body);
    
    const { destination, checkIn, checkOut, adults, children, rooms } = req.body;
    
    if (!destination || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: destination, checkIn, checkOut'
      });
    }
    
    const searchRequest = {
      destination,
      checkIn,
      checkOut,
      adults: adults || 2,
      children: children || 0,
      rooms: rooms || 1
    };
    
    console.log('🔍 Searching hotels with params:', searchRequest);
    
    const result = await hotelService.searchHotelsEnhanced(searchRequest);
    
    if (!result) {
      console.log('❌ Hotel search returned null, no results available');
      return res.status(404).json({
        success: false,
        error: 'No hotels found',
        hotels: [],
        totalResults: 0
      });
    }
    
    console.log(`✅ Hotel search completed: ${result.hotels?.length || 0} hotels found`);
    
    res.json({
      success: true,
      hotels: result.hotels || [],
      totalResults: result.totalResults || 0,
      searchId: result.searchId || `hotel-search-${Date.now()}`,
      provider: result.provider || 'booking.com',
      fallbackUsed: result.fallbackUsed || false,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Hotel search error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Hotel search failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/hotels/health
 * Health check for hotel service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hotel-search',
    timestamp: new Date().toISOString(),
    config: {
      hasBookingApiKey: !!process.env.BOOKING_API_KEY,
      hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
      bookingApiHost: process.env.BOOKING_API_HOST || 'booking-com15.p.rapidapi.com'
    }
  });
});

module.exports = router;