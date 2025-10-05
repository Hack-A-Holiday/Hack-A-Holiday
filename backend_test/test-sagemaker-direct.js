// Test SageMaker Integration
// This script tests the SageMaker endpoint directly

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS
const sagemaker = new AWS.SageMakerRuntime({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME || 'travel-assistant-endpoint-dev';

async function testSageMaker() {
  console.log('🧪 Testing SageMaker Endpoint...\n');
  console.log(`Endpoint: ${endpointName}`);
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}\n`);

  const testPrompts = [
    'Plan a 3-day trip to Paris',
    'Recommend hotels in Tokyo for $150/night',
    'What are the best destinations for beach lovers?'
  ];

  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`\n📝 Test ${i + 1}: "${prompt}"`);
    console.log('━'.repeat(60));

    try {
      const params = {
        EndpointName: endpointName,
        Body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 256,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true
          }
        }),
        ContentType: 'application/json',
        Accept: 'application/json'
      };

      console.log('⏳ Invoking endpoint...');
      const startTime = Date.now();
      
      const response = await sagemaker.invokeEndpoint(params).promise();
      
      const latency = Date.now() - startTime;
      const result = JSON.parse(response.Body.toString());
      
      console.log(`✅ Success (${latency}ms)`);
      console.log('\n📤 Response:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      if (error.code === 'ValidationException') {
        console.log('\n💡 Tip: Check if endpoint name is correct');
        console.log(`   Current: ${endpointName}`);
      } else if (error.code === 'ModelNotReadyException') {
        console.log('\n💡 Tip: Endpoint is still deploying. Wait a few minutes.');
      } else if (error.code === 'ModelError') {
        console.log('\n💡 Tip: Check model configuration and container logs in CloudWatch');
      } else if (error.code === 'AccessDeniedException') {
        console.log('\n💡 Tip: Check AWS credentials and IAM permissions');
      }
      
      console.log('\nFull error:', error);
    }
  }

  console.log('\n\n🎯 Test Complete!');
}

// Check if endpoint exists first
async function checkEndpointStatus() {
  try {
    const sagemakerClient = new AWS.SageMaker({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    console.log('🔍 Checking endpoint status...\n');
    
    const response = await sagemakerClient.describeEndpoint({
      EndpointName: endpointName
    }).promise();

    console.log(`✅ Endpoint found: ${response.EndpointName}`);
    console.log(`   Status: ${response.EndpointStatus}`);
    console.log(`   Instance: ${response.ProductionVariants[0]?.CurrentInstanceCount || 0} x ${response.ProductionVariants[0]?.InstanceType || 'unknown'}`);
    console.log(`   Created: ${response.CreationTime}\n`);

    if (response.EndpointStatus === 'InService') {
      console.log('✅ Endpoint is ready!\n');
      return true;
    } else {
      console.log(`⚠️  Endpoint status is: ${response.EndpointStatus}`);
      console.log('   Please wait for it to be "InService" before testing.\n');
      return false;
    }
  } catch (error) {
    console.log(`❌ Endpoint not found or error checking status:`);
    console.log(`   ${error.message}\n`);
    
    if (error.code === 'ValidationException') {
      console.log('💡 Tips:');
      console.log('   1. Deploy endpoint using: cdk deploy TravelCompanion-SageMaker-dev');
      console.log('   2. Or create via AWS Console: https://console.aws.amazon.com/sagemaker/');
      console.log('   3. Update SAGEMAKER_ENDPOINT_NAME in .env file\n');
    }
    
    return false;
  }
}

// Run tests
(async () => {
  console.log('🚀 SageMaker Integration Test\n');
  console.log('━'.repeat(60));
  
  const isReady = await checkEndpointStatus();
  
  if (isReady) {
    await testSageMaker();
  } else {
    console.log('\n📖 Next Steps:');
    console.log('   1. Deploy SageMaker: cd infrastructure && cdk deploy TravelCompanion-SageMaker-dev');
    console.log('   2. Wait for deployment (5-10 minutes)');
    console.log('   3. Update backend_test/.env with endpoint name');
    console.log('   4. Run this test again: node test-sagemaker-direct.js');
    console.log('\n   OR use Bedrock instead (no infrastructure needed!)');
  }
  
  console.log('\n━'.repeat(60));
})();
