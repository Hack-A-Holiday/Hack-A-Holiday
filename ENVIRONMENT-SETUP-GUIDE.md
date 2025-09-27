# 🔐 Environment Files Setup Guide

**FOR TEAM MEMBERS ONLY** - Contains sensitive configuration information

## 📁 Required Environment Files

Your project needs **TWO** environment files in specific locations:

### 1. **Root Directory**: `.env`
**Location**: `Hack-A-Holiday/.env` (project root)

### 2. **Frontend Directory**: `.env.local` 
**Location**: `Hack-A-Holiday/frontend/.env.local`

---

## 🚨 SECURITY WARNING

⚠️ **NEVER COMMIT THESE FILES TO GIT!** ⚠️
- These files contain sensitive API keys and secrets
- They are already in `.gitignore` - keep it that way
- Share them securely (encrypted message, secure file sharing)
- Each team member needs their own copy

---

## 📋 Environment File Contents

### 1. Root `.env` File

Create `Hack-A-Holiday/.env` with this content:

```bash
# =============================================================================
# TRAVEL COMPANION - ROOT ENVIRONMENT CONFIGURATION
# =============================================================================

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=105340476573

# API Configuration (DEPLOYED VALUES - DO NOT CHANGE)
API_GATEWAY_URL=https://2kojttfgyb.execute-api.us-east-1.amazonaws.com/dev/
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0

# Database Configuration (DEPLOYED VALUES)
DYNAMODB_TABLE_PREFIX=TravelCompanion
S3_BUCKET_NAME=travel-companion-itineraries-dev-105340476573

# Authentication Configuration (⚠️ REQUIRED - GET FROM TEAM LEAD)
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters-long-random-string
GOOGLE_CLIENT_ID=your-google-oauth-client-id-from-google-console

# External API Keys (Optional - uses mock data if not provided)
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
BOOKING_API_KEY=
FOURSQUARE_API_KEY=

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://2kojttfgyb.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_APP_NAME=Autonomous Travel Companion

# Development Configuration
NODE_ENV=development
LOG_LEVEL=info
```

### 2. Frontend `.env.local` File

Create `Hack-A-Holiday/frontend/.env.local` with this content:

```bash
# =============================================================================
# TRAVEL COMPANION - FRONTEND ENVIRONMENT CONFIGURATION
# =============================================================================

# API Configuration
NEXT_PUBLIC_API_URL=https://2kojttfgyb.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_APP_NAME=Autonomous Travel Companion

# Firebase Configuration (⚠️ REQUIRED - GET FROM TEAM LEAD)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Authentication
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id-from-google-console

# Development
NODE_ENV=development
```

---

## 🔑 Required Secrets from Team Lead

Your team lead needs to provide these **REQUIRED** values:

### 🔐 Authentication Secrets
```bash
# 1. JWT Secret (32+ characters, cryptographically secure)
JWT_SECRET=ask-team-lead-for-secure-jwt-secret

# 2. Google OAuth Client ID
GOOGLE_CLIENT_ID=ask-team-lead-for-google-client-id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=same-as-above
```

### 🔥 Firebase Configuration
```bash
# All Firebase values (get from team lead's Firebase console)
NEXT_PUBLIC_FIREBASE_API_KEY=ask-team-lead
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ask-team-lead
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ask-team-lead
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ask-team-lead
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=ask-team-lead
NEXT_PUBLIC_FIREBASE_APP_ID=ask-team-lead
```

---

## 📂 File Locations

```
Hack-A-Holiday/
├── .env                    ← ROOT environment file
├── frontend/
│   ├── .env.local         ← FRONTEND environment file
│   └── ...
├── backend/
└── infrastructure/
```

---

## ✅ Setup Instructions

### Step 1: Create the Files
```bash
# In project root
cd Hack-A-Holiday
touch .env

# In frontend directory  
cd frontend
touch .env.local
```

### Step 2: Copy Content
- Copy the content above into each respective file
- Replace the placeholder values with actual secrets from team lead

### Step 3: Verify Setup
```bash
# Check files exist and are git-ignored
git status
# Should NOT show .env or .env.local files
```

### Step 4: Test the Application
```bash
# Install dependencies
npm install

# Start frontend
cd frontend
npm run dev

# Open http://localhost:3000
```

---

## 🚨 Troubleshooting

### "Authentication not working"
- Check `GOOGLE_CLIENT_ID` is set in both files
- Verify `JWT_SECRET` is at least 32 characters
- Ensure Firebase config values are correct

### "API calls failing"
- Verify `NEXT_PUBLIC_API_URL` matches deployed API
- Check AWS region is `us-east-1`
- Confirm you have the deployed API Gateway URL

### "Environment variables not loading"
- Frontend env vars must start with `NEXT_PUBLIC_`
- Restart development server after changing `.env.local`
- Root `.env` variables are for backend/deployment only

---

## 🔒 Security Best Practices

1. **Never commit these files** - they're in `.gitignore` for a reason
2. **Use secure file sharing** - encrypt when sharing with team
3. **Rotate secrets regularly** - especially JWT secrets
4. **Don't log sensitive values** - avoid console.log with secrets
5. **Use different values per environment** - dev/staging/prod should differ

---

## 📞 Need Help?

Contact your team lead for:
- Firebase configuration values
- Google OAuth client ID
- JWT secret
- Any other missing environment variables

**Remember**: Without these environment files, authentication and API calls won't work! 🔑