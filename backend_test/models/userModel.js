exports.updateUser = async (user) => {
  const params = {
    TableName: USERS_TABLE,
    Item: user,
  };
  await ddbDocClient.send(new PutCommand(params));
  return user;
};
const ddbDocClient = require('../config/dynamo');
const { GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const USERS_TABLE = process.env.USERS_TABLE || 'HackAHolidayUsers';

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
