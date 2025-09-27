# ✈️ Flight API Setup Guide

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
