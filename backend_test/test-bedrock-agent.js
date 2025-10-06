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

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log('\n🏥 Test 1: Bedrock Agent Health Check');
  console.log('━'.repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/bedrock-agent/health`);
    
    console.log('✅ Health check successful');
    console.log('Status:', response.data.status);
    console.log('Tools available:', response.data.tools);
    console.log('Active sessions:', response.data.activeSessions);
    console.log('Capabilities:', JSON.stringify(response.data.capabilities, null, 2));
    console.log('Models:', JSON.stringify(response.data.models, null, 2));
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Get Available Tools
 */
async function testGetTools() {
  console.log('\n🔧 Test 2: Get Available Tools');
  console.log('━'.repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/bedrock-agent/tools`);
    
    console.log('✅ Tools retrieved successfully');
    console.log(`Total tools: ${response.data.totalTools}`);
    
    response.data.tools.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name}`);
      console.log(`   Description: ${tool.description}`);
      console.log(`   Required params: ${JSON.stringify(tool.inputSchema.required || [])}`);
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Get tools failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Simple Chat Message
 */
async function testSimpleChat() {
  console.log('\n💬 Test 3: Simple Chat Message');
  console.log('━'.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/chat`, {
      message: 'I want to plan a trip to Paris for 5 days. What should I know?',
      userId: testUser.userId,
      sessionId: testUser.sessionId
    });
    
    console.log('✅ Chat successful');
    console.log('Agent response:', response.data.message);
    console.log('Tools used:', response.data.toolsUsed);
    console.log('Session ID:', response.data.sessionId);
    console.log('Reasoning:', response.data.reasoning);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Chat failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Flight Search Tool
 */
