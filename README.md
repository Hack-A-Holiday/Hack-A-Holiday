# 🧳 Hack-A-Holiday - AI-Powered Travel Companion

[![AWS](https://img.shields.io/badge/AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-FF9900?style=for-the-badge&logo=awslambda&logoColor=white)](https://aws.amazon.com/lambda/)

An intelligent travel planning platform that creates personalized itineraries using AI. Built with AWS serverless architecture, Next.js frontend, and comprehensive travel data.

## 🚀 Features

- **🤖 AI-Powered Planning**: Generates detailed day-by-day itineraries
- **🗺️ Interactive Globe**: 3D globe interface for destination selection
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **🔐 Secure Authentication**: User accounts with JWT-based auth
- **☁️ Serverless Architecture**: Scales automatically with AWS Lambda
- **🎯 Personalized Recommendations**: Based on interests, budget, and travel style
- **📍 Real Places & Activities**: Actual attractions, restaurants, and experiences
- **💡 Travel Tips**: Destination-specific advice and emergency information

## 📁 Project Structure

```
Hack-A-Holiday/
├── 📂 frontend/              # Next.js React application
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/           # Next.js pages (dashboard, auth, etc.)
│   │   ├── contexts/        # React contexts (auth, etc.)
│   │   └── services/        # API service functions
│   └── package.json
│
├── 📂 backend/               # AWS Lambda functions
│   ├── src/
│   │   ├── functions/       # Lambda function handlers
│   │   ├── services/        # Business logic services
│   │   ├── repositories/    # Data access layer
│   │   └── types/          # TypeScript type definitions
│   └── package.json
│
├── 📂 infrastructure/        # AWS CDK infrastructure code
│   ├── lib/                # CDK stack definitions
│   │   ├── lambda-stack.js  # Lambda functions & API Gateway
│   │   ├── s3-stack.js     # S3 buckets & CloudFront
│   │   └── dynamodb-stack.js # DynamoDB tables
│   └── package.json
│
├── 📂 frontend-html/         # Simple HTML test interface (optional)
│   └── index.html           # Basic testing UI for API endpoints
│
└── 📄 Configuration files
    ├── .env.example         # Environment variables template
    ├── .gitignore          # Git ignore rules
    └── package.json        # Root workspace configuration
```

> **Note**: The `frontend-html/` directory contains a simple HTML testing interface that can be used to quickly test API endpoints without running the full Next.js application. It's useful for debugging but the main application is in the `frontend/` directory.

## ⚡ Quick Start (5 minutes)

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **AWS CLI** configured ([Setup Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- **AWS Account** with appropriate permissions

### 1. 📥 Clone & Install
```bash
git clone https://github.com/VarunGagwani/Hack-A-Holiday.git
cd Hack-A-Holiday
npm run install:all
```

### 2. 🔧 Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# At minimum, set:
# - AWS_ACCOUNT_ID (your AWS account ID)
# - AWS_REGION (e.g., us-east-1)
```

### 3. 🚀 Deploy to AWS
```bash
# Deploy infrastructure (takes ~2-3 minutes)
cd infrastructure
npm run deploy

# Note the API Gateway URL from output
```

### 4. 🌐 Start Frontend
```bash
# In a new terminal
cd frontend
npm run dev
```

### 5. ✅ Test It Out
1. Open http://localhost:3000
2. Create an account or login
3. Go to Dashboard
4. Plan a trip to "Marrakech, Morocco" or "Paris, France"
5. See your detailed itinerary! 🎉

## 🔧 Detailed Setup

### Environment Configuration

Create `.env` file in the root directory:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-aws-account-id

# API Configuration (auto-populated after deployment)
API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev

# Frontend Configuration
NEXT_PUBLIC_APP_NAME=Hack-A-Holiday
NEXT_PUBLIC_CLOUDFRONT_URL=https://your-cloudfront-domain.cloudfront.net

# Environment
NODE_ENV=dev
ENVIRONMENT=dev
```

### AWS Services Used

| Service | Purpose | Cost Estimate |
|---------|---------|---------------|
| **AWS Lambda** | Backend API functions | ~$0.20/1M requests |
| **API Gateway** | REST API endpoint | ~$3.50/1M requests |
| **DynamoDB** | User data & trip storage | ~$1.25/1M reads |
| **S3** | Static file hosting | ~$0.023/GB |
| **CloudFront** | CDN for frontend | ~$0.085/GB |

**Total estimated cost**: < $5/month for moderate usage

## 🎯 Available Destinations

The system has detailed knowledge of:

### 🇲🇦 **Marrakech, Morocco**
- Jemaa el-Fnaa, Bahia Palace, Majorelle Garden
- Traditional riads, hammam experiences
- Souks, tagine cooking classes, Atlas Mountains

### 🇫🇷 **Paris, France**
- Eiffel Tower, Louvre, Notre-Dame, Champs-Élysées
- Seine river cruises, Montmartre walks
- French bistros, wine tastings, Versailles trips

### 🇯🇵 **Tokyo, Japan**
- Senso-ji Temple, Tokyo Skytree, Shibuya Crossing
- Sushi experiences, ramen tours, Mount Fuji trips
- Traditional temples, modern entertainment districts

*More destinations coming soon!*

## 🛠️ Development Commands

```bash
# Root workspace commands
npm run install:all          # Install all dependencies
npm run build:all            # Build all projects
npm run test:all             # Run all tests
npm run dev:frontend         # Start frontend dev server
npm run deploy:infra         # Deploy infrastructure

# Frontend commands (in /frontend)
npm run dev                  # Start development server
npm run build               # Build for production
npm run test                # Run tests
npm run lint                # Check code style

# Backend commands (in /backend)
npm run build               # Compile TypeScript
npm run test                # Run unit tests

# Infrastructure commands (in /infrastructure)
npm run deploy              # Deploy all stacks
npm run destroy             # Remove all resources
npm run synth               # Generate CloudFormation
```

## 🔐 Security Features

- ✅ **No hardcoded secrets** - All sensitive data in environment variables
- ✅ **JWT authentication** - Secure user sessions
- ✅ **CORS protection** - Proper cross-origin setup
- ✅ **Input validation** - All user inputs validated
- ✅ **Environment separation** - Dev/prod isolation
- ✅ **Git secrets protection** - .env files excluded from version control

## 🧪 Testing

### Quick API Test
Use the simple HTML interface:
```bash
# Open in browser
open frontend-html/index.html
# Or start a local server
cd frontend-html && python -m http.server 8080
```

### Full Integration Test
1. Start frontend: `npm run dev:frontend`
2. Visit http://localhost:3000
3. Sign up → Login → Plan Trip
4. Verify detailed itinerary generation

### API Endpoints
```bash
# Health check
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/health

# Plan trip
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/plan-trip \
  -H "Content-Type: application/json" \
  -d '{"preferences":{"destination":"Paris, France","duration":5,"budget":2000}}'
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📚 Documentation

- [Security Checklist](SECURITY-CHECKLIST.md) - Security best practices
- [Deployment Guide](SETUP-AND-DEPLOYMENT-GUIDE.md) - Detailed deployment instructions
- [Manual Deploy](MANUAL-DEPLOY.md) - Step-by-step manual deployment

## 🐛 Troubleshooting

### Common Issues

**Frontend won't start**: Check if port 3000 is available
```bash
lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
```

**API errors**: Verify environment variables
```bash
cat .env  # Check configuration
aws sts get-caller-identity  # Verify AWS credentials
```

**Build failures**: Clean and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

**CORS errors**: Ensure API URL is correct in frontend

### Getting Help

1. **Check logs**: CloudWatch logs for Lambda functions
2. **Test API**: Use the HTML test interface
3. **Verify deployment**: Run `npm run deploy` again
4. **Check permissions**: Ensure AWS credentials have required permissions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AWS** for serverless infrastructure
- **Next.js** for the fantastic React framework
- **OpenAI** for AI capabilities inspiration
- **React Globe.gl** for the beautiful 3D globe component

---

**Made with ❤️ for travelers by travelers**

[![GitHub stars](https://img.shields.io/github/stars/VarunGagwani/Hack-A-Holiday?style=social)](https://github.com/VarunGagwani/Hack-A-Holiday)