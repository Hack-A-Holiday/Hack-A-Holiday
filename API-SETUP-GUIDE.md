# 🔑 API Setup Guide - Hack-A-Holiday

## Current Status: ✅ Real-Time Data Working
The application is now using real-time data from:
- **Kiwi.com API**: Real flight search
- **Booking.com API**: Real hotel search  
- **Vacation Packages**: Flight + Hotel bundles with savings

---

## 🚀 Setup Instructions for Teammates

### Step 1: Get API Keys from Team Lead

Contact your team lead securely (encrypted chat/password manager) to get:
1. **RapidAPI Key** (works for both flight & hotel APIs)
2. AWS Account ID
3. API Gateway URL  
4. CloudFront URL

> ⚠️ **Security**: Never share API keys in public channels (Slack, email, Discord)

### Step 2: Create Environment File

Navigate to `frontend/` and create `.env.local`:

```bash
cd frontend
# Create .env.local file with your text editor
```

### Step 3: Add Configuration

Copy this into `frontend/.env.local` (replace `<placeholders>` with actual values):

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=<ask-team-lead>

# API Configuration  
API_GATEWAY_URL=<ask-team-lead>
NEXT_PUBLIC_API_URL=http://localhost:4000

# Frontend Configuration
NEXT_PUBLIC_APP_NAME=Hack-A-Holiday
NEXT_PUBLIC_CLOUDFRONT_URL=<ask-team-lead>

# Environment
NODE_ENV=dev
ENVIRONMENT=dev

# RapidAPI Configuration (Flight & Hotel Data)
# IMPORTANT: Ask team lead for CURRENT API key
NEXT_PUBLIC_RAPIDAPI_KEY=<ask-team-lead-for-current-key>
NEXT_PUBLIC_RAPIDAPI_HOST=kiwi-com-cheap-flights.p.rapidapi.com

