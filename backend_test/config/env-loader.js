const path = require('path');
const fs = require('fs');

/**
 * Environment loader that checks for .env files in multiple locations
 * Priority order:
 * 1. backend_test/.env (local backend config)
 * 2. root/.env (project-wide config)
 * 3. process.env (system environment variables)
 */
function loadEnvironmentConfig() {
  const dotenv = require('dotenv');
  
  // Path to backend_test/.env
  const backendEnvPath = path.join(__dirname, '..', '.env');
  
  // Path to root/.env (one level up from backend_test)
  const rootEnvPath = path.join(__dirname, '..', '..', '.env');
  
  console.log('🔧 Loading environment configuration...');
  
  // First, try to load root .env as base configuration
  if (fs.existsSync(rootEnvPath)) {
    console.log('📁 Loading root .env file:', rootEnvPath);
    dotenv.config({ path: rootEnvPath });
  } else {
    console.log('⚠️  Root .env file not found:', rootEnvPath);
  }
  
  // Then, load backend_test/.env to override any values
  if (fs.existsSync(backendEnvPath)) {
    console.log('📁 Loading backend_test .env file:', backendEnvPath);
    dotenv.config({ path: backendEnvPath, override: true });
  } else {
    console.log('ℹ️  Backend_test .env file not found, using root .env values');
  }
  
  // Validate required environment variables
  validateRequiredEnvVars();
  
  console.log('✅ Environment configuration loaded successfully');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Port: ${process.env.PORT || 4000}`);
  console.log(`🔗 Frontend Origin: ${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}`);
}

/**
 * Validate that required environment variables are present
 */
function validateRequiredEnvVars() {
  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID', 
    'AWS_SECRET_ACCESS_KEY',
    'JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please check your .env files or set these variables in your system environment.');
    
    // Don't exit in development, just warn
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key, defaultValue = null) {
  return process.env[key] || defaultValue;
}

/**
 * Get boolean environment variable
 */
function getBooleanEnvVar(key, defaultValue = false) {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get numeric environment variable
 */
function getNumericEnvVar(key, defaultValue = 0) {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

module.exports = {
  loadEnvironmentConfig,
  getEnvVar,
  getBooleanEnvVar,
  getNumericEnvVar,
  validateRequiredEnvVars
};