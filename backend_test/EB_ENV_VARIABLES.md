# Environment Variables for AWS Elastic Beanstalk

## Copy these from your .env file and set them in EB

### Required AWS Settings
NODE_ENV=production
PORT=8080

### API Keys
RAPIDAPI_KEY=your_rapidapi_key_here

### AWS Bedrock Settings
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
FAST_MODEL=us.amazon.nova-lite-v1:0
AI_MODEL=us.amazon.nova-pro-v1:0

### DynamoDB
DYNAMODB_TABLE=HackAHolidayUsers

### Frontend URL (Update with your actual frontend domain)
FRONTEND_URL=https://your-frontend-domain.com

### JWT Secret
JWT_SECRET=your_jwt_secret_here

### Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

### Logging
LOG_LEVEL=info

---

## Quick Command to Set All Variables

```powershell
# Run this from backend_test directory
# Replace all "your_*_here" values with actual values from your .env file

eb setenv `
  NODE_ENV=production `
  PORT=8080 `
  RAPIDAPI_KEY=your_rapidapi_key_here `
  AWS_REGION=us-east-1 `
  AWS_ACCESS_KEY_ID=your_aws_access_key_here `
  AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here `
  FAST_MODEL=us.amazon.nova-lite-v1:0 `
  AI_MODEL=us.amazon.nova-pro-v1:0 `
  DYNAMODB_TABLE=HackAHolidayUsers `
  FRONTEND_URL=https://your-frontend-domain.com `
  JWT_SECRET=your_jwt_secret_here `
  NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key `
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain `
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id `
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket `
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id `
  NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id `
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id `
  LOG_LEVEL=info
```

## Verify Variables Are Set

```powershell
eb printenv
```
