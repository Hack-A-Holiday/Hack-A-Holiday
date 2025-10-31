# 🧳 Hack Travel - AI-Powered Travel Companion

[![AWS](https://img.shields.io/badge/AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![AWS Bedrock](https://img.shields.io/badge/AWS%20Bedrock-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/bedrock/)

An intelligent travel planning platform that creates personalized itineraries using AWS Bedrock AI. Features ChatGPT-like conversation management, real-time flight/hotel integration, and comprehensive travel assistance with context-aware responses.

## 🌐 Live Application

### 🚀 **Access the Deployed Application**
- **Frontend (Live)**: [https://hacktravel.vercel.app](https://hacktravel.vercel.app)
- **Backend API**: [https://hack-a-holiday-backend.onrender.com](https://hack-a-holiday-backend.onrender.com)

**Ready to use!** No setup required - just visit the frontend link and start planning your next adventure!

### ✅ **Current Application Status**
- ✅ **Frontend**: Fully deployed and operational on Vercel
- ✅ **Backend**: Running on Render with all APIs functional
- ✅ **AI Assistant**: AWS Bedrock Nova models integrated and working
- ✅ **Authentication**: Google OAuth and traditional auth both working
- ✅ **APIs**: TripAdvisor, Booking.com, and flight search APIs operational
- ✅ **Domain Restrictions**: Recently fixed TripAdvisor API domain issues
- ✅ **Database**: DynamoDB tables configured and accessible
- ✅ **CORS**: Properly configured for cross-origin requests

### 🏠 **Local Development Setup**
If you want to run the application locally for development:

```bash
# 1. Clone the repository
git clone https://github.com/VarunGagwani/Hack-A-Holiday.git
cd Hack-A-Holiday

# 2. Start Backend Server (Terminal 1)
cd backend_test
npm install
npm run dev
# Backend runs on http://localhost:4000

# 3. Start Frontend (Terminal 2) 
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

**Note**: For local development, you'll need to configure environment variables (see [Environment Configuration](#environment-configuration) section below).

## 🚀 Features

### 🤖 **AI-Powered Travel Assistant**
- **ChatGPT-like Conversations**: Resume any conversation and ask follow-up questions
- **Context-Aware Responses**: AI understands location-specific questions (e.g., "airport" refers to local airport when discussing a city)
- **Detailed Itineraries**: Day-by-day plans with real attractions, restaurants, and activities
- **Smart Passenger Validation**: Automatically asks for missing information before generating flight links

### 🗺️ **Interactive Travel Planning**
- **3D Globe Interface**: Beautiful globe for destination selection
- **Plan My Adventure**: Comprehensive trip planning with budget and preferences
- **Real-Time Flight Integration**: Google Flights integration with pre-populated search parameters
- **Hotel & Attraction Data**: Real data from Booking.com and TripAdvisor APIs

### 🔐 **User Experience**
- **Multiple Authentication Options**: 
  - Traditional email/password registration and login
  - **Google OAuth Integration**: One-click sign-in with Google accounts via Firebase
- **Secure JWT Authentication**: Token-based sessions with HTTP-only cookies
- **User Profiles**: Personalized accounts with profile pictures and trip history
- **Trip History**: Save and manage your planned trips across sessions
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark Mode Support**: Toggle between light and dark themes

### ☁️ **Enterprise Architecture**
- **AWS Bedrock Integration**: Advanced AI models (Nova Lite and Nova Pro) for intelligent responses
- **Express.js Backend**: Robust MVC architecture with comprehensive error handling
- **Rate Limiting Protection**: Exponential backoff for AWS API calls
- **Real-Time Processing**: Instant responses with fallback mechanisms

## 📁 Project Structure

```
Hack Travel/
├── 📂 frontend/                    # Next.js React Application
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── auth/              # Authentication components
│   │   │   ├── ai/                # AI chat components
│   │   │   └── layout/            # Layout components
│   │   ├── features/              # Feature-based modules
│   │   │   ├── ai-assistant/      # ChatGPT-like AI assistant
│   │   │   ├── flight-search/     # Flight search functionality
│   │   │   └── plan-trip/         # Trip planning features
│   │   ├── pages/                 # Next.js pages & routing
│   │   │   ├── ai-assistant.tsx   # AI chat interface
│   │   │   ├── plantrip.tsx      # Trip planning page
│   │   │   ├── profile.tsx       # User profile & trip history
│   │   │   └── flight-search.tsx # Flight search page
│   │   ├── services/              # API integration services
│   │   │   ├── dynamoAuth.ts     # Authentication service
│   │   │   ├── kiwi-api.ts       # Flight API integration
│   │   │   └── trip-api.ts       # Trip management API
│   │   ├── contexts/              # React contexts
│   │   │   ├── AuthContext.tsx   # Authentication state
│   │   │   └── TripContext.tsx   # Trip planning state
│   │   ├── types/                 # TypeScript definitions
│   │   └── utils/                 # Utility functions
│   └── package.json
│
├── 📂 backend_test/                # Express.js Backend (MVC Architecture)
│   ├── controllers/               # Route controllers
│   │   ├── authController.js     # Authentication logic
│   │   ├── planTripController.js # Trip planning logic
│   │   └── userController.js     # User management
│   ├── services/                  # Business logic services
│   │   ├── IntegratedAITravelAgent.js  # Main AI travel agent
│   │   ├── FlightService.js      # Flight search service
│   │   ├── HotelService.js       # Hotel booking service
│   │   └── TripAdvisorService.js # Attraction data service
│   ├── routes/                    # API route definitions
│   │   ├── ai.js                 # AI assistant routes
│   │   ├── auth.js               # Authentication routes
│   │   ├── flights.js            # Flight search routes
│   │   └── planTripRoutes.js     # Trip planning routes
│   ├── models/                    # Data models
│   │   ├── userModel.js          # User data model
│   │   └── tripModel.js          # Trip data model
│   ├── middleware/                # Express middleware
│   │   └── authMiddleware.js     # JWT authentication
│   ├── config/                    # Configuration files
│   │   └── dynamo.js             # DynamoDB configuration
│   └── package.json
│
├── 📂 infrastructure/              # AWS CDK Infrastructure
│   ├── lib/                      # CDK stack definitions
│   │   ├── lambda-stack.ts       # Lambda functions & API Gateway
│   │   ├── dynamodb-stack.ts     # DynamoDB tables
│   │   ├── s3-stack.ts           # S3 buckets & CloudFront
│   │   └── bedrock-agent-stack.ts # AWS Bedrock configuration
│   └── package.json
│
├── 📂 tests/                       # Test files
├── 📄 API_DOCUMENTATION.md         # Complete API documentation
├── 📄 .env.example                # Environment variables template
├── 📄 buildspec.yml               # AWS CodeBuild configuration
├── 📄 deploy-to-aws.ps1           # PowerShell deployment script
└── 📄 package.json                # Root workspace configuration
```

### 🏗️ **Architecture Overview**

- **Frontend**: Next.js with TypeScript, featuring modular components and context-based state management
- **Backend**: Express.js MVC architecture with AWS SDK integration for Bedrock, DynamoDB, and external APIs
- **Infrastructure**: AWS CDK for Infrastructure as Code (IaC) deployment
- **AI Integration**: AWS Bedrock with Nova models for intelligent travel assistance
- **Data Storage**: DynamoDB for user data, trips, and conversation history
- **External APIs**: Integration with Booking.com, TripAdvisor, and Google Flights

## ⚡ Quick Start Options

### 🌐 **Option 1: Use Live Application (Recommended)**
**No setup required!** Just visit the deployed application:

1. **Visit**: [https://hacktravel.vercel.app](https://hacktravel.vercel.app)
2. **Sign up** for a new account or login with Google
3. **Start planning**: Use "Plan My Adventure" or chat with the AI assistant
4. **Explore features**: Flight search, trip history, and personalized recommendations

### 🏠 **Option 2: Local Development Setup**

#### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

#### Quick Local Setup (5 minutes)
```bash
# 1. Clone the repository
git clone https://github.com/VarunGagwani/Hack-A-Holiday.git
cd Hack-A-Holiday

# 2. Start Backend (Terminal 1)
cd backend_test
npm install
npm run dev
# ✅ Backend runs on http://localhost:4000

# 3. Start Frontend (Terminal 2)
cd frontend  
npm install
npm run dev
# ✅ Frontend runs on http://localhost:3000
```

#### Test Local Setup
1. **Open** http://localhost:3000
2. **Sign up** for a new account or login
3. **Plan My Adventure**: Create a detailed trip itinerary
4. **AI Assistant**: Chat with the AI for travel advice
5. **Flight Search**: Search flights with real-time data
6. **Profile**: View your saved trips and travel history

**Note**: Local development requires environment configuration for full functionality (see [Environment Configuration](#environment-configuration) below).

## 🔧 Detailed Setup

### Environment Configuration

#### Root `.env` file:
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# External API Keys
RAPIDAPI_KEY=your-rapidapi-key

# Application URLs
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

#### Backend `backend_test/.env` file:
```bash
# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Bedrock Model Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_NOVA_MODEL_ID=us.amazon.nova-lite-v1:0

# External API Integration
RAPIDAPI_KEY=your-rapidapi-key
BOOKING_API_KEY=your-rapidapi-key
TRIPADVISOR_API_KEY=your-rapidapi-key
KIWI_API_KEY=your-rapidapi-key

# Database Configuration
DYNAMODB_TABLE_PREFIX=TravelCompanion
USERS_TABLE=TravelCompanion-Users-dev
TRIPS_TABLE=TravelCompanion-Trips-dev
CHATS_TABLE=HackAHolidayChatHistory

# Server Configuration
PORT=4000
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key
```

#### Frontend `frontend/.env.local` file:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Application Configuration
NEXT_PUBLIC_APP_NAME=Hack Travel
NEXT_PUBLIC_ENVIRONMENT=development

# Firebase Configuration (for Google OAuth)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEF1234
```

### AWS Services Used

| Service | Purpose | Cost Estimate |
|---------|---------|---------------|
| **AWS Bedrock** | AI models (Nova) | ~$0.003/1K tokens |
| **DynamoDB** | User data & trip storage | ~$1.25/1M reads |
| **S3** | Static file hosting | ~$0.023/GB |
| **CloudFront** | CDN for frontend | ~$0.085/GB |

**Total estimated cost**: $10-30/month for moderate usage

### External API Integration

| API | Provider | Purpose | Status |
|-----|----------|---------|--------|
| **Booking.com** | RapidAPI | Hotel search & booking | ✅ Active |
| **TripAdvisor** | RapidAPI | Attractions & reviews | ✅ Active |
| **Google Flights** | Direct URL | Flight search fallback | ✅ Active |
| **Kiwi.com** | RapidAPI | Flight search (primary) | ⚠️ Rate Limited |

## 🎯 AI Capabilities & Features

### 🤖 **Intelligent Travel Assistant**
- **Global Destination Knowledge**: Comprehensive information about worldwide destinations
- **Contextual Conversations**: Remembers previous discussions and provides relevant follow-ups
- **Multi-Language Support**: Handles travel queries in multiple languages
- **Real-Time Integration**: Connects with live flight, hotel, and attraction data

### 🗺️ **Supported Travel Services**
- **Flight Search**: Real-time flight data with Google Flights integration
- **Hotel Booking**: Live hotel availability and pricing via Booking.com
- **Attraction Discovery**: Detailed attraction information via TripAdvisor
- **Itinerary Planning**: Day-by-day detailed travel plans with real locations
- **Budget Planning**: Cost estimates for flights, hotels, and activities
- **Travel Tips**: Visa requirements, weather, local customs, and safety information

### 🌍 **Popular Destinations**
The AI has extensive knowledge of major destinations including:
- **Europe**: Paris, London, Rome, Barcelona, Amsterdam, Berlin
- **Asia**: Tokyo, Singapore, Bangkok, Mumbai, Seoul, Hong Kong
- **Americas**: New York, Los Angeles, Toronto, Mexico City, São Paulo
- **Middle East & Africa**: Dubai, Cairo, Marrakech, Cape Town, Istanbul
- **Oceania**: Sydney, Melbourne, Auckland, Fiji

*The AI can provide detailed information for virtually any global destination.*

## 🛠️ Development Commands

### Root Workspace Commands
```bash
npm run install:all          # Install all dependencies
npm run build:all            # Build all projects
npm run test:all             # Run all tests
npm run dev:frontend         # Start frontend dev server
npm run deploy:infra         # Deploy infrastructure
npm run clean                # Clean all node_modules
```

### Frontend Commands (in `/frontend`)
```bash
npm run dev                  # Start development server (http://localhost:3000)
npm run build               # Build for production
npm run start               # Start production server
npm run lint                # Check code style with ESLint
npm run test                # Run Jest tests
npm run test:watch          # Run tests in watch mode
```

### Backend Commands (in `/backend_test`)
```bash
npm run dev                  # Start development server with nodemon
npm run start               # Start production server
node server.js              # Direct server start
node validate-env.js        # Validate environment variables
```

### Infrastructure Commands (in `/infrastructure`)
```bash
npm run deploy              # Deploy all CDK stacks
npm run destroy             # Remove all AWS resources
npm run synth               # Generate CloudFormation templates
cdk diff                    # Show deployment differences
```

### Testing & Validation
```bash
# Test specific components
node test_final_validation.js        # Final integration test
node test_passenger_validation.js    # Passenger validation test
node backend_test/test-syntax.js     # Backend syntax validation
```

## 🔐 Authentication & Security Features

### **Authentication Methods**
- ✅ **Traditional Auth** - Email/password registration and login
- ✅ **Google OAuth 2.0** - Firebase-powered Google sign-in with popup flow
- ✅ **JWT Tokens** - Secure session management with HTTP-only cookies
- ✅ **Profile Management** - User profiles with Google profile pictures

### **Security Implementation**
- ✅ **No hardcoded secrets** - All sensitive data in environment variables
- ✅ **Secure cookie handling** - HTTP-only cookies with proper SameSite settings
- ✅ **CORS protection** - Proper cross-origin setup for production/development
- ✅ **Input validation** - All user inputs validated and sanitized
- ✅ **Environment separation** - Dev/prod isolation with different configurations
- ✅ **Git secrets protection** - .env files excluded from version control
- ✅ **Firebase security** - Google OAuth handled through Firebase Authentication

### **Google OAuth Setup**
The application uses Firebase Authentication for Google OAuth integration:
1. **Firebase Project**: Configure a Firebase project with Authentication enabled
2. **Google Provider**: Enable Google sign-in method in Firebase Console
3. **Environment Variables**: Set Firebase configuration in frontend environment
4. **Automatic Profile Sync**: Google profile data automatically synced to backend

## 🧪 Testing & Validation

### Local Development Testing
```bash
# 1. Start backend server
cd backend_test && npm run dev

# 2. Start frontend (new terminal)
cd frontend && npm run dev

# 3. Test the application
# - Visit http://localhost:3000
# - Sign up for a new account
# - Test "Plan My Adventure" feature
# - Test AI Assistant chat functionality
# - Test flight search integration
```

### API Endpoint Testing
```bash
# Health check
curl http://localhost:4000/api/health

# Test AI chat
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Plan a 3-day trip to Paris", "conversationId": "test-123"}'

# Test trip planning
curl -X POST http://localhost:4000/api/plan-trip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"destination": "Tokyo, Japan", "duration": 5, "budget": 3000, "interests": ["culture", "food"]}'

# Test flight search
curl -X POST http://localhost:4000/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{"origin": "JFK", "destination": "NRT", "departureDate": "2025-06-15", "passengers": 2}'

# Test authentication endpoints
# Traditional registration
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}'

# Traditional login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Google OAuth user creation/login
curl -X POST http://localhost:4000/api/auth/google-user \
  -H "Content-Type: application/json" \
  -d '{"uid": "google-uid-123", "email": "user@gmail.com", "displayName": "John Doe", "photoURL": "https://example.com/photo.jpg"}'
```

### Environment Validation
```bash
# Validate backend environment
cd backend_test && node validate-env.js

# Test AWS Bedrock connection
cd backend_test && node test-bedrock-simple.js

# Test external API integrations
cd backend_test && node test-comprehensive-integration.js
```

### Frontend Testing
```bash
# Run Jest tests
cd frontend && npm run test

# Run specific test file
cd frontend && npm run test flight-search.test.tsx

# Run tests in watch mode
cd frontend && npm run test:watch
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📚 Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API endpoint reference
- **[Environment Variables](ENVIRONMENT_VARIABLES_STRICT.md)** - Detailed environment configuration
- **[Backend README](backend_test/README.md)** - Backend-specific documentation
- **[Deployment Script](deploy-to-aws.ps1)** - PowerShell deployment automation
- **[Build Configuration](buildspec.yml)** - AWS CodeBuild configuration

### Key Documentation Files
- `API_DOCUMENTATION.md` - External API integration details
- `Requirements.docx` - Original project requirements
- `backend_test/EB_ENV_VARIABLES.md` - Elastic Beanstalk environment setup
- `backend_test/docs/` - TripAdvisor API setup guides

## 🐛 Troubleshooting

### Common Issues

#### **Backend Server Issues**
```bash
# Backend won't start - check port 4000
netstat -ano | findstr :4000  # Windows
lsof -ti:4000 | xargs kill -9  # macOS/Linux

# AWS Bedrock connection errors
# Verify AWS credentials and region
aws sts get-caller-identity
aws bedrock list-foundation-models --region us-east-1
```

#### **Frontend Issues**
```bash
# Frontend won't start - check port 3000
netstat -ano | findstr :3000  # Windows
lsof -ti:3000 | xargs kill -9  # macOS/Linux

# API connection errors - verify backend URL
# Check frontend/.env.local for correct NEXT_PUBLIC_API_URL
```

#### **Environment Configuration**
```bash
# Validate all environment files exist
ls -la .env backend_test/.env frontend/.env.local

# Test environment variables
cd backend_test && node validate-env.js

# Check AWS credentials
aws configure list
```

#### **Database Connection Issues**
```bash
# Test DynamoDB connection
aws dynamodb list-tables --region us-east-1

# Verify table permissions
aws iam get-user
```

#### **External API Issues**
```bash
# Test RapidAPI key
curl -H "X-RapidAPI-Key: YOUR_KEY" \
  "https://booking-com18.p.rapidapi.com/stays/search?locationId=test"

# Check API quotas and limits in RapidAPI dashboard
```

### Build & Dependency Issues
```bash
# Clean install all dependencies
npm run clean
npm run install:all

# Clear Next.js cache
cd frontend && rm -rf .next

# Reset package-lock files
rm -rf package-lock.json frontend/package-lock.json backend_test/package-lock.json
npm install
```

### Getting Help

1. **Check server logs**: Backend console output for detailed error messages
2. **Browser DevTools**: Network tab for API request/response details
3. **Environment validation**: Run validation scripts to check configuration
4. **AWS CloudWatch**: Monitor AWS service logs and metrics
5. **API Documentation**: Refer to `API_DOCUMENTATION.md` for endpoint details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Deployment Options

### Local Development (Recommended for testing)
```bash
# Start both frontend and backend locally
npm run install:all
cd backend_test && npm run dev &
cd frontend && npm run dev
```

### AWS Deployment
```bash
# Deploy infrastructure using CDK
cd infrastructure && npm run deploy

# Deploy backend to Elastic Beanstalk
# Use deploy-to-aws.ps1 script or manual EB deployment
```

### Firebase Setup for Google OAuth

1. **Create Firebase Project**
   ```bash
   # Visit https://console.firebase.google.com/
   # Create a new project or use existing one
   ```

2. **Enable Authentication**
   ```bash
   # In Firebase Console:
   # 1. Go to Authentication > Sign-in method
   # 2. Enable Google provider
   # 3. Add your domain to authorized domains
   ```

3. **Get Firebase Configuration**
   ```bash
   # In Firebase Console:
   # 1. Go to Project Settings > General
   # 2. Scroll to "Your apps" section
   # 3. Click "Config" to get configuration object
   # 4. Add these values to frontend/.env.local
   ```

4. **Configure OAuth Consent Screen**
   ```bash
   # In Google Cloud Console:
   # 1. Go to APIs & Services > OAuth consent screen
   # 2. Configure app information and scopes
   # 3. Add test users if in development mode
   ```

### Production Considerations
- **Environment Variables**: Ensure all production keys are configured
- **Firebase Security**: Configure Firebase security rules and authorized domains
- **CORS Settings**: Update CORS origins for production domains
- **Rate Limiting**: Configure appropriate rate limits for production traffic
- **Monitoring**: Set up CloudWatch alarms and logging
- **Security**: Enable HTTPS and proper authentication

## 🙏 Acknowledgments

- **AWS Bedrock** for advanced AI capabilities
- **Next.js** for the powerful React framework
- **Express.js** for robust backend architecture
- **React Globe.gl** for the beautiful 3D globe component
- **RapidAPI** for comprehensive travel data APIs
- **Booking.com & TripAdvisor** for real-time travel information

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation for API changes
- Ensure environment variables are properly configured
- Test both frontend and backend integration

---

**Made with ❤️ for travelers by travelers**

[![GitHub stars](https://img.shields.io/github/stars/VarunGagwani/Hack-A-Holiday?style=social)](https://github.com/VarunGagwani/Hack-A-Holiday)
