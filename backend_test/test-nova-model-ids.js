// Test Nova Pro access with different model ID formats
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const modelIds = [
  'us.amazon.nova-pro-v1:0',
  'amazon.nova-pro-v1:0',
  'us.amazon.nova-pro-v1',
  'nova-pro-v1:0'
];

async function testModelAccess() {
  const client = new BedrockRuntimeClient({ region: 'us-east-1' });
  
  console.log('Testing Nova Pro model ID formats...\n');
  
  for (const modelId of modelIds) {
    try {
      console.log(`Testing: ${modelId}`);
      const command = new ConverseCommand({
        modelId: modelId,
        messages: [{
          role: 'user',
          content: [{ text: 'Say hi' }]
        }]
      });
      
      const response = await client.send(command);
      console.log(`✅ SUCCESS with model ID: ${modelId}\n`);
      console.log('Response:', response.output.message.content[0].text);
      break;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }
}

testModelAccess().catch(console.error);
