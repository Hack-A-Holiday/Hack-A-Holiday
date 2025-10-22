# TripAdvisor Content API Setup

This document explains how to set up the TripAdvisor Content API for destination enrichment features.

## Overview

The TripAdvisor Content API provides:
- Location details (restaurants, attractions)
- High-quality photos
- Reviews and ratings
- Opening hours and contact information

## Getting Your API Key

1. **Sign up for TripAdvisor Developer Account**
   - Visit: https://www.tripadvisor.com/developers
   - Click "Get Started" or "Sign Up"
   - Complete the registration process

2. **Create a New Application**
   - Log in to your developer account
   - Navigate to "My Applications"
   - Click "Create New Application"
   - Fill in application details:
     - Application Name: "Hack-A-Holiday Travel Assistant"
     - Description: "AI-powered travel planning assistant"
     - Website URL: Your application URL

3. **Get Your API Key**
   - Once approved, you'll receive an API key
   - Copy the API key

4. **Add to Environment Variables**
   ```bash
   # In backend_test/.env
   TRIPADVISOR_API_KEY=your_actual_api_key_here
   TRIPADVISOR_CACHE_TTL=3600000  # 1 hour in milliseconds
   ```

## Configuration Options

### Cache TTL (Time To Live)

The `TRIPADVISOR_CACHE_TTL` variable controls how long location data is cached:

- **Default**: 3600000 ms (1 hour)
- **Recommended for development**: 600000 ms (10 minutes)
- **Recommended for production**: 3600000 ms (1 hour)

```bash
# Development - shorter cache for testing
TRIPADVISOR_CACHE_TTL=600000

# Production - longer cache to reduce API calls
TRIPADVISOR_CACHE_TTL=3600000
```

## API Rate Limits

TripAdvisor Content API has the following rate limits:

- **Free Tier**: 500 requests per day
- **Paid Tiers**: Higher limits available

### Best Practices to Stay Within Limits

1. **Enable Caching**: The service automatically caches responses
2. **Limit Results**: Request only the number of results you need
3. **Batch Requests**: Fetch multiple locations in parallel when possible
4. **Monitor Usage**: Check your API dashboard regularly

## Testing the Integration

### 1. Test API Key

```bash
curl "https://api.content.tripadvisor.com/api/v1/location/1954828/details?key=YOUR_API_KEY&language=en"
```

Expected response: Location details for Paris (location ID: 1954828)

### 2. Test in Application

Start the backend server:
```bash
cd backend_test
npm start
```

Test the health endpoint:
```bash
curl http://localhost:4000/api/tripadvisor/health
```

Expected response:
```json
{
  "success": true,
  "message": "TripAdvisor RapidAPI integration is healthy",
  "features": {
    "locationDetails": true,
    "locationPhotos": true,
    "attractions": true,
    "restaurants": true
  }
}
```

### 3. Test Location Details

```bash
curl "http://localhost:4000/api/tripadvisor/location/1954828/details"
```

### 4. Test Location Photos

```bash
curl "http://localhost:4000/api/tripadvisor/location/1954828/photos?limit=5"
```

## Troubleshooting

### Error: "No Content API key"

**Problem**: `TRIPADVISOR_API_KEY` not set in environment variables

**Solution**:
1. Check `.env` file exists in `backend_test/` directory
2. Verify the API key is correctly set
3. Restart the server after adding the key

### Error: "Rate limit exceeded"

**Problem**: Too many API requests

**Solution**:
1. Increase cache TTL to reduce requests
2. Implement request throttling
3. Consider upgrading to a paid tier

### Error: "Location not found (404)"

**Problem**: Invalid location ID

**Solution**:
1. Verify the location ID is correct
2. Use the location search endpoint first to find valid IDs
3. Check TripAdvisor documentation for valid location IDs

### Mock Data Fallback

If the API key is not configured, the service automatically falls back to mock data:

```
⚠️ TRIPADVISOR_API_KEY not set. Location details and photos will use mock data.
```

This allows development and testing without an API key, but real data won't be available.

## API Documentation

Full API documentation: https://www.tripadvisor.com/developers/content-api

### Key Endpoints Used

1. **Location Details**
   - Endpoint: `/location/{locationId}/details`
   - Returns: Comprehensive location information
   - Rate: 1 request per location

2. **Location Photos**
   - Endpoint: `/location/{locationId}/photos`
   - Returns: Up to 20 photos per request
   - Rate: 1 request per location

## Support

For API-related issues:
- TripAdvisor Developer Support: https://www.tripadvisor.com/developers/support
- Developer Forum: https://www.tripadvisor.com/developers/forum

For application-specific issues:
- Check application logs in `backend_test/`
- Review error messages in browser console
- Contact development team
