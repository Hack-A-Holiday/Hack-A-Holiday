# 🤖 AWS Bedrock Agent Core - Travel Agent

## 🎯 AWS Hackathon Compliance

This autonomous travel agent **fully meets all AWS Hackathon requirements**:

### ✅ Required Components

| Requirement | Implementation | Status |
|------------|----------------|--------|
| **LLM (Bedrock/Nova)** | Claude 3.5 Sonnet v2 & Haiku via AWS Bedrock | ✅ Complete |
| **Bedrock Agent Core** | Full agent with function calling, multi-turn, session management | ✅ Complete |
| **Reasoning LLM** | Claude Sonnet creates execution plans, explains decisions | ✅ Complete |
| **Autonomous Execution** | Multi-step workflows without human intervention | ✅ Complete |
| **API Integration** | Flight search (Kiwi), hotel search (Amadeus), weather APIs | ✅ Complete |
| **Database Integration** | DynamoDB for user preferences & session storage | ✅ Complete |
| **External Tools** | 10 specialized tools (flights, hotels, budget, etc.) | ✅ Complete |

## 🚀 5-Minute Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured
- AWS account with Bedrock access

### Setup

```powershell
# 1. Run automated setup
.\setup-bedrock-agent.ps1

# 2. Update AWS credentials in .env
cd backend_test
notepad .env

# 3. Start the server
npm start

# 4. Test the agent
node test-bedrock-agent.js
```

### Enable Claude in Bedrock Console

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Model access" in left sidebar
3. Click "Manage model access"
4. Enable:
   - ✅ **Claude 3.5 Sonnet v2**
   - ✅ **Claude 3.5 Haiku**
5. Click "Save changes"

## 📡 Quick Test

```powershell
# Test health
curl http://localhost:4000/bedrock-agent/health

# Test autonomous trip planning
curl -X POST http://localhost:4000/bedrock-agent/plan-trip `
  -H "Content-Type: application/json" `
  -d '{
    "destination": "Paris",
    "duration": 5,
    "budget": "moderate",
    "travelers": 2
  }'

# Test chat
curl -X POST http://localhost:4000/bedrock-agent/chat `
  -H "Content-Type: application/json" `
  -d '{
    "message": "I want to visit Tokyo. What should I know?",
    "userId": "demo_user"
  }'
```

## 🎓 Key Features for Demo

### 1. Autonomous Planning with Reasoning

```javascript
// Agent automatically:
1. Analyzes user request
2. Creates execution plan with reasoning
3. Determines tool sequence
4. Executes plan autonomously
5. Provides detailed explanation

Example: "Plan a trip to Paris"
→ Agent decides to:
  - Search flights first
  - Then search hotels
  - Calculate budget
  - Create itinerary
  - Check visa requirements
All automatically with reasoning!
```

### 2. Multi-Turn Conversations

```javascript
User: "I want to travel"
Agent: "Great! Where would you like to go?"

User: "Europe"
Agent: "Which countries interest you?"

User: "France"
Agent: "Perfect! Let me search flights and create an itinerary..."
// Agent remembers full context
```

### 3. Tool Integration (10 Tools)

- ✈️ `search_flights` - Real-time flight search
- 🌍 `get_destination_info` - Weather, attractions, tips
- 🏨 `search_hotels` - Hotel recommendations
- 💰 `calculate_trip_budget` - Budget breakdown
- 👤 `get_user_preferences` - Stored preferences
- 💾 `save_user_preferences` - Learn from interactions
- 📅 `create_itinerary` - Day-by-day plans
- 🛂 `check_visa_requirements` - Visa info
- ⚠️ `get_travel_alerts` - Safety information
- ⚖️ `compare_options` - Side-by-side comparison

### 4. Personalization & Learning

```javascript
// Agent stores and learns:
- Travel style (budget/moderate/luxury)
- Interests (culture, food, adventure)
- Past trips and preferences
- Preferred airlines/hotels
- Dietary restrictions

// Uses this for recommendations
```

## 🎬 Demo Script for Judges

### Demo 1: Autonomous Trip Planning (2 minutes)

```powershell
# Show complete end-to-end planning
curl -X POST http://localhost:4000/bedrock-agent/plan-trip `
  -H "Content-Type: application/json" `
  -d '{
    "destination": "Tokyo, Japan",
    "duration": 7,
    "budget": "moderate",
    "interests": ["culture", "food", "technology"],
    "travelers": 2,
    "startDate": "2025-07-15"
  }'

# Point out:
✅ Reasoning in execution plan
✅ Multiple tools used autonomously
✅ Confidence scores
✅ Complete itinerary with budget
```

### Demo 2: Reasoning & Planning (2 minutes)

```javascript
// Show execution plan JSON
{
  "intent": "Plan 7-day Tokyo trip for 2 people",
  "steps": [
    {
      "action": "search_flights",
      "reasoning": "Need flight options to estimate arrival time",
      "dependencies": []
    },
    {
      "action": "search_hotels",
      "reasoning": "Find accommodation near attractions",
      "dependencies": ["search_flights"]
    },
    {
      "action": "create_itinerary",
      "reasoning": "Build day-by-day plan based on interests",
      "dependencies": ["search_hotels"]
    }
  ],
  "confidence": 0.95,
  "reasoning": "Will search flights first to determine budget, then hotels..."
}

// Point out:
✅ Step-by-step planning
✅ Dependency management
✅ Reasoning for each step
✅ Confidence assessment
```

### Demo 3: Multi-Turn Conversation (2 minutes)

