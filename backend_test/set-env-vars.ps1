# Set Environment Variables for Elastic Beanstalk
# Run this from backend_test directory

$env:Path += ";C:\Users\Quagmire\AppData\Roaming\Python\Python313\Scripts"

Write-Host "Setting environment variables for hack-a-holiday-prod..." -ForegroundColor Cyan

# NOTE: Replace all placeholder values with your actual credentials from .env file
eb setenv `
  NODE_ENV=production `
  PORT=8080 `
  AWS_REGION=us-east-1 `
  AWS_ACCOUNT_ID=your-aws-account-id `
  BEDROCK_REGION=us-east-1 `
  REASONING_MODEL=us.amazon.nova-pro-v1:0 `
  FAST_MODEL=us.amazon.nova-lite-v1:0 `
  AWS_ACCESS_KEY_ID=your-aws-access-key-id `
  AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key `
  DYNAMODB_TABLE_PREFIX=TravelCompanion `
  USERS_TABLE=TravelCompanion-Users-dev `
  TRIPS_TABLE=TravelCompanion-Trips-dev `
  JWT_SECRET=your-jwt-secret-minimum-32-characters-long `
  GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com `
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com `
  RAPIDAPI_KEY=your-rapidapi-key `
  RAPIDAPI_HOST=kiwi-com-cheap-flights.p.rapidapi.com `
  BOOKING_API_KEY=your-rapidapi-key `
  BOOKING_API_HOST=booking-com15.p.rapidapi.com `
  NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key `
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com `
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id `
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app `
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id `
  NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id `
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id `
  LOG_LEVEL=info

Write-Host "Environment variables set! This will restart the app..." -ForegroundColor Green
Write-Host "Waiting for restart to complete (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Checking status..." -ForegroundColor Cyan
eb status

Write-Host ""
Write-Host "Checking health..." -ForegroundColor Cyan
eb health
