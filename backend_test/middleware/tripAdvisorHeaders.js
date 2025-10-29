/**
 * TripAdvisor Headers Enhancement Middleware
 * Adds proper Origin and Referer headers for domain-restricted API keys
 */

/**
 * Get the appropriate domain for the current environment
 * For TripAdvisor API calls, we always use the production domain
 * because the API key is restricted to specific domains
 * @returns {string} Domain URL for TripAdvisor API calls
 */
function getDomainForEnvironment() {
  // Always use production domain for TripAdvisor API calls
  // This is required because the API key has domain restrictions
  return 'https://hack-a-holiday-backend.onrender.com';
}

/**
 * Middleware to enhance TripAdvisor API requests with proper headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enhanceTripAdvisorHeaders = (req, res, next) => {
  // Get the request origin to determine the best domain to use
  const requestOrigin = req.get('Origin') || req.get('Referer');
  const headers = getEnhancedHeaders(requestOrigin);
  
  // Add domain-specific headers for TripAdvisor API
  req.tripAdvisorHeaders = {
    'X-RapidAPI-Key': process.env.TRIPADVISOR_API_KEY,
    'X-RapidAPI-Host': process.env.TRIPADVISOR_API_HOST || 'api.content.tripadvisor.com',
    'Origin': headers.Origin,
    'Referer': headers.Referer,
    'User-Agent': headers['User-Agent'],
    'Accept': headers.Accept,
    'Content-Type': headers['Content-Type']
  };
  
  // Log the headers being used for debugging
  console.log('🔧 TripAdvisor Headers Enhanced:', {
    requestOrigin: requestOrigin || 'none',
    origin: headers.Origin,
    referer: headers.Referer,
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
  // For TripAdvisor API, we need to use domains that are whitelisted in the API key
  // Try to determine the best domain based on the request origin
  let domain;
  
  if (requestOrigin && requestOrigin.includes('hacktravel.vercel.app')) {
    // If request comes from frontend, use frontend domain
    domain = 'https://hacktravel.vercel.app';
  } else {
    // Default to backend domain for API calls
    domain = 'https://hack-a-holiday-backend.onrender.com';
  }
  
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