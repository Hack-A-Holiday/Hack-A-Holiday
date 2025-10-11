# Simple Backend Setup Script

Write-Host "Setting up AI Travel Assistant Backend..." -ForegroundColor Green

# Navigate to backend directory
$backendPath = "backend_test"
if (-not (Test-Path $backendPath)) {
    New-Item -ItemType Directory -Path $backendPath
}

Set-Location $backendPath
Write-Host "Working in: $(Get-Location)" -ForegroundColor Cyan

# Create package.json if it doesn't exist
if (-not (Test-Path "package.json")) {
    Write-Host "Creating package.json..." -ForegroundColor Yellow
    
    $packageContent = @"
{
  "name": "ai-travel-assistant-backend",
  "version": "1.0.0",
  "description": "AI-powered travel assistant backend",
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
  }
}
"@
    
    $packageContent | Out-File -FilePath "package.json" -Encoding UTF8
    Write-Host "Created package.json" -ForegroundColor Green
}

# Create .env file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    $envContent = @"
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Created .env file" -ForegroundColor Green
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Setup complete! Run 'npm start' to start the server." -ForegroundColor Green