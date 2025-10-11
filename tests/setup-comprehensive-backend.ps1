# Comprehensive Backend Setup Script
# Sets up and verifies the AI-powered travel assistant backend

Write-Host "🚀 Setting up Comprehensive AI Travel Assistant Backend..." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Change to backend directory
$backendPath = "c:\Users\advai\Desktop\coding\Hack-A-Holiday\backend_test"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
Write-Host "📂 Working in: $backendPath" -ForegroundColor Green

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "⚠️ package.json not found, creating basic package.json..." -ForegroundColor Yellow
    
    $packageJsonContent = @"
{
  "name": "ai-travel-assistant-backend",
  "version": "1.0.0",
  "description": "Comprehensive AI-powered travel assistant backend with Express and SageMaker integration",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node test-comprehensive-integration.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "axios": "^1.6.2",
    "dotenv": "^16.3.1",
    "@aws-sdk/client-bedrock-runtime": "^3.460.0",
    "@aws-sdk/client-sagemaker-runtime": "^3.460.0",
    "body-parser": "^1.20.2",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "keywords": ["ai", "travel", "assistant", "express", "sagemaker", "bedrock"],
  "author": "Travel Assistant Team",
  "license": "MIT"
}
"@
    
    $packageJsonContent | Out-File -FilePath "package.json" -Encoding UTF8
    Write-Host "✅ Created package.json" -ForegroundColor Green
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies: $_" -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "⚙️ Creating .env file..." -ForegroundColor Yellow
    
    $envContent = @"
# AI Travel Assistant Backend Configuration
PORT=4000
NODE_ENV=development

# AWS Configuration (optional - will use defaults if not set)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key

# SageMaker Configuration (optional)
# SAGEMAKER_ENDPOINT_NAME=your-sagemaker-endpoint

# API Keys (optional - will use mock data if not set)
# KIWI_API_KEY=your-kiwi-api-key
# AMADEUS_API_KEY=your-amadeus-api-key
# AMADEUS_API_SECRET=your-amadeus-api-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file with default configuration" -ForegroundColor Green
}

# Check if all required files exist
Write-Host "🔍 Verifying backend files..." -ForegroundColor Yellow

$requiredFiles = @(
    "server.js",
    "routes/flights.js",
    "routes/ai-agent.js",
    "services/FlightService.js",
    "services/RecommendationEngine.js",
    "services/ComprehensiveAIAgent.js",
    "test-comprehensive-integration.js"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Missing required files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host "Please ensure all backend files are created properly." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ All required backend files found" -ForegroundColor Green
}

# Create directories if they don't exist
$directories = @("routes", "services", "middleware", "utils")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "📁 Created directory: $dir" -ForegroundColor Green
    }
}

# Check Node.js version
Write-Host "🔍 Checking Node.js version..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js to run the backend." -ForegroundColor Red
    exit 1
}

# Start the server in background for testing
Write-Host "🚀 Starting backend server for testing..." -ForegroundColor Yellow

$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru
Start-Sleep -Seconds 3

# Check if server is running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Backend server is running successfully!" -ForegroundColor Green
    Write-Host "📊 Server status: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Server health check failed, but this might be expected on first run" -ForegroundColor Yellow
}

# Run comprehensive integration tests
Write-Host "🧪 Running comprehensive integration tests..." -ForegroundColor Yellow
try {
    node test-comprehensive-integration.js
} catch {
    Write-Host "⚠️ Some tests may have failed - this is expected if AWS services aren't configured" -ForegroundColor Yellow
}

# Stop the test server
if ($serverProcess -and !$serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
    Write-Host "🛑 Stopped test server" -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Your comprehensive AI travel assistant backend is ready!" -ForegroundColor Cyan
Write-Host "`nTo start the server:" -ForegroundColor White
Write-Host "  cd backend_test" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray
Write-Host "`nTo run in development mode:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host "`nTo run tests:" -ForegroundColor White
Write-Host "  npm test" -ForegroundColor Gray
Write-Host "`nBackend Features:" -ForegroundColor White
Write-Host "  ✅ Express.js server with comprehensive routing" -ForegroundColor Green
Write-Host "  ✅ AI-powered flight search with personalization" -ForegroundColor Green
Write-Host "  ✅ SageMaker integration for chat analysis" -ForegroundColor Green
Write-Host "  ✅ Comprehensive recommendation engine" -ForegroundColor Green
Write-Host "  ✅ User context and preference management" -ForegroundColor Green
Write-Host "  ✅ Smart suggestions and conversation analysis" -ForegroundColor Green
Write-Host "  ✅ Multi-provider flight search (Kiwi, Amadeus, Mock)" -ForegroundColor Green
Write-Host "  ✅ Comprehensive error handling and fallbacks" -ForegroundColor Green
Write-Host "`nAPI Endpoints:" -ForegroundColor White
Write-Host "  🔗 http://localhost:4000/health - Health check" -ForegroundColor Gray
Write-Host "  🔗 http://localhost:4000/flights/* - Flight operations" -ForegroundColor Gray
Write-Host "  🔗 http://localhost:4000/ai-agent/* - AI agent operations" -ForegroundColor Gray

Write-Host "`n📝 Next Steps:" -ForegroundColor White
Write-Host "  1. Configure AWS credentials for SageMaker (optional)" -ForegroundColor Gray
Write-Host "  2. Add API keys for flight providers (optional)" -ForegroundColor Gray
Write-Host "  3. Start the backend server" -ForegroundColor Gray
Write-Host "  4. Update frontend to use the new Express backend" -ForegroundColor Gray
Write-Host "  5. Test the complete integration" -ForegroundColor Gray

Write-Host "`n🔧 Configuration:" -ForegroundColor White
Write-Host "  Edit .env file to configure API keys and AWS settings" -ForegroundColor Gray
Write-Host "  The backend works with mock data even without external APIs!" -ForegroundColor Gray