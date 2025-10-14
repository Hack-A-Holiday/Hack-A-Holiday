# Quick Start Guide - Trip Management Feature

## 🚀 What's New?

Your trip management system now uses **DynamoDB** instead of localStorage with automatic cleanup and cancellation features!

## 📋 Key Features

1. **DynamoDB Storage** - Trips persist across devices and browsers
2. **Auto-Hide Expired Trips** - Trips automatically disappear from profile after return date
3. **Auto-Delete After 30 Days** - DynamoDB removes old trips 30 days after return date
4. **Trip Cancellation** - Cancel trips with reasons and get reminders to contact providers
5. **Beautiful UI** - Loading states, cancellation modal, and visual trip status

## 🏃‍♂️ How to Run

### Backend
```powershell
cd backend_test
npm run dev
# Server runs on http://localhost:4000
```

### Frontend
```powershell
cd frontend
npm run dev
# App runs on http://localhost:3000
```

### Environment Variables
Make sure your `backend_test/.env` has:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
TRIPS_TABLE=TravelCompanion-Trips-dev
```

## ✨ How to Test

### 1. Book a Trip
1. Go to Flight Search page
2. Search for flights (e.g., JFK → BOM)
3. Click "Book Now" on any flight
4. New tab opens for booking
5. Return to Hack-A-Holiday tab
6. Modal appears: "Did you plan your trip?"
7. Click **"✅ Yes, Trip Planned!"**
8. Trip is saved to DynamoDB!

### 2. View Trips
1. Go to Profile page
2. Scroll to "✈️ Your Trips" section
3. See all your planned trips
4. Each trip shows:
   - Origin → Destination
   - Dates
   - Status badge
   - Price (if available)
   - Cancel button

### 3. Cancel a Trip
1. Find a trip on Profile page
2. Click **"Cancel Trip"** button
3. Modal opens with:
   - Trip details
   - ⚠️ Important disclaimer
   - Cancellation reason dropdown
4. Select a reason (e.g., "Change of plans")
5. Click **"Cancel Trip"** button
6. Trip status updates to CANCELLED
7. Trip card turns grey
8. Cancellation reason displayed

### 4. Automatic Cleanup
- **Immediate:** Expired trips hidden from profile right away
- **30 Days Later:** DynamoDB automatically deletes the trip
- **Manual:** Admin can call `POST /api/trip/cleanup`

## 🎯 User Flow Example

```
1. User searches for flights: JFK → BOM (Oct 20 - Oct 29)
   ↓
2. Finds great flight package for $1,250
   ↓
3. Clicks "Book Now" → Opens booking site
   ↓
4. Books on airline website
   ↓
5. Returns to Hack-A-Holiday tab
   ↓
6. Modal: "Did you plan your trip?"
   ↓
7. Clicks "Yes, Trip Planned!"
   ↓
8. Trip saved to DynamoDB with:
   - origin: JFK
   - destination: BOM
   - departureDate: 2025-10-20
   - returnDate: 2025-10-29
   - type: package
   - status: planned
   - details: { totalPrice: 1250 }
   - ttl: Nov 28, 2025 (30 days after return)
   ↓
9. Goes to Profile page
   ↓
10. Sees trip card showing all details
   ↓
11. (Optional) Clicks "Cancel Trip"
    ↓
12. Selects reason: "Financial reasons"
    ↓
13. Trip status → cancelled
    ↓
14. Card turns grey, reason displayed
```

## 📊 Cancellation Reasons

Users can select from:
- Change of plans
- Financial reasons
- Health concerns
- Work commitments
- Found better deal
- Travel restrictions
- Weather concerns
- Personal emergency
- Other

## ⚠️ Important Notes

### For Users
- **Cancelling in app** only updates your trip status in Hack-A-Holiday
- You **MUST contact airlines, hotels, and booking providers** to cancel actual reservations
- The app shows a clear disclaimer when cancelling

### For Developers
- Trips use DynamoDB single-table design
- TTL is set automatically (returnDate + 30 days)
- Frontend filters out past trips
- Backward compatible with localStorage trips

## 🔧 API Endpoints

```
POST   /api/trip                        - Create trip
GET    /api/trip/user/:userId           - Get user trips + stats
GET    /api/trip/:userId/:tripId        - Get single trip
POST   /api/trip/:userId/:tripId/cancel - Cancel with reason
DELETE /api/trip/:userId/:tripId        - Delete trip
PATCH  /api/trip/:userId/:tripId/status - Update status
POST   /api/trip/cleanup                - Admin cleanup
```

## 🐛 Troubleshooting

### Trips not loading?
1. Check backend is running: `http://localhost:4000`
2. Open browser console (F12) for errors
3. Verify DynamoDB table exists: `TravelCompanion-Trips-dev`
4. Check AWS credentials in `.env`

### Can't create trips?
1. Verify backend logs show no errors
2. Check CORS settings in server.js
3. Ensure TRIPS_TABLE env variable is set

### TTL not working?
1. TTL takes up to 48 hours to activate in DynamoDB
2. Check TTL is enabled on the table
3. TTL attribute must be named `ttl`
4. Value should be Unix epoch in **seconds**

## 📝 Data Structure

```typescript
interface Trip {
  id: string;                          // trip-{timestamp}-{random}
  userId: string;                      // user email
  origin: string;                      // JFK
  destination: string;                 // BOM
  departureDate: string;               // 2025-10-20
  returnDate?: string;                 // 2025-10-29
  type: 'flight' | 'package' | 'hotel' | 'vacation';
  status: 'planned' | 'booked' | 'completed' | 'cancelled';
  details: {
    totalPrice?: number;
    flights?: any;
    hotel?: any;
  };
  createdAt: string;                   // ISO timestamp
  updatedAt: string;                   // ISO timestamp
  cancellationReason?: string;         // If cancelled
  cancelledAt?: string;                // ISO timestamp
}
```

## 🎉 What's Better Now?

### Before (localStorage)
- ❌ Lost when clearing browser
- ❌ Can't access from other devices
- ❌ Manual cleanup needed
- ❌ No cancellation tracking
- ❌ No trip statistics

### After (DynamoDB)
- ✅ Persists forever (until TTL)
- ✅ Access from any device
- ✅ Auto-cleanup built-in
- ✅ Track cancellations with reasons
- ✅ User statistics (trips planned, completed, destinations explored)

## 📈 Statistics Available

Profile page shows:
- `tripsPlanned` - Number of upcoming trips
- `tripsCompleted` - Number of past trips
- `totalTrips` - All trips ever
- `destinationsExplored` - Unique destinations
- `totalSpent` - Total money spent

## 🔐 Security Notes

- Add authentication middleware to trip routes (TODO)
- Validate user owns trip before operations
- Rate limit API endpoints
- Sanitize all user input
- Consider encrypting sensitive trip details

---

## Need Help?

See full implementation details in `TRIP_MANAGEMENT_IMPLEMENTATION.md`

**Happy Travels!** ✈️🌍
