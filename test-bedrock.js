// Test script to verify Bedrock API connectivity
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testBedrockConnection() {
  console.log('🔍 Testing Bedrock API connection...');
  
  try {
    // Initialize client with same settings as the app
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    // Try cross-region inference profile 
    const modelId = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    console.log(`📡 Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`🤖 Model: ${modelId} (Claude 3.5 Sonnet v2 - cross-region)`);
    
    // Simple test prompt
    const prompt = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Hello! Please respond with 'Bedrock connection successful' to confirm the API is working."
        }
      ]
    };
    
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(prompt)
    });
    
    console.log('🚀 Sending test request to Bedrock...');
    const response = await client.send(command);
    
    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content[0].text;
    
    console.log('✅ Bedrock API Response:', responseText);
    console.log('🎉 Bedrock connection test SUCCESSFUL!');
    
  } catch (error) {
    console.error('❌ Bedrock connection test FAILED:');
    console.error('Error details:', error.message);
    
    if (error.name === 'AccessDeniedException') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if your AWS credentials have Bedrock permissions');
      console.log('2. Verify that Claude 3.5 Sonnet model access is enabled in Bedrock console');
      console.log('3. Ensure you\'re in the correct AWS region (us-east-1)');
    }
    
    if (error.name === 'ValidationException') {
      console.log('\n💡 This might be a model ID or request format issue');
      console.log('   Try checking the Bedrock console for available models');
    }
    
    process.exit(1);
  }
}

// Run the test
testBedrockConnection();