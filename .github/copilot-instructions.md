# Hack-A-Holiday AI Agent Instructions
## Category

**Type:** Full-stack AI-powered travel platform
**Tech:** Next.js (TypeScript/React), Express.js (Node), AWS Bedrock, RapidAPI (Kiwi, Booking.com)
**Domain:** Travel, conversational AI, real-time search, itinerary planning

## Project Overview

**AI-powered travel planning platform** with real-time flight/hotel search, conversational AI assistant, and personalized trip planning. Built with Next.js frontend (TypeScript/React) and Express backend (Node.js) using AWS Bedrock (Nova Pro/Lite) for AI capabilities.

## Architecture & Data Flow

### Core Components

1. **Frontend** (`frontend/src/`) - Next.js with TypeScript
   - `pages/ai-agent.tsx` - Conversational AI chat interface
   - `components/FlightSearch.tsx` - Flight/hotel search with package creation
   - `services/booking-api.ts` - Hotel API integration (Booking.com via RapidAPI)
   - `services/kiwi-api.ts` - Flight API integration (Kiwi via RapidAPI)

2. **Backend** (`backend_test/`) - Express.js on port 4000
   - `services/IntegratedAITravelAgent.js` - Main AI agent (Nova Pro)
   - `services/FlightService.js` - Multi-provider flight search with Nova Lite for airport code lookup
   - `services/HotelService.js` - Hotel search with Booking.com API
   - `services/BedrockAgentCore.js` - AWS Bedrock Agent implementation
   - `routes/ai-agent.js` - AI chat endpoints
   - `routes/flights.js` - Flight search endpoints

### Critical Data Flow Pattern

```
User Query → IntegratedAITravelAgent → Intent Detection (Nova Lite)
    ↓
Missing Info? → Ask user (origin/destination/dates)
    ↓
Has Info? → FlightService/HotelService → External APIs (Kiwi/Booking.com)
    ↓
Parse & Deduplicate → Group flights by route → Return to AI
    ↓
Nova Pro synthesizes response with real data → User
```

**CRITICAL RULES - NO EXCEPTIONS**:
1. **NEVER use default dates** - Always ask user for departure/return/check-in/check-out dates
2. **NEVER assume origin** - Always ask where they're flying from (unless saved in preferences)
3. **NEVER assume destination** - Always ask specific city (not region like "Europe")
4. **NEVER assume trip duration** - Always ask how many days/nights for itineraries
5. **NEVER hallucinate** - Don't make up flight numbers, hotel names, or prices
6. **ALWAYS validate** - Check all required fields before calling APIs

See `IntegratedAITravelAgent.js` lines 1750-1758 (flights) and 1844-1855 (hotels) for implementation.

## Development Workflow

### Running the Application

**Backend** (always start first):
```powershell
cd backend_test
npm run dev  # Uses nodemon for hot reload
# Server runs on http://localhost:4000
```

**Frontend**:
```powershell
cd frontend
npm run dev  # Next.js dev server
# App runs on http://localhost:3000
```

**CRITICAL**: After backend code changes, you MUST restart the server. Node.js loads files into memory; changes won't apply until restart.

### Environment Setup

Required in `backend_test/.env`:
```
RAPIDAPI_KEY=your_key              # For Kiwi & Booking.com APIs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key         # For Bedrock
AWS_SECRET_ACCESS_KEY=your_secret
FAST_MODEL=us.amazon.nova-lite-v1:0    # Fast airport code lookup
AI_MODEL=us.amazon.nova-pro-v1:0       # Main AI responses
```

## Project-Specific Patterns

### 1. Flight Deduplication Strategy (CRITICAL)

**Problem**: Kiwi API returns same flight multiple times with slight price variations.

**Solution**: 4-step deduplication in `FlightService.js` (lines 603-682):

```javascript
// Step 1: Group by EXACT flight (airline+flightNumber+DATE+time+route)
const exactKey = `${airline}-${flightNumber}-${departureDate}-${departureTime}-${origin}-${destination}`;

// Step 2: Keep CHEAPEST per exact match
group.sort((a, b) => a.price - b.price);
uniqueFlights.push(group[0]);

// Step 3: Group by ROUTE (airline+flightNumber+route, ignoring date)
const routeKey = `${airline}-${flightNumber}-${origin}-${destination}`;

// Step 4: Add grouped metadata for frontend display
if (group.options.length > 1) {
  mainFlight.availableDates = [...];  // Multiple date/time options
  mainFlight.priceRange = {min, max};  // Price range
}
```

**Result**: 20 API results → 2-8 unique flights. Frontend shows grouped dates in single card.

### 2. AWS Bedrock Integration Pattern

**Two models, distinct purposes**:

  - Airport code lookup: "Mumbai" → "BOM" (cached in `Map`)
  - Intent classification
  - Quick responses

  - Travel planning
  - Itinerary generation
  - Conversational responses with context

**API Call Pattern** (see `IntegratedAITravelAgent.js`):
```javascript
const command = new ConverseCommand({
  modelId: this.modelId,
  messages: [{role: 'user', content: [{text: prompt}]}],
  inferenceConfig: {
    maxTokens: 4000,
    temperature: 0.7,
    topP: 0.9
  }
});
const response = await this.bedrockClient.send(command);
```

### 3. Round-Trip Package Creation

**Auto-triggered** when `returnDate` provided in `FlightSearch.tsx`:

