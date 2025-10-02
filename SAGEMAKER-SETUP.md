# SageMaker Integration Setup Guide

This guide explains how to set up AWS SageMaker integration for the AI travel assistant.

## Overview

The AI agent now supports two AI backends:
1. **AWS Bedrock** (default) - Uses Claude-4 directly through Bedrock
2. **AWS SageMaker** - Uses custom model endpoints for more control

## SageMaker Setup

### 1. Model Deployment Options

You can deploy various models to SageMaker:

#### Option A: Hugging Face Transformers (Recommended for Travel Assistant)
```python
# Example: Deploy a travel-focused model
from sagemaker.huggingface import HuggingFaceModel
import sagemaker

# Travel-optimized model (you can fine-tune your own)
model = HuggingFaceModel(
    model_data="s3://your-bucket/travel-assistant-model.tar.gz",
    role=sagemaker.get_execution_role(),
    transformers_version="4.21",
    pytorch_version="1.12",
    py_version="py39"
)

# Deploy to endpoint
predictor = model.deploy(
    initial_instance_count=1,
    instance_type="ml.m5.large",
    endpoint_name="travel-assistant-endpoint"
)
```

#### Option B: Custom Container
```python
# Deploy custom travel AI model
from sagemaker.model import Model

model = Model(
    image_uri="your-account.dkr.ecr.region.amazonaws.com/travel-ai:latest",
    model_data="s3://your-bucket/model.tar.gz",
    role=sagemaker.get_execution_role()
)

predictor = model.deploy(
    initial_instance_count=1,
    instance_type="ml.g4dn.xlarge",  # GPU instance for larger models
    endpoint_name="travel-assistant-endpoint"
)
```

### 2. Environment Configuration

Add these environment variables to your Lambda function:

```bash
SAGEMAKER_ENDPOINT_NAME=travel-assistant-endpoint
AWS_REGION=us-east-1
```

### 3. IAM Permissions

Your Lambda execution role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sagemaker:InvokeEndpoint"
            ],
            "Resource": [
                "arn:aws:sagemaker:*:*:endpoint/travel-assistant-endpoint"
            ]
        }
    ]
}
```

## Model Input/Output Format

### Expected Input Format
```json
{
    "inputs": "System prompt + conversation history",
    "parameters": {
        "max_new_tokens": 1000,
        "temperature": 0.7,
        "top_p": 0.9,
        "do_sample": true,
        "repetition_penalty": 1.1
    },
    "userContext": {
        "sessionId": "session_123",
        "preferences": {},
        "currentTrip": {},
        "tripHistory": []
    }
}
```

### Expected Output Format
```json
{
    "generated_text": "AI response text",
    "token_usage": {
        "input_tokens": 150,
        "output_tokens": 200
    },
    "confidence": 0.95
}
```

## Fine-tuning for Travel Domain

### 1. Prepare Training Data
Create a dataset with travel-specific conversations:

```json
[
    {
        "input": "I want to plan a trip to Japan for 2 weeks with a budget of $5000",
        "output": "Fantastic choice! Japan offers incredible experiences. For a 2-week trip with $5000..."
    },
    {
        "input": "What are the best months to visit Thailand?",
        "output": "Thailand has different optimal seasons depending on the region..."
    }
]
```

### 2. Fine-tune Model
```python
from sagemaker.huggingface import HuggingFace

# Fine-tuning job
huggingface_estimator = HuggingFace(
    entry_point='train.py',
    source_dir='./scripts',
    instance_type='ml.p3.2xlarge',
    instance_count=1,
    role=role,
    transformers_version='4.21',
    pytorch_version='1.12',
    py_version='py39',
    hyperparameters={
        'epochs': 3,
        'train_batch_size': 16,
        'learning_rate': 5e-5,
        'model_name': 'microsoft/DialoGPT-large'
    }
)

huggingface_estimator.fit({'training': training_input_path})
```

## Monitoring and Optimization

### 1. CloudWatch Metrics
Monitor these metrics:
- Endpoint latency
- Error rates
- Token usage
- User satisfaction

### 2. Cost Optimization
- Use auto-scaling for variable traffic
- Consider serverless inference for low traffic
- Monitor token usage to optimize costs

### 3. Model Performance
- Track conversation quality metrics
- Implement feedback loops
- A/B test different models

## Fallback Strategy

The system automatically falls back to Bedrock if SageMaker endpoint is unavailable:

```typescript
try {
    // Try SageMaker first
    response = await sagemakerClient.send(command);
} catch (error) {
    console.log('SageMaker unavailable, falling back to Bedrock');
    // Fallback to Bedrock
    response = await bedrockClient.send(bedrockCommand);
}
```

## Deployment Commands

### Deploy SageMaker Function
```bash
# Add to your CDK stack
const sagemakerFunction = new Function(this, 'AiAgentSageMaker', {
    runtime: Runtime.NODEJS_18_X,
    handler: 'ai-agent-sagemaker.handler',
    code: Code.fromAsset('src/functions'),
    environment: {
        SAGEMAKER_ENDPOINT_NAME: 'travel-assistant-endpoint',
        AWS_REGION: 'us-east-1'
    },
    timeout: Duration.seconds(30)
});
```

### API Gateway Integration
```bash
# Add route to API Gateway
const sagemakerIntegration = new LambdaIntegration(sagemakerFunction);
api.root.addResource('ai-agent-sagemaker').addMethod('POST', sagemakerIntegration);
```

## Testing

Test both endpoints:

```bash
# Test Bedrock
curl -X POST https://your-api.amazonaws.com/ai-agent \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Plan a trip to Paris"}], "aiModel": "bedrock"}'

# Test SageMaker
curl -X POST https://your-api.amazonaws.com/ai-agent \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Plan a trip to Paris"}], "aiModel": "sagemaker"}'
```

## Troubleshooting

### Common Issues
1. **Endpoint not found**: Verify endpoint name and deployment status
2. **Permission denied**: Check IAM roles and policies
3. **Model errors**: Verify input format matches model expectations
4. **Timeout errors**: Increase Lambda timeout or optimize model

### Debug Commands
```bash
# Check endpoint status
aws sagemaker describe-endpoint --endpoint-name travel-assistant-endpoint

# Check endpoint logs
aws logs filter-log-events --log-group-name /aws/sagemaker/Endpoints/travel-assistant-endpoint
```

## Cost Considerations

### SageMaker Costs
- **Endpoint hosting**: ~$50-200/month depending on instance type
- **Inference requests**: $0.0001-0.001 per request
- **Data transfer**: Standard AWS rates

### Bedrock Costs
- **Pay per token**: ~$0.01-0.03 per 1K tokens
- **No infrastructure costs**
- **Automatic scaling**

Choose SageMaker for:
- Custom models
- High volume (>10K requests/day)
- Specific compliance requirements

Choose Bedrock for:
- Quick setup
- Variable traffic
- Latest models (Claude-4)