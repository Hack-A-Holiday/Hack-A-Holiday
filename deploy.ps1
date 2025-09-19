# Travel Companion Deployment Script for Windows
param(
    [string]$Environment = "dev"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Travel Companion deployment..." -ForegroundColor Blue
Write-Host "Environment: $Environment" -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
try {
    node --version | Out-Null
    Write-Host "✅ Node.js found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if CDK is installed
try {
    cdk --version | Out-Null
    Write-Host "✅ AWS CDK found" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CDK is not installed. Installing..." -ForegroundColor Yellow
    npm install -g aws-cdk
}

# Check AWS credentials
Write-Host "🔐 Checking AWS credentials..." -ForegroundColor Yellow
try {
    $callerIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $awsAccount = $callerIdentity.Account
    Write-Host "✅ AWS Account: $awsAccount" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS credentials not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

try {
    $awsRegion = aws configure get region
    if (-not $awsRegion) {
        $awsRegion = "us-east-1"
        Write-Host "⚠️ No default region set, using us-east-1" -ForegroundColor Yellow
    }
    Write-Host "✅ AWS Region: $awsRegion" -ForegroundColor Green
} catch {
    $awsRegion = "us-east-1"
    Write-Host "⚠️ Using default region: us-east-1" -ForegroundColor Yellow
}

# Set environment variables
$env:CDK_DEFAULT_ACCOUNT = $awsAccount
$env:CDK_DEFAULT_REGION = $awsRegion

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Root dependencies
Write-Host "Installing root dependencies..."
npm install

# Backend dependencies
Write-Host "Installing backend dependencies..."
Set-Location backend
npm install
Set-Location ..

# Frontend dependencies  
Write-Host "Installing frontend dependencies..."
Set-Location frontend
npm install
Set-Location ..

# Infrastructure dependencies
Write-Host "Installing infrastructure dependencies..."
Set-Location infrastructure
npm install

# Build backend
Write-Host "🔨 Building backend..." -ForegroundColor Yellow
Set-Location ../backend
npm run build
Set-Location ../infrastructure

# Bootstrap CDK (if needed)
Write-Host "🏗️ Bootstrapping CDK..." -ForegroundColor Yellow
cdk bootstrap "aws://$awsAccount/$awsRegion"

# Deploy infrastructure
Write-Host "🚀 Deploying infrastructure..." -ForegroundColor Yellow
cdk deploy --all --require-approval never --context environment=$Environment

# Get outputs
Write-Host "📋 Getting deployment outputs..." -ForegroundColor Yellow
try {
    $apiUrl = aws cloudformation describe-stacks --stack-name "TravelCompanion-Lambda-$Environment" --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text 2>$null
} catch {
    $apiUrl = ""
}

try {
    $cloudFrontUrl = aws cloudformation describe-stacks --stack-name "TravelCompanion-S3-$Environment" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" --output text 2>$null
} catch {
    $cloudFrontUrl = ""
}

Set-Location ..

# Create .env file
Write-Host "⚙️ Creating environment configuration..." -ForegroundColor Yellow
$envContent = @"
# AWS Configuration
AWS_REGION=$awsRegion
AWS_ACCOUNT_ID=$awsAccount

# API Configuration
API_GATEWAY_URL=$apiUrl
NEXT_PUBLIC_API_URL=$apiUrl

# Frontend Configuration
NEXT_PUBLIC_APP_NAME=Autonomous Travel Companion
NEXT_PUBLIC_CLOUDFRONT_URL=https://$cloudFrontUrl

# Environment
NODE_ENV=$Environment
ENVIRONMENT=$Environment
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

# Copy to frontend
Copy-Item ".env" "frontend/.env.local"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Deployment Summary:" -ForegroundColor Blue
Write-Host "Environment: $Environment"
Write-Host "AWS Account: $awsAccount"
Write-Host "AWS Region: $awsRegion"
Write-Host "API Gateway URL: $apiUrl"
Write-Host "CloudFront URL: https://$cloudFrontUrl"
Write-Host ""
Write-Host "🧪 Next steps:" -ForegroundColor Yellow
Write-Host "1. Run tests: npm test"
Write-Host "2. Start frontend: cd frontend && npm run dev"
Write-Host "3. Test API endpoints using the API Gateway URL above"
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Green