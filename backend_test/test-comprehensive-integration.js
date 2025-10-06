/**
 * Comprehensive Integration Test
 * Tests the complete AI-powered travel assistant backend
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Test user context
const testUserContext = {
  sessionId: 'test-session-123',
  userId: 'test-user-456',
  preferences: {
    budget: 'medium',
    travelStyle: 'adventure',
    interests: ['hiking', 'culture', 'food'],
    flightPreferences: {
      preferDirect: true,
      timePreference: 'morning',
      cabinClass: 'economy'
    },
    destinations: ['Tokyo', 'Iceland']
  }
};

const testChatHistory = [
  { role: 'user', content: 'I want to plan an adventure trip to Japan' },
  { role: 'assistant', content: 'Great! Japan has amazing hiking and cultural experiences.' },
  { role: 'user', content: 'I prefer morning flights and have a medium budget' },
  { role: 'assistant', content: 'Perfect! I can help you find flights that match your preferences.' }
];

/**
 * Test Flight Search Functionality
 */
async function testFlightSearch() {
  console.log('\n🧪 Testing Flight Search...');
  
  try {
    const response = await axios.post(`${BASE_URL}/flights/search`, {
      from: 'NYC',
      to: 'NRT',
      departure: '2024-02-15',
      return: '2024-02-25',
      passengers: 1,
      userContext: testUserContext,
      chatHistory: testChatHistory
    });
    
    console.log('✅ Flight search successful');
    console.log(`Found ${response.data.flights?.length || 0} flights`);
    
    if (response.data.personalizedRecommendations) {
      console.log(`📊 Personalized recommendations: ${response.data.personalizedRecommendations.length}`);
    }
    
    if (response.data.aiInsights) {
      console.log(`🤖 AI insights: ${response.data.aiInsights.preferenceMatch || 'N/A'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Flight search failed:', error.message);
    return false;
  }
}

/**
 * Test Flight Recommendations
 */
async function testFlightRecommendations() {
  console.log('\n🧪 Testing Flight Recommendations...');
  
  try {
    const response = await axios.post(`${BASE_URL}/flights/recommendations`, {
      userContext: testUserContext,
      chatHistory: testChatHistory,
      preferences: testUserContext.preferences,
      destination: 'Tokyo',
      budget: 'medium'
    });
    
    console.log('✅ Flight recommendations successful');
    console.log(`Found ${response.data.recommendations?.length || 0} recommendations`);
    
    if (response.data.personalizedInsights) {
      console.log(`🎯 Personalized insights available`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Flight recommendations failed:', error.message);
    return false;
  }
}

/**
 * Test AI Agent Chat
 */
async function testAIAgentChat() {
  console.log('\n🧪 Testing AI Agent Chat...');
  
  try {
    const response = await axios.post(`${BASE_URL}/ai-agent/chat`, {
      message: 'I want to plan a hiking trip to Iceland with morning flights',
      userContext: testUserContext,
      chatHistory: testChatHistory
    });
    
    console.log('✅ AI agent chat successful');
    console.log(`Response: ${response.data.response?.substring(0, 100)}...`);
    
    if (response.data.updatedPreferences) {
      console.log(`🔄 Preferences updated based on conversation`);
    }
    
    if (response.data.travelRecommendations) {
      console.log(`🗺️ Travel recommendations: ${response.data.travelRecommendations.length}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ AI agent chat failed:', error.message);
    return false;
  }
}

/**
 * Test Conversation Analysis
 */
async function testConversationAnalysis() {
  console.log('\n🧪 Testing Conversation Analysis...');
  
  try {
    const response = await axios.post(`${BASE_URL}/ai-agent/analysis`, {
      sessionId: testUserContext.sessionId,
      chatHistory: testChatHistory,
      userContext: testUserContext
    });
    
    console.log('✅ Conversation analysis successful');
    
    if (response.data.conversationAnalysis) {
      const analysis = response.data.conversationAnalysis;
      console.log(`🧠 Travel intent: ${analysis.travelIntent?.destination || 'N/A'}`);
      console.log(`💰 Budget analysis: ${analysis.travelIntent?.budget || 'N/A'}`);
      console.log(`🎯 Personalization level: ${analysis.personalizationLevel || 0}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Conversation analysis failed:', error.message);
    return false;
  }
}

/**
 * Test Smart Suggestions
 */
async function testSmartSuggestions() {
  console.log('\n🧪 Testing Smart Suggestions...');
  
  try {
    const response = await axios.post(`${BASE_URL}/ai-agent/smart-suggestions`, {
      userContext: testUserContext,
      currentContext: {
        lookingFor: 'adventure travel',
        timeframe: 'next month'
      },
      sessionId: testUserContext.sessionId
    });
    
    console.log('✅ Smart suggestions successful');
    
    if (response.data.suggestions) {
      console.log(`💡 Suggestions: ${response.data.suggestions.length}`);
      response.data.suggestions.slice(0, 2).forEach((suggestion, i) => {
        console.log(`  ${i + 1}. ${suggestion.title}: ${suggestion.description.substring(0, 50)}...`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Smart suggestions failed:', error.message);
    return false;
  }
}

/**
 * Test Destination Recommendations
 */
async function testDestinationRecommendations() {
  console.log('\n🧪 Testing Destination Recommendations...');
  
  try {
    const response = await axios.post(`${BASE_URL}/ai-agent/recommendations`, {
      userContext: testUserContext,
      preferences: testUserContext.preferences,
      chatHistory: testChatHistory
    });
    
    console.log('✅ Destination recommendations successful');
    
    if (response.data.destinations) {
      console.log(`🌍 Recommended destinations: ${response.data.destinations.length}`);
      response.data.destinations.slice(0, 3).forEach((dest, i) => {
        console.log(`  ${i + 1}. ${dest.name} (Score: ${dest.score})`);
      });
    }
    
    if (response.data.flightRecommendations) {
      console.log(`✈️ Flight recommendations: ${response.data.flightRecommendations.length}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Destination recommendations failed:', error.message);
    return false;
  }
}

/**
 * Test Preferences Update
 */
async function testPreferencesUpdate() {
  console.log('\n🧪 Testing Preferences Update...');
  
  try {
    const newPreferences = {
      budget: 'high',
      travelStyle: 'luxury',
      interests: ['spa', 'fine-dining', 'culture']
    };
    
    const response = await axios.post(`${BASE_URL}/ai-agent/preferences`, {
      sessionId: testUserContext.sessionId,
      preferences: newPreferences,
      userContext: testUserContext
    });
    
    console.log('✅ Preferences update successful');
    console.log(`🔄 Updated preferences for user: ${testUserContext.sessionId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Preferences update failed:', error.message);
    return false;
  }
}

/**
 * Test Health Check
 */
async function testHealthCheck() {
  console.log('\n🧪 Testing Health Check...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check successful');
    console.log(`📊 Status: ${response.data.status}`);
    console.log(`⚡ Services: ${Object.keys(response.data.services || {}).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

/**
 * Run All Tests
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Integration Tests...');
  console.log(`📍 Backend URL: ${BASE_URL}`);
  
  const tests = [
    { name: 'Health Check', test: testHealthCheck },
    { name: 'Flight Search', test: testFlightSearch },
    { name: 'Flight Recommendations', test: testFlightRecommendations },
    { name: 'AI Agent Chat', test: testAIAgentChat },
    { name: 'Conversation Analysis', test: testConversationAnalysis },
    { name: 'Smart Suggestions', test: testSmartSuggestions },
    { name: 'Destination Recommendations', test: testDestinationRecommendations },
    { name: 'Preferences Update', test: testPreferencesUpdate }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const success = await test();
      results.push({ name, success });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`💥 Test "${name}" crashed:`, error.message);
      results.push({ name, success: false });
    }
  }
  
  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(({ name, success }) => {
    console.log(`${success ? '✅' : '❌'} ${name}`);
  });
  
  console.log(`\n🎯 Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your comprehensive AI travel assistant is ready! 🚀');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
}

/**
 * Test Individual Endpoint
 */
async function testIndividualEndpoint(endpoint) {
  const testMap = {
    'health': testHealthCheck,
    'flights': testFlightSearch,
    'recommendations': testFlightRecommendations,
    'chat': testAIAgentChat,
    'analysis': testConversationAnalysis,
    'suggestions': testSmartSuggestions,
    'destinations': testDestinationRecommendations,
    'preferences': testPreferencesUpdate
  };
  
  const test = testMap[endpoint];
  if (test) {
    console.log(`🧪 Testing individual endpoint: ${endpoint}`);
    await test();
  } else {
    console.log(`❌ Unknown endpoint: ${endpoint}`);
    console.log(`Available endpoints: ${Object.keys(testMap).join(', ')}`);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Test specific endpoint
    testIndividualEndpoint(args[0]);
  } else {
    // Run all tests
    runAllTests();
  }
}

module.exports = {
  runAllTests,
  testIndividualEndpoint,
  tests: {
    testHealthCheck,
    testFlightSearch,
    testFlightRecommendations,
    testAIAgentChat,
    testConversationAnalysis,
    testSmartSuggestions,
    testDestinationRecommendations,
    testPreferencesUpdate
  }
};