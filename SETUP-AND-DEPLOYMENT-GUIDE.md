# 🚀 Autonomous Travel Companion - Complete Setup & Deployment Guide

This comprehensive guide will walk you through setting up and deploying the Autonomous Travel Companion, an AI-powered travel planning system built with AWS Bedrock, React/Next.js, and AWS Lambda.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [AWS Infrastructure Deployment](#aws-infrastructure-deployment)
6. [Local Development Setup](#local-development-setup)
7. [Testing & Verification](#testing--verification)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Cost Management](#cost-management)

## 🎯 Project Overview

The Autonomous Travel Companion is a full-stack application that:

- **Frontend**: React/Next.js with TypeScript and Tailwind CSS
- **Backend**: AWS Lambda functions with Node.js/TypeScript
- **AI Engine**: Amazon Bedrock with Claude 3.5 Sonnet
- **Database**: DynamoDB for user data and trip storage
- **Storage**: S3 for itinerary files and assets
- **API**: API Gateway with REST endpoints
- **Infrastructure**: AWS CDK for Infrastructure as Code

### Key Features
- 🤖 AI-powered trip planning using Amazon Bedrock
- ✈️ Flight search and booking recommendations
- 🏨 Hotel recommendations based on budget and preferences
- 🎯 Personalized activity suggestions
- 💰 Budget optimization and cost tracking
- 📱 Responsive web interface
- 🔄 Mock booking system for demonstrations

## 🛠️ Prerequisites

### Required Software

1. **Node.js 18+**
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **npm (comes with Node.js)**
   - Verify: `npm --version`

3. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

4. **AWS CLI v2**
   - Download: https://aws.amazon.com/cli/
   - Verify: `aws --version`

5. **AWS CDK**
   - Install: `npm install -g aws-cdk`
   - Verify: `cdk --version`

### AWS Account Requirements

1. **AWS Account** with administrative access
2. **$100 AWS Credits** (recommended for hackathon/demo)
3. **AWS Services Access**:
   - Amazon Bedrock (Claude 3.5 Sonnet model)
   - DynamoDB
   - Lambda
   - API Gateway
   - S3
   - CloudWatch
   - IAM

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **Internet**: Stable connection for AWS deployments

## 🚀 Initial Setup

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd autonomous-travel-companion
```

### Step 2: Quick Tool Setup (Windows)

For Windows users, run the automated setup script:

```powershell
# Run as Administrator for best results
.\setup-tools.ps1
```

This script will:
- Check for Node.js installation
- Install Chocolatey (if needed)
- Install AWS CLI
- Install AWS CDK globally

### Step 3: Manual Tool Installation

If the automated script doesn't work, install tools manually:

**AWS CLI (Windows)**:
```powershell
# Download and install from https://awscli.amazonaws.com/AWSCLIV2.msi
# Or use Chocolatey:
choco install awscli -y
```

**AWS CDK**:
```bash
npm install -g aws-cdk
```

### Step 4: Verify Installation

```bash
node --version    # Should be 18+
npm --version     # Should be 8+
aws --version     # Should be 2.x
cdk --version     # Should be 2.x
git --version     # Any recent version
```

## ⚙️ Environment Configuration

### Step 1: Configure AWS Credentials

```bash
aws configure
```

Enter your:
- **AWS Access Key ID**: Your AWS access key
- **AWS Secret Access Key**: Your AWS secret key
- **Default region**: `us-east-1` (recommended)
- **Default output format**: `json`

### Step 2: Verify AWS Access

```bash
aws sts get-caller-identity
```

This should return your AWS account ID and user information.

### Step 3: Enable Required AWS Services

1. **Enable Amazon Bedrock**:
   - Go to AWS Console → Bedrock
   - Request access to Claude 3.5 Sonnet model
   - Wait for approval (usually instant)

2. **Verify Service Quotas**:
   - Check Lambda concurrent executions limit
   - Verify DynamoDB read/write capacity limits
   - Confirm S3 bucket creation limits

### Step 4: Create Environment Configuration

⚠️ **SECURITY WARNING**: Never commit `.env` files to Git! They contain sensitive credentials.

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your specific values (this file is git-ignored for security):

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id-here

# API Configuration (will be populated after deployment)
API_GATEWAY_URL=
BEDROCK_AGENT_ID=
BEDROCK_AGENT_ALIAS_ID=TSTALIASID

# External API Keys (Optional - uses mock data if not provided)
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
BOOKING_API_KEY=
FOURSQUARE_API_KEY=

# Database Configuration
DYNAMODB_TABLE_PREFIX=TravelCompanion
S3_BUCKET_NAME=travel-companion-bucket-${AWS_ACCOUNT_ID}

# Frontend Configuration (will be populated after deployment)
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=Autonomous Travel Companion

# Development Configuration
NODE_ENV=development
LOG_LEVEL=info
```

## 🏗️ AWS Infrastructure Deployment

### Option A: Automated Deployment (Recommended)

**Windows**:
```powershell
.\deploy.ps1
```

**Linux/macOS**:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option B: Manual Step-by-Step Deployment

#### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install infrastructure dependencies
cd infrastructure
npm install
cd ..
```

#### Step 2: Build Backend

```bash
cd backend
npm run build
cd ..
```

#### Step 3: Deploy Infrastructure

```bash
cd infrastructure

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy all stacks
cdk deploy --all --require-approval never

cd ..
```

### What Gets Deployed

The deployment creates these AWS resources:

#### DynamoDB Tables
- `TravelCompanion-Users-dev`: User profiles and preferences
- `TravelCompanion-Trips-dev`: Trip plans and itineraries
- `TravelCompanion-Bookings-dev`: Booking confirmations and status

#### S3 Buckets
- `travel-companion-itineraries-dev-{account}`: Itinerary files storage
- `travel-companion-frontend-dev-{account}`: Frontend static assets

#### Lambda Functions
- `TravelCompanion-PlanTrip-dev`: Main trip planning logic
- `TravelCompanion-GetTrip-dev`: Retrieve specific trip details
- `TravelCompanion-ListTrips-dev`: List user's trips
- `TravelCompanion-CreateBooking-dev`: Process booking requests
- `TravelCompanion-GetTripBookings-dev`: Get bookings for a trip
- `TravelCompanion-GetUserBookings-dev`: Get all user bookings

#### API Gateway
- REST API with CORS enabled
- Rate limiting (1000 requests/minute)
- CloudWatch logging enabled
- Custom domain support (optional)

#### CloudFront Distribution
- CDN for frontend assets
- HTTPS enabled
- Global edge locations

#### IAM Roles & Policies
- Lambda execution roles with minimal required permissions
- DynamoDB access policies
- S3 access policies
- Bedrock access policies

## 💻 Local Development Setup

### Step 1: Update Environment Files

After deployment, the scripts automatically update your `.env` files. If needed, manually update:

```bash
# Root .env file
API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev

# Frontend .env.local file
cd frontend
cp ../.env .env.local
```

### Step 2: Start Development Server

```bash
# Start frontend development server
cd frontend
npm run dev
```

Visit: http://localhost:3000

### Step 3: Backend Development

The backend runs on AWS Lambda, but you can test functions locally:

```bash
cd backend
npm run build
npm test
```

## 🧪 Testing & Verification

### Step 1: API Testing

Use the provided test script:

```powershell
# Windows
.\test-api.ps1

# Or with specific API URL
.\test-api.ps1 -ApiUrl "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
```

**Linux/macOS**:
```bash
# Manual API testing
curl -X GET "https://your-api-url/health"
```

### Step 2: Frontend Testing

1. **Open the application**: http://localhost:3000
2. **Test trip planning form**:
   - Enter destination: "Paris, France"
   - Set budget: $2000
   - Duration: 5 days
   - Select interests: culture, food, museums
   - Submit form

3. **Verify response**:
   - Check for loading states
   - Verify itinerary display
   - Test booking functionality

### Step 3: End-to-End Testing

```bash
# Run all tests
npm test

# Run specific test suites
cd backend && npm test
cd frontend && npm test
```

### Step 4: Performance Testing

```bash
# Test API performance
curl -w "@curl-format.txt" -X GET "https://your-api-url/health"
```

## 🌐 Production Deployment

### Step 1: Production Environment

Deploy to production environment:

```powershell
# Windows
.\deploy.ps1 -Environment prod

# Linux/macOS
./deploy.sh prod
```

### Step 2: Frontend Production Build

```bash
cd frontend
npm run build
npm run start
```

### Step 3: Domain Configuration (Optional)

1. **Register domain** in Route 53
2. **Create SSL certificate** in ACM
3. **Configure CloudFront** with custom domain
4. **Update DNS records**

### Step 4: CI/CD Pipeline (Optional)

Set up automated deployment:

1. **GitHub Actions** or **AWS CodePipeline**
2. **Automated testing** on pull requests
3. **Staging environment** for testing
4. **Production deployment** on main branch

## � Securlity Best Practices

### Environment Variables Security

**❌ NEVER DO THIS:**
- Don't commit `.env` files to Git
- Don't share environment files in chat/email
- Don't hardcode secrets in source code
- Don't use production credentials in development

**✅ DO THIS:**
- Use `.env.example` as a template (safe to commit)
- Keep actual `.env` files local only
- Use different credentials for dev/staging/prod
- Rotate API keys regularly
- Use AWS IAM roles instead of access keys when possible

### Git Security Check

Before committing, always verify no secrets are included:

```bash
# Check what files are being committed
git status

# Check for accidentally staged .env files
git ls-files | grep -E "\\.env$"

# If you find .env files tracked by git, remove them:
git rm --cached .env
git commit -m "Remove .env file from tracking"
```

### AWS Credentials Security

1. **Use IAM roles** instead of access keys when possible
2. **Enable MFA** on your AWS account
3. **Use least privilege** principle for IAM policies
4. **Rotate credentials** regularly
5. **Monitor usage** in CloudTrail

## 🔧 Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Error
```
Error: Need to perform AWS CDK bootstrap
```

**Solution**:
```bash
cd infrastructure
cdk bootstrap aws://ACCOUNT-ID/REGION
```

#### 2. Permission Denied
```
Error: User is not authorized to perform: iam:CreateRole
```

**Solution**: Ensure your AWS user has Administrator access or required IAM permissions.

#### 3. Region Mismatch
```
Error: Stack is in a different region
```

**Solution**: Ensure AWS CLI region matches CDK deployment region:
```bash
aws configure set region us-east-1
```

#### 4. Lambda Build Error
```
Error: Cannot find module in Lambda function
```

**Solution**:
```bash
cd backend
rm -rf node_modules dist
npm install
npm run build
# Then redeploy
```

#### 5. Frontend Build Error
```
Error: Module not found
```

**Solution**:
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run build
```

#### 6. API Gateway CORS Error
```
Error: CORS policy blocks request
```

**Solution**: Verify CORS configuration in API Gateway or redeploy infrastructure.

### Debugging Steps

1. **Check CloudWatch Logs**:
   - AWS Console → CloudWatch → Logs
   - Look for Lambda function logs
   - Check API Gateway execution logs

2. **Verify Environment Variables**:
   ```bash
   aws lambda get-function-configuration --function-name TravelCompanion-PlanTrip-dev
   ```

3. **Test Individual Components**:
   ```bash
   # Test DynamoDB access
   aws dynamodb list-tables
   
   # Test S3 access
   aws s3 ls
   
   # Test Bedrock access
   aws bedrock list-foundation-models
   ```

4. **Check Resource Status**:
   ```bash
   # Check stack status
   aws cloudformation describe-stacks --stack-name TravelCompanion-Lambda-dev
   ```

### Getting Help

1. **AWS Documentation**: https://docs.aws.amazon.com/
2. **CDK Documentation**: https://docs.aws.amazon.com/cdk/
3. **Next.js Documentation**: https://nextjs.org/docs
4. **Project Issues**: Create GitHub issue with error details

## 💰 Cost Management

### Estimated Monthly Costs

Within $100 AWS credits:

| Service | Estimated Cost | Usage |
|---------|---------------|-------|
| Amazon Bedrock (Claude) | $30-50 | 10K-20K requests |
| Lambda | $5-10 | 1M requests |
| DynamoDB | $10-15 | On-demand pricing |
| S3 | $3-5 | 100GB storage |
| API Gateway | $5-10 | 1M requests |
| CloudFront | $2-5 | Global distribution |
| CloudWatch | $3-5 | Logs and metrics |
| **Total** | **$58-105** | **Monthly estimate** |

### Cost Optimization Tips

1. **Use On-Demand Pricing** for DynamoDB during development
2. **Enable S3 Lifecycle Policies** for old itinerary files
3. **Set CloudWatch Log Retention** to 7-14 days
4. **Use Lambda Provisioned Concurrency** only for production
5. **Monitor costs daily** in AWS Billing Dashboard

### Cost Monitoring Setup

1. **Create Billing Alerts**:
   ```bash
   aws budgets create-budget --account-id YOUR-ACCOUNT-ID --budget file://budget.json
   ```

2. **Set up Cost Explorer**:
   - AWS Console → Cost Explorer
   - Create custom reports
   - Set up daily cost notifications

3. **Use AWS Cost Calculator**:
   - Estimate costs before deployment
   - Plan for scaling scenarios

## 🎯 Next Steps

After successful deployment:

### Immediate Tasks
1. **Test all API endpoints** using the test script
2. **Verify frontend functionality** with sample data
3. **Check CloudWatch logs** for any errors
4. **Monitor initial costs** in AWS Billing

### Development Tasks
1. **Implement Bedrock AI integration** (Task 7)
2. **Add external travel APIs** (Tasks 8-9)
3. **Build remaining frontend components** (Tasks 16-18)
4. **Add user authentication** (Task 20)

### Production Readiness
1. **Set up monitoring and alerting**
2. **Implement comprehensive error handling**
3. **Add performance optimization**
4. **Create backup and disaster recovery plan**

### Demo Preparation
1. **Create realistic demo data**
2. **Prepare demo scenarios**
3. **Test complete user journey**
4. **Create presentation materials**

## 📚 Additional Resources

### Documentation
- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/)
- [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tutorials
- [AWS Lambda with TypeScript](https://docs.aws.amazon.com/lambda/latest/dg/lambda-typescript.html)
- [DynamoDB with Node.js](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.html)
- [React with TypeScript](https://react-typescript-cheatsheet.netlify.app/)

### Tools
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [Postman for API Testing](https://www.postman.com/)

---

## 🎉 Congratulations!

You've successfully set up and deployed the Autonomous Travel Companion! The system is now ready for development and testing.

**Happy coding and safe travels!** ✈️🏨🎯

---

*Last updated: December 2024*
*Version: 1.0.0*