# How to Get RapidAPI Key for Real-Time Flight Data

## 🔑 Quick Setup (5 minutes)

### Step 1: Create RapidAPI Account
1. Go to **https://rapidapi.com/**
2. Click **"Sign Up"** (top right)
3. Sign up with:
   - Email
   - Google account
   - GitHub account
4. Verify your email

### Step 2: Subscribe to Flight API
1. Go to: **https://rapidapi.com/3b-data-3b-data-default/api/booking-com15**
   
   OR search for **"Booking.com Flight Search"** in RapidAPI marketplace

2. Click **"Subscribe to Test"** button

3. Choose a plan:
   - **Basic (FREE)**: 
     - 100 requests/month
     - Perfect for testing
     - $0/month
   
   - **Pro**:
     - 1,000 requests/month
     - $9.99/month
   
   - **Ultra**:
     - 10,000 requests/month
     - $49.99/month

4. Click **"Subscribe"** on your chosen plan

### Step 3: Get Your API Key
1. After subscribing, you'll see the **"Code Snippets"** section
2. Look for **"X-RapidAPI-Key"** in the headers
3. Your key looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
4. Copy this key

### Step 4: Add Key to Your Project
1. Open `frontend/.env.local` in your editor
2. Find the line:
   ```bash
   NEXT_PUBLIC_RAPIDAPI_KEY=
   ```
3. Paste your key:
   ```bash
   NEXT_PUBLIC_RAPIDAPI_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
4. Save the file

### Step 5: Restart Frontend Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

### Step 6: Test It!
1. Go to http://localhost:3000/flight-search
2. Click **"🌐 Use Real Data"** toggle
3. The warning should disappear
4. Search for flights:
   - Origin: **YYZ**
   - Destination: **BOM**
   - Departure: **2025-10-15**
   - Return: **2025-10-30**
5. Click **"Search Flights"**
6. Wait 2-5 seconds for real flight data!

---

## 📊 Visual Guide

### Before (No API Key):
```
┌────────────────────────────────────────────────────┐
│ 🌐 Real-Time Flight Data      [📝 Use Mock Data] │
│ Searching live flights from Kiwi.com API          │
│ with real pricing and availability                 │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│ ⚠️ Note: Real-time data requires a valid          │
│ RapidAPI key for Kiwi.com API.                     │
│ (API key not configured) ← YOU SEE THIS           │
└────────────────────────────────────────────────────┘
```

### After (API Key Configured):
```
┌────────────────────────────────────────────────────┐
│ 🌐 Real-Time Flight Data      [📝 Use Mock Data] │
│ Searching live flights from Kiwi.com API          │
│ with real pricing and availability                 │
└────────────────────────────────────────────────────┘
       ← Warning disappears!
```

---

## 🧪 Testing Real Data

### Console Output (Success):
```
🛫 Searching with REAL Kiwi API data...
Request: {origin: "YYZ", destination: "BOM", ...}
RapidAPI Key available: true
Kiwi API Response: {itineraries: Array(20), ...}
✅ Real flight data loaded: 20 flights

🔄 Searching return flights for round-trip packages...
Return flight: FROM BOM TO YYZ on 2025-10-30
🌐 Fetching REAL return flights from Kiwi API...
✅ Found 15 real return flights from Kiwi API
✅ Created 10 round-trip packages
```

### What You'll See:
- **Real Airlines**: Air Canada, United, British Airways, etc.
- **Real Prices**: Actual market prices in USD
- **Real Flight Times**: Current schedules
- **Real Stops**: Actual layover information
- **Real Availability**: Only shows bookable flights

---

## 🆓 Free Tier Limits

### Basic Plan (FREE):
- **100 requests/month** = ~50 round-trip searches
- Enough for:
  - Testing and development
  - Demos and presentations
  - Personal use

### Request Count:
- **1 search** = 1 outbound + 1 return = **2 requests**
- So 100 requests = **50 round-trip searches/month**

### Tips to Save Requests:
1. Use **Mock Data** toggle for UI testing
2. Only use **Real Data** when you need actual prices
3. Cache results for repeated searches
4. Use Express backend as fallback

---

## 🔧 Configuration Reference

### Complete .env.local Setup:
```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=105340476573

# RapidAPI for Real-Time Flight Data
NEXT_PUBLIC_RAPIDAPI_KEY=your_actual_key_here
NEXT_PUBLIC_RAPIDAPI_HOST=booking-com15.p.rapidapi.com

