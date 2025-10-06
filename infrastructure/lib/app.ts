#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from './dynamodb-stack';
import { S3Stack } from './s3-stack';
import { LambdaStack } from './lambda-stack';
import { SageMakerStack } from './sagemaker-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

console.log(`Deploying to environment: ${environment}`);
console.log(`Account: ${account}`);
console.log(`Region: ${region}`);

const env = { account, region };

// Deploy DynamoDB stack first
const dynamoStack = new DynamoDBStack(app, `TravelCompanion-DynamoDB-${environment}`, {
  env,
  environment,
  description: `DynamoDB tables for Travel Companion - ${environment}`,
});

// Deploy S3 stack
const s3Stack = new S3Stack(app, `TravelCompanion-S3-${environment}`, {
  env,
  environment,
  description: `S3 buckets and CloudFront for Travel Companion - ${environment}`,
});

// Deploy Lambda stack (depends on DynamoDB and S3)
const lambdaStack = new LambdaStack(app, `TravelCompanion-Lambda-${environment}`, {
  env,
  environment,
  usersTableName: dynamoStack.usersTable.tableName,
  tripsTableName: dynamoStack.tripsTable.tableName,
  bookingsTableName: dynamoStack.bookingsTable.tableName,
  chatHistoryTableName: dynamoStack.chatHistoryTable.tableName,
  s3BucketName: s3Stack.itineraryBucket.bucketName,
  description: `Lambda functions and API Gateway for Travel Companion - ${environment}`,
});

// Add dependencies
lambdaStack.addDependency(dynamoStack);
lambdaStack.addDependency(s3Stack);

// Deploy SageMaker stack (optional - for AI agent)
const sagemakerStack = new SageMakerStack(app, `TravelCompanion-SageMaker-${environment}`, {
  env,
  environment,
  description: `SageMaker endpoint for AI Travel Assistant - ${environment}`,
});

// Add tags to all stacks
const tags = {
  Project: 'TravelCompanion',
  Environment: environment,
  Owner: 'TravelCompanionTeam',
  CostCenter: 'Development',
};

Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});