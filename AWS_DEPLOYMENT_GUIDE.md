# AWS Elastic Beanstalk Deployment Guide
## Backend Deployment with CodePipeline

This guide will help you deploy the `backend_test` backend to AWS Elastic Beanstalk with automated CI/CD using CodePipeline.

---

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **EB CLI** (Elastic Beanstalk Command Line Interface)
4. **GitHub repository** with your code

### Install AWS CLI
```powershell
# Windows (using Chocolatey)
choco install awscli

# Or download from: https://aws.amazon.com/cli/
```

### Install EB CLI
```powershell
pip install awsebcli --upgrade --user
```

### Configure AWS CLI
```powershell
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

---

## 🚀 Step 1: Initialize Elastic Beanstalk

```powershell
# Navigate to backend_test directory
cd backend_test

# Initialize Elastic Beanstalk
eb init

# Follow the prompts:
# 1. Select region (e.g., us-east-1)
# 2. Select "Create new Application"
# 3. Application name: hack-a-holiday-backend
# 4. Platform: Node.js
# 5. Platform version: Node.js 18 running on 64bit Amazon Linux 2023
# 6. CodeCommit: No (we'll use GitHub)
# 7. SSH: Yes (recommended for debugging)
```

---

## 🏗️ Step 2: Create Elastic Beanstalk Environment

```powershell
# Create production environment
eb create hack-a-holiday-prod --single --instance-types t3.small

# Options explained:
# - hack-a-holiday-prod: Environment name
# - --single: Single instance (no load balancer for cost savings)
# - --instance-types t3.small: EC2 instance type

# This will take 5-10 minutes...
```

---

## ⚙️ Step 3: Set Environment Variables

You need to set all your environment variables from `.env` in the EB environment:

```powershell
# Set environment variables (replace with your actual values)
eb setenv \
  NODE_ENV=production \
  PORT=8080 \
  RAPIDAPI_KEY=your_rapidapi_key \
  AWS_REGION=us-east-1 \
  AWS_ACCESS_KEY_ID=your_aws_access_key \
  AWS_SECRET_ACCESS_KEY=your_aws_secret_key \
  FAST_MODEL=us.amazon.nova-lite-v1:0 \
  AI_MODEL=us.amazon.nova-pro-v1:0 \
  DYNAMODB_TABLE=HackAHolidayUsers \
  FRONTEND_URL=https://your-frontend-domain.com \
  JWT_SECRET=your_jwt_secret \
  NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id \
  NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id \
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Note: Use your actual values from the .env file
```

**Alternative: Use AWS Console**
1. Go to Elastic Beanstalk Console
2. Select your environment
3. Configuration → Software → Environment properties
4. Add all variables from your `.env` file

---

## 🔄 Step 4: Set Up CodePipeline for CI/CD

### Option A: Using AWS Console (Recommended for First Time)

1. **Go to CodePipeline Console**: https://console.aws.amazon.com/codesuite/codepipeline/pipelines

2. **Create Pipeline**:
   - Click "Create pipeline"
   - Pipeline name: `hack-a-holiday-backend-pipeline`
   - Service role: New service role
   - Click "Next"

3. **Add Source Stage**:
   - Source provider: **GitHub (Version 2)**
   - Click "Connect to GitHub"
   - Connection name: `github-connection`
   - Authorize AWS to access your GitHub
   - Repository: `VarunGagwani/Hack-A-Holiday`
   - Branch: `main` (or `professional-ui-redesign-v1`)
   - Change detection: **Start pipeline on source code change**
   - Output artifact format: **CodePipeline default**
   - Click "Next"

4. **Add Build Stage**:
   - Build provider: **AWS CodeBuild**
   - Click "Create project"
   - Project name: `hack-a-holiday-backend-build`
   - Environment:
     - Managed image
     - Operating system: Amazon Linux 2
     - Runtime: Standard
     - Image: aws/codebuild/amazonlinux2-x86_64-standard:5.0
     - Environment type: Linux
   - Buildspec:
     - Use a buildspec file
     - Buildspec name: `buildspec.yml`
   - Click "Continue to CodePipeline"
   - Click "Next"

5. **Add Deploy Stage**:
   - Deploy provider: **AWS Elastic Beanstalk**
   - Application name: `hack-a-holiday-backend` (select from dropdown)
   - Environment name: `hack-a-holiday-prod` (select from dropdown)
   - Click "Next"

6. **Review and Create**:
   - Review all settings
   - Click "Create pipeline"

### Option B: Using AWS CLI

```powershell
# Create CodePipeline using CloudFormation (advanced)
# See the cloudformation template below
```

---

## 📦 Step 5: Deploy Your Code

### Initial Deployment (Manual)
```powershell
cd backend_test
eb deploy
```

### Automated Deployment (After CodePipeline Setup)
```powershell
# Simply push to your branch
git add .
git commit -m "Deploy to production"
git push origin main