# Environment
NODE_ENV=dev
ENVIRONMENT=dev
```

---

## 🐛 Troubleshooting

### Issue: Still showing "API key not configured"
**Solutions:**
1. Check if key is actually in `.env.local`
2. Restart frontend server (npm run dev)
3. Clear browser cache (Ctrl+Shift+R)
4. Check for spaces in the key value

### Issue: "401 Unauthorized" error
**Cause:** Invalid API key
**Solution:**
1. Verify you copied the complete key
2. Check if subscription is active on RapidAPI
3. Try regenerating the key on RapidAPI dashboard

### Issue: "429 Too Many Requests"
**Cause:** Exceeded free tier limit (100/month)
**Solution:**
1. Wait until next month
2. Upgrade to Pro plan
3. Use Mock Data toggle for testing

### Issue: "No flights found"
**Possible Reasons:**
1. Route not available (try popular routes like JFK→LHR)
2. Date too far in future (try within 3-6 months)
3. No flights on that specific date (try different date)

### Issue: Slow response (10+ seconds)
**Cause:** API may be slow during peak hours
**Solution:**
1. Normal response is 2-5 seconds
2. Try again in a few minutes
3. Use Mock Data for quick testing

---

## 📱 Alternative: Use Mock Data

If you don't want to set up RapidAPI (or want to save requests), you can:

### Option 1: Keep Toggle OFF
- Uses Express Backend (if available)
- Falls back to Mock Data
- **Instant results**
- Perfect for UI/UX testing

### Option 2: Click "📝 Use Mock Data"
- Generates realistic flight data locally
- **No API calls needed**
- **Unlimited searches**
- Great for demos

---

## 🎯 When to Use Each Mode

### Use Mock Data 📝 When:
- Testing UI changes
- Debugging frontend issues
- Running demos
- Learning the system
- Don't care about real prices

### Use Real Data 🌐 When:
- Need actual flight prices
- Testing API integration
- Showing real availability
- Production environment
- Client presentations

---

## 💡 Pro Tips

### 1. Test with Free Tier First
- Start with Basic (FREE) plan
- Test everything works
- Upgrade only if needed

### 2. Monitor Your Usage
- Check RapidAPI dashboard regularly
- See requests used: https://rapidapi.com/developer/apps
- Get alerts before hitting limit

### 3. Hybrid Approach
- Use Mock Data for development
- Use Real Data for final testing
- Switch easily with the toggle

### 4. Popular Routes (More Results)
Try these for best results:
- **USA**: JFK ↔ LAX, ORD ↔ MIA
- **Europe**: LHR ↔ CDG, FRA ↔ AMS
- **International**: JFK ↔ LHR, LAX ↔ NRT
- **Long-haul**: YYZ ↔ BOM, SFO ↔ SIN

---

## 📊 Comparison: Mock vs Real Data

| Feature | Mock Data | Real Data |
|---------|-----------|-----------|
| **Speed** | Instant | 2-5 seconds |
| **Cost** | Free | 100 free/month |
| **Accuracy** | Simulated | 100% Real |
| **Airlines** | Generic | Actual carriers |
| **Prices** | Random | Market prices |
| **Availability** | Always | Real bookings |
| **Setup** | None | API key needed |
| **Offline** | ✅ Yes | ❌ No |

---

## 🚀 Quick Start Checklist

- [ ] Created RapidAPI account
- [ ] Subscribed to Booking.com Flight Search API (FREE plan)
- [ ] Copied API key
- [ ] Added key to `frontend/.env.local`
- [ ] Restarted frontend server
- [ ] Tested with toggle ON
- [ ] Warning message disappeared
- [ ] Searched for flights
- [ ] Saw real flight data in results
- [ ] Checked console for success messages

---

## 📞 Support

### RapidAPI Issues:
- Dashboard: https://rapidapi.com/developer/dashboard
- Support: https://rapidapi.com/support
- Docs: https://docs.rapidapi.com/

### Project Issues:
- Check console for error messages
- See TROUBLESHOOTING.md
- Review REAL_TIME_FLIGHT_DATA.md

---

## 🎉 You're All Set!

Once configured, you'll have:
- ✅ Real-time flight data
- ✅ Actual pricing
- ✅ Current availability  
- ✅ Round-trip packages with real flights
- ✅ Easy toggle to switch modes

**Happy Flying!** ✈️🌐

---

**Last Updated**: October 2, 2025  
**API Provider**: RapidAPI (Booking.com Flight Search)  
**Free Tier**: 100 requests/month
