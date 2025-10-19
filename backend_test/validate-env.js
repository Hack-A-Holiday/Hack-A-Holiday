// Environment Variables Validation Script
// Run this to ensure all required environment variables are set

require('dotenv').config();

console.log('🔍 Validating Environment Variables...\n');

// Required environment variables
const requiredVars = {
  // AWS Configuration
  'AWS_REGION': 'AWS region for services',
  'AWS_ACCESS_KEY_ID': 'AWS access key for authentication',
  'AWS_SECRET_ACCESS_KEY': 'AWS secret key for authentication',
  
  // Bedrock Models
  'BEDROCK_MODEL_ID': 'Primary Bedrock model ID (Nova Pro)',
  'FAST_MODEL': 'Fast Bedrock model ID (Nova Lite)',
  
  // DynamoDB Tables
  'CHATS_TABLE': 'DynamoDB table for chat history',
  'USERS_TABLE': 'DynamoDB table for users',
  
  // Authentication
  'JWT_SECRET': 'Secret key for JWT token signing',
  
  // Server
  'PORT': 'Server port number'
};

// Optional environment variables (with warnings)
const optionalVars = {
  'TRIPS_TABLE': 'DynamoDB table for trips',
  'TRIPADVISOR_API_KEY': 'TripAdvisor API key',
  'RAPIDAPI_KEY': 'RapidAPI key for TripAdvisor',
  'BEDROCK_AGENT_ID': 'Bedrock Agent ID',
  'BEDROCK_AGENT_ALIAS_ID': 'Bedrock Agent Alias ID',
  'SAGEMAKER_ENDPOINT_NAME': 'SageMaker endpoint name'
};

let hasErrors = false;
let hasWarnings = false;

console.log('📋 REQUIRED VARIABLES:');
console.log('='.repeat(50));

// Check required variables
for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING - ${description}`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const displayValue = ['JWT_SECRET', 'AWS_SECRET_ACCESS_KEY', 'AWS_ACCESS_KEY_ID'].includes(varName) 
      ? '***HIDDEN***' 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
}

console.log('\n📋 OPTIONAL VARIABLES:');
console.log('='.repeat(50));

// Check optional variables
for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: NOT SET - ${description}`);
    hasWarnings = true;
  } else {
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? '***HIDDEN***' 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
}

console.log('\n' + '='.repeat(50));

// Summary
if (hasErrors) {
  console.log('❌ VALIDATION FAILED');
  console.log('   Missing required environment variables!');
  console.log('   Please set all required variables in your .env file.');
  console.log('   See .env.template for reference.');
  process.exit(1);
} else {
  console.log('✅ VALIDATION PASSED');
  console.log('   All required environment variables are set.');
  
  if (hasWarnings) {
    console.log('⚠️  Some optional variables are missing.');
    console.log('   This may limit certain features.');
  }
  
  console.log('\n🚀 Your application is ready to run!');
}

// Additional checks
console.log('\n🔧 ADDITIONAL CHECKS:');
console.log('='.repeat(50));

// Check JWT secret strength
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length < 32) {
    console.log('⚠️  JWT_SECRET is shorter than 32 characters (recommended minimum)');
  } else {
    console.log('✅ JWT_SECRET length is adequate');
  }
}

// Check AWS region format
const awsRegion = process.env.AWS_REGION;
if (awsRegion && !/^[a-z]{2}-[a-z]+-\d+$/.test(awsRegion)) {
  console.log('⚠️  AWS_REGION format may be invalid (expected: us-east-1, eu-west-1, etc.)');
} else if (awsRegion) {
  console.log('✅ AWS_REGION format looks valid');
}

// Check port number
const port = process.env.PORT;
if (port && (isNaN(port) || parseInt(port) < 1 || parseInt(port) > 65535)) {
  console.log('⚠️  PORT should be a number between 1 and 65535');
} else if (port) {
  console.log('✅ PORT number is valid');
}

console.log('\n💡 TIP: Run this script anytime to validate your environment setup!');
console.log('   node backend_test/validate-env.js');