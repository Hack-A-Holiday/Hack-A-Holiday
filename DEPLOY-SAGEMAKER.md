# 🚀 SageMaker Deployment Guide

## Quick Answer: YES! You can deploy SageMaker directly from your CDK infrastructure!

I've created a complete CDK stack for you at:
**`infrastructure/lib/sagemaker-stack.ts`**

---

## 📋 Two Deployment Options

### Option 1: CDK Infrastructure (Recommended) ✅
**Pros**: Automated, version-controlled, repeatable
**Cost**: ~$85/month (ml.m5.large) or ~$530/month (ml.g4dn.xlarge GPU)

### Option 2: AWS Console (Quick Testing)
**Pros**: Visual interface, easy to understand
**Cost**: Same as above

---

## 🏗️ Option 1: Deploy with CDK (Infrastructure as Code)

### Step 1: Review the Stack
I've created: `infrastructure/lib/sagemaker-stack.ts`

**Features**:
- ✅ SageMaker model with Hugging Face container
- ✅ Endpoint configuration (ml.m5.large default)
- ✅ Automatic IAM role creation
- ✅ CloudFormation outputs for easy access
- ✅ Tagged resources for cost tracking

### Step 2: Choose Your Model

Edit `infrastructure/lib/sagemaker-stack.ts` line 38:

```typescript
// Option A: Use Meta Llama 2 (Free, good for travel)
HF_MODEL_ID: 'meta-llama/Llama-2-7b-chat-hf',

// Option B: Use Mistral (Smaller, faster)
HF_MODEL_ID: 'mistralai/Mistral-7B-Instruct-v0.1',

// Option C: Use your custom fine-tuned model
MODEL_DATA: 's3://your-bucket/your-travel-model.tar.gz',
```

### Step 3: Choose Instance Type

Edit `infrastructure/lib/sagemaker-stack.ts` line 65:

```typescript
// CPU (Cheaper): ~$85/month
instanceType: 'ml.m5.large',

// GPU (Faster): ~$530/month
instanceType: 'ml.g4dn.xlarge',
```

### Step 4: Deploy!

```powershell
# Navigate to infrastructure folder
cd infrastructure

# Install dependencies (if not already done)
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Check what will be deployed
cdk synth TravelCompanion-SageMaker-dev

# Deploy SageMaker stack
cdk deploy TravelCompanion-SageMaker-dev

# Or deploy everything at once
cdk deploy --all
```

**Deployment time**: 5-10 minutes

### Step 5: Get Your Endpoint Name

After deployment, you'll see outputs:
```
✅ TravelCompanion-SageMaker-dev

Outputs:
TravelCompanion-SageMaker-dev.EndpointName = travel-assistant-endpoint-dev
TravelCompanion-SageMaker-dev.EndpointArn = arn:aws:sagemaker:...
TravelCompanion-SageMaker-dev.ModelName = travel-assistant-model-dev
```

### Step 6: Update Backend Config

Update `backend_test/.env`:
```env
# Use the endpoint name from CDK output
SAGEMAKER_ENDPOINT_NAME=travel-assistant-endpoint-dev
AWS_REGION=us-east-1

# Your AWS credentials
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
```

### Step 7: Test It!

```powershell
# Start backend
cd backend_test
npm start

# In another terminal, test the endpoint
curl http://localhost:4000/ai-agent/health
```

---

## 🎯 Option 2: AWS Console (Quick Setup)

### Step-by-Step Console Setup

1. **Go to SageMaker Console**
   - URL: https://console.aws.amazon.com/sagemaker/
   - Region: Select your region (e.g., us-east-1)

2. **Create Model**
   - Click **Models** → **Create model**
   - Model name: `travel-assistant-model`
   - Container:
     ```
     763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-inference:2.0.0-transformers4.28.1-cpu-py310-ubuntu20.04
     ```
   - Environment variables:
     ```
     HF_MODEL_ID=meta-llama/Llama-2-7b-chat-hf
     HF_TASK=text-generation
     ```

3. **Create Endpoint Config**
   - Click **Endpoint configurations** → **Create**
   - Name: `travel-assistant-config`
   - Instance: ml.m5.large
   - Count: 1

4. **Create Endpoint**
   - Click **Endpoints** → **Create endpoint**
   - Name: `travel-assistant-endpoint`
   - Use config: `travel-assistant-config`
   - Click **Create** (wait 5-10 min)

5. **Update Backend**
   - Copy endpoint name
   - Update `backend_test/.env`

---

## 💰 Cost Comparison

### SageMaker Costs
| Instance | vCPU | Memory | GPU | Price/Hour | Monthly (24/7) |
|----------|------|--------|-----|------------|----------------|
| ml.t3.medium | 2 | 4 GB | ❌ | $0.05 | $36 |
| ml.m5.large | 2 | 8 GB | ❌ | $0.115 | $85 |
| ml.m5.xlarge | 4 | 16 GB | ❌ | $0.23 | $170 |
| ml.g4dn.xlarge | 4 | 16 GB | ✅ | $0.736 | $530 |

### Alternative: AWS Bedrock
- **No hourly costs** (pay per request)
- **~$3 per 1M input tokens**
- **~$15 per 1M output tokens**
- **Example**: 10,000 chats/month = ~$50

