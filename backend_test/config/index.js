const { getEnvVar, getBooleanEnvVar, getNumericEnvVar } = require('./env-loader');

/**
 * Centralized configuration object
 * All environment variables should be accessed through this module
 */
let _config = null;

function getConfig() {
  if (!_config) {
    _config = {
  // Server Configuration
  server: {
    port: getNumericEnvVar('PORT', 4000),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    environment: getEnvVar('ENVIRONMENT', 'dev'),
    frontendOrigin: getEnvVar('FRONTEND_ORIGIN', 'http://localhost:3000'),
    logLevel: getEnvVar('LOG_LEVEL', 'info')
  },

  // AWS Configuration
  aws: {
    region: getEnvVar('AWS_REGION', 'us-east-1'),
    accountId: getEnvVar('AWS_ACCOUNT_ID'),
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY'),
    bedrockRegion: getEnvVar('BEDROCK_REGION', 'us-east-1')
  },

  // AI Models
  ai: {
    reasoningModel: getEnvVar('REASONING_MODEL', 'us.amazon.nova-pro-v1:0'),
    fastModel: getEnvVar('FAST_MODEL', 'us.amazon.nova-lite-v1:0')
  },

  // Database Configuration
  database: {
    tablePrefix: getEnvVar('DYNAMODB_TABLE_PREFIX', 'TravelCompanion'),
    usersTable: getEnvVar('USERS_TABLE', 'TravelCompanion-Users-dev'),
    tripsTable: getEnvVar('TRIPS_TABLE', 'TravelCompanion-Trips-dev'),
    chatsTable: getEnvVar('CHATS_TABLE', 'HackAHolidayChatHistory'),
    userPreferencesTable: getEnvVar('USER_PREFERENCES_TABLE', 'TravelCompanion-UserPreferences-dev')
  },

  // API Configuration
  api: {
    url: getEnvVar('API_URL', 'http://localhost:4000'),
    rapidApiKey: getEnvVar('RAPIDAPI_KEY'),
    rapidApiHost: getEnvVar('RAPIDAPI_HOST', 'kiwi-com-cheap-flights.p.rapidapi.com'),
    bookingApiKey: getEnvVar('BOOKING_API_KEY'),
    bookingApiHost: getEnvVar('BOOKING_API_HOST', 'booking-com15.p.rapidapi.com'),
    tripAdvisorApiKey: getEnvVar('TRIPADVISOR_API_KEY'),
    tripAdvisorCacheTtl: getNumericEnvVar('TRIPADVISOR_CACHE_TTL', 3600000)
  },

  // Authentication
  auth: {
    jwtSecret: getEnvVar('JWT_SECRET'),
    googleClientId: getEnvVar('GOOGLE_CLIENT_ID')
  },

  // SageMaker (if used)
  sagemaker: {
    endpointName: getEnvVar('SAGEMAKER_ENDPOINT_NAME')
  },

  // Development flags
  dev: {
    isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
    isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
    enableDebugLogging: getBooleanEnvVar('DEBUG_LOGGING', false)
  }
    };
  }
  return _config;
}

// Export a proxy that calls getConfig() when accessed
const config = new Proxy({}, {
  get(target, prop) {
    return getConfig()[prop];
  }
});

// Validation helper
function validateConfig() {
  const errors = [];

  if (!config.aws.accessKeyId) {
    errors.push('AWS_ACCESS_KEY_ID is required');
  }
  
  if (!config.aws.secretAccessKey) {
    errors.push('AWS_SECRET_ACCESS_KEY is required');
  }
  
  if (!config.auth.jwtSecret) {
    errors.push('JWT_SECRET is required');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    
    if (config.dev.isProduction) {
      throw new Error('Configuration validation failed in production');
    }
  }

  return errors.length === 0;
}

// Log configuration (without sensitive data)
function logConfig() {
  console.log('📋 Current Configuration:');
  console.log(`   Server Port: ${config.server.port}`);
  console.log(`   Environment: ${config.server.nodeEnv}`);
  console.log(`   AWS Region: ${config.aws.region}`);
  console.log(`   Frontend Origin: ${config.server.frontendOrigin}`);
  console.log(`   Users Table: ${config.database.usersTable}`);
  console.log(`   Trips Table: ${config.database.tripsTable}`);
  console.log(`   Chats Table: ${config.database.chatsTable}`);
  console.log(`   AI Reasoning Model: ${config.ai.reasoningModel}`);
  console.log(`   AI Fast Model: ${config.ai.fastModel}`);
  console.log(`   TripAdvisor API: ${config.api.tripAdvisorApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   RapidAPI: ${config.api.rapidApiKey ? '✅ Configured' : '❌ Missing'}`);
}

module.exports = {
  config,
  validateConfig,
  logConfig
};