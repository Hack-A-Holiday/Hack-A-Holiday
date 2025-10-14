// Test script for user preferences system
// Run with: node test-preferences.js

const IntegratedAITravelAgent = require('./services/IntegratedAITravelAgent');

async function testPreferences() {
  const agent = new IntegratedAITravelAgent();
  const sessionId = 'test-session-' + Date.now();
  
  console.log('\n🧪 Testing User Preferences System\n');
  console.log('=' .repeat(60));
  
  // Test 1: Extract flight preferences
  console.log('\n📋 Test 1: Extract Flight Preferences');
  console.log('-'.repeat(60));
  
  const flightMessage = "I'm from Mumbai. I prefer business class flights on Emirates or Qatar Airways. I only want direct flights in the morning. Window seat please, and I need vegetarian meals.";
  
  const context1 = agent.getUserContext(sessionId);
  const prefs1 = agent.extractPreferencesFromMessage(flightMessage, context1);
  agent.updateUserContext(sessionId, prefs1);
  
  const updatedContext1 = agent.getUserContext(sessionId);
  console.log('\n✅ Extracted Preferences:');
  console.log(JSON.stringify(updatedContext1.preferences, null, 2));
  
  // Test 2: Extract hotel preferences
  console.log('\n\n📋 Test 2: Extract Hotel Preferences');
  console.log('-'.repeat(60));
  
  const hotelMessage = "I want 5-star hotels with pool, gym, and spa. I prefer Marriott or Hilton. Ocean view is a must. My budget is $300 per night. I need a suite room.";
  
  const prefs2 = agent.extractPreferencesFromMessage(hotelMessage, updatedContext1);
  agent.updateUserContext(sessionId, prefs2);
  
  const updatedContext2 = agent.getUserContext(sessionId);
  console.log('\n✅ Extracted Preferences:');
  console.log(JSON.stringify(updatedContext2.preferences.hotelPreferences, null, 2));
  
  // Test 3: Check merged preferences
  console.log('\n\n📋 Test 3: Check All Merged Preferences');
  console.log('-'.repeat(60));
  
  const allPrefs = agent.getUserContext(sessionId).preferences;
  console.log('\n✅ Flight Preferences:');
  console.log(JSON.stringify(allPrefs.flightPreferences, null, 2));
  console.log('\n✅ Hotel Preferences:');
  console.log(JSON.stringify(allPrefs.hotelPreferences, null, 2));
  console.log('\n✅ General Preferences:');
  console.log(JSON.stringify({
    homeCity: allPrefs.homeCity,
    travelStyle: allPrefs.travelStyle,
    budget: allPrefs.budget,
    currency: allPrefs.currency
  }, null, 2));
  
  // Test 4: Preference override
  console.log('\n\n📋 Test 4: Preference Override');
  console.log('-'.repeat(60));
  
  const overrideMessage = "Actually, I want to fly economy this time and any stops are fine";
  
  const prefs4 = agent.extractPreferencesFromMessage(overrideMessage, updatedContext2);
  agent.updateUserContext(sessionId, prefs4);
  
  const updatedContext4 = agent.getUserContext(sessionId);
  console.log('\n✅ Updated Flight Preferences:');
  console.log(JSON.stringify(updatedContext4.preferences.flightPreferences, null, 2));
  
  // Test 5: Expected usage in flight search
  console.log('\n\n📋 Test 5: Simulated Flight Search with Preferences');
  console.log('-'.repeat(60));
  
  const userPrefs = updatedContext4.preferences;
  const searchRequest = {
    origin: userPrefs.homeCity || 'Unknown',
    destination: 'Barcelona',
    departureDate: '2025-12-13',
    returnDate: '2025-12-21',
    passengers: {
      adults: 1,
      children: 0,
      infants: 0
    },
    cabinClass: userPrefs.flightPreferences?.preferredCabinClass || 'economy',
    currency: userPrefs.currency || 'USD',
    preferences: userPrefs.flightPreferences || {}
  };
  
  console.log('\n✅ Generated Search Request:');
  console.log(JSON.stringify(searchRequest, null, 2));
  
  // Test 6: Generate preference-aware message
  console.log('\n\n📋 Test 6: Generate Preference-Aware Message');
  console.log('-'.repeat(60));
  
  const fp = userPrefs.flightPreferences;
  const prefParts = [];
  
  if (fp.preferredCabinClass && fp.preferredCabinClass !== 'economy') {
    prefParts.push(`${fp.preferredCabinClass} class`);
  }
  if (fp.maxStops === 0) {
    prefParts.push('direct flights only');
  } else if (fp.maxStops === 1) {
    prefParts.push('max 1 stop');
  }
  if (fp.preferredAirlines && fp.preferredAirlines.length > 0) {
    prefParts.push(`preferred airlines: ${fp.preferredAirlines.slice(0, 2).join(', ')}`);
  }
  if (fp.preferredDepartureTime) {
    prefParts.push(`${fp.preferredDepartureTime} departures`);
  }
  
  let prefMessage = '';
  if (prefParts.length > 0) {
    prefMessage = `Based on your profile preferences (${prefParts.join(', ')}), here are the best matching flight options`;
  } else {
    prefMessage = 'Here are the top flight options';
  }
  
  console.log('\n✅ Preference-Aware Message:');
  console.log(`"${prefMessage} from ${searchRequest.origin} to ${searchRequest.destination}..."`);
  
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ All tests completed successfully!');
  console.log('='.repeat(60) + '\n');
}

// Run tests
testPreferences().catch(console.error);
