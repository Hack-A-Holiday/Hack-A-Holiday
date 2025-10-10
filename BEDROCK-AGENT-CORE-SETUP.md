# AWS Bedrock Agent Core Setup Guide

This guide walks you through setting up and using the Bedrock Agent Core implementation in your travel assistant application.

## 🎯 What is Bedrock Agent Core?

Bedrock Agent Core is a **manual implementation** of an AI agent that uses AWS Bedrock's Claude models with native tool calling capabilities. Unlike AWS managed agents, this gives you full control over:

- **Tool definitions** - Define custom tools for your domain
- **Conversation flow** - Control how the agent reasons and responds
- **Cost optimization** - Intelligent routing between simple and complex queries
- **Rate limiting** - Built-in throttling and retry logic

## 📋 Prerequisites

### 1. AWS Account Setup
- AWS account with Bedrock access
- Model access enabled for Claude models
- IAM credentials with Bedrock permissions

### 2. Required IAM Permissions
Your AWS user/role needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock-agent-runtime:InvokeAgent"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Enable Model Access
1. Go to AWS Bedrock Console → Model access
2. Request access to: **Anthropic Claude 3.5 Sonnet v2**
3. Wait for approval (usually instant)

## 🚀 Quick Setup

### Step 1: Install Dependencies

```bash
cd backend_test
npm install
```

Required packages (already in package.json):
- `@aws-sdk/client-bedrock-runtime` - For Claude model invocation
- `@aws-sdk/client-bedrock-agent-runtime` - For agent capabilities
- `express` - Web server
- `dotenv` - Environment variables

### Step 2: Configure AWS Credentials

Create/update `backend_test/.env`:

```env
# AWS Credentials (REQUIRED)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# Claude Model Configuration
REASONING_MODEL=us.amazon.nova-pro-v1:0

# Optional: API Keys for Real Data (uses mock data if not provided)
RAPIDAPI_KEY=your_rapidapi_key
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
BOOKING_API_KEY=your_booking_key

# Server Configuration
PORT=4000
NODE_ENV=development
```

### Step 3: Verify AWS Credentials

Test your AWS setup:

```bash
node -e "const { BedrockRuntimeClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock-runtime'); const client = new BedrockRuntimeClient({ region: 'us-east-1' }); client.send(new ListFoundationModelsCommand({})).then(() => console.log('✅ AWS credentials valid!')).catch(err => console.error('❌ Error:', err.message));"
```

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
🚀 Server running on port 4000
🤖 AI Agent initialized
✅ Connected to AWS Bedrock
```

## 🎨 Architecture Overview

### Hybrid Query Routing

The agent uses **intelligent routing** to optimize API usage:

```
User Query
    ↓
Complexity Analysis
    ↓
    ├─→ SIMPLE Query (50% of traffic)
    │   └─→ Direct Bedrock (1 API call)
    │       • Greetings: "Hello", "Hi"
    │       • General questions: "What can you do?"
    │       • Travel advice: "Tell me about Paris"
    │       • Faster response, less quota
    │
    └─→ COMPLEX Query (50% of traffic)
        └─→ Agent Core with Tools (2 API calls)
            • Flight searches: "Find flights to NYC"
            • Hotel searches: "Show hotels in Tokyo"
            • Trip planning: "Plan a trip to Bali"
            • Uses 10 specialized tools
```

### Available Tools

The agent has access to 10 tools:

1. **search_flights** - Search flights with real APIs (Kiwi, Amadeus)
2. **search_hotels** - Search hotels with Booking.com API
3. **get_destination_info** - Get destination guides
4. **calculate_trip_budget** - Budget estimation
5. **create_itinerary** - Multi-day itinerary planning
6. **check_visa_requirements** - Visa information
7. **get_travel_alerts** - Safety and weather alerts
8. **compare_options** - Compare flights/hotels
9. **get_user_preferences** - Retrieve saved preferences
10. **save_user_preferences** - Store user preferences

## 🔧 Key Features

### 1. Rate Limiting (Built-in)
Protects against AWS Bedrock throttling:
- **1 second minimum delay** between API calls
- **Exponential backoff retry** (1s, 2s) on throttling
- **Graceful error messages** when quota exceeded

### 2. Tool Calling
Uses Claude's native function calling:
```javascript
// Agent automatically selects and executes tools
User: "Find cheap flights to Paris in December"
Agent: 
  1. Calls search_flights(origin="...", destination="Paris", dates="Dec")
  2. Receives flight data
  3. Synthesizes response with recommendations
