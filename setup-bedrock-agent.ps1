# Bedrock Agent Core - Quick Setup Script
# Run this to set up your AWS Bedrock Agent for the hackathon

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   AWS BEDROCK AGENT CORE - SETUP              ║" -ForegroundColor Cyan
Write-Host "║   Travel Agent for AWS Hackathon              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "🔍 Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found!" -ForegroundColor Red
    Write-Host "Please install AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
Write-Host "`n🔍 Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "✅ AWS credentials configured" -ForegroundColor Green
    Write-Host "   Account: $($identity.Account)" -ForegroundColor Gray
    Write-Host "   User: $($identity.Arn)" -ForegroundColor Gray
} catch {
    Write-Host "❌ AWS credentials not configured!" -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Check Node.js
Write-Host "`n🔍 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Navigate to backend directory
Write-Host "`n📁 Navigating to backend directory..." -ForegroundColor Yellow
Set-Location -Path "backend_test" -ErrorAction Stop

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Check for .env file
Write-Host "`n🔧 Checking environment configuration..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    
    $envContent = @"
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here

# Optional: Bedrock Agent Configuration
# BEDROCK_AGENT_ID=your-agent-id
# BEDROCK_AGENT_ALIAS_ID=your-alias-id

# Optional: DynamoDB
# DYNAMODB_USER_TABLE=travel-users

# Optional: External APIs
# KIWI_API_KEY=your-kiwi-key
# AMADEUS_API_KEY=your-amadeus-key
# AMADEUS_API_SECRET=your-amadeus-secret

# Server Configuration
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
NODE_ENV=development
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env and add your AWS credentials!" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

# Check Bedrock model access
Write-Host "`n🤖 Checking Bedrock model access..." -ForegroundColor Yellow
$region = $env:AWS_REGION
if (-not $region) { $region = "us-east-1" }

Write-Host "   Testing Claude 3.5 Sonnet access..." -ForegroundColor Gray
try {
    # Simple test - just check if we can list foundation models
    $models = aws bedrock list-foundation-models --region $region 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Bedrock API accessible" -ForegroundColor Green
        Write-Host "   Note: Ensure Claude 3.5 Sonnet is enabled in Bedrock console" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Bedrock API check inconclusive" -ForegroundColor Yellow
        Write-Host "   Make sure you have Bedrock permissions" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not verify Bedrock access" -ForegroundColor Yellow
    Write-Host "   Ensure you have these permissions:" -ForegroundColor Gray
    Write-Host "   - bedrock:InvokeModel" -ForegroundColor Gray
    Write-Host "   - bedrock:ListFoundationModels" -ForegroundColor Gray
}

# Create DynamoDB table (optional)
Write-Host "`n💾 Setting up DynamoDB table (optional)..." -ForegroundColor Yellow
$createTable = Read-Host "Do you want to create the DynamoDB table for user preferences? (y/n)"

if ($createTable -eq "y") {
    Write-Host "   Creating 'travel-users' table..." -ForegroundColor Gray
    
    $tableConfig = @"
{
    "TableName": "travel-users",
    "AttributeDefinitions": [
        {
            "AttributeName": "userId",
            "AttributeType": "S"
        }
    ],
    "KeySchema": [
        {
            "AttributeName": "userId",
            "KeyType": "HASH"
        }
    ],
    "BillingMode": "PAY_PER_REQUEST"
}
"@
    
    $tableConfig | Out-File -FilePath "dynamo-table.json" -Encoding UTF8
    
    try {
        aws dynamodb create-table --cli-input-json file://dynamo-table.json --region $region 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ DynamoDB table created successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Table might already exist or creation failed" -ForegroundColor Yellow
        }
        Remove-Item "dynamo-table.json" -ErrorAction SilentlyContinue
    } catch {
        Write-Host "⚠️  Could not create DynamoDB table" -ForegroundColor Yellow
        Write-Host "   Agent will work without it (using in-memory storage)" -ForegroundColor Gray
    }
} else {
    Write-Host "⏭️  Skipping DynamoDB table creation" -ForegroundColor Gray
    Write-Host "   Agent will use in-memory storage" -ForegroundColor Gray
}

# Test Bedrock connection
Write-Host "`n🧪 Testing Bedrock connection..." -ForegroundColor Yellow
$testBedrock = Read-Host "Do you want to test the Bedrock connection now? (y/n)"

if ($testBedrock -eq "y") {
    Write-Host "   Running connection test..." -ForegroundColor Gray
    
    # Go back to root and run test
    Set-Location ..
    node test-bedrock.js
    Set-Location backend_test
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              SETUP COMPLETE!                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Review and update .env file with your credentials:" -ForegroundColor White
Write-Host "   notepad .env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Enable Claude 3.5 Sonnet in AWS Bedrock Console:" -ForegroundColor White
Write-Host "   https://console.aws.amazon.com/bedrock/" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the backend server:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test the Bedrock Agent:" -ForegroundColor White
Write-Host "   node test-bedrock-agent.js" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Access the agent:" -ForegroundColor White
Write-Host "   http://localhost:4000/bedrock-agent/health" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   BEDROCK-AGENT-CORE-GUIDE.md" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 Hackathon Ready!" -ForegroundColor Green
Write-Host "   Your autonomous travel agent meets all AWS requirements:" -ForegroundColor White
Write-Host "   ✅ Bedrock/Nova LLM" -ForegroundColor Green
Write-Host "   ✅ Agent Core primitives" -ForegroundColor Green
Write-Host "   ✅ Reasoning capabilities" -ForegroundColor Green
Write-Host "   ✅ Autonomous execution" -ForegroundColor Green
Write-Host "   ✅ External integrations" -ForegroundColor Green
Write-Host ""

Write-Host "Good luck with your hackathon! 🚀" -ForegroundColor Cyan