1. Search outbound flights (JFK → BOM on Oct 20)
2. Search return flights (BOM → JFK on Oct 29)
3. Create packages: Combine best outbound with best return
4. Calculate savings: `individualBookingFee * 2 - bundleBookingFee`
5. Display top 5 packages sorted by total price

**Package Structure**:
```typescript
{
  outbound: FlightOption,
  return: FlightOption,
  totalPrice: number,
  savings: number  // Booking fee saved by bundling
}
```

### 4. Hotel Integration with Flight Search

**Auto-triggered** after round-trip flight search completes:

1. Extract destination airport code (BOM)
2. Get coordinates from `getAirportCoordinates()` (hardcoded map of 60+ airports)
3. Call Booking.com API with coordinates + check-in/check-out dates
4. Optimize: Fetch max 10 hotels if <10 flights found
5. Create vacation packages: Each flight package + each hotel
6. Sort by `priceWithDiscount` (flight + hotel - bundle savings)

**Coordinates Pattern** (`booking-api.ts` line 313+):
```typescript
getAirportCoordinates(code: string) {
  const coords = {
    'BOM': {lat: 19.0896, lng: 72.8656, city: 'Mumbai'},
    'JFK': {lat: 40.6413, lng: -73.7781, city: 'New York'},
    // ... 60+ airports
  };
  return coords[code] || null;
}
```

### 5. AI Agent Intent Detection

**Multi-stage analysis** in `IntegratedAITravelAgent.js`:

```javascript
// Stage 1: Nova Lite extracts basic intent
const intent = await this.analyzeUserIntent(message);
// Returns: {type: 'flight_search', extractedInfo: {origin, destination, dates}}

// Stage 2: Validate completeness
if (!extractedInfo.origin) return "Where are you flying from?";
if (!extractedInfo.destination) return "Which destination?";
if (!extractedInfo.departureDate) return "When are you traveling?";  // CRITICAL CHECK

// Stage 3: Call API only when complete
const flights = await this.fetchFlightData(extractedInfo);

// Stage 4: Nova Pro synthesizes response with real data
```

### 6. Frontend Date Validation Pattern

**Smart filtering** in `FlightSearch.tsx` (lines 626-650):

```typescript
// Filter past flights
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayStr = today.toISOString().split('T')[0];

if (flight.departure.date < todayStr) {
  console.warn(`⚠️ Filtered out past flight: ${flight.departure.date}`);
  return false;
}

// Validate route matches search
if (flight.departure.airport !== request.origin || 
    flight.arrival.airport !== request.destination) {
  console.warn(`⚠️ Wrong route: ${flight.departure.airport}→${flight.arrival.airport}`);
  return false;
}
```

## Common Pitfalls & Solutions

### Backend Changes Not Applying

**Symptom**: Code changes don't work, old behavior persists.

**Cause**: Node.js caches modules in memory.

**Fix**: 
1. Go to terminal running `npm run dev`
2. Press `Ctrl+C` to stop
3. Run `npm run dev` again
4. Look for deduplication logs: `📅 Grouped AI116: 3 date/time options`

### Google Flights URL Format

**Evolution** (4 attempts made):

```
❌ tfs=f.0.d.JFK.a.BOM.20251028&curr=USD  → Generic search form
❌ q=Flights from JFK to BOM on 2025-10-26  → Still generic
❌ /flights/s/JFK.BOM.2025-10-26  → Firebase "Invalid Dynamic Link" error
✅ q=JFK to BOM 2025-10-26  → WORKS!
```

**Current implementation** (`FlightSearch.tsx` line 134):
```typescript
const query = `${origin} to ${destination} ${date}`;
return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
```

### Flight Duplicate Issue

**Symptoms**: Same flight (AI116) showing 3-5 times with different prices.

**Root cause**: Kiwi API returns variations; deduplication key didn't include date.

**Fix applied**: See deduplication pattern above. Key now includes `departureDate`.

### AI Agent Auto-Searching Without Dates

**Symptom**: User says "flights to Japan", agent searches without asking dates.

**Root cause**: `fetchFlightData()` used default dates (`getDefaultDepartureDate()`).

**Fix applied** (line 1750):
```javascript
// Check if dates are missing - don't use defaults, ask user instead
if (!extractedInfo.departureDate) {
  console.log('⚠️ SKIPPING: No departure date found');
  return null;  // Triggers "When are you traveling?" prompt
}
```

## Testing Checklist

### After Backend Changes

1. **Restart server**: `Ctrl+C` then `npm run dev`
2. **Check logs**: Look for `🤖 Integrated AI Travel Agent initialized`
3. **Test flight search**: JFK → BOM, Oct 20 → Oct 29
4. **Verify deduplication**: Should see `🔀 Merged X duplicates` and `📅 Grouped AI116: N date/time options`
5. **Check results**: Should show 2-8 unique flights, not 20

### After Frontend Changes

1. **Hard refresh**: `Ctrl+Shift+R` (clears component cache)
2. **Check console**: Open DevTools (F12), look for errors
3. **Verify Google Flights**: Click button, check URL format in address bar
4. **Test grouped display**: Look for "📅 Multiple Dates Available" section

## Code Style Conventions


## Key Files to Reference


## External API Notes



**When in doubt**: Check the backend console logs. Every operation is logged with clear emojis and context.
