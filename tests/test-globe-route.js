// test-globe-route.js
// Test the globe route endpoint with various locations

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:4000';

const testCases = [
  {
    name: 'Major Cities',
    source: 'New York',
    destination: 'London',
    expected: 'Should work instantly'
  },
  {
    name: 'Obscure Locations',
    source: 'Santorini, Greece',
    destination: 'Queenstown, New Zealand',
    expected: 'Nova Pro should geocode both'
  },
  {
    name: 'Landmarks',
    source: 'Eiffel Tower',
    destination: 'Taj Mahal',
    expected: 'Nova Pro should recognize landmarks'
  },
  {
    name: 'Descriptive',
    source: 'Beach resort in Maldives',
    destination: 'Mountain resort in Swiss Alps',
    expected: 'Nova Pro should interpret descriptions'
  },
  {
    name: 'Mixed Format',
    source: 'Mumbai',
    destination: 'Barcelona, Spain',
    expected: 'Should handle different formats'
  }
];

async function testRoute(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Test: ${testCase.name}`);
  console.log(`📍 Source: ${testCase.source}`);
  console.log(`📍 Destination: ${testCase.destination}`);
  console.log(`💡 Expected: ${testCase.expected}`);
  console.log('⏳ Testing...\n');

  const startTime = Date.now();

  try {
    const response = await axios.post(`${API_URL}/globe/route`, {
      source: testCase.source,
      destination: testCase.destination
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (response.data.success) {
      console.log(`✅ SUCCESS (${duration}s)`);
      console.log('\n📊 Results:');
      console.log(`   Source: ${response.data.route.source.name}`);
      console.log(`   Coordinates: ${response.data.route.source.lat.toFixed(4)}°, ${response.data.route.source.lng.toFixed(4)}°`);
      console.log(`   Destination: ${response.data.route.destination.name}`);
      console.log(`   Coordinates: ${response.data.route.destination.lat.toFixed(4)}°, ${response.data.route.destination.lng.toFixed(4)}°`);
      
      // Calculate distance (rough estimation)
      const distance = calculateDistance(
        response.data.route.source.lat,
        response.data.route.source.lng,
        response.data.route.destination.lat,
        response.data.route.destination.lng
      );
      console.log(`   Distance: ~${distance.toFixed(0)} km`);
      
      return true;
    } else {
      console.log(`❌ FAILED: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ ERROR (${duration}s): ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    return false;
  }
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function runAllTests() {
  console.log('\n🌍 Globe Route Geocoding Tests');
  console.log('================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Model: Nova Pro (us.amazon.nova-pro-v1:0)`);
  console.log(`Tests: ${testCases.length}\n`);

  const results = [];
  
  for (const testCase of testCases) {
    const success = await testRoute(testCase);
    results.push({ name: testCase.name, success });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Test Summary:');
  console.log(`${'='.repeat(60)}\n`);

  let passed = 0;
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.success) passed++;
  });

  console.log(`\n📈 Results: ${passed}/${results.length} tests passed`);
  console.log(`${'='.repeat(60)}\n`);

  if (passed === results.length) {
    console.log('🎉 All tests passed! Globe route geocoding is working perfectly!');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
