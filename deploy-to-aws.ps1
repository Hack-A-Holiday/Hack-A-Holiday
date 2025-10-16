# AWS Elastic Beanstalk Deployment Script
# Run this from the repository root

Write-Host "🚀 Starting AWS Elastic Beanstalk Deployment" -ForegroundColor Green
Write-Host ""

# Add EB CLI to PATH
$env:Path += ";C:\Users\Quagmire\AppData\Roaming\Python\Python313\Scripts"

# Navigate to backend_test
Set-Location backend_test

Write-Host "📦 Step 1: Initializing Elastic Beanstalk..." -ForegroundColor Cyan
Write-Host "You will be asked a few questions:" -ForegroundColor Yellow
Write-Host "  - Region: Choose us-east-1 - recommended" -ForegroundColor Yellow
Write-Host "  - Application: Enter hack-a-holiday-backend" -ForegroundColor Yellow
Write-Host "  - Platform: Choose Node.js" -ForegroundColor Yellow
Write-Host "  - Platform version: Choose Node.js 18 running on 64bit Amazon Linux 2023" -ForegroundColor Yellow
Write-Host "  - CodeCommit: Choose n - No" -ForegroundColor Yellow
Write-Host "  - SSH: Choose Y - Yes, recommended" -ForegroundColor Yellow
Write-Host ""

# Initialize EB
eb init

Write-Host ""
Write-Host "✅ Initialization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Step 2: Creating environment..." -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow

# Create environment
eb create hack-a-holiday-prod --single --instance-types t3.small

Write-Host ""
Write-Host "✅ Environment created!" -ForegroundColor Green
Write-Host ""
Write-Host "⚙️ Step 3: Setting environment variables..." -ForegroundColor Cyan
Write-Host "⚠️ IMPORTANT: You need to set these manually!" -ForegroundColor Red
Write-Host "See EB_ENV_VARIABLES.md for the complete list" -ForegroundColor Yellow
Write-Host ""
Write-Host "Quick command to set them:" -ForegroundColor Yellow
Write-Host 'eb setenv NODE_ENV=production PORT=8080 RAPIDAPI_KEY=your_key ...' -ForegroundColor White
Write-Host ""

Write-Host "📊 Checking deployment status..." -ForegroundColor Cyan
eb status

Write-Host ""
Write-Host "🎉 Deployment process initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set environment variables (see EB_ENV_VARIABLES.md)" -ForegroundColor White
Write-Host "2. Deploy your code: eb deploy" -ForegroundColor White
Write-Host "3. Open your app: eb open" -ForegroundColor White
Write-Host "4. Set up CodePipeline in AWS Console - see AWS_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host ""
