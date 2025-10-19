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
  };
  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
};


const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const CHAT_TABLE = process.env.CHAT_TABLE || 'HackAHolidayChatHistory';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Save or update a chat session (stores all messages for a session as an array)
exports.saveChatSession = async ({ user_id, _id, messages, category, created_at, updated_at }) => {
  // If created_at is not provided, set it to updated_at
  const item = {
    user_id,
    _id,
    messages: messages || [],
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

// Get chat session by user_id and _id
exports.getChatSession = async ({ user_id, _id }) => {
  const params = {
    TableName: CHAT_TABLE,
    Key: { user_id, _id },
  };
  const result = await docClient.send(new GetCommand(params));
  return result.Item || null;
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
