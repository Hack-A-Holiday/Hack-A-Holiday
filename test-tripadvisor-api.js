/**
 * Direct test of TripAdvisor RapidAPI endpoints
 */

const axios = require('axios');

async function testTripAdvisorAPI() {
  console.log('🧪 Testing TripAdvisor RapidAPI directly\n');
  
  const apiKey = '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20';
  const baseUrl = 'https://tripadvisor-com1.p.rapidapi.com';
  const headers = {
    'x-rapidapi-host': 'tripadvisor-com1.p.rapidapi.com',
    'x-rapidapi-key': apiKey
  };

  try {
    // Test 1: Search attractions in Paris (geoId: 1954828)
    console.log('🏛️ Test 1: Searching attractions in Paris (geoId: 1954828)...');
    const attractionsResponse = await axios.get(`${baseUrl}/attractions/search`, {
      headers: headers,
      params: {
        geoId: '1954828',
        units: 'miles',
        sortType: 'asc'
      }
    });
    
    console.log('✅ Attractions API Response:');
    console.log(JSON.stringify(attractionsResponse.data, null, 2));
    console.log('');

    // Test 2: Search restaurants in Paris
    console.log('🍽️ Test 2: Searching restaurants in Paris (geoId: 1954828)...');
    const restaurantsResponse = await axios.get(`${baseUrl}/restaurants/search`, {
      headers: headers,
      params: {
        geoId: '1954828',
        units: 'miles',
        sortType: 'asc'
      }
    });
    
    console.log('✅ Restaurants API Response:');
    console.log(JSON.stringify(restaurantsResponse.data, null, 2));
    console.log('');

    // Test 3: Get attraction details (Eiffel Tower)
    console.log('🏛️ Test 3: Getting attraction details (Eiffel Tower - contentId: 3436969)...');
    const attractionDetailsResponse = await axios.get(`${baseUrl}/attractions/details`, {
      headers: headers,
      params: {
        contentId: '3436969',
        units: 'miles'
      }
    });
    
    console.log('✅ Attraction Details API Response:');
    console.log(JSON.stringify(attractionDetailsResponse.data, null, 2));
    console.log('');

    // Test 4: Get restaurant details
    console.log('🍽️ Test 4: Getting restaurant details (contentId: 27717696)...');
    const restaurantDetailsResponse = await axios.get(`${baseUrl}/restaurants/details`, {
      headers: headers,
      params: {
        contentId: '27717696',
        units: 'miles'
      }
    });
    
    console.log('✅ Restaurant Details API Response:');
    console.log(JSON.stringify(restaurantDetailsResponse.data, null, 2));
    console.log('');

    console.log('✅ All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
if (require.main === module) {
  testTripAdvisorAPI();
}

module.exports = { testTripAdvisorAPI };
