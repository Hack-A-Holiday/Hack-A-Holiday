# API Endpoint Configuration Fix - Requirements Document

## Introduction

The deployed frontend application is failing to connect to the backend services because of hardcoded localhost URLs and inconsistent environment variable usage. This causes flight search, hotel search, and attraction recommendation features to fail in production.

## Glossary

- **Frontend_Application**: The Next.js React application deployed on Vercel
- **Backend_Service**: The Express.js API server deployed on Render
- **Environment_Variable**: Configuration values that change between development and production environments
- **API_Endpoint**: URL endpoints that the frontend calls to communicate with the backend
- **Hardcoded_URL**: URLs that are directly written in code instead of using environment variables

## Requirements

### Requirement 1

**User Story:** As a user accessing the deployed application, I want flight search to work properly, so that I can find and compare flight options.

#### Acceptance Criteria

1. WHEN a user searches for flights, THE Frontend_Application SHALL use the correct production backend URL from environment variables
2. WHEN the flight search API is called, THE Frontend_Application SHALL successfully connect to the Backend_Service
3. WHEN flight search results are returned, THE Frontend_Application SHALL display the results without connection errors
4. WHERE the environment variable is not set, THE Frontend_Application SHALL fall back to localhost for development
5. THE Frontend_Application SHALL NOT contain any hardcoded production URLs in the source code

### Requirement 2

**User Story:** As a user accessing the deployed application, I want hotel search to work properly, so that I can find accommodation options.

#### Acceptance Criteria

1. WHEN a user searches for hotels, THE Frontend_Application SHALL use the correct production backend URL from environment variables
2. WHEN the hotel search API is called, THE Frontend_Application SHALL successfully connect to the Backend_Service
3. WHEN hotel search results are returned, THE Frontend_Application SHALL display the results without connection errors
4. THE Frontend_Application SHALL handle hotel booking redirects properly
5. THE Frontend_Application SHALL validate hotel search parameters before making API calls

### Requirement 3

**User Story:** As a user accessing the deployed application, I want attraction recommendations to work properly, so that I can discover interesting places to visit.

#### Acceptance Criteria

1. WHEN a user views a destination, THE Frontend_Application SHALL fetch attraction recommendations using the correct backend URL
2. WHEN TripAdvisor API calls are made, THE Frontend_Application SHALL use environment variables for the base URL
3. WHEN attraction details are fetched, THE Frontend_Application SHALL handle API timeouts gracefully
4. WHEN photos are loaded, THE Frontend_Application SHALL use the correct API endpoints
5. THE Frontend_Application SHALL filter and display attraction results appropriately

### Requirement 4

**User Story:** As a developer deploying the application, I want consistent environment variable usage, so that the application works correctly in all environments.

#### Acceptance Criteria

1. THE Frontend_Application SHALL use NEXT_PUBLIC_API_URL environment variable for all backend API calls
2. WHERE NEXT_PUBLIC_API_URL is not available, THE Frontend_Application SHALL use NEXT_PUBLIC_BACKEND_URL as fallback
3. THE Frontend_Application SHALL NOT contain hardcoded localhost URLs in production builds
4. THE Frontend_Application SHALL log API connection attempts for debugging purposes
5. THE Frontend_Application SHALL handle API connection failures gracefully with appropriate error messages