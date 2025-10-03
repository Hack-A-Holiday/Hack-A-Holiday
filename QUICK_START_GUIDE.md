# Quick Start Guide - Real-Time Flight Search

## 🚀 Getting Started in 3 Steps

### Step 1: Start Both Servers
```bash
# Terminal 1 - Frontend
cd frontend
npm run dev
# Runs on http://localhost:3000

# Terminal 2 - Backend
cd backend_test
npm run dev
# Runs on http://localhost:4000
```

### Step 2: Navigate to Flight Search
```
Open browser → http://localhost:3000/flight-search
```

### Step 3: Test the Features!

---

## 🎯 Feature Demos

### Demo 1: Country-Based Airport Search
**Try This:**
1. Click on "Origin Airport Code" field
2. Type: **"India"**
3. See dropdown showing:
   - ✈️ **DEL** - New Delhi
   - ✈️ **BOM** - Mumbai  
   - ✈️ **BLR** - Bangalore
4. Click any airport to select it

**Also Try:**
- "United States" → See JFK, LAX, ORD, MIA
- "Japan" → See NRT, HND
- "France" → See CDG
- Or just type airport codes like before: "JFK", "LHR", etc.

---

### Demo 2: Round-Trip Packages (Mock Data)
**Try This:**
1. **Origin**: YYZ (Toronto)
2. **Destination**: BOM (Mumbai)
3. **Departure**: 2025-10-06
4. **Return**: 2025-10-30
5. Click **"✈️ Search Flights"**

**What You'll See:**
- 🔄 **Round-Trip Packages** section at the top
- Up to 5 package cards showing:
  - ✈️ Outbound: YYZ → BOM (Oct 6)
  - 🔙 Return: BOM → YYZ (Oct 30) ✅ **Correct direction!**
  - 💰 Total package price
  - 💵 Savings vs separate booking
  - ⭐ "Best Deal" badge on cheapest option

---

### Demo 3: Real-Time Data Toggle
**Try This:**
1. Scroll down to the toggle section (below search button)
2. Currently shows: **"📝 Mock Flight Data"**
3. Click **"🌐 Use Real Data"** button
4. Toggle changes to green: **"🌐 Real-Time Flight Data"**
5. Search again with same parameters

**What Changes:**
- Now fetching REAL flights from Kiwi.com API
- Takes 2-5 seconds (instead of instant)
- Shows actual available flights with real pricing
- Return flights ALSO fetched in real-time
- Console shows: "🌐 Fetching REAL return flights from Kiwi API..."

**Note:** Real data requires RapidAPI key. Without it, system falls back to mock data automatically.

---

### Demo 4: One-Way Flight (No Packages)
**Try This:**
1. **Origin**: LHR (London)
2. **Destination**: CDG (Paris)
3. **Departure**: 2025-11-15
4. **Return**: **(leave empty)**
5. Click Search

**What You'll See:**
- Only the flight results section
- NO round-trip packages section
- Just one-way flights from London to Paris

---

## 📊 Visual Indicators

### Toggle States:

**Mock Data (Default):**
```
┌────────────────────────────────────────────┐
│ 📝 Mock Flight Data            [🌐 Use Real Data]│
│ Using simulated flight data                │
│ for testing purposes                       │
└────────────────────────────────────────────┘
     Gray background, purple button
```

**Real Data (Active):**
```
┌────────────────────────────────────────────┐
│ 🌐 Real-Time Flight Data      [📝 Use Mock Data]│
│ Searching live flights from Kiwi.com API   │
│ with real pricing and availability         │
└────────────────────────────────────────────┘
     Green gradient, white button
     ⚠️ Warning shown if no API key
```

---

## 🎨 Round-Trip Package Card Layout

```
┌──────────────────────────────────────────────────────────┐
│  ⭐ Best Deal                                            │
│                                                          │
│  ✈️ OUTBOUND  2025-10-06                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 01:30 PM  ──  9h 55m  ──→  11:25 PM               │ │
│  │   YYZ         1 stop         BOM                   │ │
│  │   VS                         $639                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  🔙 RETURN  2025-10-30                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 17:45     ──  5h 43m  ──→  23:28                  │ │
│  │   BOM         1 stop         YYZ                   │ │
│  │   KLM                        $466                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Total Package Price              [🎫 Book Package] │ │
│  │ $1105.00                                           │ │
│  │ 💰 Save $30 vs separate booking                    │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Frontend Environment (.env.local)
```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# RapidAPI for Kiwi.com (Optional - for real-time data)
NEXT_PUBLIC_RAPIDAPI_KEY=your_key_here
NEXT_PUBLIC_RAPIDAPI_HOST=booking-com15.p.rapidapi.com

