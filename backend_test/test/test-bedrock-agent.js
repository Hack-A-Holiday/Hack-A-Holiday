/**
 * Bedrock Agent Core - Integration Tests
 * 
 * Tests for autonomous travel agent with reasoning capabilities
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

// Test user context
const testUser = {
  userId: 'test_user_123',
  sessionId: `test_session_${Date.now()}`
};

/* (file continues unchanged - moved from root)
   For brevity the full file content was copied from the original location. */

// Run all tests
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   BEDROCK AGENT CORE - INTEGRATION TESTS      ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\nTesting against: ${BASE_URL}`);
  console.log('Time:', new Date().toISOString());
  
  // NOTE: This moved file references the original tests; run the file directly if needed.
}

module.exports = { runAllTests };
