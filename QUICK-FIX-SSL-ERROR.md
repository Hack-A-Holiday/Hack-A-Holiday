# 🚨 Quick Fix for SSL Protocol Error

## Problem
Getting `net::ERR_SSL_PROTOCOL_ERROR` when trying to login/authenticate.

## Root Cause
The application is trying to make HTTPS requests to `localhost:4000`, but local development servers run on HTTP.

## Quick Solution Steps

### 1. ✅ Update .env.local (ALREADY FIXED)
```bash
# Make sure frontend/.env.local has (no extra spaces):
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 2. 🖥️ Start Backend Server
```bash
# Terminal 1: Start backend
cd backend_test
npm install
npm start
```

### 3. 🌐 Start Frontend
```bash
# Terminal 2: Start frontend (restart if already running)
cd frontend
npm run dev
```

### 4. 🧪 Test the Fix
Run the debug script:
```bash
node debug-api-connection.js
```

### 5. 🔍 Verify in Browser
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login
4. Check the actual URLs being called - they should be `http://localhost:4000/auth/login`

## If Still Not Working

### Check 1: Port 4000 Available
```bash
# Windows
netstat -an | findstr :4000

# Should show something like:
# TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING
```

### Check 2: Clear Browser Cache
- Clear all cookies and cache for localhost:3000
- Try in incognito/private mode

### Check 3: Environment Variables Loading
Add this temporarily to any React component:
```tsx
useEffect(() => {
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
}, []);
```

## Alternative Backend Setup

If `backend_test` doesn't work, try the main backend:

```bash
# Alternative: Use main backend
cd backend
npm install
npm run dev
```

## Need Help?
If the issue persists, check:
1. ✅ Both servers are running (frontend:3000, backend:4000)
2. ✅ No VPN/proxy forcing HTTPS
3. ✅ No browser extensions interfering
4. ✅ Windows firewall not blocking port 4000