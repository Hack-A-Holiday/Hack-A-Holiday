# Deploying Hack-A-Holiday to Render

## Overview
This guide walks you through deploying the full-stack Hack-A-Holiday app to Render using the included `render.yaml` blueprint.

**Services created:**
1. **Backend** (`hack-a-holiday-backend`) - Express API with AWS Bedrock AI, DynamoDB, flight/hotel search
2. **Frontend** (`hack-a-holiday-frontend`) - Next.js web app with React, Firebase auth, 3D globe

---

## Prerequisites

✅ GitHub account with access to this repo  
✅ Render account (free tier works for testing)  
✅ AWS credentials (for Bedrock AI and DynamoDB)  
✅ RapidAPI key (for flight/hotel search)  
✅ Firebase project credentials  
✅ All secrets from your local `.env` file

---

## Quick Start (Using render.yaml)

### 1. Connect GitHub to Render

1. Sign in to [Render](https://render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub account if not already connected
4. Select the repository: `VarunGagwani/Hack-A-Holiday`
5. Branch: `main` (or `professional-ui-redesign-v1` if deploying from feature branch)

Render will detect `render.yaml` and show you the services it will create.

---

### 2. Set Environment Variables (Secrets)

Render will prompt you to provide values for `sync: false` environment variables. You **must** set these before deploying:

#### Backend Secrets (hack-a-holiday-backend)

**AWS Credentials** (for Bedrock AI & DynamoDB):
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

**Authentication**:
```
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**RapidAPI Keys** (for Kiwi flights & Booking.com):
```
RAPIDAPI_KEY=your-rapidapi-key-here
BOOKING_API_KEY=your-rapidapi-key-here
```

**TripAdvisor API** (for destination content):
```
TRIPADVISOR_API_KEY=your-tripadvisor-api-key-here
TRIPADVISOR_CACHE_TTL=3600000
```

**Firebase Config** (if backend needs Firebase):
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

#### Frontend Secrets (hack-a-holiday-frontend)

**RapidAPI Keys**:
```
NEXT_PUBLIC_RAPIDAPI_KEY=your-rapidapi-key-here
NEXT_PUBLIC_BOOKING_API_KEY=your-rapidapi-key-here
```

**Firebase Config** (for client-side auth):
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

**API URL** (set AFTER backend deploys):
```
NEXT_PUBLIC_API_URL=REPLACE_WITH_BACKEND_URL_AFTER_DEPLOY
```

---

### 3. Deploy Services

1. After setting all secrets, click **Apply** or **Deploy**
2. Render will:
   - Clone the repo
   - Build backend: `cd backend_test && npm ci --production`
   - Build frontend: `cd frontend && npm ci && npm run build`
   - Start both services

**Backend will be available at**: `https://hack-a-holiday-backend.onrender.com`  
**Frontend will be available at**: `https://hack-a-holiday-frontend.onrender.com`

---

### 4. Update Frontend API URL

⚠️ **CRITICAL STEP**: After backend deploys, you must update the frontend's `NEXT_PUBLIC_API_URL`:

1. Go to Render dashboard → **hack-a-holiday-frontend** service
2. Click **Environment** tab
3. Find `NEXT_PUBLIC_API_URL`
4. Change from `REPLACE_WITH_BACKEND_URL_AFTER_DEPLOY` to:
   ```
   https://hack-a-holiday-backend.onrender.com
   ```
5. Click **Save Changes** (this will trigger a redeploy)

---

### 5. Update Backend CORS

Your backend needs to allow the frontend domain. Update `backend_test/server.js`:

```javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://hack-a-holiday-frontend.onrender.com'  // ← Add this
  ],
  credentials: true
}));
```

Commit and push:
```powershell
git add backend_test/server.js
git commit -m "feat: add Render frontend to CORS allowlist"
git push origin main
```

Render will auto-deploy the backend with the updated CORS config.

---

## Manual Deployment (Without render.yaml)

If you prefer to create services manually in the Render dashboard:

### Backend Service

1. **New** → **Web Service**
2. Connect repo: `VarunGagwani/Hack-A-Holiday`
3. Settings:
   - **Name**: hack-a-holiday-backend
   - **Root Directory**: `backend_test`
   - **Environment**: Node
   - **Build Command**: `npm ci --production`
   - **Start Command**: `node server.js`
   - **Plan**: Starter (or Standard-1x for production)
   - **Branch**: main
4. Add all environment variables listed above
5. Deploy

### Frontend Service

1. **New** → **Web Service**
2. Connect repo: `VarunGagwani/Hack-A-Holiday`
3. Settings:
   - **Name**: hack-a-holiday-frontend
   - **Root Directory**: `frontend`
   - **Environment**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Starter
   - **Branch**: main
4. Add all environment variables (especially `NEXT_PUBLIC_API_URL` with backend URL)
5. Deploy

---

## Troubleshooting

### Backend Issues

**"Cannot find module 'uuid'"**:
- Fixed in latest commit (uuid added to package.json)
- Ensure you're deploying from main branch after the fix

**AWS Bedrock errors**:
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
- Check IAM permissions for Bedrock and DynamoDB access

**Health check failing**:
- Backend exposes `/` endpoint that returns `{"message":"Hack-A-Holiday backend running!"}`
- Check logs in Render dashboard for startup errors

### Frontend Issues

**"Failed to fetch" or CORS errors**:
- Ensure `NEXT_PUBLIC_API_URL` points to backend (e.g., `https://hack-a-holiday-backend.onrender.com`)
- Verify backend CORS allows frontend domain

**Firebase auth not working**:
- Check all `NEXT_PUBLIC_FIREBASE_*` env vars are set correctly
- Verify Firebase project has web app configured

**Build failures**:
- Common issue: Missing environment variables during build
- Next.js requires `NEXT_PUBLIC_*` vars at build time

### General

**Render free tier sleep**:
- Free tier services sleep after 15 min of inactivity
- First request after sleep takes ~30 seconds to wake up
- Upgrade to paid plan for always-on services

**Logs**:
- View real-time logs in Render dashboard → Service → **Logs** tab
- Filter by "Build" or "Runtime"

---

## Cost Estimate

**Free Tier** (for testing):
- Backend: Starter plan (750 hrs/month free)
- Frontend: Starter plan (750 hrs/month free)
- **Total**: $0/month (both services sleep after inactivity)

**Paid** (production):
- Backend: Starter+ ($7/month) or Standard-1x ($25/month)
- Frontend: Starter+ ($7/month)
- **Total**: $14-32/month

---

## Deployment Checklist

Before going live:

- [ ] All environment variables set in Render
- [ ] Backend CORS updated with frontend domain
- [ ] `NEXT_PUBLIC_API_URL` points to backend
- [ ] Health checks passing (both services show "Live")
- [ ] Test Google login on frontend
- [ ] Test flight/hotel search
- [ ] Test AI agent chat
- [ ] Monitor logs for errors

---

## Additional Services (Optional)

### PostgreSQL Database
If you want to move from DynamoDB to Render's managed Postgres:

1. **New** → **PostgreSQL**
2. Add to `render.yaml` or create manually
3. Update backend to use Postgres instead of DynamoDB

### Redis (Key-Value Store)
For caching or session storage:

1. **New** → **Redis**
2. Add `REDIS_URL` env var to backend
3. Use for rate limiting, caching flight searches, etc.

### Cron Jobs
For scheduled tasks (e.g., updating flight prices):

1. **New** → **Cron Job**
2. Same repo, different start command
3. Schedule: `0 */6 * * *` (every 6 hours)

---

## Support

- **Render Docs**: https://render.com/docs
- **GitHub Issues**: https://github.com/VarunGagwani/Hack-A-Holiday/issues
- **Backend logs**: Check Render dashboard for detailed error messages

---

**Next Steps**: After deployment, test all features and update DNS/custom domain if desired.
