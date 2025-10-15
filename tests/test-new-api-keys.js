/**
 * Test script for new RapidAPI keys
 */

const axios = require('axios');

async function testNewAPIKeys() {
  console.log('🧪 Testing new RapidAPI keys\n');
  
  const newApiKey = '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20';
  
  try {
    // Test 1: TripAdvisor API
    console.log('🏛️ Test 1: Testing TripAdvisor API with new key...');
    const tripAdvisorResponse = await axios.get('https://tripadvisor-com1.p.rapidapi.com/attractions/search', {
      headers: {
        'x-rapidapi-host': 'tripadvisor-com1.p.rapidapi.com',
        'x-rapidapi-key': newApiKey
      },
      params: {
        geoId: '1954828', // Paris
        units: 'miles',
        sortType: 'asc'
      }
    });
    
    console.log('✅ TripAdvisor API working with new key');
    console.log(`📊 Found ${tripAdvisorResponse.data.data?.length || 0} attractions\n`);
    
    // Test 2: Kiwi Flights API
    console.log('✈️ Test 2: Testing Kiwi Flights API with new key...');
    const kiwiResponse = await axios.get('https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip', {
      headers: {
        'x-rapidapi-host': 'kiwi-com-cheap-flights.p.rapidapi.com',
        'x-rapidapi-key': newApiKey
      },
      params: {
        source: 'Country:GB',
        destination: 'City:dubrovnik_hr',
        currency: 'usd',
        locale: 'en',
        adults: 1,
        children: 0,
        infants: 0,
        handbags: 1,
        holdbags: 0,
        cabinClass: 'ECONOMY',
        sortBy: 'QUALITY',
        sortOrder: 'ASCENDING',
        limit: 5
      }
    });
    
    console.log('✅ Kiwi Flights API working with new key');
    console.log(`📊 Found ${kiwiResponse.data.data?.length || 0} flights\n`);
    
    // Test 3: Booking.com Car Rentals API
    console.log('🚗 Test 3: Testing Booking.com Car Rentals API with new key...');
    const bookingResponse = await axios.get('https://booking-com15.p.rapidapi.com/api/v1/cars/searchCarRentals', {
      headers: {
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
        'x-rapidapi-key': newApiKey
      },
      params: {
        pick_up_latitude: 40.6397018432617,
        pick_up_longitude: -73.7791976928711,
        drop_off_latitude: 40.6397018432617,
        drop_off_longitude: -73.7791976928711,
        pick_up_time: '10:00',
        drop_off_time: '10:00',
        driver_age: 30,
        currency_code: 'USD',
        location: 'US'
      }
    });
    
    console.log('✅ Booking.com Car Rentals API working with new key');
    console.log(`📊 Found ${bookingResponse.data.data?.length || 0} car rentals\n`);
    
    console.log('🎉 All new API keys are working successfully!');
    
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
  testNewAPIKeys();
}

module.exports = { testNewAPIKeys };
