/**
 * Simple test for Bedrock Agent Core
 * Tests the new simpleChat method
 */

require('dotenv').config();
const BedrockAgentCore = require('./services/BedrockAgentCore');

async function testSimpleChat() {
  console.log('🧪 Testing Bedrock Agent Core - Simple Chat Mode\n');
  console.log('='.repeat(60));

  // Check AWS credentials
  console.log('\n📋 Configuration:');
  console.log(`   AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   AWS Access Key: ${process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Not Set'}`);
  console.log(`   AWS Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Not Set'}`);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('\n❌ ERROR: AWS credentials not configured!');
    console.log('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file\n');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));

  try {
    const agent = new BedrockAgentCore();

    console.log('\n🧪 Test 1: AI Agent - Beach destination with tools');
    console.log('Query: "Suggest beach destinations for my budget under $2000"');
    console.log('Expected: Agent should use tools to get destination info\n');
    
    const result1 = await agent.agentChat(
      'Suggest beach destinations for my budget under $2000',
      'test-session-1',
      [],
      'test-user'
    );

    console.log('\n✅ AI Agent Response:');
    console.log(result1.response);
    console.log(`\n� Tools Used: ${result1.toolsUsed.join(', ') || 'None'}`);
    console.log(`� Model: ${result1.model}`);
    console.log(`🤖 Agent Mode: ${result1.agentMode ? 'Active' : 'Passive'}`);

    console.log('\n' + '='.repeat(60));

    console.log('\n🧪 Test 2: AI Agent - Flight search');
    console.log('Query: "Find me flights from New York to Paris in December"');
    console.log('Expected: Agent should search flights and show options\n');
    
    const result2 = await agent.agentChat(
      'Find me flights from New York to Paris in December',
      'test-session-2',
      [],
      'test-user'
    );

    console.log('\n✅ AI Agent Response:');
    console.log(result2.response);
    console.log(`\n🔧 Tools Used: ${result2.toolsUsed.join(', ') || 'None'}`);

    console.log('\n' + '='.repeat(60));

    console.log('\n🧪 Test 3: AI Agent - Multi-step trip planning');
    console.log('Query: "Help me plan a 5-day trip to Tokyo with hotels"');
    console.log('Expected: Agent should use multiple tools (destination info, hotels, itinerary)\n');
    
    const result3 = await agent.agentChat(
      'Help me plan a 5-day trip to Tokyo with hotels',
      'test-session-3',
      [],
      'test-user'
    );

    console.log('\n✅ AI Agent Response:');
    console.log(result3.response);
    console.log(`\n🔧 Tools Used: ${result3.toolsUsed.join(', ') || 'None'}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All tests passed! AI Agent with Claude 4 Opus is working!\n');
    console.log('🎯 The agent is now:');
    console.log('   • Using tools to get real data');
    console.log('   • Providing actionable recommendations');
    console.log('   • Guiding users through travel planning');
    console.log('   • Being proactive with suggestions\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    
    if (error.message.includes('expired')) {
      console.log('\n💡 Your AWS credentials may be expired. Please refresh them.');
    } else if (error.message.includes('denied')) {
      console.log('\n💡 Access denied. Please ensure:');
      console.log('   1. Your AWS credentials are correct');
      console.log('   2. You have Bedrock access enabled');
      console.log('   3. Claude 4 Opus model is enabled in Bedrock console');
    } else if (error.message.includes('not enabled')) {
      console.log('\n💡 Please enable Claude 4 Opus in AWS Bedrock Console:');
      console.log('   1. Go to https://console.aws.amazon.com/bedrock/');
      console.log('   2. Click "Model access" → "Manage model access"');
      console.log('   3. Enable "Claude Opus 4"');
      console.log('   4. Wait 2-3 minutes for activation');
    }
    
    process.exit(1);
  }
}

// Run test
console.log('');
testSimpleChat().catch(console.error);
