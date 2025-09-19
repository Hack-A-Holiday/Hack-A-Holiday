# 🚀 Manual Deployment Guide

Since the PowerShell scripts aren't executing, let's deploy manually step by step.

## Step 1: Install Required Tools

### Install AWS CLI
1. Download AWS CLI from: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer
3. Restart PowerShell
4. Verify: `aws --version`

### Install AWS CDK
```powershell
npm install -g aws-cdk
```

## Step 2: Configure AWS

```powershell
# Configure AWS credentials
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format: json

Verify:
```powershell
aws sts get-caller-identity
```

## Step 3: Install Dependencies

```powershell
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..

# Infrastructure dependencies
cd infrastructure
npm install
cd ..
```

## Step 4: Build Backend

```powershell
cd backend
npm run build
cd ..
```

## Step 5: Deploy Infrastructure

```powershell
cd infrastructure

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy all stacks
cdk deploy --all --require-approval never

cd ..
```

## Step 6: Test the API

After deployment, get your API URL from the CDK output and test:

```powershell
# Test health endpoint
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev/health"

# Test trip planning
$body = @{
    preferences = @{
        destination = "Paris, France"
        budget = 2000
        duration = 5
        interests = @("culture", "food")
        startDate = "2024-06-01"
        travelers = 2
        travelStyle = "mid-range"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev/plan-trip" -Method POST -Body $body -ContentType "application/json"
```

## Step 7: Test Frontend (Simple Version)

```powershell
cd frontend-simple
npm install
npm run dev
```

Visit: http://localhost:3000

## Troubleshooting

### If CDK Bootstrap Fails
```powershell
# Set environment variables
$env:CDK_DEFAULT_ACCOUNT = "YOUR-ACCOUNT-ID"
$env:CDK_DEFAULT_REGION = "us-east-1"

# Try bootstrap again
cdk bootstrap aws://YOUR-ACCOUNT-ID/us-east-1
```

### If Dependencies Fail
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### If TypeScript Build Fails
```powershell
# Install TypeScript globally
npm install -g typescript

# Build again
npm run build
```

## Expected Outputs

After successful deployment, you should see:
- DynamoDB tables created
- S3 buckets created
- Lambda functions deployed
- API Gateway URL provided
- CloudFront distribution created

The CDK will output the API Gateway URL - save this for testing!

## Cost Monitoring

Check AWS Billing Dashboard to monitor costs and ensure you stay within your $100 credit limit.

## Next Steps

Once deployed successfully:
1. Test all API endpoints
2. Verify frontend can connect to API
3. Continue with Bedrock AI integration
4. Add external travel API integrations