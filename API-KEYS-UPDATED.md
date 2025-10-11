# 🔑 API Keys Updated - RapidAPI Migration

## 📋 Summary

Successfully migrated to **new RapidAPI credentials** for both Kiwi.com flights and Booking.com services across the entire application.

---

## ✅ Changes Made

### 1. **Kiwi.com Flight API** - New RapidAPI Key

**File:** `frontend/src/services/kiwi-api.ts`

**Old API Key:** `4bb41c35e2mshabe7faff89c8273p1fe197jsnccfa27353502`
**New API Key:** `8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20`

**API Configuration:**
```typescript
export class KiwiApiService {
  private readonly apiKey = '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20';
  private readonly baseUrl = 'https://kiwi-com-cheap-flights.p.rapidapi.com';
}
```

**Request Headers:**
```typescript
headers: {
  'x-rapidapi-host': 'kiwi-com-cheap-flights.p.rapidapi.com',
  'x-rapidapi-key': '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20'
}
```

**Example cURL:**
```bash
curl --request GET \
  --url 'https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip?source=Country%3AGB&destination=City%3Adubrovnik_hr&currency=usd&locale=en&adults=1&children=0&infants=0&handbags=1&holdbags=0&cabinClass=ECONOMY&sortBy=QUALITY&sortOrder=ASCENDING&applyMixedClasses=true&allowReturnFromDifferentCity=true&allowChangeInboundDestination=true&allowChangeInboundSource=true&allowDifferentStationConnection=true&enableSelfTransfer=true&allowOvernightStopover=true&enableTrueHiddenCity=true&enableThrowAwayTicketing=true&outbound=SUNDAY%2CWEDNESDAY%2CTHURSDAY%2CFRIDAY%2CSATURDAY%2CMONDAY%2CTUESDAY&transportTypes=FLIGHT&contentProviders=FLIXBUS_DIRECTS%2CFRESH%2CKAYAK%2CKIWI&limit=20' \
  --header 'x-rapidapi-host: kiwi-com-cheap-flights.p.rapidapi.com' \
  --header 'x-rapidapi-key: 8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20'
```

---

### 2. **Booking.com Hotel API** - New RapidAPI Key

**File:** `frontend/src/services/booking-api.ts`

**Old API Key:** `2fa64a1f33msh66fae9717bb5ba2p10e28fjsn7419e62e64e2`
**New API Key:** `8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20`

**API Configuration:**
```typescript
export class BookingApiService {
  private readonly apiKey = '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20';
  private readonly baseUrl = 'https://booking-com15.p.rapidapi.com/api/v1';
}
```

**Request Headers:**
```typescript
headers: {
  'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
  'x-rapidapi-key': '8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20'
}
```

**Example cURL (Car Rentals):**
```bash
curl --request GET \
  --url 'https://booking-com15.p.rapidapi.com/api/v1/cars/searchCarRentals?pick_up_latitude=40.6397018432617&pick_up_longitude=-73.7791976928711&drop_off_latitude=40.6397018432617&drop_off_longitude=-73.7791976928711&pick_up_time=10%3A00&drop_off_time=10%3A00&driver_age=30&currency_code=USD&location=US' \
  --header 'x-rapidapi-host: booking-com15.p.rapidapi.com' \
  --header 'x-rapidapi-key: 8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20'
```

---

## 🔍 Files Modified

### Primary Service Files:
1. ✅ `frontend/src/services/kiwi-api.ts` - Updated Kiwi.com API key
2. ✅ `frontend/src/services/booking-api.ts` - Updated Booking.com API key

### Documentation Files (Reference Only):
- `HOTEL_INTEGRATION_PROGRESS.md` - Contains old key in documentation
- `FEATURE_COMPLETE_SUMMARY.md` - Contains old key in documentation

**Note:** Documentation files are not updated as they serve as historical reference. The actual code has been updated.

---

## 🎯 API Endpoints

### Kiwi.com Flight Search API

**Base URL:** `https://kiwi-com-cheap-flights.p.rapidapi.com`

**Endpoint:** `/round-trip`

**Parameters:**
- `source`: Origin airport/city (e.g., `City:toronto`)
- `destination`: Destination airport/city (e.g., `City:mumbai`)
- `departureDate`: Departure date (YYYY-MM-DD)
- `returnDate`: Return date (YYYY-MM-DD)
- `adults`: Number of adults
- `children`: Number of children
- `infants`: Number of infants
- `handbags`: Number of handbags
- `holdbags`: Number of checked bags
- `cabinClass`: Cabin class (ECONOMY, BUSINESS, FIRST)
- `sortBy`: Sort criteria (QUALITY, PRICE, DURATION)
- `currency`: Currency code (USD)
- `locale`: Language (en)
- `limit`: Max results (20)

---

### Booking.com Hotel Search API

**Base URL:** `https://booking-com15.p.rapidapi.com/api/v1`

**Endpoint:** `/hotels/searchHotels`