```

### 3. Conversation Memory
Maintains context across messages:
- Session management with DynamoDB
- Last 5 messages included in context
- Personalized responses based on history

### 4. Proactive Suggestions
Agent offers follow-up actions:
```
✈️ Found 5 flights to Paris
💡 Would you like me to:
   • Search for hotels in Paris
   • Create a 7-day itinerary
   • Calculate total trip budget
```

## 📡 API Endpoints

### POST /bedrock-agent/chat
Main conversation endpoint with hybrid routing

**Request:**
```json
{
  "message": "Find flights to Tokyo next week",
  "userId": "user123",
  "sessionId": "session_abc",
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ],
  "forceAgentMode": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "I found 8 flights to Tokyo...",
  "toolsUsed": ["search_flights"],
  "toolResults": [...],
  "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  "sessionId": "session_abc",
  "agentMode": true,
  "simpleMode": false
}
```

### POST /bedrock-agent/plan-trip
Autonomous trip planning

**Request:**
```json
{
  "origin": "New York",
  "destination": "Tokyo",
  "startDate": "2025-12-01",
  "endDate": "2025-12-07",
  "budget": 3000,
  "preferences": {
    "flightClass": "economy",
    "hotelStars": 4
  }
}
```

### POST /bedrock-agent/suggest
Get personalized suggestions

**Request:**
```json
{
  "context": "beach vacation",
  "budget": 2000,
  "duration": "7 days",
  "interests": ["snorkeling", "nightlife"]
}
```

## 🧪 Testing the Agent

### Test 1: Simple Query (Direct Bedrock)
```bash
curl -X POST http://localhost:4000/bedrock-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! What can you help me with?"}'
```

Expected: Fast response, `simpleMode: true`, no tools used

### Test 2: Complex Query (Agent with Tools)
```bash
curl -X POST http://localhost:4000/bedrock-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find cheap flights from NYC to Paris in December"}'
```

Expected: Slower response, `agentMode: true`, `toolsUsed: ["search_flights"]`

### Test 3: Multi-turn Conversation
```bash
curl -X POST http://localhost:4000/bedrock-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Now show me hotels near the Eiffel Tower",
    "sessionId": "test_session_123",
    "conversationHistory": [
      {"role": "user", "content": "Find flights to Paris"},
      {"role": "assistant", "content": "I found 5 flights..."}
    ]
  }'
```

Expected: Agent remembers context, searches Paris hotels

## 🎯 Complexity Detection

The agent automatically detects query complexity:

### Triggers Agent Mode (Complex):
- Keywords: `find flights`, `search hotels`, `book`, `plan trip`
- Date patterns: `12/25`, `next week`, `in 3 days`
- Actionable requests: `show me hotels in Tokyo`, `cheap flights to Paris`

### Triggers Simple Mode:
- Greetings: `hello`, `hi`, `hey`
- Questions: `what can you do?`, `how does this work?`
- General travel: `tell me about Paris`, `what's the weather like in Tokyo?`
- Thanks: `thank you`, `thanks`, `great`

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use IAM roles in production** - Don't hardcode credentials
3. **Rotate API keys regularly** - Especially for hackathons
4. **Set up billing alerts** - AWS Bedrock charges by usage
5. **Use request validation** - Sanitize user inputs

## 💰 Cost Management

### AWS Bedrock Pricing (Claude 3.5 Sonnet v2)
- **Input tokens**: ~$3 per 1M tokens
- **Output tokens**: ~$15 per 1M tokens

### Optimization Tips:
1. **Hybrid routing saves 50% on API calls** for simple queries
2. **Rate limiting prevents excessive usage** from errors
3. **Conversation history limited to 5 messages** to reduce token usage
4. **Mock data fallback** when API keys not configured

