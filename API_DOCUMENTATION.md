# 🚀 **Hack-A-Holiday API Documentation**

This document contains all the API details currently used in the Hack-A-Holiday project.

## 🛫 **Google Flights API**

**Current Implementation:** We're using Google Flights as a **fallback URL generator** when the Kiwi API fails, not as a direct API.

**API Key:** `24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4`

**URL Format:**
```
https://www.google.com/travel/flights/flights/{ORIGIN}.{DESTINATION}.{DEPARTURE_DATE}.{RETURN_DATE}?hl=en&curr={CURRENCY}&adults={ADULTS}&tfs=f.CABIN.c.2
```

**Example:**
```
https://www.google.com/travel/flights/flights/JFK.BOM.2025-12-15.2025-12-20?hl=en&curr=USD&adults=2&tfs=f.CABIN.c.2
```

**Parameters:**
- `ORIGIN`: Airport code (e.g., JFK)
- `DESTINATION`: Airport code (e.g., BOM)
- `DEPARTURE_DATE`: YYYY-MM-DD format
- `RETURN_DATE`: YYYY-MM-DD format (optional for one-way)
- `CURRENCY`: USD, EUR, INR, etc.
- `ADULTS`: Number of adult passengers

---

## 🏨 **Booking.com API**

**API Provider:** RapidAPI - `booking-com18`
**Host:** `booking-com18.p.rapidapi.com`
**API Key:** `24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4`

### **Search Hotels Endpoint:**
```
GET https://booking-com18.p.rapidapi.com/stays/search
```

**Headers:**
```
x-rapidapi-host: booking-com18.p.rapidapi.com
x-rapidapi-key: 24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4
```

**Parameters:**
- `locationId`: Base64 encoded location (e.g., `eyJjaXR5X25hbWUiOiJOZXcgWW9yayIsImNvdW50cnkiOiJVbml0ZWQgU3RhdGVzIiwiZGVzdF90eXBlIjoiY2l0eSJ9`)
- `checkinDate`: YYYY-MM-DD format
- `checkoutDate`: YYYY-MM-DD format
- `adults`: Number of adults
- `children`: Number of children
- `rooms`: Number of rooms
- `units`: metric
- `temperature`: c

### **Other Endpoints:**
- **Photos:** `GET /stays/get-photos?hotelId={HOTEL_ID}`
- **Reviews:** `GET /stays/reviews?hotelId={HOTEL_ID}`
- **Details:** `GET /stays/detail?hotelId={HOTEL_ID}&units=metric`
- **Description:** `GET /stays/get-description?hotelId={HOTEL_ID}`

---

## 🏛️ **TripAdvisor API**

**API Provider:** RapidAPI - `tripadvisor-api`
**Host:** `tripadvisor-api.p.rapidapi.com`
**API Key:** `24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4`

### **Location Search Endpoint:**
```
GET https://tripadvisor-api.p.rapidapi.com/locations/search
```

**Headers:**
```
x-rapidapi-host: tripadvisor-api.p.rapidapi.com
x-rapidapi-key: 24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4
```

**Parameters:**
- `query`: Search term (e.g., "Mumbai tourist attractions")
- `limit`: Number of results (default: 10)

### **Location Details Endpoint:**
```
GET https://tripadvisor-api.p.rapidapi.com/locations/{locationId}/details
```

### **Location Photos Endpoint:**
```
GET https://tripadvisor-api.p.rapidapi.com/locations/{locationId}/photos
```

**Parameters:**
- `limit`: Number of photos (default: 5)

### **Nearby Search Endpoint:**
```
GET https://tripadvisor-api.p.rapidapi.com/locations/nearby-search
```

**Parameters:**
- `latitude`: Latitude coordinate
- `longitude`: Longitude coordinate
- `category`: Search category (e.g., "attractions")
- `limit`: Number of results

---

## 🛫 **Kiwi.com Flights API** (Currently Rate Limited)

**API Provider:** RapidAPI - `kiwi-com-cheap-flights`
**Host:** `kiwi-com-cheap-flights.p.rapidapi.com`
**API Key:** `24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4`

**Status:** ⚠️ **RATE LIMITED** - Currently returning 429 errors due to monthly quota exceeded on BASIC plan.

**Endpoints:**
- **Round Trip:** `GET /round-trip`
- **One Way:** `GET /one-way`

**Parameters:**
- `source`: City:{AIRPORT_CODE} or Airport:{AIRPORT_CODE}
- `destination`: City:{AIRPORT_CODE} or Airport:{AIRPORT_CODE}
- `departureDate`: YYYY-MM-DD format
- `returnDate`: YYYY-MM-DD format (for round trip)
- `adults`: Number of adult passengers
- `children`: Number of children
- `infants`: Number of infants
- `currency`: usd, eur, inr, etc.
- `cabinClass`: ECONOMY, BUSINESS, FIRST
- `sortBy`: QUALITY, PRICE, DURATION
- `sortOrder`: ASCENDING, DESCENDING

---

## 📊 **Current API Status**

| API | Status | Usage | Notes |
|-----|--------|-------|-------|
| **Booking.com** | ✅ **Working** | Real hotel data | Successfully integrated with `booking-com18` |
| **TripAdvisor** | ✅ **Working** | Real attraction data | Successfully integrated for attractions |
| **Google Flights** | ✅ **Working** | Fallback URLs | Used when Kiwi API fails |
| **Kiwi.com** | ⚠️ **Rate Limited** | Flight search | 429 errors due to quota exceeded |

---

## 🔧 **Fallback Strategy**

The system is designed to gracefully handle API failures:

1. **Primary Flight API:** Kiwi.com (currently rate limited)
2. **Fallback:** Google Flights URL generation
3. **Hotel API:** Booking.com (working perfectly)
4. **Attractions API:** TripAdvisor (working perfectly)

When Kiwi API fails, the system automatically generates Google Flights URLs with the correct parameters, ensuring users always have a way to search for flights.

---

## 📝 **Environment Variables**

```bash
# RapidAPI Key (used for all APIs)
RAPIDAPI_KEY=24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4

# Booking.com API
BOOKING_API_HOST=booking-com18.p.rapidapi.com
BOOKING_API_KEY=24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4

# TripAdvisor API
TRIPADVISOR_API_KEY=24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4

# Kiwi.com API (currently rate limited)
KIWI_API_KEY=24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4
```

---

*Last Updated: January 2025*
*Project: Hack-A-Holiday Travel Planning Platform*
