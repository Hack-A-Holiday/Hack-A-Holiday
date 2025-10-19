// Delete all chat sessions for a user
exports.deleteAllChatSessionsForUser = async ({ user_id }) => {
  // Query all sessions for the user
  const params = {
    TableName: CHAT_TABLE,
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': user_id },
  };
  const result = await docClient.send(new QueryCommand(params));
  const sessions = result.Items || [];
  if (sessions.length === 0) return;
  // Batch delete (max 25 at a time)
  const { BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
  for (let i = 0; i < sessions.length; i += 25) {
    const batch = sessions.slice(i, i + 25);
    const deleteRequests = batch.map(sess => ({
      DeleteRequest: { Key: { user_id: sess.user_id, _id: sess._id } }
    }));
    const batchParams = {
      RequestItems: {
        [CHAT_TABLE]: deleteRequests
      }
    };
    await docClient.send(new BatchWriteCommand(batchParams));
  }
};

// Get all chat sessions for a user (for sidebar summaries)
exports.getAllChatSessionsForUser = async ({ user_id }) => {
  const params = {
    TableName: CHAT_TABLE,
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': user_id },
    ScanIndexForward: false // Sort by sort key descending (most recent first)
  };
  const result = await docClient.send(new QueryCommand(params));
  const items = result.Items || [];
  
  // Transform each item to handle DynamoDB format
  return items.map(item => transformDynamoDBItem(item));
};

// Delete a specific chat session
exports.deleteChatSession = async ({ user_id, _id }) => {
  const params = {
    TableName: CHAT_TABLE,
    Key: { user_id, _id }
  };
  await docClient.send(new DeleteCommand(params));
};

// Update chat session title
exports.updateChatSessionTitle = async ({ user_id, _id, title }) => {
  const params = {
    TableName: CHAT_TABLE,
    Key: { user_id, _id },
    UpdateExpression: 'SET title = :title, updated_at = :updated_at',
    ExpressionAttributeValues: {
      ':title': title,
      ':updated_at': new Date().toISOString()
    }
  };
  await docClient.send(new UpdateCommand(params));
};

// Generate smart conversation title using Nova Lite AI
exports.generateConversationTitleWithAI = async (firstMessage) => {
  if (!firstMessage || typeof firstMessage !== 'string') {
    return 'New Chat';
  }

  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
    
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION
    });

    const prompt = `Generate a concise, descriptive title (max 4-5 words) for this travel conversation based on the user's first message. Focus on the main travel intent (flights, hotels, destinations, etc.).

User message: "${firstMessage}"

Examples:
- "flights from mumbai to jfk" → "Mumbai to JFK Flights"
- "hotels in barcelona for vacation" → "Barcelona Hotel Search"
- "plan a trip to italy" → "Italy Trip Planning"
- "compare flights mumbai to barcelona" → "Mumbai-Barcelona Flights"

Generate only the title, nothing else:`;

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 20,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0", // Using Claude Haiku for fast title generation
      body: body,
      contentType: "application/json",
      accept: "application/json"
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
      let title = responseBody.content[0].text.trim();
      
      // Clean up the title
      title = title.replace(/['"]/g, ''); // Remove quotes
      title = title.replace(/\.$/, ''); // Remove trailing period
      
      // Limit length
      if (title.length > 40) {
        title = title.substring(0, 37) + '...';
      }
      
      return title || exports.generateConversationTitle(firstMessage);
    }
  } catch (error) {
    console.warn('Failed to generate AI title, falling back to rule-based:', error.message);
  }

  // Fallback to rule-based generation
  return exports.generateConversationTitle(firstMessage);
};

// Generate smart conversation title from first user message (rule-based fallback)
exports.generateConversationTitle = (firstMessage) => {
  if (!firstMessage || typeof firstMessage !== 'string') {
    return 'New Chat';
  }
  
  const message = firstMessage.toLowerCase().trim();
  
  // Enhanced travel-specific title generation
  if (message.includes('flight') || message.includes('fly')) {
    // Extract origin and destination
    const fromMatch = message.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|\s|$|,)/);
    const toMatch = message.match(/to\s+([a-zA-Z\s]+?)(?:\s|$|,|\?)/);
    
    if (fromMatch && toMatch) {
      const from = fromMatch[1].trim();
      const to = toMatch[1].trim();
      return `${from} to ${to} Flights`;
    } else if (toMatch) {
      return `Flights to ${toMatch[1].trim()}`;
    } else if (fromMatch) {
      return `Flights from ${fromMatch[1].trim()}`;
    }
    return 'Flight Search';
  }
  
  if (message.includes('hotel') || message.includes('accommodation')) {
    const match = message.match(/(?:in|at)\s+([a-zA-Z\s]+?)(?:\s|$|,|\?)/);
    if (match) return `Hotels in ${match[1].trim()}`;
    return 'Hotel Search';
  }
  
  if (message.includes('trip') || message.includes('travel') || message.includes('vacation')) {
    const match = message.match(/(?:to|in)\s+([a-zA-Z\s]+?)(?:\s|$|,|\?)/);
    if (match) return `Trip to ${match[1].trim()}`;
    return 'Trip Planning';
  }
  
  if (message.includes('destination') || message.includes('where')) {
    return 'Destination Ideas';
  }
  
  if (message.includes('budget')) {
    return 'Budget Planning';
  }
  
  if (message.includes('compare')) {
    return 'Travel Comparison';
  }
  
  // Generic title from first few words
  const words = firstMessage.split(' ').slice(0, 4);
  let title = words.join(' ');
  if (title.length > 30) {
    title = title.substring(0, 27) + '...';
  }
  
  return title || 'New Chat';
};

