# Design Document

## Overview

This design addresses the critical issues in trip management where confirmed bookings don't appear in the user's trip list, user data isolation problems, and missing profile functionality. The solution focuses on fixing the data flow between booking confirmation and trip retrieval, implementing proper user-based data isolation, and enhancing the profile system with travel preferences and city suggestions.

## Architecture

### Current Issues Analysis
Based on the console logs, trips are being created successfully in DynamoDB but not appearing in the "Your Trips" section. This indicates:
1. Disconnect between trip creation and trip retrieval systems
2. Potential caching issues or state management problems
3. User isolation not properly implemented (same data across different emails)
4. Missing profile preference management

### Solution Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │────│  Trip Service    │────│   DynamoDB      │
│                 │    │                  │    │                 │
│ - Trip List     │    │ - Create Trip    │    │ - User Trips    │
│ - Confirmation  │    │ - Fetch Trips    │    │ - Preferences   │
│ - Profile       │    │ - Delete Trip    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────────┐
                       │  Auth Context    │
                       │ - User Email     │
                       │ - Session Mgmt   │
                       └──────────────────┘
```

## Components and Interfaces

### 1. Trip Management Service Enhancement

**Current Implementation Issues:**
- Trip creation works but retrieval doesn't reflect new trips
- No proper user isolation in queries

**Enhanced Interface:**
```typescript
interface TripService {
  createTrip(tripData: TripData, userEmail: string): Promise<Trip>
  getUserTrips(userEmail: string): Promise<Trip[]>
  deleteTrip(tripId: string, userEmail: string): Promise<void>
  refreshTripList(userEmail: string): Promise<Trip[]>
}

interface Trip {
  id: string
  userId: string // User email
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  flightDetails: FlightDetails[]
  status: 'confirmed' | 'cancelled'
  createdAt: string
}
```

### 2. User Profile Service

**New Interface:**
```typescript
interface UserProfileService {
  getUserProfile(userEmail: string): Promise<UserProfile>
  updateTravelPreferences(userEmail: string, preferences: TravelPreferences): Promise<void>
  updateHomeCity(userEmail: string, homeCity: string): Promise<void>
  getCitySuggestions(query: string): Promise<CitySuggestion[]>
}

interface TravelPreferences {
  interests: string[]
  travelStyle: 'budget' | 'comfort' | 'luxury'
  budgetRange: { min: number; max: number }
  accommodationType: 'hotel' | 'hostel' | 'apartment' | 'any'
}

interface UserProfile {
  email: string
  homeCity: string
  travelPreferences: TravelPreferences
  createdAt: string
  updatedAt: string
}
```

### 3. City Suggestion Service

**Interface:**
```typescript
interface CitySuggestionService {
  searchCities(query: string): Promise<CitySuggestion[]>
}

interface CitySuggestion {
  name: string
  country: string
  iataCode?: string
  displayName: string
}
```

## Data Models

### DynamoDB Table Structure

**Trips Table:**
```
PK: USER#{userEmail}
SK: TRIP#{tripId}
GSI1PK: USER#{userEmail}
GSI1SK: DATE#{departureDate}#{tripId}

Attributes:
- id: string
- userId: string (user email)
- origin: string
- destination: string
- departureDate: string
- returnDate?: string
- flightDetails: object
- status: string
- createdAt: string
```

**User Profiles Table:**
```
PK: USER#{userEmail}
SK: PROFILE

Attributes:
- email: string
- homeCity: string
- travelPreferences: object
- createdAt: string
- updatedAt: string
```

## Error Handling

### Trip Management Errors
1. **Trip Creation Failure**: Display user-friendly error with retry option
2. **Trip Retrieval Failure**: Show cached data with refresh option
3. **Trip Deletion Failure**: Maintain trip in list with error notification
4. **Network Connectivity**: Implement offline-first approach with sync

### Profile Management Errors
1. **Preference Save Failure**: Show validation errors and allow correction
2. **City Suggestion API Failure**: Fallback to cached city list
3. **Profile Load Failure**: Use default preferences with notification

## Testing Strategy

### Unit Tests
- Trip service CRUD operations
- User isolation validation
- Profile preference validation
- City suggestion filtering

### Integration Tests
- End-to-end booking flow
- Multi-user data isolation
- Profile preference persistence
- City autocomplete functionality

### User Acceptance Tests
- Book trip and verify it appears in trip list
- Switch between user accounts and verify data isolation
- Set travel preferences and verify they persist
- Use city autocomplete and verify suggestions

## Implementation Approach

### Phase 1: Fix Trip Management
1. Debug and fix trip retrieval after creation
2. Implement proper user-based filtering
3. Add real-time trip list refresh
4. Fix trip deletion functionality

### Phase 2: Enhance Profile System
1. Create travel preferences UI components
2. Implement preference persistence
3. Add city autocomplete functionality
4. Integrate preferences with search/recommendations

### Phase 3: Data Isolation
1. Audit all DynamoDB queries for user isolation
2. Implement user context throughout the application
3. Add user switching detection and data refresh
4. Test multi-user scenarios thoroughly

## Security Considerations

1. **User Data Isolation**: Ensure all queries include user email filter
2. **Input Validation**: Validate all user inputs before database operations
3. **Authentication**: Verify user authentication before any data operations
4. **Data Sanitization**: Sanitize city search inputs to prevent injection attacks