# AWS (for other features)
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=105340476573
```

### Backend Environment (.env)
```bash
PORT=4000
JWT_SECRET=devsecret
FRONTEND_ORIGIN=http://localhost:3000
```

---

## 🐛 Common Issues & Solutions

### Issue: "No airports found when typing country name"
**Check:**
- Typed at least 2 characters?
- Spelling correct? Try: "India", "United States", "Japan"

### Issue: "Toggle doesn't show real flights"
**Check:**
1. Is RapidAPI key in frontend/.env.local?
2. Check browser console for errors
3. Verify internet connection

### Issue: "Return flights showing wrong direction"
**Status:** ✅ FIXED in latest version!
- Should now show: BOM → YYZ (not YYZ → BOM)

### Issue: "Backend unavailable" error
**Solution:**
```bash
# Check if backend is running
cd backend_test
npm run dev

# Should see: "Server running on port 4000"
```

---

## 🎯 Testing Checklist

Quick tests to verify everything works:

- [ ] Type "India" in origin → See DEL, BOM, BLR
- [ ] Search YYZ → BOM with return date → See packages
- [ ] Verify return shows BOM → YYZ (correct direction!)
- [ ] Click toggle → Changes from mock to real data
- [ ] Check console for "🌐 Fetching REAL return flights"
- [ ] Search without return date → No packages section
- [ ] Try different countries: "USA", "Japan", "France"
- [ ] Verify "Best Deal" badge on cheapest package

---

## 📱 Browser Console Commands

### Check Current Data Source:
```javascript
// Open console (F12) and type:
console.log('Using real data:', window.localStorage.getItem('useRealData'));
```

### Force Reload:
```javascript
window.location.reload();
```

### Clear Cache:
```javascript
window.localStorage.clear();
window.location.reload();
```

---

## 🎓 Pro Tips

1. **Fast Testing**: Use mock data (toggle OFF) for quick UI testing
2. **Real Pricing**: Turn toggle ON to see actual market prices
3. **Save API Calls**: Toggle OFF when not testing real data
4. **Multiple Routes**: Try popular routes like JFK→LHR, LAX→NRT
5. **Console Logging**: Keep DevTools open to see debug info
6. **Hover Effects**: Hover over packages to see animations

---

## 📊 Data Flow Diagram

```
User Input (Origin, Destination, Dates)
           ↓
    Click Search Button
           ↓
   Check Toggle State
           ↓
    ┌──────┴──────┐
    ↓             ↓
Mock Data     Real Data?
    ↓             ↓
Generate     Kiwi API
Locally         ↓
    ↓        Success?
    ↓         ↙  ↘
    ↓       YES   NO
    ↓        ↓     ↓
    ↓     Use It  Try Backend
    ↓        ↓         ↓
    ↓        ↓      Success?
    ↓        ↓      ↙    ↘
    ↓        ↓    YES     NO
    ↓        ↓     ↓       ↓
    └────────┴─────┴───────┘
              ↓
    Display Outbound Flights
              ↓
        Return Date?
         ↙        ↘
       YES        NO
        ↓          ↓
   Repeat        Done
   for Return
   Flights
        ↓
   Create Packages
        ↓
   Display Results
```

---

## 🚀 Ready to Test!

Everything is configured and running. Just:

1. ✅ Frontend: http://localhost:3000/flight-search
2. ✅ Backend: http://localhost:4000
3. ✅ Features: Airport search, Round-trips, Real-time toggle
4. ✅ Documentation: This guide + REAL_TIME_FLIGHT_DATA.md

**Start Testing!** 🎉

---

**Version**: 2.0.0  
**Last Updated**: October 2, 2025  
**Docs**: See REAL_TIME_FLIGHT_DATA.md for complete details
