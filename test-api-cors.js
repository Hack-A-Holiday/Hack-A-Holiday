// Quick test to verify the API endpoint is working
import fetch from 'node-fetch';

async function testAPI() {
  console.log('🔍 Testing API endpoint...');
  
  const apiUrl = 'https://2kojttfgyb.execute-api.us-east-1.amazonaws.com/dev';
  
  try {
    // Test the health endpoint first
    console.log('Testing health endpoint...');
    const healthResponse = await fetch(`${apiUrl}/health`);
    console.log('Health status:', healthResponse.status);
    const healthData = await healthResponse.text();
    console.log('Health response:', healthData);
    
    // Test OPTIONS request for CORS
    console.log('\nTesting CORS preflight...');
    const corsResponse = await fetch(`${apiUrl}/plan-trip`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('CORS status:', corsResponse.status);
    console.log('CORS headers:');
    corsResponse.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testAPI();