# API Endpoint Configuration Fix - Implementation Plan

- [x] 1. Create centralized API configuration utility


  - Create `frontend/src/config/api.ts` with centralized URL management
  - Implement environment variable resolution with fallbacks
  - Add URL validation and error handling
  - _Requirements: 4.1, 4.2, 4.3_




- [ ] 2. Update existing API client utilities
  - [ ] 2.1 Enhance `frontend/src/utils/api-client.ts` to use centralized config
    - Import and use the centralized API configuration
    - Add proper error handling for connection failures


    - Implement request/response logging
    - _Requirements: 4.4, 4.5_




  - [ ] 2.2 Update `frontend/src/utils/api.ts` to use centralized config
    - Replace hardcoded base URL with centralized configuration
    - Add consistent error handling patterns
    - _Requirements: 4.1, 4.5_



- [x] 3. Fix flight search API endpoints

  - [x] 3.1 Update FlightSearch component API calls


    - Replace hardcoded URLs in `frontend/src/components/FlightSearch.tsx`
    - Use centralized API configuration for all flight-related calls
    - Add proper error handling for connection failures
    - _Requirements: 1.1, 1.2, 1.3_



  - [x] 3.2 Update flight search service files

    - Fix API URLs in flight search related services


    - Ensure consistent error handling across all flight APIs
    - _Requirements: 1.1, 1.4_

- [x] 4. Fix hotel search API endpoints


  - [ ] 4.1 Update hotel search hook
    - Replace hardcoded URL in `frontend/src/features/flight-search/hooks/useHotelSearch.ts`
    - Add proper error handling and user feedback


    - Implement request validation before API calls
    - _Requirements: 2.1, 2.2, 2.3, 2.5_




  - [ ] 4.2 Update hotel search in main flight search page
    - Fix hardcoded URLs in `frontend/src/pages/flight-search.tsx`
    - Ensure consistent error handling


    - _Requirements: 2.1, 2.4_


- [x] 5. Fix attraction recommendation API endpoints


  - [ ] 5.1 Update attraction recommendations hook
    - Replace hardcoded URLs in `frontend/src/features/flight-search/hooks/useAttractionRecommendations.ts`
    - Add proper timeout handling for API calls


    - Implement photo loading error handling
    - _Requirements: 3.1, 3.2, 3.3, 3.4_




  - [ ] 5.2 Update TripAdvisor service
    - Fix API URLs in `frontend/src/services/tripadvisorService.js`
    - Add consistent error handling patterns


    - _Requirements: 3.1, 3.5_


  - [x] 5.3 Update attraction API calls in flight search page


    - Replace all hardcoded TripAdvisor API URLs in `frontend/src/pages/flight-search.tsx`
    - Add proper error handling for photo loading
    - _Requirements: 3.2, 3.4_

- [ ] 6. Update remaining service files
  - [ ] 6.1 Fix user profile API service
    - Update `frontend/src/services/user-profile-api.ts` to use centralized config
    - Add proper error handling
    - _Requirements: 4.1, 4.5_





  - [ ] 6.2 Fix trip API service
    - Update `frontend/src/services/trip-api.ts` to use centralized config
    - Add consistent error handling patterns
    - _Requirements: 4.1, 4.5_



- [ ] 7. Update API route handlers
  - [ ] 7.1 Fix AI agent API route
    - Update `frontend/src/pages/api/ai-agent.ts` to use environment variables properly
    - Add proper error handling and logging
    - _Requirements: 4.1, 4.4_

  - [ ] 7.2 Fix AI chat API route
    - Update `frontend/src/pages/api/ai/chat.ts` to use centralized configuration
    - Add request/response logging
    - _Requirements: 4.1, 4.4_

- [ ] 8. Update plan trip feature hooks
  - [ ] 8.1 Fix globe route hook
    - Update `frontend/src/features/plan-trip/hooks/useGlobeRoute.ts` API URL usage
    - Add proper error handling
    - _Requirements: 4.1, 4.5_

  - [ ] 8.2 Fix trip planner hook
    - Update `frontend/src/features/plan-trip/hooks/useTripPlanner.ts` API URL usage
    - Add consistent error handling patterns
    - _Requirements: 4.1, 4.5_

- [ ] 9. Environment variable validation and testing
  - [ ] 9.1 Add environment validation utility
    - Create validation for required environment variables
    - Add startup checks for API connectivity
    - Implement development vs production environment detection
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 9.2 Add API connectivity tests
    - Create tests for API URL resolution
    - Test fallback mechanisms
    - Test error handling scenarios
    - _Requirements: 4.4, 4.5_

- [ ] 10. Update environment configuration files
  - [ ] 10.1 Verify frontend environment files
    - Ensure `frontend/.env` has correct production URLs
    - Ensure `frontend/.env.local` uses correct URLs for local development
    - Remove any conflicting environment variable definitions
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 10.2 Add environment documentation
    - Document required environment variables
    - Add setup instructions for different environments
    - _Requirements: 4.1, 4.2_