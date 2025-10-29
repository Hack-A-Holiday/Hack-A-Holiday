/**
 * Quick test script to verify TripAdvisor domain restriction fix
 * Run this after deployment to verify the fix is working
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'https://hack-a-holiday-backend.onrender.com';

async function testTripAdvisorFix() {
  console.log('🧪 Testing TripAdvisor Domain Restriction Fix...\n');

  try {
    // Test 1: Domain validation test
    console.log('1️⃣ Testing domain validation...');
    const domainTest = await axios.get(`${BACKEND_URL}/tripadvisor/monitoring/domain-test`);
    console.log(`   ✅ Domain validation: ${domainTest.data.domainValidation.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   📊 Response count: ${domainTest.data.domainValidation.responseCount}`);
    console.log(`   🌐 Domain: ${domainTest.data.domainValidation.domain}\n`);

    // Test 2: Search locations with expected high result count
    console.log('2️⃣ Testing location search quality...');
    const searchTest = await axios.get(`${BACKEND_URL}/tripadvisor/location/search?searchQuery=japan%20attractions&limit=10`);
    console.log(`   📊 Results returned: ${searchTest.data.count}/10`);
    console.log(`   🎯 Quality indicator: ${searchTest.data.qualityIndicator || 'N/A'}`);
    console.log(`   ⚡ Response time: ${searchTest.data.responseTime || 'N/A'}ms`);
    
    if (searchTest.data.count >= 8) {
      console.log('   ✅ HIGH QUALITY: Getting expected number of results!');
    } else if (searchTest.data.count >= 5) {
      console.log('   ⚠️ MODERATE QUALITY: Getting some results but could be better');
    } else {
      console.log('   ❌ LOW QUALITY: Still experiencing domain restriction issues');
    }
    console.log();

    // Test 3: API health check
    console.log('3️⃣ Testing API health...');
    const healthTest = await axios.get(`${BACKEND_URL}/tripadvisor/health`);
    console.log(`   🏥 API Health: ${healthTest.data.apiHealth?.status || 'unknown'}`);
    console.log(`   💬 Message: ${healthTest.data.apiHealth?.message || 'N/A'}`);
    console.log(`   📈 Average quality: ${healthTest.data.apiHealth?.averageQuality || 'N/A'}`);
    console.log();

    // Test 4: Quality monitoring
    console.log('4️⃣ Testing quality monitoring...');
    const qualityTest = await axios.get(`${BACKEND_URL}/tripadvisor/monitoring/quality`);
    console.log(`   📊 Total calls: ${qualityTest.data.metrics.totalCalls}`);
    console.log(`   🎯 Average quality: ${qualityTest.data.metrics.averageQuality}`);
    console.log(`   ⚡ Average response time: ${qualityTest.data.metrics.averageResponseTime}ms`);
    console.log(`   ⚠️ Degraded calls: ${qualityTest.data.metrics.degradedCalls}`);
    console.log();

    // Summary
    console.log('📋 SUMMARY:');
    const isFixed = searchTest.data.count >= 8 && domainTest.data.domainValidation.passed;
    if (isFixed) {
      console.log('   🎉 SUCCESS: TripAdvisor domain restriction fix is working!');
      console.log('   ✅ Getting full results (10 items instead of 1)');
      console.log('   ✅ Domain validation passing');
    } else {
      console.log('   ⚠️ PARTIAL: Fix may need additional configuration');
      console.log('   💡 Check API key domain restrictions in TripAdvisor console');
      console.log('   💡 Verify domains: hacktravel.vercel.app, hack-a-holiday-backend.onrender.com');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testTripAdvisorFix();