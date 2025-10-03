#!/usr/bin/env node

/**
 * Debug Script for API Connection Issues
 * Run this to diagnose HTTPS/HTTP connection problems
 */

console.log('🔍 Debugging API Connection Issues...\n');

// 1. Check environment variables
console.log('📋 Environment Variables:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

// 2. Test HTTP connection to localhost:4000
const http = require('http');
const https = require('https');

async function testConnection(url, protocol = 'http') {
  return new Promise((resolve) => {
    const client = protocol === 'https' ? https : http;
    const req = client.get(url, (res) => {
      console.log(`✅ ${protocol.toUpperCase()} connection successful to ${url}`);
      console.log(`   Status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${protocol.toUpperCase()} connection failed to ${url}`);
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏱️  ${protocol.toUpperCase()} connection timeout to ${url}`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('\n🧪 Testing Connections:');
  
  // Test HTTP localhost:4000
  await testConnection('http://localhost:4000');
  
  // Test HTTPS localhost:4000 (should fail)
  await testConnection('https://localhost:4000', 'https');
  
  // Test if anything is running on port 4000
  console.log('\n🔍 Checking what\'s running on port 4000...');
  
  const { exec } = require('child_process');
  exec('netstat -an | findstr :4000', (error, stdout, stderr) => {
    if (stdout) {
      console.log('✅ Port 4000 is in use:');
      console.log(stdout);
    } else {
      console.log('❌ Nothing found on port 4000');
      console.log('💡 Suggestion: Start the backend server with:');
      console.log('   cd backend_test && npm start');
    }
  });
}

// 3. Check for common issues
console.log('\n🔧 Common Issues to Check:');
console.log('1. ✅ Remove extra spaces in .env.local (fixed)');
console.log('2. 🔄 Restart npm run dev after .env changes');
console.log('3. 🖥️  Start backend server: cd backend_test && npm start');
console.log('4. 🌐 Check browser Network tab for actual URLs being called');
console.log('5. 🔍 Clear browser cache and cookies');

runTests();