# TripAdvisor API Endpoints

This document describes the TripAdvisor-related API endpoints available in the Hack-A-Holiday backend.

## Base URL

```
http://localhost:4000/api/tripadvisor
```

Production: `https://your-domain.com/api/tripadvisor`

---

## Endpoints

### 1. Get Location Details

Retrieve comprehensive information about a specific location (restaurant, attraction, hotel).

**Endpoint**: `GET /location/:locationId/details`

**Parameters**:
- `locationId` (path, required): TripAdvisor location ID
- `language` (query, optional): Language code (default: 'en')
- `currency` (query, optional): Currency code (default: 'USD')

**Example Request**:
```bash
curl "http://localhost:4000/api/tripadvisor/location/1954828/details?language=en&currency=USD"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "location_id": "1954828",
    "name": "Eiffel Tower",
    "description": "The iconic iron lattice tower...",
    "rating": 4.5,
    "num_reviews": 125000,
    "review_rating_count": {
      "1": 1250,
      "2": 2500,
      "3": 12500,
      "4": 37500,
      "5": 71250
    },
    "address": "Champ de Mars, 5 Avenue Anatole France, 75007 Paris",
    "address_obj": {
      "street1": "Champ de Mars",
      "street2": "5 Avenue Anatole France",
      "city": "Paris",
      "state": "Île-de-France",
      "country": "France",
      "postalcode": "75007"
    },
    "phone": "+33 892 70 12 39",
    "website": "https://www.toureiffel.paris",
    "email": "contact@toureiffel.fr",
    "latitude": 48.8584,
    "longitude": 2.2945,
    "timezone": "Europe/Paris",
    "hours": {
      "weekday_text": [
        "Monday: 9:30 AM – 11:45 PM",
        "Tuesday: 9:30 AM – 11:45 PM",
        ...
      ]
    },
    "amenities": ["Elevator", "Gift Shop", "Restaurant"],
    "features": ["Iconic Landmark", "City Views"],
    "cuisine": [],
    "price_level": "$$",
    "ranking_data": {
      "geo_location_id": "187147",
      "ranking_string": "#1 of 3,000 things to do in Paris",
      "geo_location_name": "Paris",
      "ranking_out_of": 3000,
      "ranking": 1
    },
    "awards": [...],
    "category": {
      "name": "attraction",
      "localized_name": "Attraction"
    },
    "web_url": "https://www.tripadvisor.com/...",
    "write_review": "https://www.tripadvisor.com/.../review"
  },
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "success": false,
  "error": "Location ID is required",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

404 Not Found:
```json
{
  "success": false,
  "error": "Location 999999 not found",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

429 Too Many Requests:
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

504 Gateway Timeout:
```json
{
  "success": false,
  "error": "Request timeout. Please try again.",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

---

### 2. Get Location Photos

Retrieve high-quality photos for a specific location.

**Endpoint**: `GET /location/:locationId/photos`

**Parameters**:
- `locationId` (path, required): TripAdvisor location ID
- `limit` (query, optional): Number of photos to return (1-20, default: 5)
- `language` (query, optional): Language code (default: 'en')

**Example Request**:
```bash
curl "http://localhost:4000/api/tripadvisor/location/1954828/photos?limit=5&language=en"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "is_blessed": true,
      "album": "Exterior Views",
      "caption": "The Eiffel Tower at sunset",
      "published_date": "2024-08-15",
      "images": {
        "thumbnail": {
          "url": "https://...",
          "width": 50,
          "height": 50
        },
        "small": {
          "url": "https://...",
          "width": 150,
          "height": 150
        },
        "medium": {
          "url": "https://...",
          "width": 250,
          "height": 250
        },
        "large": {
          "url": "https://...",
          "width": 550,
          "height": 550
        },
        "original": {
          "url": "https://...",
          "width": 2048,
          "height": 1536
        }
      },
      "source": {
        "name": "Traveler",
        "localized_name": "Traveler"
      },
      "user": {
        "username": "travel_photographer"
      }
    }
  ],
  "count": 5,
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

**Error Responses**:

