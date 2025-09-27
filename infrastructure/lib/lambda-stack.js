"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const iam = require("aws-cdk-lib/aws-iam");
const logs = require("aws-cdk-lib/aws-logs");
class LambdaStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        // Common Lambda function configuration
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
                JWT_SECRET: environment === 'prod'
                    ? 'CHANGE_THIS_TO_A_SECURE_JWT_SECRET_IN_PRODUCTION_MINIMUM_32_CHARACTERS'
                    : 'dev-jwt-secret-key-for-development-use-only',
                GOOGLE_CLIENT_ID: 'your-google-oauth-client-id-from-google-console', // Replace with your actual Google Client ID
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
            code: lambda.Code.fromAsset('../backend', {
                bundling: {
                    image: lambda.Runtime.NODEJS_18_X.bundlingImage,
                    command: [
                        'bash', '-c',
                        'cp -r /asset-input/* /asset-output/ && cd /asset-output && npm install --production'
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
exports.LambdaStack = LambdaStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFXN0MsTUFBYSxXQUFZLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFjeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRS9GLHVDQUF1QztRQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNELFFBQVEsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtTQUNGLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM3QyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRTtnQkFDVCxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxVQUFVLGNBQWMsRUFBRTtnQkFDekUsb0JBQW9CLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sVUFBVSxjQUFjLFVBQVU7Z0JBQ2pGLG9CQUFvQixJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLFVBQVUsY0FBYyxFQUFFO2dCQUN6RSxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxVQUFVLGNBQWMsVUFBVTtnQkFDakYsb0JBQW9CLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sVUFBVSxpQkFBaUIsRUFBRTtnQkFDNUUsb0JBQW9CLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sVUFBVSxpQkFBaUIsVUFBVTthQUNyRjtTQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUoscUJBQXFCO1FBQ3JCLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQzdDLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFO2dCQUNQLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxpQkFBaUI7Z0JBQ2pCLGVBQWU7YUFDaEI7WUFDRCxTQUFTLEVBQUU7Z0JBQ1QsZ0JBQWdCLFlBQVksRUFBRTtnQkFDOUIsZ0JBQWdCLFlBQVksSUFBSTthQUNqQztTQUNGLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbEUsR0FBRyxpQkFBaUI7WUFDcEIsWUFBWSxFQUFFLDJCQUEyQixXQUFXLEVBQUU7WUFDdEQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDO1lBQzlDLE9BQU8sRUFBRSw2QkFBNkI7WUFDdEMsV0FBVyxFQUFFLDhCQUE4QjtTQUM1QyxDQUFDLENBQUM7UUFFSCw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDdEUsR0FBRyxpQkFBaUI7WUFDcEIsWUFBWSxFQUFFLDZCQUE2QixXQUFXLEVBQUU7WUFDeEQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDO1lBQzlDLE9BQU8sRUFBRSwrQkFBK0I7WUFDeEMsV0FBVyxFQUFFLHdDQUF3QztTQUN0RCxDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDOUUsR0FBRyxpQkFBaUI7WUFDcEIsWUFBWSxFQUFFLGlDQUFpQyxXQUFXLEVBQUU7WUFDNUQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDO1lBQzlDLE9BQU8sRUFBRSwxtQ0FBbUM7WUFDNUMsV0FBVyxFQUFFLHNDQUFzQztTQUNwRCxDQUFDLENBQUM7UUFFSCxrQ0FBa0M7UUFFbEMseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNoRSxHQUFHLGlCQUFpQjtZQUNwQixZQUFZLEVBQUUsNEJBQTRCLFdBQVcsRUFBRTtZQUN2RCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUM7WUFDOUMsT0FBTyxFQUFFLDhCQUE4QjtZQUN2QyxXQUFXLEVBQUUsa0RBQWtEO1NBQ2hFLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbEUsR0FBRyxpQkFBaUI7WUFDcEIsWUFBWSxFQUFFLDJCQUEyQixXQUFXLEVBQUU7WUFDdEQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDO1lBQzlDLE9BQU8sRUFBRSw2QkFBNkI7WUFDdEMsV0FBVyxFQUFFLDhCQUE4QjtTQUM1QyxDQUFDLENBQUM7UUFFSCw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDdEUsR0FBRyxpQkFBaUI7WUFDcEIsWUFBWSxFQUFFLDZCQUE2QixXQUFXLEVBQUU7WUFDeEQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDO1lBQzlDLE9BQU8sRUFBRSwrQkFBK0I7WUFDeEMsV0FBVyxFQUFFLHdDQUF3QztTQUN0RCxDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDbEYsR0FBRyxpQkFBaUI7WUFDcEIsWUFBWSxFQUFFLG1DQUFtQyxXQUFXLEVBQUU7WUFDOUQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDO1lBQzlDLE9BQU8sRUFBRSwxtQ0FBbUM7WUFDNUMsV0FBVyxFQUFFLHNDQUFzQztTQUNwRCxDQUFDLENBQUM7UUFFSCxrQ0FBa0M7UUFFbEMseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNoRSxHQUFHLGlCQUFpQjtZQUNwQixZQUFZLEVBQUUsNEJBQTRCLFdBQVcsRUFBRTtZQUN2RCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUM7WUFDOUMsT0FBTyxFQUFFLHlCQUF5QjtZQUNsQyxXQUFXLEVBQUUsMkNBQTJDO1NBQ3pELENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDcEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRjtBQTFYRCxrQ0EwWEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTGFtYmRhU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIHVzZXJzVGFibGVOYW1lOiBzdHJpbmc7XHJcbiAgdHJpcHNUYWJsZU5hbWU6IHN0cmluZztcclxuICBib29raW5nc1RhYmxlTmFtZTogc3RyaW5nO1xyXG4gIHMzQnVja2V0TmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTGFtYmRhU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcclxuICBwdWJsaWMgcmVhZG9ubHkgcGxhblRyaXBGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnZXRUcmlwRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgbGlzdFRyaXBzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgY3JlYXRlQm9va2luZ0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGdldFRyaXBCb29raW5nc0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGdldFVzZXJCb29raW5nc0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHNpZ251cEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvZ2luRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ29vZ2xlQXV0aEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IG1lRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgYXV0aEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBMYW1iZGFTeWFuZCBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBwdWJsaWMgcmVhZG9ubHkgY3JlYXRlQm9va2luZ0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGdldFRyaXBCb29raW5nc0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGdldFVzZXJCb29raW5nc0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHNpZ251cEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvZ2luRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ29vZ2xlQXV0aEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IG1lRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgYXV0aEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHVzZXJzVGFibGVOYW1lLCB0cmlwc1RhbGxlTmFtZSwgYm9va2luZ3NUYWJsZU5hbWUsIHMzQnVja2V0TmFtZSB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIElBTSByb2xlIGZvciBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBsYW1iZGFyb2xlID0gbmV3IGlhbS5Sb2xlZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcclxuICAgICAgICByb2xlTmFtZTogJFRyYXZlbENvbXBhbmlvbi1MYW1iZGEgLSAkJWVudmlyb25tZW50fScsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmljaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJyksXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgRHluYW1vREIgcGVybWlzc2lvbnNcclxuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgICAnZHluYW1vZGI6U2NhbicsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke3VzZXJzVGFibGVOYW1lfWAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dXNlcnNUYWJsZU5hbWV9L2luZGV4LypgLFxyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke3RyaXBzVGFibGVOYW1lfWAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dHJpcHNUYWJsZU5hbWV9L2luZGV4LypgLFxyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke2Jvb2tpbmdzVGFibGVOYW1lfWAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7Ym9va2luZ3NUYWJsZU5hbWV9L2luZGV4LypgLFxyXG4gICAgICBdLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEFkZCBTMyBwZXJtaXNzaW9uc1xyXG4gICAgbGFtYmRhUm9zZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCB7IGVudmlyb25tZW50LCB1c2Vyc1RhYmxlTmFtZSwgdHJpcHNUYWJsZU5hbU