// Script to list available Bedrock models
const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');

async function listAvailableModels() {
  console.log('🔍 Checking available Bedrock models...');
  
  try {
    const client = new BedrockClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    const command = new ListFoundationModelsCommand({});
    const response = await client.send(command);
    
    console.log('\n📋 Available Claude models:');
    const claudeModels = response.modelSummaries.filter(model => 
      model.modelId.includes('claude')
    );
    
    claudeModels.forEach(model => {
      console.log(`✅ ${model.modelId} - ${model.modelName}`);
    });
    
    if (claudeModels.length === 0) {
      console.log('❌ No Claude models found. Please check model access in Bedrock console.');
    }
    
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
  }
}

listAvailableModels();