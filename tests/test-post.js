// Test POST request to plan-trip endpoint
import fetch from 'node-fetch';

async function testPlanTrip() {
  const apiUrl = 'https://2kojttfgyb.execute-api.us-east-1.amazonaws.com/dev';
  
  const testData = {
    preferences: {
      destination: "Paris, France",
      budget: 1500,
      duration: 3,
      interests: ["museums", "food"],
      startDate: "2025-10-01",
      travelers: 2,
      travelStyle: "mid-range",
      accommodationType: "hotel"
    }
  };

  try {
    console.log('🧪 Testing POST to /plan-trip...');
    
    const response = await fetch(`${apiUrl}/plan-trip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify(testData)
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.text();
      console.log('Response preview:', data.substring(0, 200) + '...');
    } else {
      const error = await response.text();
      console.log('Error response:', error.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testPlanTrip();