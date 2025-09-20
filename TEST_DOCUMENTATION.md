# Test Suite Documentation

## Overview
Comprehensive unit and integration tests for the Travel Companion application, covering both frontend and backend components.

## Test Structure

### Backend Tests (`/backend/src/__tests__/`)
- **auth.test.ts**: Authentication handler tests (login, signup, password reset)
- **user-repository.test.ts**: Database operations and user management tests

### Frontend Tests (`/frontend/src/`)
- **components/__tests__/**: Component unit tests
  - `InteractiveGlobe.test.tsx`: 3D globe component functionality
  - `ForgotPasswordForm.test.tsx`: Password reset form validation and submission
  - `ResetPasswordForm.test.tsx`: Password reset completion form
  - `AuthForm.integration.test.tsx`: Complete authentication form flow
- **contexts/__tests__/**: Context provider tests
  - `AuthContext.test.tsx`: Authentication state management
- **services/__tests__/**: Service layer tests
  - `dynamoAuth.test.ts`: API service methods and error handling

## Running Tests

### Backend Tests
```bash
cd backend
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
```

### Frontend Tests
```bash
cd frontend
npm test               # Run all tests
npm run test:watch    # Run tests in watch mode
```

### Test Coverage
```bash
npm test -- --coverage  # Generate coverage reports
```

## Test Features

### Authentication System
- ✅ User login/signup validation
- ✅ Password reset flow (forgot password → email → reset)
- ✅ Google OAuth integration
- ✅ Token management and validation
- ✅ Error handling and edge cases
- ✅ Security measures (rate limiting, token expiry)

### Interactive Globe Component
- ✅ 3D globe rendering and fallback handling
- ✅ Destination selection and filtering
- ✅ Search functionality
- ✅ User interactions (click, hover, search)
- ✅ Performance optimization
- ✅ Accessibility compliance

### Form Components
- ✅ Input validation and error messages
- ✅ Loading states and user feedback
- ✅ Password strength indicators
- ✅ Form submission handling
- ✅ Keyboard navigation
- ✅ ARIA attributes for accessibility

### Context Management
- ✅ Authentication state persistence
- ✅ Local storage integration
- ✅ Route protection and redirection
- ✅ Error state management
- ✅ Loading state coordination

### API Services
- ✅ HTTP request/response handling
- ✅ Error response parsing
- ✅ Network failure resilience
- ✅ Request parameter validation
- ✅ Authentication header management

## Test Coverage Goals
- **Backend**: 90%+ line coverage
- **Frontend Components**: 85%+ line coverage
- **Critical Paths**: 100% coverage (auth flows, password reset)

## Mock Strategy
- **External APIs**: Mocked to ensure test isolation
- **Browser APIs**: Mocked for consistent test environment
- **Database**: Mocked with controlled test data
- **File System**: Avoided in favor of in-memory operations

## Performance Testing
- **Component Render**: Measured render times
- **State Updates**: Validated efficient re-renders
- **Memory Usage**: Checked for memory leaks
- **Bundle Size**: Monitored test bundle impact

## Accessibility Testing
- **Screen Reader**: ARIA labels and roles
- **Keyboard Navigation**: Tab order and focus management
- **Color Contrast**: Visual accessibility compliance
- **Form Labels**: Proper input associations

## Security Testing
- **Input Sanitization**: XSS prevention
- **Authentication**: Token validation
- **Password Security**: Strength requirements
- **Error Messages**: No sensitive data exposure