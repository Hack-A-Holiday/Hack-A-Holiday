// test-nova-pro.js
// Quick test script for Nova Pro migration

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testSimpleChat() {
  console.log('\n🧪 Test 1: Simple Chat (Nova Lite)');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/chat`, {
      message: 'Hello! What can you help me with?'
    });
    
    console.log('✅ Success!');
    console.log(`Model Used: ${response.data.model}`);
    console.log(`Simple Mode: ${response.data.simpleMode}`);
    console.log(`Response: ${response.data.message.substring(0, 200)}...`);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

async function testComplexSearch() {
  console.log('\n🧪 Test 2: Complex Search (Nova Pro)');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/bedrock-agent/chat`, {
      message: 'Find cheap flights from Washington DC to Bali'
    });
    
    console.log('✅ Success!');
    console.log(`Model Used: ${response.data.model}`);
    console.log(`Agent Mode: ${response.data.agentMode}`);
    console.log(`Tools Used: ${response.data.toolsUsed.join(', ')}`);
    console.log(`Response: ${response.data.message.substring(0, 200)}...`);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    return false;
  }
}

async function testGlobeRoute() {
  console.log('\n🧪 Test 3: Globe Route Coordinates');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/globe/route`, {
      source: 'Washington DC',
      destination: 'Bali'
    });
    
    console.log('✅ Success!');
    console.log(`Source: ${response.data.source.name} (${response.data.source.lat}, ${response.data.source.lng})`);
    console.log(`Destination: ${response.data.destination.name} (${response.data.destination.lat}, ${response.data.destination.lng})`);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    return false;
  }
}

async function testGeocode() {
  console.log('\n🧪 Test 4: Single Location Geocoding');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/globe/geocode`, {
      location: 'Tokyo, Japan'
    });
    
    console.log('✅ Success!');
    console.log(`Location: ${response.data.coordinates.name}`);
    console.log(`Coordinates: ${response.data.coordinates.lat}, ${response.data.coordinates.lng}`);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Testing Nova Pro Migration');
  console.log('='.repeat(50));
  console.log('Backend URL:', BASE_URL);
  
  const results = {
    simpleChat: await testSimpleChat(),
    complexSearch: await testComplexSearch(),
    globeRoute: await testGlobeRoute(),
    geocode: await testGeocode()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Simple Chat (Nova Lite): ${results.simpleChat ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Complex Search (Nova Pro): ${results.complexSearch ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Globe Route: ${results.globeRoute ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Geocoding: ${results.geocode ? 'PASSED' : 'FAILED'}`);
  
  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.values(results).length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`TOTAL: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 All tests passed! Nova Pro migration successful!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
