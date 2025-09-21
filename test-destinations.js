const https = require('https');

// Test different destinations to verify AI is working
const testCases = [
  { destination: 'mumbai', description: 'Mumbai, India' },
  { destination: 'tokyo', description: 'Tokyo, Japan' },
  { destination: 'london', description: 'London, UK' }
];

async function testDestination(destination, description) {
  const testData = {
    destination: destination,
    budget: 1200,
    duration: 3,
    interests: ['culture', 'food'],
    startDate: '2024-01-15',
    travelers: 2,
    travelStyle: 'mid-range'
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: '2kojttfgyb.execute-api.us-east-1.amazonaws.com',
      port: 443,
      path: '/dev/plan-trip',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log(`\n🌍 Testing ${description}:`);
          console.log(`📍 Generated destination: ${response.itinerary.destination}`);
          console.log(`💭 Message: ${response.message}`);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing AI destination generation...\n');
  
  for (const testCase of testCases) {
    try {
      await testDestination(testCase.destination, testCase.description);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between calls
    } catch (error) {
      console.error(`❌ Error testing ${testCase.description}:`, error.message);
    }
  }
  
  console.log('\n✅ All tests completed!');
}

runTests();