# Booking.com uses same RapidAPI key
NEXT_PUBLIC_BOOKING_API_KEY=<same-as-rapidapi-key>
NEXT_PUBLIC_BOOKING_API_HOST=booking-com15.p.rapidapi.com
```

### Step 4: Restart Development Server

```bash
# Stop server if running (Ctrl+C)
npm run dev
```

---

## 📊 What These APIs Provide

### 🛫 Kiwi.com Flight API
- Real airline names (Air Canada, Cathay Pacific, Emirates, etc.)
- Live flight pricing in USD
- Accurate departure/arrival times
- Baggage information (carry-on & checked)
- Multi-segment flight support
- Direct & connecting flights

### 🏨 Booking.com Hotel API  
- 60+ major airports worldwide
- Hotel ratings & review counts
- Price per night & total pricing
- Amenities (WiFi, Pool, Gym, Breakfast, etc.)
- Distance from city center
- Free cancellation status
- Breakfast inclusion info

### 🎁 Vacation Package Creation
- Automatic flight + hotel combinations
- Bundle discount calculations ($50 + flight savings)
- Best value sorting
- Complete pricing breakdown

---

## 🧪 Testing Your Setup

### Test 1: Flight Search  
1. Go to **Flight & Hotel Search** page
2. Toggle **"Real-Time Flight Data"** to ON (green)
3. Search: YYZ → BOM, Oct 15 - Nov 19
4. **Expected**: Real airlines with live prices

### Test 2: Hotel Search
1. Complete flight search above
2. **Expected**: Hotels section appears automatically  
3. **Should show**: 20 hotels in Mumbai with ratings

### Test 3: Vacation Packages
1. After hotels load
2. **Expected**: "Complete Vacation Packages" section
3. **Should show**: Flight + hotel combos with bundle savings

---

## 🐛 Troubleshooting

### Issue: 429 Too Many Requests
**Cause**: Old/invalid API key or rate limit exceeded

**Solution**:
1. Verify you have CURRENT API key from team
2. Check `.env.local` exists in `frontend/` folder
3. Restart server completely
4. Check browser console for exact error

### Issue: Mock data instead of real data
**Cause**: API key not loaded or toggle OFF

**Solution**:
1. Verify `.env.local` has correct keys
2. Restart: `npm run dev`
3. Toggle "Real-Time Flight Data" to ON
4. Check console logs for API calls

### Issue: Prices show decimals (e.g., $1237.260454)  
**Status**: ✅ FIXED (Oct 3, 2025)
- All prices now properly rounded
- Math.round() applied everywhere

### Issue: One-way flights not appearing
**Status**: ✅ FIXED (Oct 3, 2025)
- Date filtering now ±3 days tolerance
- Was exact match (too strict)

---

## 🔄 Recent Updates (October 3, 2025)

### API Key Update
- **Old Key**: Exhausted free tier → 429 errors
- **New Key**: Active subscription, higher limits
- **Action**: Update `.env.local` with new key from team

### Bug Fixes
1. ✅ **Hardcoded API key** removed from `kiwi-api.ts`
2. ✅ **Price rounding** - All prices now whole numbers  
3. ✅ **One-way flight filtering** - ±3 days tolerance
4. ✅ **Multi-segment flights** - Proper route display

### New Features
- ✅ Complete hotel search integration
- ✅ Vacation package creation
- ✅ Bundle savings calculation
- ✅ 60+ airports covered worldwide

---

## 🔒 Security Best Practices

1. ✅ Never commit `.env` or `.env.local` files
2. ✅ Never share API keys in public channels
3. ✅ Use encrypted communication for key sharing  
4. ✅ Rotate keys if accidentally exposed
5. ✅ Use separate keys for dev/staging/production

---

## 🌍 Supported Airports (60+)

**North America**: JFK, LAX, ORD, MIA, YYZ, YVR, MEX  
**Europe**: LHR, CDG, FRA, AMS, MAD, BCN, FCO, MXP, DUB, LIS, ATH, IST  
**Asia**: NRT, HND, ICN, PEK, PVG, HKG, SIN, BKK, KUL, DEL, BOM, BLR, SGN  
**Middle East & Africa**: DXB, AUH, DOH, CAI, JNB, CPT  
**Oceania**: SYD, MEL, AKL, BNE  
**South America**: GRU, GIG, EZE, BOG, LIM

---

## ❓ Need Help?

- **API Keys**: Contact team lead via secure channel
- **Detailed RapidAPI Setup**: See `RAPIDAPI_SETUP_GUIDE.md`
- **Troubleshooting**: Check browser console for errors
- **Backend Issues**: Ensure `backend_test` running on localhost:4000

---

**Last Updated**: October 3, 2025  
**Status**: Production-ready with real-time data

## 🔧 Current API Endpoints

### Amadeus API
- **Search**: `GET /v2/shopping/flight-offers`
- **Details**: `GET /v1/shopping/flight-offers/{id}`
- **Auth**: OAuth2 Bearer token
- **Rate Limit**: 2000 requests/month (free tier)

### RapidAPI/Skyscanner
- **Search**: `GET /apiservices/browsequotes/v1.0/{country}/{currency}/{locale}/{origin}/{destination}/{departureDate}`
- **Auth**: X-RapidAPI-Key header
- **Rate Limit**: Varies by subscription

## 📊 Data Quality Comparison

| API | Real-time | Price Accuracy | Coverage | Cost |
|-----|-----------|----------------|----------|------|
| Amadeus | ✅ Excellent | ✅ High | ✅ Global | Free tier + pay-per-use |
| RapidAPI | ⚠️ Good | ✅ High | ✅ Good | Subscription |
| Mock Data | ❌ Static | ❌ Random | ❌ Limited | Free |

## 🚀 Quick Start (Amadeus)

1. **Get API Key** (5 minutes):
   - Visit: https://developers.amadeus.com/
   - Sign up with email
   - Create new app
   - Copy API Key & Secret

2. **Set Environment Variables**:
   ```bash
   export AMADEUS_API_KEY="your_key_here"
   export AMADEUS_API_SECRET="your_secret_here"
   ```

3. **Deploy Backend**:
   ```bash
   npm run deploy --prefix infrastructure
   ```

4. **Test Real Data**:
   - Visit: http://localhost:3000/flight-search
   - Search for flights
   - See real-time data!

## 🔍 Why Mock Data Currently?

1. **No API Keys**: Environment variables not set
2. **Not Deployed**: Enhanced flight search Lambda not deployed
3. **Fallback Active**: System uses mock data when APIs fail
4. **Demo Mode**: Shows functionality without API costs

## 💡 Pro Tips

- **Start with Amadeus**: Best free tier, comprehensive data
- **Use Test Environment**: Amadeus has test endpoints for development
- **Cache Results**: Implement caching to reduce API calls
- **Error Handling**: Always have fallback to mock data
- **Rate Limiting**: Respect API rate limits

## 🎯 Next Steps

1. Get Amadeus API key (free)
2. Set environment variables
3. Deploy backend infrastructure
4. Test with real data
5. Add caching for better performance
# 🛫 Flight API Setup Guide

## Current Status: Using Mock Data
The flight search is currently using mock data because:
- No API keys configured
- Enhanced flight search endpoint not deployed
- Fallback system active

## 🚀 How to Get Real Flight Data

### Option 1: Amadeus API (Recommended)
**Best for**: Real-time flight data, comprehensive coverage

1. **Sign up**: https://developers.amadeus.com/
2. **Get API Key**: 
   - Go to "My Self-Service Workspace"
   - Create a new app
   - Copy API Key and API Secret

3. **Set Environment Variables**:
   ```bash
   AMADEUS_API_KEY=your_api_key_here
   AMADEUS_API_SECRET=your_api_secret_here
   ```

4. **Deploy Backend**:
   ```bash
   npm run deploy --prefix infrastructure
   ```

### Option 2: RapidAPI/Skyscanner
**Best for**: Price comparison, multiple airlines

1. **Sign up**: https://rapidapi.com/skyscanner/api/skyscanner-flight-search
2. **Subscribe**: Choose a plan (Free tier available)
3. **Get API Key**: Copy from RapidAPI dashboard

4. **Set Environment Variable**:
   ```bash
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```

### Option 3: Multiple APIs (Best Coverage)
Use both Amadeus and RapidAPI for maximum coverage:

```bash
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
RAPIDAPI_KEY=your_rapidapi_key
```

## 🔧 Current API Endpoints

### Amadeus API
- **Search**: `GET /v2/shopping/flight-offers`
- **Details**: `GET /v1/shopping/flight-offers/{id}`
- **Auth**: OAuth2 Bearer token
- **Rate Limit**: 2000 requests/month (free tier)

### RapidAPI/Skyscanner
- **Search**: `GET /apiservices/browsequotes/v1.0/{country}/{currency}/{locale}/{origin}/{destination}/{departureDate}`
- **Auth**: X-RapidAPI-Key header
- **Rate Limit**: Varies by subscription

## 📊 Data Quality Comparison

| API | Real-time | Price Accuracy | Coverage | Cost |
|-----|-----------|----------------|----------|------|
| Amadeus | ✅ Excellent | ✅ High | ✅ Global | Free tier + pay-per-use |
| RapidAPI | ⚠️ Good | ✅ High | ✅ Good | Subscription |
| Mock Data | ❌ Static | ❌ Random | ❌ Limited | Free |

## 🚀 Quick Start (Amadeus)

1. **Get API Key** (5 minutes):
   - Visit: https://developers.amadeus.com/
   - Sign up with email
   - Create new app
   - Copy API Key & Secret

2. **Set Environment Variables**:
   ```bash
   export AMADEUS_API_KEY="your_key_here"
   export AMADEUS_API_SECRET="your_secret_here"
   ```

3. **Deploy Backend**:
   ```bash
   npm run deploy --prefix infrastructure
   ```

4. **Test Real Data**:
   - Visit: http://localhost:3000/flight-search
   - Search for flights
   - See real-time data!

## 🔍 Why Mock Data Currently?

1. **No API Keys**: Environment variables not set
2. **Not Deployed**: Enhanced flight search Lambda not deployed
3. **Fallback Active**: System uses mock data when APIs fail
4. **Demo Mode**: Shows functionality without API costs

## 💡 Pro Tips

- **Start with Amadeus**: Best free tier, comprehensive data
- **Use Test Environment**: Amadeus has test endpoints for development
- **Cache Results**: Implement caching to reduce API calls
- **Error Handling**: Always have fallback to mock data
- **Rate Limiting**: Respect API rate limits

## 🎯 Next Steps

1. Get Amadeus API key (free)
2. Set environment variables
3. Deploy backend infrastructure
4. Test with real data
5. Add caching for better performance