### Estimated Costs:
- **Simple query**: ~500 tokens = $0.002
- **Complex query with tools**: ~2000 tokens = $0.008
- **100 mixed queries**: ~$0.50
- **Hackathon usage (1000 queries)**: ~$5

## 🐛 Troubleshooting

### Error: "ThrottlingException: Too many requests"
**Cause:** AWS Bedrock free tier rate limits
**Solution:** 
- Already implemented: 1s delays + retry logic
- If persists: Wait 60 seconds between test batches
- Consider AWS rate limit increase request

### Error: "AccessDeniedException: User is not authorized"
**Cause:** Missing IAM permissions or model access
**Solution:**
1. Check IAM permissions (see Prerequisites section)
2. Enable model access in Bedrock console
3. Verify correct AWS region in `.env`

### Error: "ValidationException: The provided model identifier is invalid"
**Cause:** Incorrect model ID or no model access
**Solution:**
- Use: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- List available models: `aws bedrock list-foundation-models --region us-east-1`

### Tools not executing
**Cause:** Query not detected as complex
**Solution:**
- Use force flag: `{"message": "...", "forceAgentMode": true}`
- Include trigger keywords: "find", "search", "show me"

### Mock data instead of real data
**Cause:** API keys not configured
**Solution:**
- Add API keys to `.env` file
- FlightService and HotelService automatically fall back to mock data when keys missing
- For hackathon demo, mock data is sufficient

## 📚 Code Structure

```
backend_test/
├── services/
│   ├── BedrockAgentCore.js       # Main agent implementation
│   ├── FlightService.js          # Flight search (Kiwi, Amadeus)
│   └── HotelService.js           # Hotel search (Booking.com)
├── routes/
│   └── bedrock-agent.js          # API endpoints
├── .env                          # Configuration (DO NOT COMMIT)
└── server.js                     # Express server
```

### Key Methods in BedrockAgentCore.js:

- `analyzeComplexity(message)` - Detects query complexity
- `simpleChat(...)` - Direct Bedrock (1 API call)
- `agentChat(...)` - Agent with tools (2 API calls)
- `executeToolCall(...)` - Runs specific tools
- `synthesizeResponseFromTools(...)` - Formats tool results

## 🎓 Best Practices

### 1. Always use hybrid routing
Let the agent decide between simple/complex modes for optimal performance

### 2. Include conversation history
Provides better context for multi-turn conversations

### 3. Handle errors gracefully
```javascript
try {
  const result = await agent.agentChat(message, sessionId);
  // Use result
} catch (error) {
  if (error.name === 'ThrottlingException') {
    // Show user friendly message
  }
}
```

### 4. Test with varied queries
Mix simple and complex queries to ensure routing works correctly

### 5. Monitor AWS usage
Check AWS CloudWatch for Bedrock API metrics

## 🚀 Advanced Usage

### Custom Tools
Add new tools to `BedrockAgentCore.js`:

```javascript
{
  name: 'get_weather',
  description: 'Get current weather for a destination',
  input_schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  }
}
```

Then implement the tool method:
```javascript
async getWeather(location) {
  // Your weather API logic
  return { temperature: 75, conditions: 'Sunny' };
}
```

### Custom Complexity Detection
Modify `analyzeComplexity()` for your use case:

```javascript
analyzeComplexity(message) {
  const msg = message.toLowerCase();
  
  // Add your custom keywords
  const myComplexKeywords = ['weather', 'forecast', 'temperature'];
  
  return {
    isComplex: myComplexKeywords.some(k => msg.includes(k)),
    reason: 'Custom weather check'
  };
}
```

## 📖 Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Model Access Request](https://console.aws.amazon.com/bedrock/home#/modelaccess)

## 🎉 You're Ready!

Your Bedrock Agent Core is now set up and ready for the hackathon! The hybrid routing strategy will help you stay within AWS rate limits while providing powerful AI capabilities.

**Next steps:**
1. Test with varied queries
2. Customize tools for your use case
3. Add real API keys for production data
4. Deploy and demo!

Good luck with the hackathon! 🚀
