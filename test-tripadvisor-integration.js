/**
 * Test script for TripAdvisor RapidAPI integration with Bedrock Agent
 */

const BedrockAgentCore = require('./backend_test/services/BedrockAgentCore');

async function testTripAdvisorIntegration() {
  console.log('🧪 Testing TripAdvisor RapidAPI Integration with Bedrock Agent\n');
  
  try {
    // Initialize the Bedrock Agent Core
    const agent = new BedrockAgentCore();
    
    console.log('✅ Bedrock Agent Core initialized successfully');
    console.log('📋 Available tools:', agent.tools.map(t => t.name).join(', '));
    console.log('');
    
    // Test 1: Search for attractions in Paris
    console.log('🏛️ Test 1: Searching for attractions in Paris...');
    const attractionsResult = await agent.executeToolCall({
      name: 'search_attractions',
      input: { location: 'Paris', limit: 3 }
    });
    
    console.log('Attractions Result:', JSON.stringify(attractionsResult, null, 2));
    console.log('');
    
    // Test 2: Search for restaurants in Paris
    console.log('🍽️ Test 2: Searching for restaurants in Paris...');
    const restaurantsResult = await agent.executeToolCall({
      name: 'search_restaurants',
      input: { location: 'Paris', limit: 3 }
    });
    
    console.log('Restaurants Result:', JSON.stringify(restaurantsResult, null, 2));
    console.log('');
    
    // Test 3: Get details for a specific attraction (using mock contentId)
    console.log('🏛️ Test 3: Getting attraction details...');
    const attractionDetails = await agent.executeToolCall({
      name: 'get_attraction_details',
      input: { contentId: '3436969' }
    });
    
    console.log('Attraction Details:', JSON.stringify(attractionDetails, null, 2));
    console.log('');
    
    // Test 4: Get details for a specific restaurant (using mock contentId)
    console.log('🍽️ Test 4: Getting restaurant details...');
    const restaurantDetails = await agent.executeToolCall({
      name: 'get_restaurant_details',
      input: { contentId: '27717696' }
    });
    
    console.log('Restaurant Details:', JSON.stringify(restaurantDetails, null, 2));
    console.log('');
    
    // Test 5: Full agent request with attraction search
    console.log('🤖 Test 5: Full agent request for attractions...');
    const agentRequest = await agent.processRequest({
      message: "I'm planning a trip to Paris. Can you find some popular attractions and restaurants for me?",
      userId: 'test_user',
      sessionId: 'test_session_' + Date.now()
    });
    
    console.log('Agent Response:', JSON.stringify(agentRequest, null, 2));
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testTripAdvisorIntegration();
}

module.exports = { testTripAdvisorIntegration };
