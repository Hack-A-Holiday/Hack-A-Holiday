# Environment Setup Guide

This document explains how to configure environment variables for the Hack-A-Holiday frontend application.

## Required Environment Variables

### Core API Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Primary backend API URL | Yes | `https://hack-a-holiday-backend.onrender.com` |
| `NEXT_PUBLIC_BACKEND_URL` | Fallback backend API URL | No | `https://hack-a-holiday-backend.onrender.com` |

### External API Keys

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_RAPIDAPI_KEY` | RapidAPI key for flight searches | Yes | `your-rapidapi-key` |
| `NEXT_PUBLIC_RAPIDAPI_HOST` | RapidAPI host for Kiwi flights | Yes | `kiwi-com-cheap-flights.p.rapidapi.com` |

### Firebase Configuration (Optional)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | No | `your-firebase-api-key` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | No | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | No | `your-project-id` |

## Environment Files

### Production Environment (`.env`)

```bash
# Production configuration
NEXT_PUBLIC_API_URL=https://hack-a-holiday-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://hack-a-holiday-backend.onrender.com
NEXT_PUBLIC_RAPIDAPI_KEY=your-rapidapi-key
NEXT_PUBLIC_RAPIDAPI_HOST=kiwi-com-cheap-flights.p.rapidapi.com
```

### Local Development (`.env.local`)

```bash
# Local development configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_RAPIDAPI_KEY=your-rapidapi-key
NEXT_PUBLIC_RAPIDAPI_HOST=kiwi-com-cheap-flights.p.rapidapi.com
```

## Setup Instructions

### 1. Development Setup

1. Copy the example environment file:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

2. Update the variables in `.env.local`:
   - Set `NEXT_PUBLIC_API_URL=http://localhost:4000`
   - Add your RapidAPI key
   - Configure other optional services

3. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

### 2. Production Deployment

#### Vercel Deployment

1. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add the production variables

2. Key production variables:
   ```
   NEXT_PUBLIC_API_URL=https://hack-a-holiday-backend.onrender.com
   NEXT_PUBLIC_RAPIDAPI_KEY=your-rapidapi-key
   ```

#### Other Platforms

For other deployment platforms, ensure these environment variables are set:
- `NEXT_PUBLIC_API_URL` - Your backend API URL
- `NEXT_PUBLIC_RAPIDAPI_KEY` - Your RapidAPI key

## Environment Variable Validation

The application includes automatic environment validation:

### Startup Checks

The app performs these checks on startup:
- ✅ Validates required environment variables
- ✅ Checks URL format validity
- ✅ Detects localhost URLs in production
- ✅ Tests API connectivity

### Development Logging

In development mode, you'll see:
```
🌍 Environment Information
Environment: development
Platform: localhost
API Base URL: http://localhost:4000
```

### Production Validation

In production, the app ensures:
- No localhost URLs are used
- All required variables are present
- API endpoints are reachable

## Troubleshooting

### Common Issues

#### 1. API Connection Errors

**Problem**: `Failed to connect to backend service`

**Solutions**:
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend server is running
- Check network connectivity

#### 2. Missing Environment Variables

**Problem**: `No valid API URL found in environment variables`

**Solutions**:
- Ensure `.env.local` exists for development
- Set `NEXT_PUBLIC_API_URL` in production
- Check variable names are correct (case-sensitive)

#### 3. CORS Issues

**Problem**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions**:
- Verify backend CORS configuration
- Check frontend origin is allowed
- Ensure API URL is correct

### Environment Detection

The app automatically detects:
- **Development**: `NODE_ENV=development` or localhost
- **Production**: `NODE_ENV=production` or deployed domains
- **Platform**: Vercel, Netlify, or localhost

### API Fallback Strategy

The application uses a fallback strategy:
1. Try `NEXT_PUBLIC_API_URL`
2. Fall back to `NEXT_PUBLIC_BACKEND_URL`
3. Use `http://localhost:4000` in development
4. Throw error in production if no valid URL

## Security Notes

### Public Variables

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser:
- ✅ Safe: API URLs, public keys
- ❌ Never: Private keys, secrets, passwords

### Best Practices

1. **Never commit sensitive data** to version control
2. **Use different keys** for development and production
3. **Rotate API keys** regularly
4. **Monitor API usage** to detect unauthorized access

## API Endpoints

The frontend connects to these backend endpoints:

### Flight Search
- `POST /flights/search` - Search for flights
- `GET /flights/health` - Health check

### Hotel Search
- `POST /api/hotels/search` - Search for hotels

### Attractions
- `GET /tripadvisor/location/search` - Search attractions
- `GET /tripadvisor/location/:id/details` - Get attraction details
- `GET /tripadvisor/location/:id/photos` - Get attraction photos

### AI Assistant
- `POST /api/ai/chat` - AI chat functionality
- `POST /ai-agent/chat` - AI agent communication

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify environment variables are set correctly
3. Test API connectivity using the validation utility
4. Check backend server logs for errors

For development help, see the main README.md file.