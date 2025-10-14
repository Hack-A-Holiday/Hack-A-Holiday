const https = require('https');

// API endpoint from deployment
const API_URL = 'https://2kojttfgyb.execute-api.us-east-1.amazonaws.com/dev';

// Test data for Mumbai
const testData = {
  destination: 'mumbai',
  budget: 1500,
  duration: 3,
  interests: ['culture', 'food', 'history'],
  startDate: '2024-01-15',
  travelers: 2,
  travelStyle: 'mid-range'
};

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
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
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testMumbaiItinerary() {
  console.log('🚀 Testing AI-powered Mumbai itinerary generation...');
  console.log('Request data:', JSON.stringify(testData, null, 2));
  
  try {
    const result = await makeRequest(testData);
    
    console.log('\n✅ Response Status:', result.statusCode);
    console.log('\n📋 Mumbai Itinerary Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    // Check if response contains Mumbai-specific content
    const responseStr = JSON.stringify(result.data).toLowerCase();
    
    console.log('\n🔍 Mumbai-specific content check:');
    const mumbaiKeywords = ['mumbai', 'bollywood', 'marine drive', 'gateway of india', 'colaba', 'bandra'];
    const foundKeywords = mumbaiKeywords.filter(keyword => responseStr.includes(keyword));
    
    if (foundKeywords.length > 0) {
      console.log('✅ Mumbai-specific content found:', foundKeywords);
    } else {
      console.log('❌ No Mumbai-specific content found - checking for generic content...');
    }
    
    // Check if it's still returning Morocco data (old hardcoded behavior)
    const moroccoKeywords = ['marrakech', 'morocco', 'jemaa', 'medina', 'atlas'];
    const foundMoroccoKeywords = moroccoKeywords.filter(keyword => responseStr.includes(keyword));
    
    if (foundMoroccoKeywords.length > 0) {
      console.log('❌ Still returning Morocco data:', foundMoroccoKeywords);
      console.log('⚠️  AI integration may not be working properly');
    } else {
      console.log('✅ No Morocco data found - AI is generating location-specific content');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMumbaiItinerary();