import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LambdaStackProps extends cdk.StackProps {
  environment: string;
  usersTableName: string;
  tripsTableName: string;
  bookingsTableName: string;
  chatHistoryTableName: string;
  s3BucketName: string;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { environment, usersTableName, tripsTableName, bookingsTableName, chatHistoryTableName, s3BucketName } = props;

    // Create IAM role with comprehensive permissions for AI functions
    const lambdaRole = new iam.Role(this, 'TravelCompanionLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // DynamoDB permissions
    const dynamoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Scan',
        'dynamodb:Query',
      ],
      resources: [
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${usersTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${tripsTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${bookingsTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${chatHistoryTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${chatHistoryTableName}/index/*`,
      ],
    });

    // Bedrock permissions for AI
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        'bedrock:GetFoundationModel',
        'bedrock:ListFoundationModels',
      ],
      resources: [
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-*',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
      ],
    });

    // SageMaker permissions for custom models
    const sagemakerPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sagemaker:InvokeEndpoint',
        'sagemaker:DescribeEndpoint',
        'sagemaker:ListEndpoints',
      ],
      resources: [
        `arn:aws:sagemaker:${this.region}:${this.account}:endpoint/travel-assistant-endpoint`,
        `arn:aws:sagemaker:${this.region}:${this.account}:endpoint/*travel*`,
      ],
    });

    // S3 permissions
    const s3Policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      resources: [
        `arn:aws:s3:::${s3BucketName}`,
        `arn:aws:s3:::${s3BucketName}/*`,
      ],
    });

    // Add policies to the role
    lambdaRole.addToPolicy(dynamoPolicy);
    lambdaRole.addToPolicy(bedrockPolicy);
    lambdaRole.addToPolicy(sagemakerPolicy);
    lambdaRole.addToPolicy(s3Policy);

    // Common environment variables for all Lambda functions
    const commonEnvironment = {
      USERS_TABLE_NAME: usersTableName,
      TRIPS_TABLE_NAME: tripsTableName,
      BOOKINGS_TABLE_NAME: bookingsTableName,
      CHAT_HISTORY_TABLE_NAME: chatHistoryTableName,
      S3_BUCKET_NAME: s3BucketName,
      SAGEMAKER_ENDPOINT_NAME: process.env.SAGEMAKER_ENDPOINT_NAME || 'travel-assistant-endpoint',
    };

    // AI Agent Lambda for Bedrock Claude-4 chat
    const aiAgentLambda = new lambda.Function(this, 'AIAgentLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/ai-agent.handler',
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // AI Agent Lambda for SageMaker integration
    const aiAgentSageMakerLambda = new lambda.Function(this, 'AIAgentSageMakerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/ai-agent-sagemaker.handler',
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(60), // Longer timeout for SageMaker
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // AI Chat API Lambda for managing chat history and preferences
    const aiChatApiLambda = new lambda.Function(this, 'AiChatApiLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/ai-chat-api.handler',
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Authentication Lambda functions
    const authLambda = new lambda.Function(this, 'AuthLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/auth.handler',
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Trip Planning Lambda
    const planTripLambda = new lambda.Function(this, 'PlanTripLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/plan-trip.handler',
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Booking Lambda
    const bookingLambda = new lambda.Function(this, 'BookingLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/booking.handler',
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // API Gateway with proper CORS and routes
    const api = new apigateway.RestApi(this, 'TravelCompanionApi', {
      restApiName: `TravelCompanion-${environment}`,
      description: 'Travel Companion API with AI and SageMaker integration',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    // AI Agent endpoints
    const aiResource = api.root.addResource('ai-agent');
    aiResource.addMethod('POST', new apigateway.LambdaIntegration(aiAgentLambda));

    // SageMaker AI Agent endpoint
    const aiSageMakerResource = api.root.addResource('ai-agent-sagemaker');
    aiSageMakerResource.addMethod('POST', new apigateway.LambdaIntegration(aiAgentSageMakerLambda));

    // Auth endpoints
    const authResource = api.root.addResource('auth');
    const loginResource = authResource.addResource('login');
    const signupResource = authResource.addResource('signup');
    
    loginResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    signupResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));

    // Trip planning endpoints
    const tripsResource = api.root.addResource('trips');
    const planResource = tripsResource.addResource('plan');
    
    planResource.addMethod('POST', new apigateway.LambdaIntegration(planTripLambda));
    tripsResource.addMethod('GET', new apigateway.LambdaIntegration(planTripLambda));

    // Booking endpoints
    const bookingsResource = api.root.addResource('bookings');
    bookingsResource.addMethod('POST', new apigateway.LambdaIntegration(bookingLambda));
    bookingsResource.addMethod('GET', new apigateway.LambdaIntegration(bookingLambda));

        // AI Chat API endpoints
    const aiChatResource = api.root.addResource('ai-chat');
    const historyResource = aiChatResource.addResource('history');
    const saveResource = aiChatResource.addResource('save');
    
    historyResource.addMethod('GET', new apigateway.LambdaIntegration(aiChatApiLambda));
    saveResource.addMethod('POST', new apigateway.LambdaIntegration(aiChatApiLambda));

    // User preferences endpoint
    const userResource = api.root.addResource('user');
    const preferencesResource = userResource.addResource('preferences');
    preferencesResource.addMethod('GET', new apigateway.LambdaIntegration(aiChatApiLambda));
    preferencesResource.addMethod('PUT', new apigateway.LambdaIntegration(aiChatApiLambda));

    // Output important values
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: `${environment}-ApiGatewayUrl`,
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTableName,
      exportName: `${environment}-UsersTableName`,
    });

    new cdk.CfnOutput(this, 'TripsTableName', {
      value: tripsTableName,
      exportName: `${environment}-TripsTableName`,
    });

    new cdk.CfnOutput(this, 'BookingsTableName', {
      value: bookingsTableName,
      exportName: `${environment}-BookingsTableName`,
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: s3BucketName,
      exportName: `${environment}-S3BucketName`,
    });

    new cdk.CfnOutput(this, 'SageMakerEndpointName', {
      value: commonEnvironment.SAGEMAKER_ENDPOINT_NAME,
      description: 'SageMaker endpoint name for AI model',
      exportName: `${environment}-SageMakerEndpointName`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'TravelCompanion');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('AIIntegration', 'Bedrock-SageMaker');
  }
}