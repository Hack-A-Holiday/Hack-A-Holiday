# 🚀 Travel Companion Deployment Guide

This guide will help you deploy the Autonomous Travel Companion to AWS.

## Prerequisites

### 1. Install Required Tools

**Node.js (18+)**
- Download from: https://nodejs.org/
- Verify: `node --version`

**AWS CLI**
- Download from: https://aws.amazon.com/cli/
- Verify: `aws --version`

**Git**
- Download from: https://git-scm.com/
- Verify: `git --version`

### 2. AWS Account Setup

1. **Create AWS Account** (if you don't have one)
   - Go to: https://aws.amazon.com/
   - Sign up for a new account

2. **Apply $100 AWS Credits**
   - Use your hackathon credits or AWS Educate credits
   - Verify in AWS Billing Console

3. **Configure AWS CLI**
   ```powershell
   aws configure
   ```
   Enter:
   - AWS Access Key ID
   - AWS Secret Access Key  
   - Default region (e.g., `us-east-1`)
   - Default output format: `json`

4. **Verify AWS Access**
   ```powershell
   aws sts get-caller-identity
   ```

## Deployment Steps

### Step 1: Clone and Setup

```powershell
# Clone the repository (if not already done)
git clone <your-repo-url>
cd autonomous-travel-companion

# Make sure you're in the project root directory
```

### Step 2: Deploy Infrastructure

**Option A: Automated Deployment (Recommended)**
```powershell
# Run the deployment script
.\deploy.ps1

# Or specify environment
.\deploy.ps1 -Environment prod
```

**Option B: Manual Deployment**
```powershell
# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd infrastructure && npm install

# Build backend
cd backend && npm run build && cd ..

# Deploy infrastructure
cd infrastructure
cdk bootstrap
cdk deploy --all --require-approval never
cd ..
```

### Step 3: Verify Deployment

```powershell
# Test the API
.\test-api.ps1

# Or test with specific URL
.\test-api.ps1 -ApiUrl "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
```

### Step 4: Start Frontend

```powershell
cd frontend
npm run dev
```

Visit: http://localhost:3000

## What Gets Deployed

### AWS Resources Created

1. **DynamoDB Tables**
   - `TravelCompanion-Users-{env}`
   - `TravelCompanion-Trips-{env}`
   - `TravelCompanion-Bookings-{env}`

2. **S3 Buckets**
   - `travel-companion-itineraries-{env}-{account}`
   - `travel-companion-frontend-{env}-{account}`

3. **Lambda Functions**
   - `TravelCompanion-PlanTrip-{env}`
   - `TravelCompanion-GetTrip-{env}`
   - `TravelCompanion-ListTrips-{env}`
   - `TravelCompanion-CreateBooking-{env}`
   - `TravelCompanion-GetTripBookings-{env}`
   - `TravelCompanion-GetUserBookings-{env}`

4. **API Gateway**
   - REST API with CORS enabled
   - Rate limiting (1000 req/min)
   - CloudWatch logging

5. **CloudFront Distribution**
   - CDN for frontend assets
   - HTTPS enabled

6. **IAM Roles & Policies**
   - Lambda execution roles
   - DynamoDB access policies
   - S3 access policies

## API Endpoints

Once deployed, your API will have these endpoints:

```
GET  /health                    # Health check
POST /plan-trip                 # Create trip plan
GET  /trips                     # List user trips
GET  /trips/{tripId}           # Get specific trip
GET  /trips/{tripId}/bookings  # Get trip bookings
POST /bookings                 # Create booking
GET  /bookings                 # Get user bookings
```

## Environment Variables

The deployment creates these environment files:

**.env** (root)
```
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
API_GATEWAY_URL=https://api-id.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_API_URL=https://api-id.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_APP_NAME=Autonomous Travel Companion
NODE_ENV=dev
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=https://api-id.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_APP_NAME=Autonomous Travel Companion
```

## Testing

### 1. API Testing
```powershell
# Automated API tests
.\test-api.ps1

# Manual testing with curl/Postman
curl -X GET https://your-api-url/health
```

### 2. Frontend Testing
```powershell
cd frontend
npm run dev
# Visit http://localhost:3000
```

### 3. Unit Tests
```powershell
# Backend tests
cd backend
npm test

# Frontend tests (when added)
cd frontend  
npm test
```

## Cost Monitoring

Monitor your AWS costs to stay within the $100 credit limit:

1. **AWS Billing Dashboard**
   - Go to AWS Console > Billing
   - Set up billing alerts

2. **Estimated Monthly Costs**
   - DynamoDB: ~$15 (on-demand)
   - Lambda: ~$10 (1M requests)
   - S3: ~$5 (100GB)
   - API Gateway: ~$10 (1M requests)
   - CloudFront: ~$5
   - **Total: ~$45/month**

## Troubleshooting

### Common Issues

**1. CDK Bootstrap Error**
```
Error: Need to perform AWS CDK bootstrap
```
Solution:
```powershell
cd infrastructure
cdk bootstrap aws://ACCOUNT-ID/REGION
```

**2. Permission Denied**
```
Error: User is not authorized to perform: iam:CreateRole
```
Solution: Ensure your AWS user has Administrator access or required IAM permissions.

**3. Region Mismatch**
```
Error: Stack is in a different region
```
Solution: Ensure AWS CLI region matches CDK deployment region.

**4. Lambda Build Error**
```
Error: Cannot find module in Lambda function
```
Solution:
```powershell
cd backend
npm run build
# Then redeploy
```

### Getting Help

1. **Check CloudWatch Logs**
   - Go to AWS Console > CloudWatch > Logs
   - Look for Lambda function logs

2. **Check API Gateway Logs**
   - Go to AWS Console > API Gateway
   - Check execution logs

3. **Validate Environment**
   ```powershell
   aws sts get-caller-identity
   aws configure list
   ```

## Cleanup

To avoid ongoing charges, clean up resources when done:

```powershell
cd infrastructure
cdk destroy --all
```

This will delete all AWS resources created by the deployment.

## Next Steps

After successful deployment:

1. **Add Bedrock Integration** (Task 7)
2. **Implement Flight/Hotel APIs** (Tasks 8-9)
3. **Add User Authentication**
4. **Deploy Frontend to S3/CloudFront**
5. **Set up CI/CD Pipeline**

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Verify all prerequisites are installed
4. Ensure AWS credentials are properly configured

Happy coding! 🎉