```javascript
// Show natural conversation flow
POST /bedrock-agent/chat
Message 1: "I want to visit Europe"
→ Agent asks for more details

Message 2: "France and Italy"
→ Agent asks about duration

Message 3: "2 weeks with moderate budget"
→ Agent creates complete plan using all context

// Point out:
✅ Context awareness across turns
✅ Natural conversation flow
✅ Remembers all previous messages
✅ Uses accumulated context for planning
```

### Demo 4: Tool Integration (2 minutes)

```javascript
// Show direct tool calls
POST /bedrock-agent/tool/search_flights
POST /bedrock-agent/tool/calculate_trip_budget
POST /bedrock-agent/tool/get_destination_info

// Point out:
✅ 10 specialized tools
✅ API integrations (Kiwi, Amadeus)
✅ Database integration (DynamoDB)
✅ External data sources
```

### Demo 5: Personalization (1 minute)

```javascript
// Save preferences
POST /bedrock-agent/tool/save_user_preferences
{
  "userId": "demo_user",
  "preferences": {
    "travelStyle": "adventure",
    "interests": ["hiking", "photography"],
    "budget": "moderate"
  }
}

// Get personalized recommendations
POST /bedrock-agent/recommend
→ Uses stored preferences automatically

// Point out:
✅ Learns from interactions
✅ Stores preferences in DynamoDB
✅ Personalizes future recommendations
✅ Remembers user history
```

## 📊 Architecture Diagram

```
User Request
    ↓
┌─────────────────────────────────┐
│   Bedrock Agent Core            │
│   ┌─────────────────────────┐   │
│   │ 1. Request Analysis     │   │
│   └──────────┬──────────────┘   │
│              ↓                   │
│   ┌─────────────────────────┐   │
│   │ 2. Reasoning (Claude)   │   │
│   │    - Create plan        │   │
│   │    - Determine tools    │   │
│   │    - Calculate confidence│  │
│   └──────────┬──────────────┘   │
│              ↓                   │
│   ┌─────────────────────────┐   │
│   │ 3. Autonomous Execution │   │
│   │    - Execute tools      │   │
│   │    - Handle dependencies│   │
│   └──────────┬──────────────┘   │
│              ↓                   │
│   ┌─────────────────────────┐   │
│   │ 4. Response (Claude)    │   │
│   │    - Synthesize results │   │
│   │    - Provide reasoning  │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
    ↓
External Integrations:
- AWS Bedrock (Claude 3.5)
- DynamoDB (preferences)
- Flight APIs (Kiwi)
- Hotel APIs (Amadeus)
```

## 🎯 Hackathon Judging Criteria

### Innovation ⭐⭐⭐⭐⭐
- Autonomous reasoning and planning
- Multi-turn context awareness
- Dynamic tool selection
- Self-correcting execution

### Technical Excellence ⭐⭐⭐⭐⭐
- Bedrock Agent Core implementation
- 10 integrated tools
- Database persistence
- API integrations

### AWS Service Usage ⭐⭐⭐⭐⭐
- AWS Bedrock (Claude 3.5 Sonnet & Haiku)
- DynamoDB
- Lambda (deployable)
- API Gateway
- CloudWatch

### Real-World Applicability ⭐⭐⭐⭐⭐
- Practical travel planning use case
- Personalization and learning
- Multiple data sources
- Scalable architecture

## 📝 Environment Variables

```env
# Required
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Optional but recommended
DYNAMODB_USER_TABLE=travel-users
KIWI_API_KEY=your-kiwi-key
AMADEUS_API_KEY=your-amadeus-key
```

## 🚀 Deployment

### Local Development
```powershell
cd backend_test
npm start
```

### AWS Deployment
```powershell
cd infrastructure
npm install
cdk deploy BedrockAgentStack
```

## 📚 Documentation

- **[BEDROCK-AGENT-CORE-GUIDE.md](./BEDROCK-AGENT-CORE-GUIDE.md)** - Complete implementation guide
- **[API Documentation](./BEDROCK-AGENT-CORE-GUIDE.md#-api-endpoints)** - All endpoints
- **[Architecture](./BEDROCK-AGENT-CORE-GUIDE.md#-architecture)** - System design

## ✅ Testing

```powershell
# Run all integration tests
node test-bedrock-agent.js

# Tests include:
✅ Health check
✅ Tool availability
✅ Simple chat
✅ Flight search
✅ Budget calculator
✅ Autonomous planning
✅ Multi-turn conversation
✅ Recommendations
✅ Personalization
```

## 🎉 Success Checklist

- ✅ Claude 3.5 Sonnet enabled in Bedrock
- ✅ AWS credentials configured
- ✅ Server running on port 4000
- ✅ Health check passes
- ✅ Test suite passes
- ✅ Can plan complete trip autonomously
- ✅ Multi-turn conversation works
- ✅ Tools execute successfully
- ✅ Reasoning explanations provided

## 🏆 Hackathon Ready!

Your autonomous travel agent:
- ✅ Uses AWS Bedrock (Claude 3.5)
- ✅ Implements Agent Core primitives
- ✅ Has reasoning capabilities
- ✅ Executes autonomously
- ✅ Integrates multiple services
- ✅ Provides excellent user experience

**Good luck with your hackathon! 🚀**

---

## 📞 Quick Links

- Health Check: `http://localhost:4000/bedrock-agent/health`
- API Docs: [BEDROCK-AGENT-CORE-GUIDE.md](./BEDROCK-AGENT-CORE-GUIDE.md)
- AWS Console: [Bedrock](https://console.aws.amazon.com/bedrock/)
- Test Suite: `node test-bedrock-agent.js`
