# ✅ Frontend Connected to AWS Backend

## Problem
Your frontend was trying to connect to `http://localhost:4000` (local backend), but you're no longer running the backend locally - it's deployed on AWS Elastic Beanstalk.

**Error**:
```
POST http://localhost:4000/auth/google-user net::ERR_CONNECTION_REFUSED
```

---

## Solution

### Updated Environment Variable
**File**: `.env` (root)
**Line 59**: Changed from:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

To:
```bash
NEXT_PUBLIC_API_URL=http://hack-a-holiday-prod.eba-fjphuqxp.us-east-1.elasticbeanstalk.com
```

---

## How It Works

1. **Root `.env` file** contains all environment variables
2. **Frontend's `predev` script** automatically copies `.env` → `frontend/.env.local`
3. **Next.js** reads `NEXT_PUBLIC_API_URL` from `.env.local`
4. **All API calls** now go to AWS backend instead of localhost

---

## Current Setup

### ✅ Backend (AWS)
- **Status**: Running on Elastic Beanstalk
- **URL**: http://hack-a-holiday-prod.eba-fjphuqxp.us-east-1.elasticbeanstalk.com
- **Health**: 🟢 Green
- **Auto-deploy**: Push to `main` branch triggers deployment

### ✅ Frontend (Local Development)
- **Status**: Running locally with Next.js dev server
- **URL**: http://localhost:3001 (port 3000 was in use)
- **Backend API**: Points to AWS Elastic Beanstalk
- **Environment**: `.env.local` (auto-copied from root `.env`)

---

## Testing Your Setup

### 1. Test API Connection
Open your browser to **http://localhost:3001** and:
- Try logging in with Google
- Check browser console for errors
- Google user should now be stored in DynamoDB successfully

### 2. Backend Health Check
```bash
curl http://hack-a-holiday-prod.eba-fjphuqxp.us-east-1.elasticbeanstalk.com/
```
Should return:
```json
{"message":"Hack-A-Holiday backend running!"}
```

---

## Development Workflow

### Running Locally (Frontend Only)
```bash
# Terminal 1: Frontend (connects to AWS backend)
cd frontend
npm run dev
# Opens on http://localhost:3001
```

**No need to run `npm run dev` in backend_test anymore!** The backend is live on AWS.

### Running Locally (Both Frontend & Backend)
If you need to test backend changes locally before deploying:

```bash
# Terminal 1: Local Backend
cd backend_test
npm run dev
# Runs on http://localhost:4000

# Terminal 2: Frontend (with local backend)
cd frontend
# Temporarily change .env: NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev
```

### Deploying Backend Changes
```bash
# Make your changes in backend_test/
git add .
git commit -m "Your changes"
git push origin main

# CodePipeline automatically:
# 1. Pulls code from GitHub
# 2. Builds with CodeBuild
# 3. Deploys to Elastic Beanstalk
# Takes ~3-5 minutes
```

---

## Files Using NEXT_PUBLIC_API_URL

These files now automatically connect to AWS:

1. `frontend/src/services/dynamoAuth.ts` - Google OAuth user storage
2. `frontend/src/services/trip-api.ts` - Trip management
3. `frontend/src/pages/api/ai-agent.ts` - AI agent proxy
4. `frontend/src/pages/api/ai/chat.ts` - AI chat endpoint
5. `frontend/src/utils/api.ts` - General API utilities
6. `frontend/src/utils/api-client.ts` - API client wrapper

---

## CORS Configuration

Your AWS backend's CORS is configured to allow:
- **http://localhost:3000**
- **http://localhost:3001**

If you need to add more origins (e.g., your production frontend URL), update `backend_test/server.js`:

```javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-production-domain.com'  // Add here
  ],
  credentials: true
}));
```

Then commit and push to deploy.

---

## Troubleshooting

### Issue: "Failed to fetch" or "Connection refused"
**Solution**: Make sure you restarted the frontend after changing `.env`

### Issue: CORS errors
**Solution**: Check that `NEXT_PUBLIC_API_URL` doesn't have a trailing slash

### Issue: Port 3000 in use
**Solution**: Frontend automatically uses port 3001 (or next available port)

### Issue: Environment variables not updating
**Solution**: 
1. Stop frontend dev server (Ctrl+C)
2. Verify `.env` has correct `NEXT_PUBLIC_API_URL`
3. Delete `frontend/.env.local` if it exists
4. Run `npm run dev` again (predev script will recreate .env.local)

---

## Summary

✅ **Backend**: Deployed on AWS, always running  
✅ **Frontend**: Runs locally, connects to AWS backend  
✅ **No need to run backend locally** unless testing changes  
✅ **Auto-deployment**: Push to main → deploys in ~5 minutes  

Your frontend at **http://localhost:3001** is now connected to the AWS backend! 🎉
