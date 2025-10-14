/**
 * Bedrock Agent Setup Verification
 * Checks all requirements before running the agent
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   BEDROCK AGENT - SETUP VERIFICATION          ║');
console.log('╚════════════════════════════════════════════════╝\n');

let allChecksPassed = true;
const checks = [];

// Check 1: Node.js version
console.log('1️⃣  Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 18) {
  console.log(`   ✅ Node.js ${nodeVersion} (>= 18.0.0)\n`);
  checks.push({ name: 'Node.js', status: 'PASS' });
} else {
  console.log(`   ❌ Node.js ${nodeVersion} (Need >= 18.0.0)\n`);
  checks.push({ name: 'Node.js', status: 'FAIL' });
  allChecksPassed = false;
}

// Check 2: Backend directory
console.log('2️⃣  Checking backend directory...');
if (fs.existsSync(path.join(__dirname, 'backend_test'))) {
  console.log('   ✅ backend_test/ directory exists\n');
  checks.push({ name: 'Backend Directory', status: 'PASS' });
} else {
  console.log('   ❌ backend_test/ directory not found\n');
  checks.push({ name: 'Backend Directory', status: 'FAIL' });
  allChecksPassed = false;
}

// Check 3: Package.json
console.log('3️⃣  Checking package.json...');
const packageJsonPath = path.join(__dirname, 'backend_test', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('   ✅ package.json exists\n');
  
  // Check for required dependencies
  const requiredDeps = [
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-bedrock-agent-runtime',
    '@aws-sdk/client-dynamodb',
    'express',
    'axios'
  ];
  
  const hasDeps = requiredDeps.every(dep => 
    packageJson.dependencies && packageJson.dependencies[dep]
  );
  
  if (hasDeps) {
    console.log('   ✅ All required dependencies present\n');
    checks.push({ name: 'Dependencies', status: 'PASS' });
  } else {
    console.log('   ⚠️  Some dependencies missing - run: cd backend_test && npm install\n');
    checks.push({ name: 'Dependencies', status: 'WARN' });
  }
} else {
  console.log('   ❌ package.json not found\n');
  checks.push({ name: 'Package.json', status: 'FAIL' });
  allChecksPassed = false;
}

// Check 4: Core implementation files
console.log('4️⃣  Checking core implementation files...');
const requiredFiles = [
  'backend_test/services/BedrockAgentCore.js',
  'backend_test/routes/bedrock-agent.js',
  'backend_test/test-bedrock-agent.js',
  'backend_test/server.js'
];

let fileChecksPassed = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    fileChecksPassed = false;
  }
});
console.log('');

if (fileChecksPassed) {
  checks.push({ name: 'Core Files', status: 'PASS' });
} else {
  checks.push({ name: 'Core Files', status: 'FAIL' });
  allChecksPassed = false;
}

// Check 5: .env file
console.log('5️⃣  Checking environment configuration...');
const envPath = path.join(__dirname, 'backend_test', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('   ✅ .env file exists');
  
  // Check for AWS credentials
  const hasRegion = envContent.includes('AWS_REGION=') && !envContent.includes('AWS_REGION=your-');
  const hasAccessKey = envContent.includes('AWS_ACCESS_KEY_ID=') && !envContent.includes('your-access-key');
  const hasSecretKey = envContent.includes('AWS_SECRET_ACCESS_KEY=') && !envContent.includes('your-secret-key');
  
  if (hasRegion && hasAccessKey && hasSecretKey) {
    console.log('   ✅ AWS credentials configured\n');
    checks.push({ name: 'AWS Credentials', status: 'PASS' });
  } else {
    console.log('   ⚠️  AWS credentials not configured');
    console.log('      Please edit .env and add your AWS credentials\n');
    checks.push({ name: 'AWS Credentials', status: 'WARN' });
  }
} else {
  console.log('   ⚠️  .env file not found');
  console.log('      Run setup-bedrock-agent.ps1 to create it\n');
  checks.push({ name: 'Environment Config', status: 'WARN' });
}

// Check 6: Documentation
console.log('6️⃣  Checking documentation...');
const docFiles = [
  'BEDROCK-AGENT-CORE-GUIDE.md',
  'BEDROCK-AGENT-QUICKSTART.md',
  'HACKATHON-SUBMISSION-SUMMARY.md'
];

let docChecksPassed = true;
docFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    docChecksPassed = false;
  }
});
console.log('');

if (docChecksPassed) {
  checks.push({ name: 'Documentation', status: 'PASS' });
} else {
  checks.push({ name: 'Documentation', status: 'FAIL' });
}

// Check 7: AWS SDK
console.log('7️⃣  Checking AWS SDK modules...');
const nodePath = path.join(__dirname, 'backend_test', 'node_modules');
if (fs.existsSync(nodePath)) {
  const hasBedrockRuntime = fs.existsSync(path.join(nodePath, '@aws-sdk', 'client-bedrock-runtime'));
  const hasBedrockAgent = fs.existsSync(path.join(nodePath, '@aws-sdk', 'client-bedrock-agent-runtime'));
  const hasDynamoDB = fs.existsSync(path.join(nodePath, '@aws-sdk', 'client-dynamodb'));
  
  if (hasBedrockRuntime && hasBedrockAgent && hasDynamoDB) {
    console.log('   ✅ AWS SDK modules installed\n');
    checks.push({ name: 'AWS SDK', status: 'PASS' });
  } else {
    console.log('   ⚠️  AWS SDK modules not installed');
    console.log('      Run: cd backend_test && npm install\n');
    checks.push({ name: 'AWS SDK', status: 'WARN' });
  }
} else {
  console.log('   ⚠️  node_modules not found');
  console.log('      Run: cd backend_test && npm install\n');
  checks.push({ name: 'Node Modules', status: 'WARN' });
}

// Check 8: Server configuration
console.log('8️⃣  Checking server configuration...');
const serverPath = path.join(__dirname, 'backend_test', 'server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  if (serverContent.includes('bedrock-agent')) {
    console.log('   ✅ Bedrock agent routes configured\n');
    checks.push({ name: 'Server Config', status: 'PASS' });
  } else {
    console.log('   ⚠️  Bedrock agent routes not found in server.js\n');
    checks.push({ name: 'Server Config', status: 'WARN' });
  }
}

// Summary
console.log('╔════════════════════════════════════════════════╗');
console.log('║              VERIFICATION SUMMARY              ║');
console.log('╚════════════════════════════════════════════════╝\n');

checks.forEach((check, index) => {
  const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${index + 1}. ${icon} ${check.name.padEnd(30)} ${check.status}`);
});

console.log('\n' + '═'.repeat(50) + '\n');

// Next steps
if (allChecksPassed) {
  console.log('🎉 All critical checks passed!');
  console.log('\n📋 Next Steps:\n');
  console.log('1. Ensure AWS credentials are configured in .env');
  console.log('2. Enable Claude 3.5 Sonnet in AWS Bedrock Console:');
  console.log('   https://console.aws.amazon.com/bedrock/');
  console.log('3. Start the backend server:');
  console.log('   cd backend_test && npm start');
  console.log('4. Run tests:');
  console.log('   node backend_test/test-bedrock-agent.js');
  console.log('5. Test the health endpoint:');
  console.log('   curl http://localhost:4000/bedrock-agent/health');
  console.log('\n📚 Read the documentation:');
  console.log('   - BEDROCK-AGENT-QUICKSTART.md (Quick start)');
  console.log('   - BEDROCK-AGENT-CORE-GUIDE.md (Complete guide)');
  console.log('   - HACKATHON-SUBMISSION-SUMMARY.md (Submission info)');
  console.log('\n🚀 Ready for hackathon!');
} else {
  console.log('⚠️  Some checks failed. Please address the issues above.');
  console.log('\n🔧 Quick fixes:');
  console.log('1. Run setup script:');
  console.log('   .\\setup-bedrock-agent.ps1');
  console.log('2. Install dependencies:');
  console.log('   cd backend_test && npm install');
  console.log('3. Configure AWS credentials in .env');
}

console.log('\n' + '═'.repeat(50) + '\n');

// Exit with appropriate code
process.exit(allChecksPassed ? 0 : 1);
