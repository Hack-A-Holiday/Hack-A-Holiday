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
                AWS_REGION: this.region, // Required for Bedrock service
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        };
        // Plan Trip Lambda Function
        this.planTripFunction = new lambda.Function(this, 'PlanTripFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-PlanTrip-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/plan-trip.planTrip',
            description: 'Creates new trip plans based on user preferences',
        });
        // Get Trip Lambda Function
        this.getTripFunction = new lambda.Function(this, 'GetTripFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GetTrip-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/plan-trip.getTrip',
            description: 'Retrieves trip details by ID',
        });
        // List Trips Lambda Function
        this.listTripsFunction = new lambda.Function(this, 'ListTripsFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-ListTrips-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/plan-trip.listTrips',
            description: 'Lists trips for a user with pagination',
        });
        // Create Booking Lambda Function
        this.createBookingFunction = new lambda.Function(this, 'CreateBookingFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-CreateBooking-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/booking.createBooking',
            description: 'Processes booking confirmations for trips',
        });
        // Get Trip Bookings Lambda Function
        this.getTripBookingsFunction = new lambda.Function(this, 'GetTripBookingsFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GetTripBookings-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/booking.getTripBookings',
            description: 'Retrieves bookings for a specific trip',
        });
        // Get User Bookings Lambda Function
        this.getUserBookingsFunction = new lambda.Function(this, 'GetUserBookingsFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GetUserBookings-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/booking.getUserBookings',
            description: 'Retrieves booking history for a user',
        });
        // Authentication Lambda Functions
        // Signup Lambda Function
        this.signupFunction = new lambda.Function(this, 'SignupFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-Signup-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/signup.signup',
            description: 'User registration with email and password',
        });
        // Login Lambda Function
        this.loginFunction = new lambda.Function(this, 'LoginFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-Login-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/login.login',
            description: 'User authentication with email and password',
        });
        // Google OAuth Lambda Function
        this.googleAuthFunction = new lambda.Function(this, 'GoogleAuthFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GoogleAuth-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/google-auth.googleAuth',
            description: 'Google OAuth authentication',
        });
        // Me (Get Current User) Lambda Function
        this.meFunction = new lambda.Function(this, 'MeFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-Me-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/auth-middleware.me',
            description: 'Get current authenticated user profile',
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
        });
        // Enhanced Flight Search Lambda Function
        this.enhancedFlightSearchFunction = new lambda.Function(this, 'EnhancedFlightSearchFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-EnhancedFlightSearch-${environment}`,
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/enhanced-flight-search.handler',
            description: 'Enhanced flight search with advanced filtering and recommendations v1.0',
            timeout: cdk.Duration.seconds(60), // Longer timeout for flight search
            memorySize: 1024, // More memory for complex search operations
        });
        // Create API Gateway
        this.api = new apigateway.RestApi(this, 'TravelCompanionApi', {
            restApiName: `TravelCompanion-API-${environment}`,
            description: 'API for Travel Companion application',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
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
        // Enhanced Flight Search endpoint
        const enhancedFlightSearchResource = this.api.root.addResource('enhanced-flight-search');
        enhancedFlightSearchResource.addMethod('POST', new apigateway.LambdaIntegration(this.enhancedFlightSearchFunction), {
            requestValidator: new apigateway.RequestValidator(this, 'EnhancedFlightSearchValidator', {
                restApi: this.api,
                validateRequestBody: true,
                validateRequestParameters: false,
            }),
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFXN0MsTUFBYSxXQUFZLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFleEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRS9GLHVDQUF1QztRQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNELFFBQVEsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtTQUNGLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM3QyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRTtnQkFDVCxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENB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QVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBQ0Y7QUFoWkQsa0NBZ1pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICB1c2Vyc1RhYmxlTmFtZTogc3RyaW5nO1xuICB0cmlwc1RhYmxlTmFtZTogc3RyaW5nO1xuICBib29raW5nc1RhYmxlTmFtZTogc3RyaW5nO1xuICBzM0J1Y2tldE5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xuICBwdWJsaWMgcmVhZG9ubHkgcGxhblRyaXBGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgZ2V0VHJpcEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBsaXN0VHJpcHNGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgY3JlYXRlQm9va2luZ0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBnZXRUcmlwQm9va2luZ3NGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgZ2V0VXNlckJvb2tpbmdzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IHNpZ251cEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBsb2dpbkZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBnb29nbGVBdXRoRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IG1lRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGF1dGhGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgZW5oYW5jZWRGbGlnaHRTZWFyY2hGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGVudmlyb25tZW50LCB1c2Vyc1RhYmxlTmFtZSwgdHJpcHNUYWJsZU5hbWUsIGJvb2tpbmdzVGFibGVOYW1lLCBzM0J1Y2tldE5hbWUgfSA9IHByb3BzO1xuXG4gICAgLy8gQ3JlYXRlIElBTSByb2xlIGZvciBMYW1iZGEgZnVuY3Rpb25zXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIHJvbGVOYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUxhbWJkYS1Sb2xlLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dXNlcnNUYWJsZU5hbWV9YCxcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dXNlcnNUYWJsZU5hbWV9L2luZGV4LypgLFxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt0cmlwc1RhYmxlTmFtZX1gLFxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt0cmlwc1RhYmxlTmFtZX0vaW5kZXgvKmAsXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke2Jvb2tpbmdzVGFibGVOYW1lfWAsXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke2Jvb2tpbmdzVGFibGVOYW1lfS9pbmRleC8qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gQWRkIFMzIHBlcm1pc3Npb25zXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXG4gICAgICAgICdzMzpMaXN0QnVja2V0JyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgYGFybjphd3M6czM6Ojoke3MzQnVja2V0TmFtZX1gLFxuICAgICAgICBgYXJuOmF3czpzMzo6OiR7czNCdWNrZXROYW1lfS8qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gQWRkIEJlZHJvY2sgcGVybWlzc2lvbnMgKGZvciBmdXR1cmUgdXNlKVxuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICAgICdiZWRyb2NrOkludm9rZUFnZW50JyxcbiAgICAgICAgJ2JlZHJvY2s6R2V0QWdlbnQnLFxuICAgICAgICAnYmVkcm9jazpMaXN0QWdlbnRzJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vIENvbW1vbiBMYW1iZGEgZnVuY3Rpb24gY29uZmlndXJhdGlvblxuICAgIGNvbnN0IGNvbW1vbkxhbWJkYVByb3BzID0ge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTk9ERV9FTlY6IGVudmlyb25tZW50LFxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlTmFtZSxcbiAgICAgICAgVFJJUFNfVEFCTEVfTkFNRTogdHJpcHNUYWJsZU5hbWUsXG4gICAgICAgIEJPT0tJTkdTX1RBQkxFX05BTUU6IGJvb2tpbmdzVGFibGVOYW1lLFxuICAgICAgICBTM19CVUNLRVRfTkFNRTogczNCdWNrZXROYW1lLFxuICAgICAgICBMT0dfTEVWRUw6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAnaW5mbycgOiAnZGVidWcnLFxuICAgICAgICBKV1RfU0VDUkVUOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnIFxuICAgICAgICAgID8gJ0NIQU5HRV9USElTX1RPX0FfU0VDVVJFX0pXVF9TRUNSRVRfSU5fUFJPRFVDVElPTl9NSU5JTVVNXzMyX0NIQVJBQ1RFUlMnIFxuICAgICAgICAgIDogJ2Rldi1qd3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtdXNlLW9ubHknLFxuICAgICAgICBHT09HTEVfQ0xJRU5UX0lEOiAneW91ci1nb29nbGUtb2F1dGgtY2xpZW50LWlkLWZyb20tZ29vZ2xlLWNvbnNvbGUnLCAvLyBSZXBsYWNlIHdpdGggeW91ciBhY3R1YWwgR29vZ2xlIENsaWVudCBJRFxuICAgICAgICBBV1NfUkVHSU9OOiB0aGlzLnJlZ2lvbiwgLy8gUmVxdWlyZWQgZm9yIEJlZHJvY2sgc2VydmljZVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgIH07XG5cbiAgICAvLyBQbGFuIFRyaXAgTGFtYmRhIEZ1bmN0aW9uXG4gICAgdGhpcy5wbGFuVHJpcEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGxhblRyaXBGdW5jdGlvbicsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLVBsYW5UcmlwLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL3BsYW4tdHJpcC5wbGFuVHJpcCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZXMgbmV3IHRyaXAgcGxhbnMgYmFzZWQgb24gdXNlciBwcmVmZXJlbmNlcycsXG4gICAgfSk7XG5cbiAgICAvLyBHZXQgVHJpcCBMYW1iZGEgRnVuY3Rpb25cbiAgICB0aGlzLmdldFRyaXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFRyaXBGdW5jdGlvbicsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUdldFRyaXAtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvcGxhbi10cmlwLmdldFRyaXAnLFxuICAgICAgZGVzY3JpcHRpb246ICdSZXRyaWV2ZXMgdHJpcCBkZXRhaWxzIGJ5IElEJyxcbiAgICB9KTtcblxuICAgIC8vIExpc3QgVHJpcHMgTGFtYmRhIEZ1bmN0aW9uXG4gICAgdGhpcy5saXN0VHJpcHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0xpc3RUcmlwc0Z1bmN0aW9uJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tTGlzdFRyaXBzLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL3BsYW4tdHJpcC5saXN0VHJpcHMnLFxuICAgICAgZGVzY3JpcHRpb246ICdMaXN0cyB0cmlwcyBmb3IgYSB1c2VyIHdpdGggcGFnaW5hdGlvbicsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQm9va2luZyBMYW1iZGEgRnVuY3Rpb25cbiAgICB0aGlzLmNyZWF0ZUJvb2tpbmdGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NyZWF0ZUJvb2tpbmdGdW5jdGlvbicsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUNyZWF0ZUJvb2tpbmctJHtlbnZpcm9ubWVudH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvYm9va2luZy5jcmVhdGVCb29raW5nJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJvY2Vzc2VzIGJvb2tpbmcgY29uZmlybWF0aW9ucyBmb3IgdHJpcHMnLFxuICAgIH0pO1xuXG4gICAgLy8gR2V0IFRyaXAgQm9va2luZ3MgTGFtYmRhIEZ1bmN0aW9uXG4gICAgdGhpcy5nZXRUcmlwQm9va2luZ3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFRyaXBCb29raW5nc0Z1bmN0aW9uJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tR2V0VHJpcEJvb2tpbmdzLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL2Jvb2tpbmcuZ2V0VHJpcEJvb2tpbmdzJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmV0cmlldmVzIGJvb2tpbmdzIGZvciBhIHNwZWNpZmljIHRyaXAnLFxuICAgIH0pO1xuXG4gICAgLy8gR2V0IFVzZXIgQm9va2luZ3MgTGFtYmRhIEZ1bmN0aW9uXG4gICAgdGhpcy5nZXRVc2VyQm9va2luZ3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFVzZXJCb29raW5nc0Z1bmN0aW9uJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tR2V0VXNlckJvb2tpbmdzLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL2Jvb2tpbmcuZ2V0VXNlckJvb2tpbmdzJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmV0cmlldmVzIGJvb2tpbmcgaGlzdG9yeSBmb3IgYSB1c2VyJyxcbiAgICB9KTtcblxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIExhbWJkYSBGdW5jdGlvbnNcbiAgICBcbiAgICAvLyBTaWdudXAgTGFtYmRhIEZ1bmN0aW9uXG4gICAgdGhpcy5zaWdudXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NpZ251cEZ1bmN0aW9uJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tU2lnbnVwLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL3NpZ251cC5zaWdudXAnLFxuICAgICAgZGVzY3JpcHRpb246ICdVc2VyIHJlZ2lzdHJhdGlvbiB3aXRoIGVtYWlsIGFuZCBwYXNzd29yZCcsXG4gICAgfSk7XG5cbiAgICAvLyBMb2dpbiBMYW1iZGEgRnVuY3Rpb25cbiAgICB0aGlzLmxvZ2luRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMb2dpbkZ1bmN0aW9uJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tTG9naW4tJHtlbnZpcm9ubWVudH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvbG9naW4ubG9naW4nLFxuICAgICAgZGVzY3JpcHRpb246ICdVc2VyIGF1dGhlbnRpY2F0aW9uIHdpdGggZW1haWwgYW5kIHBhc3N3b3JkJyxcbiAgICB9KTtcblxuICAgIC8vIEdvb2dsZSBPQXV0aCBMYW1iZGEgRnVuY3Rpb25cbiAgICB0aGlzLmdvb2dsZUF1dGhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dvb2dsZUF1dGhGdW5jdGlvbicsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUdvb2dsZUF1dGgtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvZ29vZ2xlLWF1dGguZ29vZ2xlQXV0aCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dvb2dsZSBPQXV0aCBhdXRoZW50aWNhdGlvbicsXG4gICAgfSk7XG5cbiAgICAvLyBNZSAoR2V0IEN1cnJlbnQgVXNlcikgTGFtYmRhIEZ1bmN0aW9uXG4gICAgdGhpcy5tZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTWVGdW5jdGlvbicsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLU1lLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL2F1dGgtbWlkZGxld2FyZS5tZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dldCBjdXJyZW50IGF1dGhlbnRpY2F0ZWQgdXNlciBwcm9maWxlJyxcbiAgICB9KTtcblxuICAgIC8vIFVuaWZpZWQgQXV0aCBMYW1iZGEgRnVuY3Rpb24gKE5ldylcbiAgICB0aGlzLmF1dGhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhGdW5jdGlvbicsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUF1dGgtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kJywge1xuICAgICAgICBidW5kbGluZzoge1xuICAgICAgICAgIGltYWdlOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWC5idW5kbGluZ0ltYWdlLFxuICAgICAgICAgIGNvbW1hbmQ6IFtcbiAgICAgICAgICAgICdiYXNoJywgJy1jJyxcbiAgICAgICAgICAgICdjcCAtciAvYXNzZXQtaW5wdXQvKiAvYXNzZXQtb3V0cHV0LyAmJiBjZCAvYXNzZXQtb3V0cHV0ICYmIG5wbSBpbnN0YWxsIC0tcHJvZHVjdGlvbidcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICBoYW5kbGVyOiAnZGlzdC9mdW5jdGlvbnMvYXV0aC5oYW5kbGVyJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVW5pZmllZCBhdXRoZW50aWNhdGlvbiBoYW5kbGVyIGZvciBhbGwgYXV0aCByb3V0ZXMgd2l0aCBidW5kbGVkIGRlcGVuZGVuY2llcycsXG4gICAgfSk7XG5cbiAgICAvLyBFbmhhbmNlZCBGbGlnaHQgU2VhcmNoIExhbWJkYSBGdW5jdGlvblxuICAgIHRoaXMuZW5oYW5jZWRGbGlnaHRTZWFyY2hGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0VuaGFuY2VkRmxpZ2h0U2VhcmNoRnVuY3Rpb24nLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogYFRyYXZlbENvbXBhbmlvbi1FbmhhbmNlZEZsaWdodFNlYXJjaC0ke2Vudmlyb25tZW50fWAsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZGlzdCcpLFxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9lbmhhbmNlZC1mbGlnaHQtc2VhcmNoLmhhbmRsZXInLFxuICAgICAgZGVzY3JpcHRpb246ICdFbmhhbmNlZCBmbGlnaHQgc2VhcmNoIHdpdGggYWR2YW5jZWQgZmlsdGVyaW5nIGFuZCByZWNvbW1lbmRhdGlvbnMgdjEuMCcsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksIC8vIExvbmdlciB0aW1lb3V0IGZvciBmbGlnaHQgc2VhcmNoXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LCAvLyBNb3JlIG1lbW9yeSBmb3IgY29tcGxleCBzZWFyY2ggb3BlcmF0aW9uc1xuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5XG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdUcmF2ZWxDb21wYW5pb25BcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogYFRyYXZlbENvbXBhbmlvbi1BUEktJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIFRyYXZlbCBDb21wYW5pb24gYXBwbGljYXRpb24nLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcbiAgICAgICAgICAnWC1BcGktS2V5JyxcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxuICAgICAgICAgICdYLVVzZXItSWQnLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiBlbnZpcm9ubWVudCxcbiAgICAgICAgdGhyb3R0bGluZ1JhdGVMaW1pdDogMTAwMCxcbiAgICAgICAgdGhyb3R0bGluZ0J1cnN0TGltaXQ6IDIwMDAsXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgUmVzb3VyY2VzIGFuZCBNZXRob2RzXG5cbiAgICAvLyAvcGxhbi10cmlwIGVuZHBvaW50XG4gICAgY29uc3QgcGxhblRyaXBSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BsYW4tdHJpcCcpO1xuICAgIHBsYW5UcmlwUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5wbGFuVHJpcEZ1bmN0aW9uKSwge1xuICAgICAgYXBpS2V5UmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnUGxhblRyaXBWYWxpZGF0b3InLCB7XG4gICAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gL3RyaXBzIGVuZHBvaW50XG4gICAgY29uc3QgdHJpcHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3RyaXBzJyk7XG4gICAgXG4gICAgLy8gR0VUIC90cmlwcyAobGlzdCB1c2VyIHRyaXBzKVxuICAgIHRyaXBzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmxpc3RUcmlwc0Z1bmN0aW9uKSk7XG5cbiAgICAvLyAvdHJpcHMve3RyaXBJZH0gZW5kcG9pbnRcbiAgICBjb25zdCB0cmlwUmVzb3VyY2UgPSB0cmlwc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dHJpcElkfScpO1xuICAgIFxuICAgIC8vIEdFVCAvdHJpcHMve3RyaXBJZH1cbiAgICB0cmlwUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmdldFRyaXBGdW5jdGlvbikpO1xuXG4gICAgLy8gL3RyaXBzL3t0cmlwSWR9L2Jvb2tpbmdzIGVuZHBvaW50XG4gICAgY29uc3QgdHJpcEJvb2tpbmdzUmVzb3VyY2UgPSB0cmlwUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2Jvb2tpbmdzJyk7XG4gICAgdHJpcEJvb2tpbmdzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmdldFRyaXBCb29raW5nc0Z1bmN0aW9uKSk7XG5cbiAgICAvLyAvYm9va2luZ3MgZW5kcG9pbnRcbiAgICBjb25zdCBib29raW5nc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYm9va2luZ3MnKTtcbiAgICBcbiAgICAvLyBQT1NUIC9ib29raW5ncyAoY3JlYXRlIGJvb2tpbmcpXG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmNyZWF0ZUJvb2tpbmdGdW5jdGlvbiksIHtcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0Jvb2tpbmdWYWxpZGF0b3InLCB7XG4gICAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gR0VUIC9ib29raW5ncyAoZ2V0IHVzZXIgYm9va2luZ3MpXG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZ2V0VXNlckJvb2tpbmdzRnVuY3Rpb24pKTtcblxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIGVuZHBvaW50c1xuICAgIFxuICAgIC8vIC9hdXRoIHJlc291cmNlXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xuICAgIFxuICAgIC8vIFBPU1QgL2F1dGgvc2lnbnVwICh1c2luZyBuZXcgdW5pZmllZCBhdXRoIGZ1bmN0aW9uKVxuICAgIGNvbnN0IHNpZ251cFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdzaWdudXAnKTtcbiAgICBzaWdudXBSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmF1dGhGdW5jdGlvbiksIHtcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ1NpZ251cFZhbGlkYXRvcicsIHtcbiAgICAgICAgcmVzdEFwaTogdGhpcy5hcGksXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICAvLyBQT1NUIC9hdXRoL2xvZ2luICh1c2luZyBuZXcgdW5pZmllZCBhdXRoIGZ1bmN0aW9uKVxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XG4gICAgbG9naW5SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmF1dGhGdW5jdGlvbiksIHtcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0xvZ2luVmFsaWRhdG9yJywge1xuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogZmFsc2UsXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIC8vIFBPU1QgL2F1dGgvZ29vZ2xlLXVzZXIgKG5ldyBlbmRwb2ludCB1c2luZyB1bmlmaWVkIGF1dGggZnVuY3Rpb24pXG4gICAgY29uc3QgZ29vZ2xlVXNlclJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdnb29nbGUtdXNlcicpO1xuICAgIGdvb2dsZVVzZXJSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmF1dGhGdW5jdGlvbiksIHtcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0dvb2dsZVVzZXJWYWxpZGF0b3InLCB7XG4gICAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gUE9TVCAvYXV0aC9nb29nbGUgKGxlZ2FjeSAtIGtlZXBpbmcgZm9yIGNvbXBhdGliaWxpdHkpXG4gICAgY29uc3QgZ29vZ2xlQXV0aFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdnb29nbGUnKTtcbiAgICBnb29nbGVBdXRoUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5nb29nbGVBdXRoRnVuY3Rpb24pLCB7XG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdHb29nbGVBdXRoVmFsaWRhdG9yJywge1xuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogZmFsc2UsXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIC8vIEdFVCAvYXV0aC9tZSAodXNpbmcgbmV3IHVuaWZpZWQgYXV0aCBmdW5jdGlvbilcbiAgICBjb25zdCBtZVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdtZScpO1xuICAgIG1lUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmF1dGhGdW5jdGlvbikpO1xuXG4gICAgLy8gRW5oYW5jZWQgRmxpZ2h0IFNlYXJjaCBlbmRwb2ludFxuICAgIGNvbnN0IGVuaGFuY2VkRmxpZ2h0U2VhcmNoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdlbmhhbmNlZC1mbGlnaHQtc2VhcmNoJyk7XG4gICAgZW5oYW5jZWRGbGlnaHRTZWFyY2hSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmVuaGFuY2VkRmxpZ2h0U2VhcmNoRnVuY3Rpb24pLCB7XG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdFbmhhbmNlZEZsaWdodFNlYXJjaFZhbGlkYXRvcicsIHtcbiAgICAgICAgcmVzdEFwaTogdGhpcy5hcGksXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICAvLyBIZWFsdGggY2hlY2sgZW5kcG9pbnRcbiAgICBjb25zdCBoZWFsdGhSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xuICAgIGhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHN0YXR1czogJ2hlYWx0aHknLFxuICAgICAgICAgICAgdGltZXN0YW1wOiAnJGNvbnRleHQucmVxdWVzdFRpbWUnLFxuICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSxcbiAgICAgIH1dLFxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxuICAgICAgfSxcbiAgICB9KSwge1xuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXG4gICAgICAgIH0sXG4gICAgICB9XSxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dCBBUEkgR2F0ZXdheSBVUkxcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheVVybCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tQXBpR2F0ZXdheVVybGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheUlkJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBpLnJlc3RBcGlJZCxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1BcGlHYXRld2F5SWRgLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IExhbWJkYSBmdW5jdGlvbiBBUk5zXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1BsYW5UcmlwRnVuY3Rpb25Bcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5wbGFuVHJpcEZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxuICAgICAgZXhwb3J0TmFtZTogYCR7ZW52aXJvbm1lbnR9LVBsYW5UcmlwRnVuY3Rpb25Bcm5gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NyZWF0ZUJvb2tpbmdGdW5jdGlvbkFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNyZWF0ZUJvb2tpbmdGdW5jdGlvbi5mdW5jdGlvbkFybixcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1DcmVhdGVCb29raW5nRnVuY3Rpb25Bcm5gLFxuICAgIH0pO1xuXG4gICAgLy8gVGFncyBmb3IgY29zdCB0cmFja2luZ1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdUcmF2ZWxDb21wYW5pb24nKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnQ29tcG9uZW50JywgJ0FQSScpO1xuICB9XG59Il19