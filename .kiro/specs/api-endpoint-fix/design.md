# API Endpoint Configuration Fix - Design Document

## Overview

This design addresses the systematic replacement of hardcoded localhost URLs with environment variable-based configuration across the frontend application. The solution ensures proper API connectivity in both development and production environments while maintaining backward compatibility.

## Architecture

### Current State Issues
- Multiple hardcoded `http://localhost:4000` URLs throughout the codebase
- Inconsistent environment variable usage across different components
- Frontend deployed on Vercel trying to connect to localhost instead of Render backend
- Mixed patterns of API URL construction

### Target Architecture
```
Frontend (Vercel) → Environment Variables → Backend (Render)
                 ↓
    NEXT_PUBLIC_API_URL = https://hack-a-holiday-backend.onrender.com
                 ↓
    All API calls use centralized URL configuration
```

## Components and Interfaces

### 1. Environment Configuration Layer
**Purpose**: Centralize API URL management
**Location**: `frontend/src/config/api.ts`

```typescript
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export const getApiConfig = (): ApiConfig => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                  process.env.NEXT_PUBLIC_BACKEND_URL || 
                  'http://localhost:4000';
  
  return {
    baseUrl,
    timeout: 10000,
    retries: 3
  };
};
```

### 2. API Client Utilities
**Purpose**: Provide consistent API calling patterns
**Components**:
- `frontend/src/utils/api-client.ts` (existing, needs enhancement)
- `frontend/src/utils/api.ts` (existing, needs enhancement)

### 3. Service Layer Updates
**Components to Update**:
- `frontend/src/features/flight-search/hooks/useHotelSearch.ts`
- `frontend/src/features/flight-search/hooks/useAttractionRecommendations.ts`
- `frontend/src/pages/flight-search.tsx`
- `frontend/src/services/tripadvisorService.js`
- `frontend/src/services/user-profile-api.ts`
- `frontend/src/services/trip-api.ts`

### 4. Component Layer Updates
**Components to Update**:
- `frontend/src/components/FlightSearch.tsx`
- All API route handlers in `frontend/src/pages/api/`

## Data Models

### API Configuration Model
```typescript
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  timeout?: number;
}

interface ApiEndpoints {
  flights: {
    search: ApiEndpoint;
  };
  hotels: {
    search: ApiEndpoint;
  };
  tripadvisor: {
    locationSearch: ApiEndpoint;
    locationDetails: ApiEndpoint;
    locationPhotos: ApiEndpoint;
  };
}
```

### Environment Variable Schema
```typescript
interface EnvironmentConfig {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_BACKEND_URL?: string; // fallback
  NODE_ENV: 'development' | 'production' | 'test';
}
```

## Error Handling

### Connection Error Handling
1. **Network Failures**: Implement retry logic with exponential backoff
2. **Timeout Handling**: Set appropriate timeouts for different API types
3. **Fallback Mechanisms**: Graceful degradation when APIs are unavailable
4. **User Feedback**: Clear error messages for connection issues

### Environment Configuration Errors
1. **Missing Variables**: Log warnings and use localhost fallback in development
2. **Invalid URLs**: Validate URL format before making requests
3. **CORS Issues**: Ensure proper origin configuration

## Testing Strategy

### Unit Tests
- Test environment variable resolution
- Test API URL construction
- Test error handling scenarios

### Integration Tests
- Test API connectivity in different environments
- Test fallback mechanisms
- Test timeout handling

### End-to-End Tests
- Test complete user flows with real API calls
- Test deployment scenarios
- Test environment variable changes

## Implementation Approach

### Phase 1: Centralized Configuration
1. Create centralized API configuration utility
2. Update existing API client utilities
3. Define standard patterns for API calls

### Phase 2: Service Layer Updates
1. Update all service files to use centralized configuration
2. Replace hardcoded URLs systematically
3. Add proper error handling and logging

### Phase 3: Component Updates
1. Update React components and hooks
2. Update API route handlers
3. Ensure consistent patterns across all components

### Phase 4: Environment Validation
1. Add environment variable validation
2. Implement development vs production checks
3. Add logging for debugging API connections

## Security Considerations

### Environment Variables
- Use NEXT_PUBLIC_ prefix only for client-side variables
- Validate URLs to prevent injection attacks
- Log API calls without exposing sensitive data

### API Communication
- Ensure HTTPS in production
- Implement proper CORS configuration
- Add request/response logging for debugging

## Performance Considerations

### API Call Optimization
- Implement request caching where appropriate
- Use connection pooling for multiple requests
- Set reasonable timeout values

### Bundle Size
- Keep configuration utilities lightweight
- Avoid unnecessary dependencies
- Use tree-shaking friendly patterns

## Monitoring and Debugging

### Logging Strategy
- Log API configuration on application start
- Log failed API calls with error details
- Add environment-specific logging levels

### Debug Information
- Include API URL in error messages (development only)
- Add request/response timing information
- Implement health check endpoints