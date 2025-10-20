// Test script to verify passenger validation is working
const IntegratedAITravelAgent = require('./backend_test/services/IntegratedAITravelAgent');

async function testPassengerValidation() {
  console.log('🧪 Testing passenger validation...');
  
  const agent = new IntegratedAITravelAgent();
  
  // Test case 1: Message with explicit passenger count (should NOT trigger validation)
  const messageWithPassengers = "I want flights from mumbai to japan for 2 travelers on 2025-10-19";
  
  // Test case 2: Message without passenger count (SHOULD trigger validation)
  const messageWithoutPassengers = "I want flights from mumbai to japan on 2025-10-19";
  
  // Test case 3: User's actual message (has "Number of travelers: 2")
  const userActualMessage = `I want to plan a trip with the following details:
•Traveling from: mumbai
•Destination: japan  
•Duration: 5 days
•Budget: $2000
•Number of travelers: 2
•Start date: 2025-10-19
•Travel style: mid-range
•Interests: culture, food

Please help me create a detailed itinerary for this trip from mumbai to japan.`;
  
  try {
    console.log('\n--- Test 1: Message WITH explicit passenger count ---');
    console.log('Input:', messageWithPassengers);
    
    const flightInfo1 = agent.extractFlightInfo(messageWithPassengers);
    console.log('Flight extraction result:', JSON.stringify(flightInfo1, null, 2));
    
    console.log('\n--- Test 2: Message WITHOUT passenger count ---');
    console.log('Input:', messageWithoutPassengers);
    
    const flightInfo2 = agent.extractFlightInfo(messageWithoutPassengers);
    console.log('Flight extraction result:', JSON.stringify(flightInfo2, null, 2));
    
    console.log('\n--- Test 3: User actual message ---');
    console.log('Input:', userActualMessage.substring(0, 100) + '...');
    
    const flightInfo3 = agent.extractFlightInfo(userActualMessage);
    console.log('Flight extraction result:', JSON.stringify(flightInfo3, null, 2));
    
    console.log('\n--- Test 4: fetchFlightData validation ---');
    
    // Test fetchFlightData with missing passengers
    const extractedInfoMissingPassengers = {
      origin: 'Mumbai',
      destination: 'Japan',
      departureDate: '2025-10-19'
      // No passengers field
    };
    
    const result1 = await agent.fetchFlightData(extractedInfoMissingPassengers, {});
    console.log('fetchFlightData with missing passengers:', JSON.stringify(result1, null, 2));
    
    // Test fetchFlightData with passengers object
    const extractedInfoWithPassengers = {
      origin: 'Mumbai', 
      destination: 'Japan',
      departureDate: '2025-10-19',
      passengers: { adults: 2, children: 0, infants: 0 }
    };
    
    const result2 = await agent.fetchFlightData(extractedInfoWithPassengers, {});
    console.log('fetchFlightData with passengers object:', JSON.stringify(result2, null, 2));
    
    // Test fetchFlightData with passengers number (legacy format)
    const extractedInfoWithPassengersNumber = {
      origin: 'Mumbai', 
      destination: 'Japan',
      departureDate: '2025-10-19',
      passengers: 2
    };
    
    const result3 = await agent.fetchFlightData(extractedInfoWithPassengersNumber, {});
    console.log('fetchFlightData with passengers number:', JSON.stringify(result3, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testPassengerValidation();