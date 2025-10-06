# AI Assistant Setup Guide

This guide explains how to set up and deploy the SageMaker-powered AI Travel Assistant.

## Overview

The AI Assistant is a standalone chatbot that helps users with:
- **Destination Recommendations** - Personalized suggestions based on user preferences
- **Flight Search** - Finding and recommending flights with external booking links
- **Hotel Recommendations** - Suggesting accommodations based on budget and style
- **Trip Planning** - Helping create complete itineraries

## Architecture

```
Frontend (Next.js)
    ↓
Backend API (/ai/chat)
    ↓
SageMaker Service
    ↓
AWS SageMaker Endpoint
```

## Prerequisites

1. **AWS Account** with SageMaker access
2. **AWS CLI** configured
3. **Node.js** 16+ and npm
4. **Backend server** running (backend_test)

## Setup Instructions

### 1. Install AWS SDK

The AWS SDK is already added to `backend_test/package.json`. Install it:

```bash
cd backend_test
npm install
```

### 2. Configure AWS Credentials

Create a `.env` file in `backend_test/`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
SAGEMAKER_ENDPOINT_NAME=travel-assistant-endpoint
```

### 3. Deploy SageMaker Model

You have two options:

#### Option A: Use Pre-trained Hugging Face Model (Recommended)

```python
# deploy-sagemaker-model.py
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

role = "arn:aws:iam::YOUR_ACCOUNT_ID:role/SageMakerRole"

# Use a pre-trained conversational model
huggingface_model = HuggingFaceModel(
    model_data="s3://path-to-model/model.tar.gz",  # Or use model_id
    transformers_version='4.26',
    pytorch_version='1.13',
    py_version='py39',
    role=role,
    model_id="microsoft/DialoGPT-medium"  # Or use "facebook/blenderbot-400M-distill"
)

predictor = huggingface_model.deploy(
    initial_instance_count=1,
    instance_type='ml.g4dn.xlarge',
    endpoint_name='travel-assistant-endpoint'
)

print(f"Endpoint deployed: {predictor.endpoint_name}")
```

Run deployment:
```bash
python deploy-sagemaker-model.py
```

#### Option B: Use Amazon Bedrock (Simpler Alternative)

Instead of SageMaker, you can use Amazon Bedrock for serverless AI:

1. Enable Bedrock in AWS Console
2. Update `sagemakerService.js` to use Bedrock:

```javascript
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

async invokeBedrock(prompt) {
  const client = new BedrockRuntimeClient({ region: "us-east-1" });
  
  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-v2",
    body: JSON.stringify({
      prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      max_tokens_to_sample: 512,
      temperature: 0.7
    }),
    contentType: "application/json",
    accept: "application/json"
  });
  
  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.completion;
}
```

### 4. Testing the Endpoint

Test the SageMaker endpoint:

```bash
cd backend_test
node test-sagemaker.js
```

Create `test-sagemaker.js`:

```javascript
const sagemakerService = require('./services/sagemakerService');

async function test() {
  const response = await sagemakerService.processMessage(
    "I want to visit a tropical destination with beaches",
    "test-user-123",
    {
      budget: 2000,
      travelStyle: 'relaxed',
      interests: ['beach', 'culture'],
      travelers: 2
    }
  );
  
  console.log('AI Response:', response);
}

test();
```

### 5. Start the Backend

```bash
cd backend_test
npm start
```

The AI endpoint will be available at: `http://localhost:4000/ai/chat`

### 6. Test the Frontend

1. Start the frontend:
```bash
cd frontend
npm run dev
```

2. Navigate to: `http://localhost:3000/ai-assistant`

3. Try these prompts:
   - "I want to visit a tropical beach destination"
   - "Find me flights to Tokyo"
   - "Recommend hotels in Paris for $150/night"

## API Endpoints

### POST /ai/chat

