const ddbDocClient = require('../config/dynamo');
const { GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const USERS_TABLE = process.env.USERS_TABLE || 'HackAHolidayUsers';

exports.updateUser = async (user) => {
  const params = {
    TableName: USERS_TABLE,
    Item: user,
  };
  await ddbDocClient.send(new PutCommand(params));
  return user;
};

exports.getUserByEmail = async (email) => {
  const params = {
    TableName: USERS_TABLE,
    IndexName: 'GSI1', // DynamoDB GSI name
    KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
    ExpressionAttributeValues: {
      ':gsi1pk': `EMAIL#${email}`,
      ':gsi1sk': 'USER',
    },
  };
  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items && data.Items[0];
};

exports.getUserById = async (id) => {
  const params = {
    TableName: USERS_TABLE,
    Key: { PK: `USER#${id}`, SK: 'PROFILE' },
  };
  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item;
};

exports.createUser = async (user) => {
  const params = {
    TableName: USERS_TABLE,
    Item: user,
    ConditionExpression: 'attribute_not_exists(PK)',
  };
  await ddbDocClient.send(new PutCommand(params));
  return user;
};

/**
 * Soft delete user - marks as deleted with 30-day TTL
 */
exports.softDeleteUser = async (userId) => {
  console.log(`🔍 Model: Attempting to get user ${userId}`);
  const user = await exports.getUserById(userId);
  
  if (!user) {
    console.error(`❌ Model: User ${userId} not found`);
    throw new Error('User not found');
  }

  console.log(`✅ Model: Found user ${userId}, email: ${user.email}`);

  // Calculate TTL: 30 days from now
  const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  
  const updatedUser = {
    ...user,
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    ttl: ttl // DynamoDB will auto-delete after 30 days
  };

  console.log(`🔍 Model: Writing to DynamoDB table: ${USERS_TABLE}`);
  const params = {
    TableName: USERS_TABLE,
    Item: updatedUser,
  };
  
  try {
    await ddbDocClient.send(new PutCommand(params));
    console.log(`🗑️ User ${userId} soft deleted. Will be permanently deleted after 30 days.`);
    return updatedUser;
  } catch (dbError) {
    console.error(`❌ Model: DynamoDB error:`, dbError);
    throw dbError;
  }
};

/**
 * Restore deleted user account
 */
exports.restoreUser = async (userId) => {
  const user = await exports.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Remove deletion flags and TTL
  const { isDeleted, deletedAt, ttl, ...restoredUser } = user;
  restoredUser.restoredAt = new Date().toISOString();

  const params = {
    TableName: USERS_TABLE,
    Item: restoredUser,
  };
  
  await ddbDocClient.send(new PutCommand(params));
  console.log(`♻️ User ${userId} account restored`);
  return restoredUser;
};
