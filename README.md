# Autonomous Travel Companion

An AI-powered travel planning system that autonomously creates end-to-end trip itineraries using AWS Bedrock and AgentCore.

## Features

- 🤖 **AI-Powered Planning**: Uses Amazon Bedrock (Claude 3.5 Sonnet v2) for intelligent trip planning
- ✈️ **Flight Search**: Autonomous flight search and booking recommendations
- 🏨 **Hotel Booking**: Smart hotel recommendations based on budget and preferences
- 🎯 **Activity Suggestions**: Personalized local activities and attractions
- 💰 **Budget Optimization**: Ensures all recommendations stay within budget
- 📱 **Responsive UI**: Modern React/Next.js interface
- 🔄 **Mock Booking**: Simulated booking process for demo purposes

## Architecture

- **Frontend**: React/Next.js with TypeScript and Tailwind CSS
- **Backend**: AWS Lambda functions with Node.js/TypeScript
- **AI**: Amazon Bedrock with AgentCore (Memory, Gateway, Observability)
- **Database**: DynamoDB for user data and trip storage
- **Storage**: S3 for itinerary files and assets
- **API**: API Gateway with REST endpoints

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS Account with $100 credits applied
- AWS CLI configured with appropriate permissions

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your AWS account details
```

3. **Deploy AWS infrastructure**:
```bash
cd infrastructure
npm run deploy
```

4. **Start development server**:
```bash
npm run dev
```

### AWS Setup Required

You'll need to:

1. **Enable AWS Services** in your account:
   - Amazon Bedrock (Claude 3.5 Sonnet v2 model)
   - DynamoDB
   - Lambda
   - API Gateway
   - S3
   - CloudWatch

2. **Configure IAM permissions** for Bedrock and other services

3. **Deploy infrastructure** using the provided CDK templates

## Project Structure

```
autonomous-travel-companion/
├── frontend/                 # React/Next.js application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Next.js pages
│   │   ├── services/       # API client services
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # Utility functions
│   └── package.json
├── backend/                 # Lambda functions
│   ├── src/
│   │   ├── functions/      # Lambda function handlers
│   │   ├── services/       # Business logic services
│   │   ├── repositories/   # Data access layer
│   │   ├── types/          # Shared TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
├── infrastructure/          # AWS CDK infrastructure
│   ├── lib/               # CDK stack definitions
│   └── package.json
└── .kiro/specs/            # Feature specifications
    └── autonomous-travel-companion/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Development Workflow

1. **Requirements**: Defined in `.kiro/specs/autonomous-travel-companion/requirements.md`
2. **Design**: Architecture and technical design in `design.md`
3. **Tasks**: Implementation plan in `tasks.md`

## Team Responsibilities

- **Varun**: AWS setup and infrastructure deployment
- **Deep**: Backend Lambda functions and API development
- **Muhammad**: AI/Bedrock integration and agent logic
- **Advait**: Frontend React components and UI/UX

## Deployment

The application uses AWS CDK for infrastructure as code:

```bash
# Deploy all resources
cd infrastructure
npm run deploy

# Deploy frontend to S3/CloudFront
cd frontend
npm run build
# Upload to S3 bucket created by CDK
```

## Cost Estimation

Estimated monthly costs within $100 AWS credits:
- Bedrock (Claude): ~$50
- Lambda: ~$10
- DynamoDB: ~$15
- S3: ~$5
- API Gateway: ~$10
- CloudWatch: ~$5

## Demo Features

- Complete trip planning from user input to itinerary
- Mock booking confirmations with reference numbers
- Budget optimization and alternative suggestions
- Responsive design for mobile and desktop
- Real-time AI processing with loading states

## Contributing

1. Follow the task list in `.kiro/specs/autonomous-travel-companion/tasks.md`
2. Each task includes specific requirements and testing guidelines
3. Use TypeScript for all new code
4. Write unit tests for all business logic
5. Follow the established project structure

## License

MIT License - see LICENSE file for details