**Parameters:**
- `dest_id`: Destination ID from Booking.com
- `search_type`: Search type (CITY, HOTEL, etc.)
- `arrival_date`: Check-in date (YYYY-MM-DD)
- `departure_date`: Check-out date (YYYY-MM-DD)
- `adults`: Number of adults
- `room_qty`: Number of rooms
- `currency_code`: Currency (USD)
- `languagecode`: Language (en-us)

---

### Booking.com Car Rentals API (NEW)

**Base URL:** `https://booking-com15.p.rapidapi.com/api/v1`

**Endpoint:** `/cars/searchCarRentals`

**Parameters:**
- `pick_up_latitude`: Pickup location latitude
- `pick_up_longitude`: Pickup location longitude
- `drop_off_latitude`: Drop-off location latitude
- `drop_off_longitude`: Drop-off location longitude
- `pick_up_time`: Pickup time (HH:MM)
- `drop_off_time`: Drop-off time (HH:MM)
- `driver_age`: Driver age
- `currency_code`: Currency (USD)
- `location`: Country code (US)

---

## 🔒 Security Best Practices

### Environment Variables

**Recommended:** Store API keys in environment variables:

```bash
# .env.local (frontend)
NEXT_PUBLIC_RAPIDAPI_KEY=8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20
NEXT_PUBLIC_BOOKING_API_KEY=8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20
```

**Current Implementation:**
- ✅ Both services support environment variables
- ✅ Fallback to hardcoded keys if env vars not set
- ✅ Keys are in frontend code only (client-side API calls)

**Future Improvement:**
- 🔄 Move API calls to backend/server-side
- 🔄 Store keys in backend environment only
- 🔄 Expose secured proxy endpoints to frontend

---

## 📊 API Usage & Limits

### RapidAPI Free Tier Limits

**Important:** Both APIs now share the **same RapidAPI account**, so rate limits are combined.

**Typical Limits:**
- 500 requests/month (free tier)
- 10 requests/second
- Daily quota varies by plan

**Monitoring:**
- Check RapidAPI dashboard for usage
- Monitor console logs for API errors
- Implement rate limiting on frontend

---

## 🧪 Testing

### Test Kiwi.com API:
```bash
curl --request GET \
  --url 'https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip?source=City:toronto&destination=City:mumbai&departureDate=2025-10-28&returnDate=2025-11-05&currency=usd&locale=en&adults=1&children=0&infants=0&handbags=1&holdbags=0&cabinClass=ECONOMY&sortBy=QUALITY&limit=20' \
  --header 'x-rapidapi-host: kiwi-com-cheap-flights.p.rapidapi.com' \
  --header 'x-rapidapi-key: 8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20'
```

### Test Booking.com API:
```bash
curl --request GET \
  --url 'https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels?dest_id=-2092174&search_type=CITY&arrival_date=2025-10-28&departure_date=2025-11-05&adults=1&room_qty=1&currency_code=USD&languagecode=en-us' \
  --header 'x-rapidapi-host: booking-com15.p.rapidapi.com' \
  --header 'x-rapidapi-key: 8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20'
```

---

## ✅ Verification Checklist

- [x] Updated Kiwi.com API key in `kiwi-api.ts`
- [x] Updated Booking.com API key in `booking-api.ts`
- [x] Verified no TypeScript errors
- [x] Both services use same RapidAPI key
- [x] API keys support environment variables
- [x] Headers configured correctly
- [x] No backend services need updating
- [ ] Test flight search functionality
- [ ] Test hotel search functionality
- [ ] Monitor API usage on RapidAPI dashboard
- [ ] Update .env.example if needed

---

## 🚀 Deployment Notes

**Before deploying:**
1. Set environment variables on hosting platform:
   ```
   NEXT_PUBLIC_RAPIDAPI_KEY=8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20
   NEXT_PUBLIC_BOOKING_API_KEY=8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20
   ```

2. Verify API endpoints are accessible

3. Monitor API usage to avoid hitting rate limits

4. Consider implementing caching to reduce API calls

---

## 🔧 Troubleshooting

### If API Calls Fail:

1. **Check API Key:**
   - Verify key is correct: `8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20`
   - Check RapidAPI dashboard for subscription status

2. **Check Rate Limits:**
   - Monitor RapidAPI dashboard for quota
   - Implement exponential backoff for retries

3. **Check Response Errors:**
   - Open browser DevTools → Network tab
   - Look for 401 (Unauthorized) or 429 (Rate Limit) errors
   - Check response body for error messages

4. **Fallback to Mock Data:**
   - Both services have mock data fallback
   - Will activate automatically if API fails
   - Check console for "Using mock data" messages

---

## 📝 Additional Notes

- **Same API Key:** Both Kiwi.com and Booking.com use the same RapidAPI key
- **No Breaking Changes:** API structure remains the same
- **Backward Compatible:** Old searches will work with new keys
- **Future Features:** Car rentals API endpoint available for future integration

---

**Migration Complete!** ✅ All API calls now use the new RapidAPI credentials.