async function testFlightSearch() {
  console.log('\n✈️ Test 4: Flight Search Tool');
  console.log('━'.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/tool/search_flights`, {
      origin: 'NYC',
      destination: 'PAR',
      departDate: '2025-06-15',
      returnDate: '2025-06-22',
      passengers: 2,
      cabinClass: 'economy'
    });
    
    console.log('✅ Flight search successful');
    console.log('Flights found:', response.data.result.flights.length);
    
    response.data.result.flights.slice(0, 3).forEach((flight, index) => {
      console.log(`\nFlight ${index + 1}:`);
      console.log(`  Airline: ${flight.airline}`);
      console.log(`  Price: $${Math.round(flight.price)}`);
      console.log(`  Duration: ${flight.duration}`);
      console.log(`  Stops: ${flight.stops}`);
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Flight search failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Destination Info Tool
 */
async function testDestinationInfo() {
  console.log('\n🌍 Test 5: Destination Info Tool');
  console.log('━'.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/tool/get_destination_info`, {
      destination: 'Tokyo',
      travelDate: '2025-07-01'
    });
    
    console.log('✅ Destination info retrieved');
    const info = response.data.result;
    console.log('Name:', info.name);
    console.log('Best time to visit:', info.bestTime);
    console.log('Weather:', info.weather);
    console.log('Top attractions:', info.attractions?.join(', '));
    console.log('Currency:', info.currency);
    console.log('Travel tips:', info.tips?.slice(0, 3).join(', '));
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Destination info failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 6: Budget Calculator Tool
 */
async function testBudgetCalculator() {
  console.log('\n💰 Test 6: Budget Calculator Tool');
  console.log('━'.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/tool/calculate_trip_budget`, {
      destination: 'Paris',
      duration: 7,
      travelers: 2,
      travelStyle: 'moderate'
    });
    
    console.log('✅ Budget calculated');
    const budget = response.data.result;
    console.log('Total budget:', `$${budget.total}`);
    console.log('Per person:', `$${budget.perPerson}`);
    console.log('\nBreakdown:');
    console.log('  Flights:', `$${budget.breakdown.flights}`);
    console.log('  Hotels:', `$${budget.breakdown.accommodation}`);
    console.log('  Daily expenses:', `$${budget.breakdown.dailyExpenses}`);
    console.log('Travel style:', budget.travelStyle);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Budget calculation failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 7: Autonomous Trip Planning
 */
async function testAutonomousTripPlanning() {
  console.log('\n🤖 Test 7: Autonomous Trip Planning');
  console.log('━'.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/plan-trip`, {
      destination: 'Tokyo, Japan',
      duration: 5,
      budget: 'moderate',
      interests: ['culture', 'food', 'technology'],
      travelers: 2,
      startDate: '2025-07-15',
      userId: testUser.userId
    });
    
    console.log('✅ Trip planning successful');
    console.log('Session ID:', response.data.sessionId);
    console.log('Tools used:', response.data.toolsUsed?.join(', '));
    console.log('Confidence:', response.data.confidence);
    console.log('\nExecution Plan:');
    console.log('  Intent:', response.data.executionPlan?.intent);
    console.log('  Steps:', response.data.executionPlan?.steps?.length);
    console.log('\nTrip Plan Preview:');
    console.log(response.data.tripPlan?.substring(0, 500) + '...');
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Trip planning failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test 8: Multi-turn Conversation
 */
async function testMultiTurnConversation() {
  console.log('\n🔄 Test 8: Multi-turn Conversation');
  console.log('━'.repeat(50));

  const sessionId = `multi_turn_${Date.now()}`;
  
  try {
    // Message 1
    console.log('\n📨 Message 1: "I want to visit Europe"');
    const response1 = await axios.post(`${BASE_URL}/bedrock-agent/chat`, {
      message: 'I want to visit Europe',
      userId: testUser.userId,
      sessionId: sessionId
    });
    console.log('Agent:', response1.data.message.substring(0, 200) + '...');
    
    // Message 2
    console.log('\n📨 Message 2: "What about Paris?"');
    const response2 = await axios.post(`${BASE_URL}/bedrock-agent/chat`, {
      message: 'What about Paris?',
      userId: testUser.userId,
      sessionId: sessionId
    });
    console.log('Agent:', response2.data.message.substring(0, 200) + '...');
    
    // Message 3
    console.log('\n📨 Message 3: "Show me flight options"');
    const response3 = await axios.post(`${BASE_URL}/bedrock-agent/chat`, {
      message: 'Show me flight options from New York in June',
      userId: testUser.userId,
      sessionId: sessionId
    });
    console.log('Agent:', response3.data.message.substring(0, 200) + '...');
    console.log('Tools used:', response3.data.toolsUsed);
    
    console.log('\n✅ Multi-turn conversation successful');
    console.log('Total conversation length:', response3.data.conversationLength);
    
    return { success: true, data: { sessionId, turns: 3 } };
  } catch (error) {
    console.error('❌ Multi-turn conversation failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 9: Recommendations
 */
async function testRecommendations() {
  console.log('\n💡 Test 9: Personalized Recommendations');
  console.log('━'.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/recommend`, {
      type: 'destination',
      preferences: {
        interests: ['beaches', 'history', 'food'],
        budget: 'moderate',
        climate: 'warm'
      },
      userId: testUser.userId,
      context: {
        duration: 7,
        travelers: 2
      }
    });
    
    console.log('✅ Recommendations generated');
    console.log('Confidence:', response.data.confidence);
    console.log('Tools used:', response.data.toolsUsed);
    console.log('\nRecommendations:');
    console.log(response.data.recommendations.substring(0, 400) + '...');
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Recommendations failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 10: User Preferences Management
 */
async function testUserPreferences() {
  console.log('\n👤 Test 10: User Preferences Management');
  console.log('━'.repeat(50));

  try {
    // Save preferences
    console.log('Saving user preferences...');
    await axios.post(`${BASE_URL}/bedrock-agent/tool/save_user_preferences`, {
      userId: testUser.userId,
      preferences: {
        travelStyle: 'adventure',
        interests: ['hiking', 'photography', 'local_cuisine'],
        budget: 'moderate',
        preferredAirlines: ['Delta', 'United'],
        dietaryRestrictions: ['vegetarian']
      }
    });
    
    // Get preferences
    console.log('Retrieving user preferences...');
    const response = await axios.post(`${BASE_URL}/bedrock-agent/tool/get_user_preferences`, {
      userId: testUser.userId
    });
    
    console.log('✅ Preferences managed successfully');
    console.log('User ID:', response.data.result.userId);
    console.log('Preferences:', JSON.stringify(response.data.result.preferences, null, 2));
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Preferences management failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   BEDROCK AGENT CORE - INTEGRATION TESTS      ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\nTesting against: ${BASE_URL}`);
  console.log('Time:', new Date().toISOString());
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Get Available Tools', fn: testGetTools },
    { name: 'Simple Chat', fn: testSimpleChat },
    { name: 'Flight Search Tool', fn: testFlightSearch },
    { name: 'Destination Info Tool', fn: testDestinationInfo },
    { name: 'Budget Calculator Tool', fn: testBudgetCalculator },
    { name: 'Autonomous Trip Planning', fn: testAutonomousTripPlanning },
    { name: 'Multi-turn Conversation', fn: testMultiTurnConversation },
    { name: 'Personalized Recommendations', fn: testRecommendations },
    { name: 'User Preferences Management', fn: testUserPreferences }
  ];

  const results = {
    passed: 0,
    failed: 0,
    total: tests.length,
    details: []
  };

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result.success) {
        results.passed++;
        results.details.push({ name: test.name, status: 'PASSED' });
      } else {
        results.failed++;
        results.details.push({ name: test.name, status: 'FAILED', error: result.error });
      }
    } catch (error) {
      results.failed++;
      results.details.push({ name: test.name, status: 'ERROR', error: error.message });
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\nTotal Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  console.log('\nDetailed Results:');
  results.details.forEach((detail, index) => {
    const icon = detail.status === 'PASSED' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${detail.name} - ${detail.status}`);
    if (detail.error) {
      console.log(`   Error: ${detail.error}`);
    }
  });

  console.log('\n' + '═'.repeat(50));
  console.log('Tests completed at:', new Date().toISOString());
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testGetTools,
  testSimpleChat,
  testFlightSearch,
  testDestinationInfo,
  testBudgetCalculator,
  testAutonomousTripPlanning,
  testMultiTurnConversation,
  testRecommendations,
  testUserPreferences
};
