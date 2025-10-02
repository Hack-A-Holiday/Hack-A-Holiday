# 🚀 SageMaker Integration - Quick Start Guide

Welcome to the SageMaker integration for your Travel Companion app! This guide will get you up and running with both AWS Bedrock and SageMaker AI models.

## ✅ Prerequisites Checklist

Before you start, make sure you have:

- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] AWS CDK installed (`npm install -g aws-cdk`)
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] SageMaker permissions in your AWS account

## 🎯 Quick Setup (5 minutes)

### 1. Install Dependencies

Run the PowerShell setup script:

```powershell
# Install all required dependencies
.\setup-sagemaker.ps1 install
```

Or manually:

```bash
# Python packages
pip install sagemaker boto3 transformers torch

# Node.js packages (if not already installed)
npm install axios
```

### 2. Configure Environment

Copy the SageMaker environment template:

```powershell
cp .env.sagemaker .env
```

Edit `.env` with your AWS settings:
```env
AWS_REGION=us-east-1
SAGEMAKER_ENDPOINT_NAME=travel-assistant-endpoint
```

### 3. Deploy SageMaker Model

```powershell
# Deploy the travel-optimized AI model
.\setup-sagemaker.ps1 deploy
```

Or using Python directly:
```bash
python scripts/deploy-sagemaker.py --action deploy
```

### 4. Update Infrastructure

Deploy the updated CDK stack with SageMaker permissions:

```bash
cd infrastructure
npm run build
cdk deploy --all
```

### 5. Test Integration

```powershell
# Test both Bedrock and SageMaker
.\setup-sagemaker.ps1 test
```

Or:
```bash
node scripts/test-sagemaker.js
```

## 🎉 You're Done!

Your AI agent now supports both:
- **AWS Bedrock** (Claude-4) - Default, reliable, fast
- **SageMaker** - Custom travel-optimized model

## 🔧 Configuration Options

### AI Model Selection

Users can choose between models in the AI agent interface:

```typescript
// Frontend automatically detects available models
const [aiModel, setAiModel] = useState<'bedrock' | 'sagemaker'>('bedrock');
```

### Environment Variables

Key settings in your `.env`:

```env
# Enable SageMaker integration
NEXT_PUBLIC_SAGEMAKER_ENABLED=true
NEXT_PUBLIC_AI_MODELS=bedrock,sagemaker

# SageMaker endpoint (deployed by script)
SAGEMAKER_ENDPOINT_NAME=travel-assistant-endpoint

# Default model
NEXT_PUBLIC_DEFAULT_AI_MODEL=bedrock
```

## 📊 Monitoring

### Check Endpoint Status

```powershell
.\setup-sagemaker.ps1 status
```

### View Metrics

1. Go to [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
2. Navigate to "SageMaker" metrics
3. Monitor:
   - `Invocations` - Usage
   - `ModelLatency` - Performance  
   - `Errors` - Issues

### Cost Monitoring

- **Serverless SageMaker**: Pay per request (~$0.0001/request)
- **Bedrock**: Pay per token (~$0.003/1K tokens)

Set up billing alerts in AWS Console.

## 🛠️ Advanced Configuration

### Custom Model Training

To train your own travel-focused model:

```python
# See scripts/train-travel-model.py for full example
from sagemaker.pytorch import PyTorch

estimator = PyTorch(
    entry_point='train.py',
    source_dir='training',
    instance_type='ml.g4dn.xlarge',
    hyperparameters={
        'epochs': 3,
        'learning-rate': 0.0001,
        'model-name': 'custom-travel-assistant'
    }
)

estimator.fit({'training': 's3://your-bucket/training-data/'})
```

### Model Optimization

Optimize for your use case:

```python
# scripts/deploy-sagemaker.py
serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=4096,  # Increase for larger models
    max_concurrency=20,      # Increase for higher traffic
)
```

### Multi-Model Endpoints

Deploy multiple models:

```python
# Deploy different models for different use cases
models = [
    ('travel-assistant-general', 'microsoft/DialoGPT-large'),
    ('travel-assistant-luxury', 'custom-luxury-travel-model'),
    ('travel-assistant-budget', 'custom-budget-travel-model')
]

for endpoint_name, model_id in models:
    deploy_model(endpoint_name, model_id)
```

## 🚨 Troubleshooting

### Common Issues

**❌ "Endpoint not found"**
```bash
# Check if endpoint exists
aws sagemaker describe-endpoint --endpoint-name travel-assistant-endpoint

# If not found, redeploy
python scripts/deploy-sagemaker.py --action deploy
```

**❌ "IAM permissions error"**
```bash
# Verify Lambda has SageMaker permissions
# Redeploy CDK stack to update permissions
cd infrastructure && cdk deploy --all
```

**❌ "Timeout errors"**
```typescript
// Increase timeout in API call
const response = await axios.post('/api/ai-agent', {
  // ... data
}, { timeout: 60000 }); // 60 seconds
```

**❌ "Memory errors in SageMaker"**
```python
# Increase memory allocation
serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=6144,  # Increased from 4096
    max_concurrency=5,       # Reduced concurrency
)
```

### Debug Commands

```bash
# View SageMaker logs
aws logs tail /aws/sagemaker/Endpoints/travel-assistant-endpoint --follow

# View Lambda logs  
aws logs tail /aws/lambda/ai-agent-sagemaker --follow

# Test endpoint directly
aws sagemaker-runtime invoke-endpoint \
  --endpoint-name travel-assistant-endpoint \
  --content-type application/json \
  --body '{"inputs": "Plan a trip to Tokyo"}' \
  response.json
```

## 💡 Tips for Success

1. **Start with Bedrock**: Test your app with Bedrock first, then add SageMaker
2. **Monitor costs**: SageMaker serverless is cost-effective for variable workloads
3. **Use caching**: Cache frequent responses to reduce API calls
4. **Set timeouts**: Always set appropriate timeouts for AI calls
5. **Fallback strategy**: If SageMaker fails, fallback to Bedrock

## 📚 Next Steps

Once your SageMaker integration is working:

1. **Customize the model**: Fine-tune with your travel data
2. **A/B test**: Compare Bedrock vs SageMaker performance
3. **Scale**: Adjust concurrency based on usage
4. **Monitor**: Set up comprehensive monitoring and alerts

## 🆘 Need Help?

- **AWS SageMaker Documentation**: [docs.aws.amazon.com/sagemaker](https://docs.aws.amazon.com/sagemaker/)
- **Hugging Face Models**: [huggingface.co/models](https://huggingface.co/models)
- **CDK Documentation**: [docs.aws.amazon.com/cdk](https://docs.aws.amazon.com/cdk/)

## 🎊 Success!

Your Travel Companion now has:
- ✅ Dual AI models (Bedrock + SageMaker)
- ✅ Automatic model selection
- ✅ Comprehensive monitoring
- ✅ Cost optimization
- ✅ Production-ready deployment

Happy travels! 🌍✈️