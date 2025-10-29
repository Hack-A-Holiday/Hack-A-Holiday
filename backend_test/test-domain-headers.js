/**
 * Test script to verify which domain headers work with TripAdvisor API
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.TRIPADVISOR_API_KEY;
const BASE_URL = 'https://api.content.tripadvisor.com/api/v1';

async function testDomainHeaders() {
  console.log('🧪 Testing TripAdvisor API with different domain headers...\n');

  const domains = [
    'https://hacktravel.vercel.app',
    'https://hack-a-holiday-backend.onrender.com',
    'http://localhost:4000',
    'http://localhost:3000'
  ];

  for (const domain of domains) {
    console.log(`🔍 Testing with domain: ${domain}`);
    
    try {
      const response = await axios.get(`${BASE_URL}/location/search`, {
        params: {
          key: API_KEY,
          searchQuery: 'test',
          limit: 1
        },
        headers: {
          'Origin': domain,
          'Referer': domain,
          'User-Agent': 'Hack-A-Holiday/1.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`   ✅ SUCCESS: Status ${response.status}`);
      console.log(`   📊 Results: ${response.data?.data?.length || 0}`);
      console.log(`   🎯 This domain works!\n`);
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.response?.status || 'Network Error'}`);
      console.log(`   💬 Message: ${error.response?.data?.Message || error.message}`);
      console.log(`   🚫 This domain is blocked\n`);
    }
  }

  console.log('🔍 Testing without Origin/Referer headers...');
  try {
    const response = await axios.get(`${BASE_URL}/location/search`, {
      params: {
        key: API_KEY,
        searchQuery: 'test',
        limit: 1
      },
      headers: {
        'User-Agent': 'Hack-A-Holiday/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`   ✅ SUCCESS without domain headers: Status ${response.status}`);
    console.log(`   📊 Results: ${response.data?.data?.length || 0}`);
    
  } catch (error) {
    console.log(`   ❌ FAILED without domain headers: ${error.response?.status || 'Network Error'}`);
    console.log(`   💬 Message: ${error.response?.data?.Message || error.message}`);
  }
}

if (require.main === module) {
  testDomainHeaders();
}

module.exports = { testDomainHeaders };