400 Bad Request (Invalid Limit):
```json
{
  "success": false,
  "error": "Limit must be between 1 and 20",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

404 Not Found (No Photos):
```json
{
  "success": true,
  "data": [],
  "count": 0,
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

---

### 3. Search Attractions

Search for attractions near a location.

**Endpoint**: `GET /attractions/:location`

**Parameters**:
- `location` (path, required): Location name (e.g., "Paris", "New York")
- `limit` (query, optional): Number of results (default: 5)

**Example Request**:
```bash
curl "http://localhost:4000/api/tripadvisor/attractions/Paris?limit=5"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "contentId": "3436969",
      "name": "Eiffel Tower",
      "rating": 4.5,
      "reviewCount": 125000,
      "priceLevel": "$",
      "category": "landmark",
      "address": "Champ de Mars, 7th arrondissement, Paris",
      "description": "Iconic iron lattice tower...",
      "photoUrl": "https://...",
      "latitude": 48.8584,
      "longitude": 2.2945
    }
  ],
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

---

### 4. Search Restaurants

Search for restaurants near a location.

**Endpoint**: `GET /restaurants/:location`

**Parameters**:
- `location` (path, required): Location name
- `limit` (query, optional): Number of results (default: 5)

**Example Request**:
```bash
curl "http://localhost:4000/api/tripadvisor/restaurants/Paris?limit=5"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "contentId": "27717696",
      "name": "Le Comptoir du Relais",
      "rating": 4.4,
      "reviewCount": 1200,
      "priceLevel": "$$",
      "cuisine": ["French", "European"],
      "address": "9 Carrefour de l'Odéon, Paris",
      "description": "Traditional French bistro...",
      "photoUrl": "https://...",
      "latitude": 48.8519,
      "longitude": 2.3396
    }
  ],
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

---

### 5. Health Check

Check the status of the TripAdvisor integration.

**Endpoint**: `GET /health`

**Example Request**:
```bash
curl "http://localhost:4000/api/tripadvisor/health"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "TripAdvisor RapidAPI integration is healthy",
  "timestamp": "2025-10-16T10:30:00.000Z",
  "availableTools": [
    "search_attractions",
    "search_restaurants",
    "get_attraction_details",
    "get_restaurant_details"
  ],
  "features": {
    "locationDetails": true,
    "locationPhotos": true,
    "attractions": true,
    "restaurants": true
  }
}
```

---

## Rate Limiting

The TripAdvisor Content API has rate limits:
- **Free Tier**: 500 requests/day
- **Paid Tiers**: Higher limits available

The service implements:
- **Caching**: Responses cached for 1 hour (configurable)
- **Retry Logic**: Automatic retry with exponential backoff
- **Graceful Degradation**: Falls back to mock data if API unavailable

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (location doesn't exist)
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error
- `504`: Gateway Timeout

---

## Caching

Responses are automatically cached to improve performance and reduce API calls:

- **Cache Duration**: 1 hour (configurable via `TRIPADVISOR_CACHE_TTL`)
- **Cache Key**: Based on endpoint, location ID, and parameters
- **Cache Storage**: In-memory (Map)

**Cache Behavior**:
- First request: Fetches from API, stores in cache
- Subsequent requests: Returns cached data if not expired
- Expired cache: Automatically refreshes from API

---

## Authentication

TripAdvisor endpoints require a valid API key configured in environment variables:

```bash
TRIPADVISOR_API_KEY=your_api_key_here
```

If not configured, endpoints will:
1. Log a warning
2. Return mock data
3. Continue functioning for development

---

## Best Practices

1. **Use Caching**: Don't disable caching in production
2. **Limit Results**: Request only what you need
3. **Handle Errors**: Always check `success` field in responses
4. **Monitor Usage**: Track API calls to stay within limits
5. **Implement Retry**: Use exponential backoff for failed requests

---

## Examples

### Get Details for Multiple Locations

```javascript
const locationIds = ['1954828', '187791', '188590'];

const details = await Promise.all(
  locationIds.map(id =>
    fetch(`http://localhost:4000/api/tripadvisor/location/${id}/details`)
      .then(res => res.json())
  )
);
```

### Get Photos with Error Handling

```javascript
try {
  const response = await fetch(
    'http://localhost:4000/api/tripadvisor/location/1954828/photos?limit=10'
  );
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('Error:', data.error);
    return;
  }
  
  console.log(`Received ${data.count} photos`);
  data.data.forEach(photo => {
    console.log(`- ${photo.caption}: ${photo.images.large.url}`);
  });
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Support

For issues or questions:
- Check logs in `backend_test/`
- Review [TripAdvisor Setup Guide](./TRIPADVISOR_SETUP.md)
- Contact development team
