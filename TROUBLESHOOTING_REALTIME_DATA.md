# Troubleshooting Real-Time Flight Data

## Current Issue
✅ Toggle shows: "🌐 Real-Time Flight Data" (green)  
❌ Console shows: "✈️ Searching flights with Express backend..."  
❌ Warning: "(API key not configured)"

## Root Cause
Next.js environment variables are only loaded when the server **starts**. Adding the key to `.env.local` requires a full restart.

---

## Solution Steps

### Step 1: Verify .env.local File
Check that `frontend/.env.local` contains:
```bash
NEXT_PUBLIC_RAPIDAPI_KEY=dc260b79a1mshf60901d122bb384p183ba0jsn9093522cbb9b
NEXT_PUBLIC_RAPIDAPI_HOST=kiwi-com-cheap-flights.p.rapidapi.com
```

### Step 2: FULL Restart of Frontend
```powershell
# In your frontend terminal (NOT just save/refresh!)
1. Press Ctrl+C (wait for full stop)
2. npm run dev
```

### Step 3: Hard Refresh Browser
```
1. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Or open DevTools → Right-click refresh → "Empty Cache and Hard Reload"
```

### Step 4: Verify in Console
After restart, you should see:
```
🛫 Searching with REAL Kiwi API data...    ← NEW!
Request: {origin: "YYZ", destination: "BOM", ...}
RapidAPI Key available: true               ← Should be TRUE!
```

NOT:
```
✈️ Searching flights with Express backend...  ← OLD (wrong!)
```

---

## Quick Test Commands

### Test 1: Check Environment Variable (in browser console)
```javascript
// Open browser console (F12) and paste:
console.log('API Key:', process.env.NEXT_PUBLIC_RAPIDAPI_KEY ? 'CONFIGURED ✅' : 'NOT FOUND ❌');
```

**Expected**: `API Key: CONFIGURED ✅`

### Test 2: Check Build Info
In terminal output when starting, look for:
```
 ✓ Ready in 1626ms
 - Environments: .env.local, .env    ← Should see .env.local!
```

---

## Alternative: Direct API Test

Test your API key directly in browser console:

```javascript
fetch('https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip?source=City:YYZ&destination=City:BOM&currency=usd&locale=en&adults=1&children=0&infants=0&handbags=1&holdbags=0&cabinClass=ECONOMY&sortBy=QUALITY&sortOrder=ASCENDING&limit=20', {
  method: 'GET',
  headers: {
    'x-rapidapi-host': 'kiwi-com-cheap-flights.p.rapidapi.com',
    'x-rapidapi-key': 'dc260b79a1mshf60901d122bb384p183ba0jsn9093522cbb9b'
  }
})
.then(r => r.json())
.then(d => console.log('API Test:', d))
.catch(e => console.error('API Error:', e));
```

**Expected**: See flight data object  
**If error**: Check API key validity on RapidAPI dashboard

---

## Common Issues

### Issue 1: "Fast Refresh" Not Picking Up Changes
**Symptom**: Warning still shows after editing .env.local  
**Why**: Fast Refresh doesn't reload environment variables  
**Fix**: Full server restart (Ctrl+C → npm run dev)

### Issue 2: Old Build Cache
**Symptom**: Changes not appearing  
**Fix**:
```powershell
# Stop server, clean, restart
npm run clean  # if available
# OR
rm -rf .next
npm run dev
```

### Issue 3: Toggle Shows Green But Using Mock/Backend
**Symptom**: Green toggle but console shows Express backend  
**Why**: `useRealData` state is true but API key not found  
**Fix**: Full restart + hard browser refresh

### Issue 4: CORS Error with Kiwi API
**Symptom**: "Access-Control-Allow-Origin" error  
**Why**: RapidAPI should handle CORS, but browser blocks it  
**Fix**: This shouldn't happen with RapidAPI. Check API key is valid.

---

## Expected vs Actual

### What You See Now (WRONG):
```
Console:
✈️ Searching flights with Express backend...
✅ Express backend search completed: 20 flights

UI:
🌐 Real-Time Flight Data [📝 Use Mock Data]
⚠️ Note: Real-time data requires... (API key not configured)
```

### What You Should See (CORRECT):
```
Console:
🛫 Searching with REAL Kiwi API data...
RapidAPI Key available: true ✅
Kiwi API Response: {...}
✅ Real flight data loaded: 15 flights
🔄 Searching return flights...
🌐 Fetching REAL return flights from Kiwi API...
✅ Found 12 real return flights

UI:
🌐 Real-Time Flight Data [📝 Use Mock Data]
(No warning message)
```

---

## Checklist

Before testing:
- [ ] `.env.local` has `NEXT_PUBLIC_RAPIDAPI_KEY=dc260b79a1...`
- [ ] Stopped frontend server completely (Ctrl+C)
- [ ] Restarted with `npm run dev`
- [ ] Waited for "✓ Ready in XXXXms"
- [ ] Did hard refresh in browser (Ctrl+Shift+R)
- [ ] Checked console for "RapidAPI Key available: true"
- [ ] Toggle is ON (green "Real-Time Flight Data")
- [ ] Searched for flights
- [ ] Console shows "🛫 Searching with REAL Kiwi API data..."

---

## Still Not Working?

### Debug Command:
Add this to your console to see what's happening:
```javascript
// Check toggle state
console.log('useRealData state:', window.localStorage.getItem('useRealData'));

// Check env vars
console.log('Env check:', {
  hasKey: !!process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
  keyPrefix: process.env.NEXT_PUBLIC_RAPIDAPI_KEY?.substring(0, 10),
  host: process.env.NEXT_PUBLIC_RAPIDAPI_HOST
});
```

### If API Key Shows as Undefined:
The environment variable isn't being loaded. Check:
1. File is named exactly `.env.local` (not `.env.local.txt`)
2. File is in `frontend/` directory (not root)
3. No spaces around `=` sign
4. Server was fully restarted
5. Try renaming to `.env` temporarily to test

---

## Manual Override (Testing Only)

If you need to test immediately without restart:

Open browser console and run:
```javascript
// Force set the API key (temporary, won't persist)
window.NEXT_PUBLIC_RAPIDAPI_KEY = 'dc260b79a1mshf60901d122bb384p183ba0jsn9093522cbb9b';
```

But this won't fix the environment variable issue - you still need to restart properly.

---

**Next Action**: Restart your frontend server and do a hard browser refresh!

---

Last Updated: October 2, 2025