# CodePipeline will automatically:
# 1. Detect the push
# 2. Run CodeBuild (using buildspec.yml)
# 3. Deploy to Elastic Beanstalk
```

---

## 🔍 Step 6: Monitor and Verify

### Check Application Health
```powershell
eb health
eb status
```

### View Logs
```powershell
eb logs
```

### Open Application in Browser
```powershell
eb open
```

### Test Your API
```powershell
# Get your EB URL
$EB_URL = eb status | Select-String "CNAME" | ForEach-Object { $_.ToString().Split(":")[1].Trim() }

# Test health endpoint
Invoke-RestMethod -Uri "http://$EB_URL/" -Method Get
```

---

## 🔧 Common Commands

```powershell
# Check environment status
eb status

# View recent logs
eb logs

# SSH into instance
eb ssh

# Update environment configuration
eb config

# List all environments
eb list

# Terminate environment (careful!)
eb terminate hack-a-holiday-prod

# Scale environment
eb scale 2  # Scale to 2 instances
```

---

## 🎯 Architecture Overview

```
GitHub Repository
      ↓
CodePipeline (Triggered on push)
      ↓
CodeBuild (Runs buildspec.yml)
      ↓
Elastic Beanstalk (Deploys to EC2)
      ↓
Your Backend API (Running on Port 8080)
```

---

## 📝 Files Created for Deployment

1. **`.ebextensions/01_environment.config`** - Node.js and environment settings
2. **`.ebextensions/02_logs.config`** - Logging configuration
3. **`.ebignore`** - Files to exclude from deployment
4. **`app.js`** - Production-ready server with health checks
5. **`buildspec.yml`** - CodeBuild instructions (already exists, updated)

---

## 🔐 IAM Permissions Required

Your AWS user needs these permissions:
- `AWSElasticBeanstalkFullAccess`
- `AWSCodePipelineFullAccess`
- `AWSCodeBuildAdminAccess`
- `AmazonS3FullAccess` (for artifact storage)
- `IAMFullAccess` (to create service roles)

---

## 💰 Cost Estimates

**Free Tier Eligible:**
- 750 hours/month of t2.micro/t3.micro instances
- First year free

**Estimated Monthly Cost (After Free Tier):**
- t3.small instance: ~$15-20/month
- Data transfer: ~$5-10/month
- Total: ~$20-30/month

---

## 🐛 Troubleshooting

### Build Fails
```powershell
# Check CodeBuild logs in AWS Console
# Or view EB logs
eb logs
```

### Environment Variables Not Set
```powershell
# Verify environment variables
eb printenv
```

### Port Issues
- Ensure `PORT=8080` is set (EB uses 8080 internally)
- Your app should listen on `process.env.PORT || 8080`

### CORS Issues
- Update `FRONTEND_URL` environment variable
- Check `app.js` CORS configuration

---

## 🔄 Updating Your Deployment

### Manual Update
```powershell
cd backend_test
git pull origin main
eb deploy
```

### Automatic Updates (With CodePipeline)
```powershell
# Just push to your branch
git push origin main

# Pipeline will automatically deploy
```

---

## 🎉 Success Checklist

- [ ] EB CLI installed and configured
- [ ] Elastic Beanstalk environment created
- [ ] All environment variables set
- [ ] CodePipeline connected to GitHub
- [ ] First deployment successful
- [ ] Health check endpoint returning 200
- [ ] API endpoints working correctly
- [ ] Frontend can connect to backend

---

## 📚 Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS CodePipeline Documentation](https://docs.aws.amazon.com/codepipeline/)
- [EB CLI Reference](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)

---

## 🆘 Need Help?

1. Check EB logs: `eb logs`
2. Check CodeBuild logs in AWS Console
3. Review CloudWatch logs
4. SSH into instance: `eb ssh`

---

**Ready to deploy? Start with Step 1! 🚀**
