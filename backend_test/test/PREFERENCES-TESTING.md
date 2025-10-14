# User Preferences Testing Guide

## Quick Test
```bash
cd backend_test/test
node test-preferences.js
```

## What Was Implemented

### 1. Extended Preferences Structure
- **Flight**: cabin class, airlines, stops, departure time, seat, meals, baggage
- **Hotel**: chains, rating, amenities, room type, location, view, budget
- **General**: home city, travel style, interests, currency

### 2. Auto-Extraction from Chat
Users can naturally mention preferences:
- "I prefer business class" → Saves preference
- "Direct flights only" → maxStops = 0
- "I love Emirates" → Adds to preferredAirlines
- "5-star hotels with pool" → Hotel preferences

### 3. Applied to Search
- Uses homeCity as default origin
- Applies cabin class preference
- Uses preferred currency
- Displays preference-aware messages

## Test Scenarios

**Test 1: Full Flight Request**
```
User: "search me flights to barcelona from mumbai dec 13 to dec 21"
Expected: Extracts all info and searches immediately (no confirmation needed)
```

**Test 2: Set Preferences**
```
User: "I'm from Mumbai. I prefer business class, Emirates, direct flights, morning departures"
Expected: Saves all preferences automatically
```

**Test 3: Use Saved Preferences**
```
User: "search flights to Paris in July"
Expected: Uses Mumbai as origin, searches with saved preferences
```

## Files Modified
- `backend_test/services/IntegratedAITravelAgent.js` (lines 64-520, 2733-2770)

## Debugging
Check backend logs for:
- `✅ Extracted new preferences`
- `👤 Final user preferences`
- `📅 Extracted date range`