**Request:**
```json
{
  "message": "I want to visit Japan",
  "conversationId": "conv_123456",
  "preferences": {
    "budget": 3000,
    "travelStyle": "adventure",
    "interests": ["culture", "food"],
    "travelers": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Japan is a wonderful destination! Here are some recommendations...",
    "type": "recommendation",
    "recommendations": [
      {
        "type": "destination",
        "title": "Tokyo",
        "description": "...",
        "link": "https://www.lonelyplanet.com/japan/tokyo",
        "rating": 4.9
      }
    ],
    "intent": "destination_recommendation",
    "conversationId": "conv_123456",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Fallback Mode

The AI Assistant includes intelligent fallback responses when:
- SageMaker endpoint is not configured
- Network errors occur
- AWS credentials are missing

It will still provide helpful recommendations using local logic and external booking links.

## Cost Optimization

### SageMaker Costs
- **ml.t2.medium**: ~$0.065/hour (cheapest, for testing)
- **ml.g4dn.xlarge**: ~$0.736/hour (GPU, better performance)
- **ml.inf1.xlarge**: ~$0.228/hour (AWS Inferentia, optimized)

### Cost Saving Tips
1. Use **SageMaker Serverless Inference** for variable traffic
2. Set up **Auto-scaling** based on usage
3. Use **Spot Instances** for development
4. Consider **Amazon Bedrock** for pay-per-token pricing

### Serverless Inference Setup

```python
from sagemaker.serverless import ServerlessInferenceConfig

serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=4096,
    max_concurrency=10
)

predictor = model.deploy(
    serverless_inference_config=serverless_config,
    endpoint_name='travel-assistant-serverless'
)
```

## Monitoring

### CloudWatch Metrics
- Invocation count
- Model latency
- Error rate
- Throttling

### Enable Logging

Update `sagemakerService.js`:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'ai-assistant.log' })
  ]
});

// Log all requests
logger.info('AI Request', { userId, message, intent });
```

## Troubleshooting

### Issue: "Endpoint not found"
**Solution:** Verify endpoint name in `.env` matches deployed endpoint:
```bash
aws sagemaker list-endpoints
```

### Issue: "Access Denied"
**Solution:** Check IAM role has SageMaker permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "sagemaker:InvokeEndpoint"
  ],
  "Resource": "*"
}
```

### Issue: "Timeout errors"
**Solution:** Increase timeout in `sagemakerService.js`:
```javascript
this.sagemaker = new AWS.SageMakerRuntime({
  region: process.env.AWS_REGION,
  httpOptions: {
    timeout: 60000 // 60 seconds
  }
});
```

### Issue: "Out of memory"
**Solution:** Increase instance size or reduce max_tokens:
```javascript
parameters: {
  max_new_tokens: 256,  // Reduce from 512
  temperature: 0.7
}
```

## Advanced Features

### 1. Multi-language Support

Update prompt to include language:

```javascript
const systemPrompt = `You are a multilingual travel assistant. Respond in ${userLanguage}.`;
```

### 2. Image Recognition

Add vision model for analyzing travel photos:

```python
model = HuggingFaceModel(
    model_id="Salesforce/blip-image-captioning-base",
    transformers_version='4.26',
    pytorch_version='1.13',
    py_version='py39',
    role=role
)
```

### 3. Voice Input

Integrate with AWS Transcribe:

```javascript
const transcribe = new AWS.TranscribeService();

async function transcribeAudio(audioBuffer) {
  // Upload to S3
  // Start transcription job
  // Return text
}
```

### 4. Persistent Chat History

Add database storage:

```javascript
// Store in DynamoDB
const params = {
  TableName: 'ChatHistory',
  Item: {
    conversationId: conversationId,
    userId: userId,
    messages: messages,
    timestamp: new Date().toISOString()
  }
};

await dynamodb.put(params).promise();
```

## Production Deployment

### 1. Use Environment Variables

```env
NODE_ENV=production
SAGEMAKER_ENDPOINT_NAME=travel-assistant-prod
AWS_REGION=us-east-1
```

### 2. Enable HTTPS

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

### 3. Add Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/ai', limiter);
```

### 4. Set up Monitoring

- CloudWatch Alarms for errors
- X-Ray for distributed tracing
- Custom metrics dashboard

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review SageMaker endpoint status
3. Test with fallback mode enabled
4. Contact AWS Support for SageMaker issues

## Next Steps

1. ✅ Deploy SageMaker endpoint
2. ✅ Configure AWS credentials
3. ✅ Test AI Assistant in browser
4. 🔄 Add user feedback collection
5. 🔄 Implement chat history persistence
6. 🔄 Add multi-language support
7. 🔄 Optimize model performance
