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
  s3BucketName: string;
}

export class LambdaStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly planTripFunction: lambda.Function;
  public readonly getTripFunction: lambda.Function;
  public readonly listTripsFunction: lambda.Function;
  public readonly createBookingFunction: lambda.Function;
  public readonly getTripBookingsFunction: lambda.Function;
  public readonly getUserBookingsFunction: lambda.Function;
  public readonly signupFunction: lambda.Function;
  public readonly loginFunction: lambda.Function;
  public readonly googleAuthFunction: lambda.Function;
  public readonly meFunction: lambda.Function;
  public readonly authFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { environment, usersTableName, tripsTableName, bookingsTableName, s3BucketName } = props;

    // Create IAM role for Lambda functions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `TravelCompanion-Lambda-Role-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Add DynamoDB permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${usersTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${usersTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${tripsTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${tripsTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${bookingsTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${bookingsTableName}/index/*`,
      ],
    }));

    // Add S3 permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
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
    }));

    // Add Bedrock permissions (for future use)
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeAgent',
        'bedrock:GetAgent',
        'bedrock:ListAgents',
      ],
      resources: ['*'],
    }));

    // Common Lambda function configuration (no Docker, uses dist)
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      role: lambdaRole,
      environment: {
        NODE_ENV: environment,
        USERS_TABLE_NAME: usersTableName,
        TRIPS_TABLE_NAME: tripsTableName,
        BOOKINGS_TABLE_NAME: bookingsTableName,
        S3_BUCKET_NAME: s3BucketName,
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
    };

    // Plan Trip Lambda Function
    this.planTripFunction = new lambda.Function(this, 'PlanTripFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-PlanTrip-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/plan-trip.planTrip',
      description: 'Creates new trip plans based on user preferences',
      logGroup: new logs.LogGroup(this, 'PlanTripLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Get Trip Lambda Function
    this.getTripFunction = new lambda.Function(this, 'GetTripFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-GetTrip-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/plan-trip.getTrip',
      description: 'Retrieves trip details by ID',
      logGroup: new logs.LogGroup(this, 'GetTripLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // List Trips Lambda Function
    this.listTripsFunction = new lambda.Function(this, 'ListTripsFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-ListTrips-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/plan-trip.listTrips',
      description: 'Lists trips for a user with pagination',
      logGroup: new logs.LogGroup(this, 'ListTripsLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Create Booking Lambda Function
    this.createBookingFunction = new lambda.Function(this, 'CreateBookingFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-CreateBooking-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/booking.createBooking',
      description: 'Processes booking confirmations for trips',
      logGroup: new logs.LogGroup(this, 'CreateBookingLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Get Trip Bookings Lambda Function
    this.getTripBookingsFunction = new lambda.Function(this, 'GetTripBookingsFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-GetTripBookings-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/booking.getTripBookings',
      description: 'Retrieves bookings for a specific trip',
      logGroup: new logs.LogGroup(this, 'GetTripBookingsLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Get User Bookings Lambda Function
    this.getUserBookingsFunction = new lambda.Function(this, 'GetUserBookingsFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-GetUserBookings-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/booking.getUserBookings',
      description: 'Retrieves booking history for a user',
      logGroup: new logs.LogGroup(this, 'GetUserBookingsLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Authentication Lambda Functions
    
    // Signup Lambda Function
    this.signupFunction = new lambda.Function(this, 'SignupFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-Signup-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/signup.signup',
      description: 'User registration with email and password',
      logGroup: new logs.LogGroup(this, 'SignupLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Login Lambda Function
    this.loginFunction = new lambda.Function(this, 'LoginFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-Login-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/login.login',
      description: 'User authentication with email and password',
      logGroup: new logs.LogGroup(this, 'LoginLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Google OAuth Lambda Function
    this.googleAuthFunction = new lambda.Function(this, 'GoogleAuthFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-GoogleAuth-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/google-auth.googleAuth',
      description: 'Google OAuth authentication',
      logGroup: new logs.LogGroup(this, 'GoogleAuthLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Me (Get Current User) Lambda Function
    this.meFunction = new lambda.Function(this, 'MeFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-Me-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'functions/auth-middleware.me',
      description: 'Get current authenticated user profile',
      logGroup: new logs.LogGroup(this, 'MeLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Unified Auth Lambda Function (New)
    this.authFunction = new lambda.Function(this, 'AuthFunction', {
      ...commonLambdaProps,
      functionName: `TravelCompanion-Auth-${environment}`,
      code: lambda.Code.fromAsset('../backend/extracted-lambda', {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: [
            'bash', '-c',
            'cp -r /asset-input/* /asset-output/ && cp /asset-input/.npmrc /asset-output/.npmrc || true && cd /asset-output && npm install --production'
          ],
        },
      }),
      handler: 'dist/functions/auth.handler',
      description: 'Unified authentication handler for all auth routes with bundled dependencies',
      logGroup: new logs.LogGroup(this, 'AuthLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
    });

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'TravelCompanionApi', {
      restApiName: `TravelCompanion-API-${environment}`,
      description: 'API for Travel Companion application',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'], // Added localhost for development
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-User-Id',
        ],
      },
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // API Gateway Resources and Methods

    // /plan-trip endpoint
    const planTripResource = this.api.root.addResource('plan-trip');
    planTripResource.addMethod('POST', new apigateway.LambdaIntegration(this.planTripFunction), {
      apiKeyRequired: false,
      requestValidator: new apigateway.RequestValidator(this, 'PlanTripValidator', {
        restApi: this.api,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // /trips endpoint
    const tripsResource = this.api.root.addResource('trips');
    
    // GET /trips (list user trips)
    tripsResource.addMethod('GET', new apigateway.LambdaIntegration(this.listTripsFunction));

    // /trips/{tripId} endpoint
    const tripResource = tripsResource.addResource('{tripId}');
    
    // GET /trips/{tripId}
    tripResource.addMethod('GET', new apigateway.LambdaIntegration(this.getTripFunction));

    // /trips/{tripId}/bookings endpoint
    const tripBookingsResource = tripResource.addResource('bookings');
    tripBookingsResource.addMethod('GET', new apigateway.LambdaIntegration(this.getTripBookingsFunction));

    // /bookings endpoint
    const bookingsResource = this.api.root.addResource('bookings');
    
    // POST /bookings (create booking)
    bookingsResource.addMethod('POST', new apigateway.LambdaIntegration(this.createBookingFunction), {
      requestValidator: new apigateway.RequestValidator(this, 'BookingValidator', {
        restApi: this.api,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // GET /bookings (get user bookings)
    bookingsResource.addMethod('GET', new apigateway.LambdaIntegration(this.getUserBookingsFunction));

    // Authentication endpoints
    
    // /auth resource
    const authResource = this.api.root.addResource('auth');
    
    // POST /auth/signup (using new unified auth function)
    const signupResource = authResource.addResource('signup');
    signupResource.addMethod('POST', new apigateway.LambdaIntegration(this.authFunction), {
      requestValidator: new apigateway.RequestValidator(this, 'SignupValidator', {
        restApi: this.api,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // POST /auth/login (using new unified auth function)
    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', new apigateway.LambdaIntegration(this.authFunction), {
      requestValidator: new apigateway.RequestValidator(this, 'LoginValidator', {
        restApi: this.api,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // POST /auth/google-user (new endpoint using unified auth function)
    const googleUserResource = authResource.addResource('google-user');
    googleUserResource.addMethod('POST', new apigateway.LambdaIntegration(this.authFunction), {
      requestValidator: new apigateway.RequestValidator(this, 'GoogleUserValidator', {
        restApi: this.api,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // POST /auth/google (legacy - keeping for compatibility)
    const googleAuthResource = authResource.addResource('google');
    googleAuthResource.addMethod('POST', new apigateway.LambdaIntegration(this.googleAuthFunction), {
      requestValidator: new apigateway.RequestValidator(this, 'GoogleAuthValidator', {
        restApi: this.api,
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // GET /auth/me (using new unified auth function)
    const meResource = authResource.addResource('me');
    meResource.addMethod('GET', new apigateway.LambdaIntegration(this.authFunction));

    // Health check endpoint
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            status: 'healthy',
            timestamp: '$context.requestTime',
            version: '1.0.0',
          }),
        },
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': apigateway.Model.EMPTY_MODEL,
        },
      }],
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      exportName: `${environment}-ApiGatewayUrl`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayId', {
      value: this.api.restApiId,
      exportName: `${environment}-ApiGatewayId`,
    });

    // Output Lambda function ARNs
    new cdk.CfnOutput(this, 'PlanTripFunctionArn', {
      value: this.planTripFunction.functionArn,
      exportName: `${environment}-PlanTripFunctionArn`,
    });

    new cdk.CfnOutput(this, 'CreateBookingFunctionArn', {
      value: this.createBookingFunction.functionArn,
      exportName: `${environment}-CreateBookingFunctionArn`,
    });

    // Tags for cost tracking
    cdk.Tags.of(this).add('Project', 'TravelCompanion');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Component', 'API');
  }
}