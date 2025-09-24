#!/usr/bin/env node

// 🛫 Real Flight Data Test
// This script demonstrates your working Kiwi API with real flight data

const https = require('https');

const RAPIDAPI_KEY = 'dc260b79a1mshf60901d122bb384p183ba0jsn9093522cbb9b';

async function testKiwiAPI() {
  console.log('🛫 Testing Kiwi.com Flight API with Real Data');
  console.log('==============================================');
  console.log('');

  const options = {
    hostname: 'kiwi-com-cheap-flights.p.rapidapi.com',
    path: '/round-trip?source=City%3AJFK&destination=City%3ACDG&currency=usd&locale=en&adults=1&children=0&infants=0&handbags=1&holdbags=0&cabinClass=ECONOMY&sortBy=QUALITY&sortOrder=ASCENDING&limit=5',
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'kiwi-com-cheap-flights.p.rapidapi.com',
      'x-rapidapi-key': RAPIDAPI_KEY
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.itineraries && response.itineraries.length > 0) {
            console.log('✅ SUCCESS! Real flight data received:');
            console.log('');
            
            response.itineraries.slice(0, 3).forEach((flight, index) => {
              const outbound = flight.outbound.sectorSegments[0].segment;
              const price = flight.price.amount;
              const airline = outbound.carrier.name;
              const flightNumber = outbound.code;
              const departure = outbound.source.station.code;
              const arrival = outbound.destination.station.code;
              const departureTime = new Date(outbound.source.localTime).toLocaleTimeString();
              const arrivalTime = new Date(outbound.destination.localTime).toLocaleTimeString();
              
              console.log(`✈️  Flight ${index + 1}:`);
              console.log(`   Airline: ${airline}`);
              console.log(`   Flight: ${flightNumber}`);
              console.log(`   Route: ${departure} → ${arrival}`);
              console.log(`   Time: ${departureTime} → ${arrivalTime}`);
              console.log(`   Price: $${price}`);
              console.log(`   Baggage: ${flight.bagsInfo.includedHandBags} carry-on, ${flight.bagsInfo.includedCheckedBags} checked`);
              console.log('');
            });
            
            console.log('🎉 This is REAL flight data, not mock data!');
            console.log('   - Actual airline schedules');
            console.log('   - Real-time pricing');
            console.log('   - Live availability');
            console.log('   - Detailed flight information');
            console.log('');
            console.log('🚀 Your Kiwi API is working perfectly!');
            console.log('   Ready to integrate with your frontend!');
            
          } else {
            console.log('❌ No flight data received');
          }
          
          resolve(response);
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

// Run the test
testKiwiAPI().catch(console.error);