**💡 Recommendation**: Start with Bedrock, migrate to SageMaker if you need custom models

---

## 🧪 Testing Your Deployment

### Test 1: AWS CLI
```powershell
# Test endpoint directly
aws sagemaker-runtime invoke-endpoint `
  --endpoint-name travel-assistant-endpoint-dev `
  --body '{"inputs":"Plan a 3-day trip to Paris"}' `
  --content-type application/json `
  output.json

# View response
cat output.json
```

### Test 2: Backend API
```powershell
# Make sure backend is running
cd backend_test
npm start

# In another terminal
curl -X POST http://localhost:4000/ai-agent/chat `
  -H "Content-Type: application/json" `
  -d '{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"userContext\":{\"sessionId\":\"test\"}}'
```

### Test 3: Frontend UI
```powershell
# Start frontend
cd frontend
npm run dev

# Visit: http://localhost:3000/ai-agent
# Try chatting with the AI!
```

---

## 🔧 Configuration Guide

### Backend Configuration

**File**: `backend_test/.env`

```env
# SageMaker Configuration
SAGEMAKER_ENDPOINT_NAME=travel-assistant-endpoint-dev
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Alternative: Use Bedrock instead (easier)
USE_BEDROCK=true
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Other configs
PORT=4000
DYNAMODB_TABLE_NAME=your-table
```

### Frontend Configuration

**File**: `frontend/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

---

## 🚨 Troubleshooting

### Issue: Endpoint creation fails
**Solution**: Check IAM permissions, ensure role has SageMaker access

### Issue: Model download timeout
**Solution**: Use smaller model or increase timeout in endpoint config

### Issue: High costs
**Solution**: 
- Stop endpoint when not in use
- Use auto-scaling
- Switch to Bedrock for testing

### Issue: Slow responses
**Solution**: Upgrade to GPU instance (ml.g4dn.xlarge)

---

## 🎛️ Managing Your Endpoint

### Start/Stop Endpoint (Save Costs)
```powershell
# Stop endpoint (saves money)
aws sagemaker update-endpoint `
  --endpoint-name travel-assistant-endpoint-dev `
  --endpoint-config-name travel-assistant-config-dev

# Delete endpoint (stops billing)
aws sagemaker delete-endpoint `
  --endpoint-name travel-assistant-endpoint-dev
```

### Update Endpoint (Change Instance)
```powershell
# Deploy new config with different instance
cdk deploy TravelCompanion-SageMaker-dev
```

### Monitor Endpoint
```powershell
# Check status
aws sagemaker describe-endpoint `
  --endpoint-name travel-assistant-endpoint-dev

# View CloudWatch metrics
aws cloudwatch get-metric-statistics `
  --namespace AWS/SageMaker `
  --metric-name ModelLatency `
  --dimensions Name=EndpointName,Value=travel-assistant-endpoint-dev `
  --start-time 2025-10-03T00:00:00Z `
  --end-time 2025-10-03T23:59:59Z `
  --period 3600 `
  --statistics Average
```

---

## 🔄 Cleanup (Important!)

### Delete CDK Stack
```powershell
# Delete SageMaker stack (stops all charges)
cdk destroy TravelCompanion-SageMaker-dev

# Confirm deletion
```

### Manual Cleanup
```powershell
# Delete endpoint
aws sagemaker delete-endpoint --endpoint-name travel-assistant-endpoint-dev

# Delete endpoint config
aws sagemaker delete-endpoint-config --endpoint-config-name travel-assistant-config-dev

# Delete model
aws sagemaker delete-model --model-name travel-assistant-model-dev
```

---

## 🎯 My Recommendation

Based on your setup, here's what I suggest:

### For Development/Testing:
1. **Use AWS Bedrock** (your code already supports it!)
   - No infrastructure needed
   - Pay per use
   - Works immediately
   - Visit: http://localhost:3000/ai-agent
   - Toggle to "AWS Bedrock (Claude-4)" model

### For Production with Custom Models:
1. **Deploy SageMaker via CDK**
   - Run: `cdk deploy TravelCompanion-SageMaker-dev`
   - Use ml.m5.large for cost efficiency
   - Auto-scale based on traffic

### Cost-Effective Hybrid:
1. **Development**: Bedrock
2. **Production**: SageMaker with auto-scaling
3. **Budget**: Use Bedrock exclusively

---

## 📚 Next Steps

1. **Choose your approach**:
   - Quick test? → Use Bedrock (already working!)
   - Need custom model? → Deploy SageMaker with CDK

2. **Deploy SageMaker** (if needed):
   ```powershell
   cd infrastructure
   cdk deploy TravelCompanion-SageMaker-dev
   ```

3. **Update backend config**:
   - Copy endpoint name from CDK output
   - Update `backend_test/.env`

4. **Test the full stack**:
   ```powershell
   ./start-ai-agent.ps1
   ```

5. **Monitor costs**:
   - Check AWS Cost Explorer daily
   - Set up billing alerts
   - Delete endpoint when not in use

---

## 📞 Need Help?

- **CDK Issues**: Check `cdk.out/` for synthesized templates
- **SageMaker Errors**: Check CloudWatch Logs
- **Backend Issues**: Check `backend_test/` logs
- **Frontend Issues**: Check browser console

**Remember**: Your AI agent already works with Bedrock! SageMaker is optional for custom models.