// Check if messages array has complete user-AI pairs
exports.hasCompleteConversation = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return false;
  }
  
  // Must have at least one user message and one AI response
  const userMessages = messages.filter(m => m && (m.role === 'user'));
  const aiMessages = messages.filter(m => m && (m.role === 'assistant' || m.role === 'ai'));
  
  // Need at least one complete pair
  return userMessages.length > 0 && aiMessages.length > 0;
};

// Filter messages to only include complete user-AI pairs
exports.filterCompleteConversation = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  
  const filtered = [];
  let i = 0;
  
  while (i < messages.length) {
    const currentMsg = messages[i];
    
    // Look for user message followed by AI response
    if (currentMsg && currentMsg.role === 'user') {
      // Find the next AI response
      let aiResponseIndex = -1;
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[j] && (messages[j].role === 'assistant' || messages[j].role === 'ai')) {
          aiResponseIndex = j;
          break;
        }
      }
      
      // If we found a complete pair, add both messages
      if (aiResponseIndex !== -1) {
        filtered.push(currentMsg);
        filtered.push(messages[aiResponseIndex]);
        i = aiResponseIndex + 1;
      } else {
        // No AI response found for this user message, skip it
        i++;
      }
    } else {
      // Not a user message, skip
      i++;
    }
  }
  
  return filtered;
};


const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const CHAT_TABLE = process.env.CHATS_TABLE;

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

// Save or update a chat session (stores all messages for a session as an array)
exports.saveChatSession = async ({ user_id, _id, messages, title, category, created_at, updated_at }) => {
  // If created_at is not provided, set it to updated_at
  const item = {
    user_id,
    _id,
    messages: messages || [],
    title: title || 'New Chat',
    category: category || 'general',
    created_at: created_at || updated_at,
    updated_at: updated_at || new Date().toISOString(),
  };
  const params = {
    TableName: CHAT_TABLE,
    Item: item,
  };
  await docClient.send(new PutCommand(params));
};

// Append a message to an existing chat session (atomic update)
exports.appendMessageToSession = async ({ user_id, _id, message, updated_at }) => {
  const params = {
    TableName: CHAT_TABLE,
    Key: { user_id, _id },
    UpdateExpression: 'SET #msgs = list_append(if_not_exists(#msgs, :empty), :msg), updated_at = :updated_at',
    ExpressionAttributeNames: { '#msgs': 'messages' },
    ExpressionAttributeValues: {
      ':msg': [message],
      ':empty': [],
      ':updated_at': updated_at || new Date().toISOString(),
    },
    ReturnValues: 'UPDATED_NEW',
  };
  await docClient.send(new UpdateCommand(params));
};

// Helper function to transform DynamoDB format to regular JSON
const transformDynamoDBItem = (item) => {
  if (!item) return null;
  
  // If messages is in DynamoDB format, transform it
  if (item.messages && Array.isArray(item.messages)) {
    item.messages = item.messages.map(msg => {
      // Check if message is in DynamoDB format { M: { field: { S: "value" } } }
      if (msg.M) {
        return {
          id: msg.M.id?.S || '',
          role: msg.M.role?.S || 'assistant',
          content: msg.M.content?.S || '',
          timestamp: msg.M.timestamp?.N ? parseInt(msg.M.timestamp.N) : Date.now(),
          type: msg.M.type?.S || 'text'
        };
      }
      // Already in regular format
      return msg;
    });
  }
  
  return item;
};

// Get chat session by user_id and _id
exports.getChatSession = async ({ user_id, _id }) => {
  const params = {
    TableName: CHAT_TABLE,
    Key: { user_id, _id },
  };
  const result = await docClient.send(new GetCommand(params));
  const item = result.Item || null;
  
  // Transform DynamoDB format to regular JSON
  return transformDynamoDBItem(item);
};

// Get all chat sessions for a user (optionally filter by category)
exports.getUserChatSessions = async ({ user_id, category }) => {
  const params = {
    TableName: CHAT_TABLE,
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': user_id },
  };
  const result = await docClient.send(new QueryCommand(params));
  let sessions = result.Items || [];
  if (category) {
    sessions = sessions.filter(s => s.category === category);
  }
  return sessions;
};
