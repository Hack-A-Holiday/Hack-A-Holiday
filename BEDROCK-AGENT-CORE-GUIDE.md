# AWS Bedrock Agent Core - Travel Agent Implementation

## 🎯 Hackathon Requirements Met

This implementation meets **ALL AWS Hackathon requirements** for AI Agents:

### ✅ Core Requirements

1. **Amazon Bedrock/Nova LLM** ✅
   - Uses Claude 3.5 Sonnet v2 for reasoning and decision-making
   - Uses Claude 3.5 Haiku for fast responses
   - Integrated via Bedrock Runtime API

2. **Bedrock Agent Core Primitives** ✅
   - Function calling / tool use
   - Multi-turn conversations
   - Session management
   - Autonomous execution planning

3. **Reasoning LLM for Decision-Making** ✅
   - Creates execution plans before taking action
   - Analyzes user intent and determines best approach
   - Evaluates dependencies between actions
   - Provides confidence scores and reasoning explanations

4. **Autonomous Capabilities** ✅
   - Can execute complete workflows without human intervention
   - Optional human-in-the-loop for critical decisions
   - Self-corrects and adapts based on tool results
   - Handles multiple steps and complex requests

5. **External Integrations** ✅
   - **APIs**: Flight search (Kiwi API), hotel search, destination data
   - **Database**: DynamoDB for user preferences and history
   - **External Tools**: Budget calculator, itinerary creator, visa checker
   - **Multi-agent potential**: Can coordinate multiple specialized agents

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│              (Frontend / API Clients)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Express.js Backend                          │
│         /bedrock-agent/* endpoints                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              BedrockAgentCore Service                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  1. Request Analysis                              │  │
│  │     - Parse user intent                           │  │
│  │     - Retrieve user context                       │  │
│  │     - Get conversation history                    │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  2. Reasoning & Planning (Claude Sonnet)         │  │
│  │     - Analyze request complexity                  │  │
│  │     - Create execution plan                       │  │
│  │     - Determine tool sequence                     │  │
│  │     - Identify dependencies                       │  │
│  │     - Calculate confidence                        │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  3. Autonomous Execution                          │  │
│  │     - Execute plan steps sequentially             │  │
│  │     - Call appropriate tools                      │  │
│  │     - Handle dependencies                         │  │
│  │     - Collect results                             │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  4. Tool Execution                                │  │
│  │     ├─ search_flights                             │  │
│  │     ├─ get_destination_info                       │  │
│  │     ├─ search_hotels                              │  │
│  │     ├─ calculate_trip_budget                      │  │
│  │     ├─ get_user_preferences                       │  │
│  │     ├─ save_user_preferences                      │  │
│  │     ├─ create_itinerary                           │  │
│  │     ├─ check_visa_requirements                    │  │
│  │     ├─ get_travel_alerts                          │  │
│  │     └─ compare_options                            │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  5. Response Generation (Claude Sonnet)           │  │
│  │     - Synthesize tool results                     │  │
│  │     - Create natural response                     │  │
│  │     - Provide reasoning                           │  │
│  │     - Suggest next steps                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              External Integrations                       │
│  ├─ AWS Bedrock (Claude 3.5 Sonnet/Haiku)              │
│  ├─ DynamoDB (User preferences & history)               │
│  ├─ Kiwi API (Real-time flight search)                  │
│  ├─ Amadeus API (Hotel search)                          │
│  └─ Weather APIs (Destination info)                     │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd backend_test
npm install
```

### 2. Configure Environment

Create `.env` file in `backend_test/`:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional: Bedrock Agent Configuration
BEDROCK_AGENT_ID=your-agent-id
BEDROCK_AGENT_ALIAS_ID=your-alias-id

# Optional: DynamoDB
DYNAMODB_USER_TABLE=travel-users

# Optional: External APIs
KIWI_API_KEY=your-kiwi-key
AMADEUS_API_KEY=your-amadeus-key
AMADEUS_API_SECRET=your-amadeus-secret

# Server Configuration
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

### 3. Start the Server

```powershell
npm start
```

Server will start on `http://localhost:4000`

### 4. Test the Agent

```powershell
node test-bedrock-agent.js
```

## 📡 API Endpoints

### Core Agent Endpoints

#### 1. **POST** `/bedrock-agent/process`
Main autonomous agent endpoint - processes any request with reasoning and tool use.

**Request:**
```json
{
  "message": "Plan a 5-day trip to Paris",
  "userId": "user123",
  "sessionId": "session_abc",
  "requireHumanApproval": false,
  "maxIterations": 10
}
```

**Response:**
```json
{
  "success": true,
  "response": "I've created a comprehensive plan...",
  "reasoning": "I analyzed your request and determined...",
  "toolsUsed": ["search_flights", "search_hotels", "create_itinerary"],
  "confidence": 0.92,
  "executionPlan": {
    "intent": "Plan complete trip to Paris",
    "steps": [...],
    "confidence": 0.92
  },
  "sessionId": "session_abc",
  "metadata": {
    "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "iterations": 5,
    "autonomousExecution": true
  }
}
```

#### 2. **POST** `/bedrock-agent/chat`
Multi-turn conversation with context awareness.

**Request:**
```json
{
  "message": "What's the weather like there?",
  "userId": "user123",
  "sessionId": "session_abc",
  "context": {}
}
```

#### 3. **POST** `/bedrock-agent/plan-trip`
Comprehensive autonomous trip planning.

**Request:**
```json
{
  "destination": "Tokyo, Japan",
  "duration": 7,
  "budget": "moderate",
  "interests": ["culture", "food", "technology"],
  "travelers": 2,
  "startDate": "2025-07-15",
  "userId": "user123"
}
```

#### 4. **POST** `/bedrock-agent/recommend`
Personalized recommendations based on preferences.

**Request:**
```json
{
  "type": "destination",
  "preferences": {
    "interests": ["beaches", "history"],
    "budget": "moderate",
    "climate": "warm"
  },
  "userId": "user123"
}
```

### Tool Endpoints

#### 5. **POST** `/bedrock-agent/tool/:toolName`
Execute a specific tool directly.

Available tools:
- `search_flights`
- `get_destination_info`
- `search_hotels`
- `calculate_trip_budget`
- `get_user_preferences`
- `save_user_preferences`
- `create_itinerary`
- `check_visa_requirements`
- `get_travel_alerts`
- `compare_options`

#### 6. **GET** `/bedrock-agent/tools`
Get list of all available tools with schemas.

#### 7. **GET** `/bedrock-agent/session/:sessionId`
Retrieve session information and history.

#### 8. **GET** `/bedrock-agent/health`
Health check and service status.

## 🧠 Key Features

### 1. Reasoning-Based Planning

The agent uses Claude 3.5 Sonnet to create execution plans:

```javascript
const plan = await agent.createExecutionPlan(message, session, userPreferences);

// Plan structure:
{
  "intent": "Book complete vacation",
  "steps": [
    {
      "action": "search_flights",
      "params": {...},
      "reasoning": "Need to find available flights first",
      "dependencies": []
    },
    {
      "action": "search_hotels",
      "params": {...},
      "reasoning": "Find accommodation near flight dates",
      "dependencies": ["search_flights"]
    }
  ],
  "confidence": 0.95,
  "needsHumanApproval": false,
  "reasoning": "Will search flights, then hotels, then create itinerary"
}
```

### 2. Autonomous Execution

Agent executes plans independently:

```javascript
// Automatically:
// 1. Checks dependencies
// 2. Executes tools in order
// 3. Adapts to results
// 4. Handles errors gracefully
// 5. Provides detailed reasoning

const results = await agent.executeAutonomousPlan(plan, session);
```

### 3. Tool Calling (Function Calling)

10 specialized tools for travel:

- **Search Tools**: Flights, hotels, destinations
- **Planning Tools**: Itinerary creator, budget calculator
- **Data Tools**: User preferences, travel history
- **Information Tools**: Visa requirements, travel alerts
- **Analysis Tools**: Option comparison

### 4. Multi-Turn Conversations

Maintains context across messages:

```javascript
User: "I want to visit Europe"
Agent: "Great! Which countries interest you?"

User: "France and Italy"
Agent: "Excellent choices! How long do you have?"

User: "2 weeks"
Agent: "Perfect! Let me search flights and create an itinerary..."
// Agent remembers: Europe → France/Italy → 2 weeks
```

### 5. Personalization

Learns from user interactions:

```javascript
// Stores preferences
- Travel style (budget/moderate/luxury)
- Interests (culture, food, adventure)
- Past trips and bookings
- Preferred airlines/hotels
- Dietary restrictions

// Uses preferences in recommendations
agent.generateRecommendations(userProfile, context);
```

## 🎓 Example Use Cases

### Use Case 1: Complete Trip Planning

```javascript
POST /bedrock-agent/plan-trip

Request:
{
  "destination": "Bali, Indonesia",
  "duration": 10,
  "budget": "moderate",
  "interests": ["beaches", "culture", "wellness"],
  "travelers": 2,
  "startDate": "2025-08-01"
}

Agent automatically:
1. Searches flights from user's location
2. Finds hotels in Bali (moderate price range)
3. Creates 10-day itinerary with beach days, temples, spa visits
4. Calculates total budget breakdown
5. Checks visa requirements
6. Gets travel alerts and weather info
7. Provides packing recommendations

Response includes:
- Flight options with prices
- Hotel recommendations
- Day-by-day itinerary
- Budget breakdown
- Visa information
- Travel tips
- Reasoning for each recommendation
```

### Use Case 2: Conversational Flight Search

```javascript
User: "I need to fly to Tokyo next month"
Agent: [Analyzes intent, creates plan]
      - Determines origin from user profile
      - Identifies "next month" as date range
      - Searches flights
      - Provides options with reasoning

Agent: "I found 5 great options! The best deal is..."

User: "What about business class?"
Agent: [Remembers Tokyo flight context]
      - Searches business class flights
      - Compares with economy
      - Provides upgrade cost analysis

Agent: "Business class adds $1,200 per person. Here are the options..."
```

### Use Case 3: Budget Analysis

```javascript
POST /bedrock-agent/tool/calculate_trip_budget

{
  "destination": "Paris",
  "duration": 7,
  "travelers": 2,
  "travelStyle": "moderate"
}

Response:
{
  "total": 4830,
  "perPerson": 2415,
  "breakdown": {
    "flights": 1400,
    "accommodation": 2100,
    "dailyExpenses": 1680,
    "subtotal": 5180
  },
  "currency": "USD",
  "travelStyle": "moderate"
}
```

## 🔧 Configuration

### AWS Credentials

The agent requires AWS credentials with permissions for:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/travel-users"
      ]
    }
  ]
}
```

### Model Configuration

```javascript
// Reasoning model (complex decisions)
reasoningModel: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'

// Fast model (quick responses)
fastModel: 'us.anthropic.claude-3-5-haiku-20241022-v1:0'
```

### DynamoDB Schema

User preferences table:

```javascript
{
  "userId": "string",        // Partition key
  "preferences": "string",   // JSON stringified
  "travelHistory": "string", // JSON stringified
  "updatedAt": "string"      // ISO timestamp
}
```

## 🧪 Testing

### Run All Tests

```powershell
node test-bedrock-agent.js
```

Tests include:
1. ✅ Health check
2. ✅ Tool availability
3. ✅ Simple chat
4. ✅ Flight search
5. ✅ Destination info
6. ✅ Budget calculator
7. ✅ Autonomous trip planning
8. ✅ Multi-turn conversation
9. ✅ Recommendations
10. ✅ User preferences

### Individual Tests

```powershell
# Test specific functionality
node -e "require('./test-bedrock-agent').testFlightSearch()"
node -e "require('./test-bedrock-agent').testAutonomousTripPlanning()"
```

## 📊 Monitoring

### Agent Metrics

```javascript
GET /bedrock-agent/health

Response:
{
  "success": true,
  "service": "Bedrock Agent Core",
  "status": "operational",
  "capabilities": {
    "reasoning": true,
    "autonomous": true,
    "toolCalling": true,
    "multiTurn": true
  },
  "tools": 10,
  "activeSessions": 5,
  "models": {
    "reasoning": "claude-3-5-sonnet",
    "fast": "claude-3-5-haiku"
  }
}
```

### Session Monitoring

```javascript
GET /bedrock-agent/session/:sessionId

Response:
{
  "sessionId": "session_abc",
  "userId": "user123",
  "messageCount": 8,
  "createdAt": 1696348800000,
  "lastMessage": {
    "role": "agent",
    "content": "I've created your itinerary...",
    "timestamp": 1696349000000
  }
}
```

## 🎯 Hackathon Demo Script

### Demo Flow

1. **Show Autonomous Planning**
   ```bash
   POST /bedrock-agent/plan-trip
   # Demonstrate complete end-to-end planning
   # Show reasoning and execution plan
   ```

2. **Show Reasoning Capabilities**
   ```bash
   # Show execution plan creation
   # Show confidence scores
   # Show dependency management
   ```

3. **Show Multi-Turn Conversation**
   ```bash
   # Have natural conversation
   # Show context awareness
   # Show tool calling
   ```

4. **Show Tool Integration**
   ```bash
   # Demonstrate each tool
   # Show API integrations
   # Show database access
   ```

5. **Show Personalization**
   ```bash
   # Save user preferences
   # Show personalized recommendations
   # Show learning over time
   ```

## 🚀 Deployment

### Local Development

```powershell
cd backend_test
npm install
npm start
```

### Production Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for:
- AWS Lambda deployment
- API Gateway configuration
- DynamoDB setup
- Bedrock model access

## 📚 Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference/)
- [Function Calling Guide](https://docs.anthropic.com/claude/docs/tool-use)

## 🎉 Success Criteria

✅ **Uses AWS Bedrock/Nova** - Claude 3.5 Sonnet & Haiku  
✅ **Bedrock Agent Core** - Full agent implementation with primitives  
✅ **Reasoning LLM** - Plans and explains decisions  
✅ **Autonomous Execution** - Executes multi-step workflows  
✅ **External Integrations** - APIs, database, tools  
✅ **Human-in-the-Loop** - Optional approval workflow  

**This implementation fully satisfies all AWS hackathon requirements for AI agents!** 🎯
