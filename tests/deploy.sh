#!/bin/bash

# Travel Companion Deployment Script
set -e

echo "🚀 Starting Travel Companion deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-dev}

echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK is not installed. Installing...${NC}"
    npm install -g aws-cdk
fi

# Check AWS credentials
echo -e "${YELLOW}🔐 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"

# Set environment variables
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT
export CDK_DEFAULT_REGION=$AWS_REGION

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Root dependencies
echo "Installing root dependencies..."
npm install

# Backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Infrastructure dependencies
echo "Installing infrastructure dependencies..."
cd infrastructure
npm install
cd ..

# Build backend
echo -e "${YELLOW}🔨 Building backend...${NC}"
cd backend
npm run build
cd ..

# Bootstrap CDK (if needed)
echo -e "${YELLOW}🏗️ Bootstrapping CDK...${NC}"
cd infrastructure
cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION

# Deploy infrastructure
echo -e "${YELLOW}🚀 Deploying infrastructure...${NC}"
cdk deploy --all --require-approval never --context environment=$ENVIRONMENT

# Get outputs
echo -e "${YELLOW}📋 Getting deployment outputs...${NC}"
API_URL=$(aws cloudformation describe-stacks --stack-name "TravelCompanion-Lambda-${ENVIRONMENT}" --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text 2>/dev/null || echo "")
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name "TravelCompanion-S3-${ENVIRONMENT}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" --output text 2>/dev/null || echo "")

cd ..

# Create .env file
echo -e "${YELLOW}⚙️ Creating environment configuration...${NC}"
cat > .env << EOF
# AWS Configuration
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$AWS_ACCOUNT

# API Configuration
API_GATEWAY_URL=$API_URL
NEXT_PUBLIC_API_URL=$API_URL

# Frontend Configuration
NEXT_PUBLIC_APP_NAME=Autonomous Travel Companion
NEXT_PUBLIC_CLOUDFRONT_URL=https://$CLOUDFRONT_URL

# Environment
NODE_ENV=$ENVIRONMENT
ENVIRONMENT=$ENVIRONMENT
EOF

# Copy to frontend
cp .env frontend/.env.local

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "AWS Account: ${AWS_ACCOUNT}"
echo -e "AWS Region: ${AWS_REGION}"
echo -e "API Gateway URL: ${API_URL}"
echo -e "CloudFront URL: https://${CLOUDFRONT_URL}"
echo ""
echo -e "${YELLOW}🧪 Next steps:${NC}"
echo "1. Run tests: npm test"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Test API endpoints using the API Gateway URL above"
echo ""
echo -e "${GREEN}🎉 Happy coding!${NC}"