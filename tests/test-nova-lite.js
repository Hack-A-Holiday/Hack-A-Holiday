// Test Nova Lite access
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const modelIds = [
  'us.amazon.nova-lite-v1:0',
  'amazon.nova-lite-v1:0',
  'us.amazon.nova-micro-v1:0'
];

async function testModelAccess() {
  const client = new BedrockRuntimeClient({ region: 'us-east-1' });
  
  console.log('Testing Nova Lite/Micro model ID formats...\n');
  
  for (const modelId of modelIds) {
    try {
      console.log(`Testing: ${modelId}`);
      const command = new ConverseCommand({
        modelId: modelId,
        messages: [{
          role: 'user',
          content: [{ text: 'What is 2+2?' }]
        }]
      });
      
      const response = await client.send(command);
      console.log(`✅ SUCCESS with model ID: ${modelId}`);
      console.log(`Response: ${response.output.message.content[0].text}\n`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }
}

testModelAccess().catch(console.error);
