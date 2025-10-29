/**
 * TripAdvisor Headers Enhancement Middleware
 * Adds proper Origin and Referer headers for domain-restricted API keys
 */

/**
 * Get the appropriate domain for the current environment
 * @returns {string} Domain URL for the current environment
 */
function getDomainForEnvironment() {
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'production') {
    // Use the backend domain for production API calls
    return 'https://hack-a-holiday-backend.onrender.com';
  } else {
    // Use localhost for development
    return 'http://localhost:4000';
  }
}

/**
 * Middleware to enhance TripAdvisor API requests with proper headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enhanceTripAdvisorHeaders = (req, res, next) => {
  // Get the domain for the current environment
  const domain = getDomainForEnvironment();
  
  // Add domain-specific headers for TripAdvisor API
  req.tripAdvisorHeaders = {
    'X-RapidAPI-Key': process.env.TRIPADVISOR_API_KEY,
    'X-RapidAPI-Host': process.env.TRIPADVISOR_API_HOST || 'api.content.tripadvisor.com',
    'Origin': domain,
    'Referer': domain,
    'User-Agent': 'Hack-A-Holiday/1.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  // Log the headers being used for debugging
  console.log('🔧 TripAdvisor Headers Enhanced:', {
    origin: domain,
    referer: domain,
    apiKey: process.env.TRIPADVISOR_API_KEY ? process.env.TRIPADVISOR_API_KEY.substring(0, 8) + '...' : 'MISSING',
    timestamp: new Date().toISOString()
  });
  
  next();
};

/**
 * Validate domain restrictions for TripAdvisor API
 * @param {string} origin - Request origin
 * @returns {boolean} Whether the domain is valid for API access
 */
function validateDomainRestrictions(origin) {
  const allowedDomains = [
    'https://hacktravel.vercel.app',
    'https://hack-a-holiday-backend.onrender.com',
    'http://localhost:3000',
    'http://localhost:4000'
  ];
  
  return !origin || allowedDomains.includes(origin);
}

/**
 * Get enhanced headers for TripAdvisor API calls
 * @param {string} requestOrigin - Origin of the incoming request
 * @returns {Object} Headers object for TripAdvisor API calls
 */
function getEnhancedHeaders(requestOrigin = null) {
  const domain = getDomainForEnvironment();
  
  return {
    'key': process.env.TRIPADVISOR_API_KEY,
    'Origin': domain,
    'Referer': domain,
    'User-Agent': 'Hack-A-Holiday/1.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
}

module.exports = {
  enhanceTripAdvisorHeaders,
  getDomainForEnvironment,
  validateDomainRestrictions,
  getEnhancedHeaders
};