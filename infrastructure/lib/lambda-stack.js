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
            code: lambda.Code.fromAsset('../backend/dist'),
            handler: 'functions/auth.handler',
            description: 'Unified authentication handler for all auth routes',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFXN0MsTUFBYSxXQUFZLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFjeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRS9GLHVDQUF1QztRQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNELFFBQVEsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtTQUNGLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM3QyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRTtnQkFDVCxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENB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QUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNwRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNGO0FBalhELGtDQWlYQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgdXNlcnNUYWJsZU5hbWU6IHN0cmluZztcclxuICB0cmlwc1RhYmxlTmFtZTogc3RyaW5nO1xyXG4gIGJvb2tpbmdzVGFibGVOYW1lOiBzdHJpbmc7XHJcbiAgczNCdWNrZXROYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMYW1iZGFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG4gIHB1YmxpYyByZWFkb25seSBwbGFuVHJpcEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGdldFRyaXBGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBsaXN0VHJpcHNGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBjcmVhdGVCb29raW5nRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ2V0VHJpcEJvb2tpbmdzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ2V0VXNlckJvb2tpbmdzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgc2lnbnVwRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgbG9naW5GdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnb29nbGVBdXRoRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgbWVGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBhdXRoRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHVzZXJzVGFibGVOYW1lLCB0cmlwc1RhYmxlTmFtZSwgYm9va2luZ3NUYWJsZU5hbWUsIHMzQnVja2V0TmFtZSB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIElBTSByb2xlIGZvciBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogYFRyYXZlbENvbXBhbmlvbi1MYW1iZGEtUm9sZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xyXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dXNlcnNUYWJsZU5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt1c2Vyc1RhYmxlTmFtZX0vaW5kZXgvKmAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dHJpcHNUYWJsZU5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt0cmlwc1RhYmxlTmFtZX0vaW5kZXgvKmAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7Ym9va2luZ3NUYWJsZU5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHtib29raW5nc1RhYmxlTmFtZX0vaW5kZXgvKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQWRkIFMzIHBlcm1pc3Npb25zXHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOkdldE9iamVjdCcsXHJcbiAgICAgICAgJ3MzOlB1dE9iamVjdCcsXHJcbiAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXHJcbiAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBgYXJuOmF3czpzMzo6OiR7czNCdWNrZXROYW1lfWAsXHJcbiAgICAgICAgYGFybjphd3M6czM6Ojoke3MzQnVja2V0TmFtZX0vKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQWRkIEJlZHJvY2sgcGVybWlzc2lvbnMgKGZvciBmdXR1cmUgdXNlKVxyXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VBZ2VudCcsXHJcbiAgICAgICAgJ2JlZHJvY2s6R2V0QWdlbnQnLFxyXG4gICAgICAgICdiZWRyb2NrOkxpc3RBZ2VudHMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIENvbW1vbiBMYW1iZGEgZnVuY3Rpb24gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgY29tbW9uTGFtYmRhUHJvcHMgPSB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT0RFX0VOVjogZW52aXJvbm1lbnQsXHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZU5hbWUsXHJcbiAgICAgICAgVFJJUFNfVEFCTEVfTkFNRTogdHJpcHNUYWJsZU5hbWUsXHJcbiAgICAgICAgQk9PS0lOR1NfVEFCTEVfTkFNRTogYm9va2luZ3NUYWJsZU5hbWUsXHJcbiAgICAgICAgUzNfQlVDS0VUX05BTUU6IHMzQnVja2V0TmFtZSxcclxuICAgICAgICBMT0dfTEVWRUw6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAnaW5mbycgOiAnZGVidWcnLFxyXG4gICAgICAgIEpXVF9TRUNSRVQ6IGVudmlyb25tZW50ID09PSAncHJvZCcgXHJcbiAgICAgICAgICA/ICdDSEFOR0VfVEhJU19UT19BX1NFQ1VSRV9KV1RfU0VDUkVUX0lOX1BST0RVQ1RJT05fTUlOSU1VTV8zMl9DSEFSQUNURVJTJyBcclxuICAgICAgICAgIDogJ2Rldi1qd3Qtc2VjcmV0LWtleS1mb3ItZGV2ZWxvcG1lbnQtdXNlLW9ubHknLFxyXG4gICAgICAgIEdPT0dMRV9DTElFTlRfSUQ6ICd5b3VyLWdvb2dsZS1vYXV0aC1jbGllbnQtaWQtZnJvbS1nb29nbGUtY29uc29sZScsIC8vIFJlcGxhY2Ugd2l0aCB5b3VyIGFjdHVhbCBHb29nbGUgQ2xpZW50IElEXHJcbiAgICAgIH0sXHJcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQbGFuIFRyaXAgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLnBsYW5UcmlwRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQbGFuVHJpcEZ1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLVBsYW5UcmlwLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9wbGFuLXRyaXAucGxhblRyaXAnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZXMgbmV3IHRyaXAgcGxhbnMgYmFzZWQgb24gdXNlciBwcmVmZXJlbmNlcycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZXQgVHJpcCBMYW1iZGEgRnVuY3Rpb25cclxuICAgIHRoaXMuZ2V0VHJpcEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VHJpcEZ1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUdldFRyaXAtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZGlzdCcpLFxyXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL3BsYW4tdHJpcC5nZXRUcmlwJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdSZXRyaWV2ZXMgdHJpcCBkZXRhaWxzIGJ5IElEJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExpc3QgVHJpcHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmxpc3RUcmlwc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTGlzdFRyaXBzRnVuY3Rpb24nLCB7XHJcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tTGlzdFRyaXBzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9wbGFuLXRyaXAubGlzdFRyaXBzJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdMaXN0cyB0cmlwcyBmb3IgYSB1c2VyIHdpdGggcGFnaW5hdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQm9va2luZyBMYW1iZGEgRnVuY3Rpb25cclxuICAgIHRoaXMuY3JlYXRlQm9va2luZ0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlQm9va2luZ0Z1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUNyZWF0ZUJvb2tpbmctJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZGlzdCcpLFxyXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL2Jvb2tpbmcuY3JlYXRlQm9va2luZycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJvY2Vzc2VzIGJvb2tpbmcgY29uZmlybWF0aW9ucyBmb3IgdHJpcHMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IFRyaXAgQm9va2luZ3MgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmdldFRyaXBCb29raW5nc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VHJpcEJvb2tpbmdzRnVuY3Rpb24nLCB7XHJcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tR2V0VHJpcEJvb2tpbmdzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9ib29raW5nLmdldFRyaXBCb29raW5ncycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmV0cmlldmVzIGJvb2tpbmdzIGZvciBhIHNwZWNpZmljIHRyaXAnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IFVzZXIgQm9va2luZ3MgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmdldFVzZXJCb29raW5nc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VXNlckJvb2tpbmdzRnVuY3Rpb24nLCB7XHJcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tR2V0VXNlckJvb2tpbmdzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9ib29raW5nLmdldFVzZXJCb29raW5ncycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmV0cmlldmVzIGJvb2tpbmcgaGlzdG9yeSBmb3IgYSB1c2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIFxyXG4gICAgLy8gU2lnbnVwIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5zaWdudXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NpZ251cEZ1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLVNpZ251cC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvc2lnbnVwLnNpZ251cCcsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNlciByZWdpc3RyYXRpb24gd2l0aCBlbWFpbCBhbmQgcGFzc3dvcmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTG9naW4gTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmxvZ2luRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMb2dpbkZ1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUxvZ2luLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9sb2dpbi5sb2dpbicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNlciBhdXRoZW50aWNhdGlvbiB3aXRoIGVtYWlsIGFuZCBwYXNzd29yZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHb29nbGUgT0F1dGggTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmdvb2dsZUF1dGhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dvb2dsZUF1dGhGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYFRyYXZlbENvbXBhbmlvbi1Hb29nbGVBdXRoLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9nb29nbGUtYXV0aC5nb29nbGVBdXRoJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdHb29nbGUgT0F1dGggYXV0aGVudGljYXRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTWUgKEdldCBDdXJyZW50IFVzZXIpIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5tZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTWVGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYFRyYXZlbENvbXBhbmlvbi1NZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvYXV0aC1taWRkbGV3YXJlLm1lJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdHZXQgY3VycmVudCBhdXRoZW50aWNhdGVkIHVzZXIgcHJvZmlsZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVbmlmaWVkIEF1dGggTGFtYmRhIEZ1bmN0aW9uIChOZXcpXHJcbiAgICB0aGlzLmF1dGhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYFRyYXZlbENvbXBhbmlvbi1BdXRoLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9hdXRoLmhhbmRsZXInLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1VuaWZpZWQgYXV0aGVudGljYXRpb24gaGFuZGxlciBmb3IgYWxsIGF1dGggcm91dGVzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheVxyXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdUcmF2ZWxDb21wYW5pb25BcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUFQSS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBUcmF2ZWwgQ29tcGFuaW9uIGFwcGxpY2F0aW9uJyxcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICdYLUFtei1EYXRlJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcclxuICAgICAgICAgICdYLUFwaS1LZXknLFxyXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcclxuICAgICAgICAgICdYLVVzZXItSWQnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6IGVudmlyb25tZW50LFxyXG4gICAgICAgIHRocm90dGxpbmdSYXRlTGltaXQ6IDEwMDAsXHJcbiAgICAgICAgdGhyb3R0bGluZ0J1cnN0TGltaXQ6IDIwMDAsXHJcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxyXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSBSZXNvdXJjZXMgYW5kIE1ldGhvZHNcclxuXHJcbiAgICAvLyAvcGxhbi10cmlwIGVuZHBvaW50XHJcbiAgICBjb25zdCBwbGFuVHJpcFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGxhbi10cmlwJyk7XHJcbiAgICBwbGFuVHJpcFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMucGxhblRyaXBGdW5jdGlvbiksIHtcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdQbGFuVHJpcFZhbGlkYXRvcicsIHtcclxuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC90cmlwcyBlbmRwb2ludFxyXG4gICAgY29uc3QgdHJpcHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3RyaXBzJyk7XHJcbiAgICBcclxuICAgIC8vIEdFVCAvdHJpcHMgKGxpc3QgdXNlciB0cmlwcylcclxuICAgIHRyaXBzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmxpc3RUcmlwc0Z1bmN0aW9uKSk7XHJcblxyXG4gICAgLy8gL3RyaXBzL3t0cmlwSWR9IGVuZHBvaW50XHJcbiAgICBjb25zdCB0cmlwUmVzb3VyY2UgPSB0cmlwc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dHJpcElkfScpO1xyXG4gICAgXHJcbiAgICAvLyBHRVQgL3RyaXBzL3t0cmlwSWR9XHJcbiAgICB0cmlwUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmdldFRyaXBGdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIC90cmlwcy97dHJpcElkfS9ib29raW5ncyBlbmRwb2ludFxyXG4gICAgY29uc3QgdHJpcEJvb2tpbmdzUmVzb3VyY2UgPSB0cmlwUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2Jvb2tpbmdzJyk7XHJcbiAgICB0cmlwQm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZ2V0VHJpcEJvb2tpbmdzRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyAvYm9va2luZ3MgZW5kcG9pbnRcclxuICAgIGNvbnN0IGJvb2tpbmdzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdib29raW5ncycpO1xyXG4gICAgXHJcbiAgICAvLyBQT1NUIC9ib29raW5ncyAoY3JlYXRlIGJvb2tpbmcpXHJcbiAgICBib29raW5nc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuY3JlYXRlQm9va2luZ0Z1bmN0aW9uKSwge1xyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdCb29raW5nVmFsaWRhdG9yJywge1xyXG4gICAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXHJcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogZmFsc2UsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR0VUIC9ib29raW5ncyAoZ2V0IHVzZXIgYm9va2luZ3MpXHJcbiAgICBib29raW5nc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5nZXRVc2VyQm9va2luZ3NGdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIGVuZHBvaW50c1xyXG4gICAgXHJcbiAgICAvLyAvYXV0aCByZXNvdXJjZVxyXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xyXG4gICAgXHJcbiAgICAvLyBQT1NUIC9hdXRoL3NpZ251cCAodXNpbmcgbmV3IHVuaWZpZWQgYXV0aCBmdW5jdGlvbilcclxuICAgIGNvbnN0IHNpZ251cFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdzaWdudXAnKTtcclxuICAgIHNpZ251cFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuYXV0aEZ1bmN0aW9uKSwge1xyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdTaWdudXBWYWxpZGF0b3InLCB7XHJcbiAgICAgICAgcmVzdEFwaTogdGhpcy5hcGksXHJcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiBmYWxzZSxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQT1NUIC9hdXRoL2xvZ2luICh1c2luZyBuZXcgdW5pZmllZCBhdXRoIGZ1bmN0aW9uKVxyXG4gICAgY29uc3QgbG9naW5SZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9naW4nKTtcclxuICAgIGxvZ2luUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5hdXRoRnVuY3Rpb24pLCB7XHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0xvZ2luVmFsaWRhdG9yJywge1xyXG4gICAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXHJcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogZmFsc2UsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUE9TVCAvYXV0aC9nb29nbGUtdXNlciAobmV3IGVuZHBvaW50IHVzaW5nIHVuaWZpZWQgYXV0aCBmdW5jdGlvbilcclxuICAgIGNvbnN0IGdvb2dsZVVzZXJSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZ29vZ2xlLXVzZXInKTtcclxuICAgIGdvb2dsZVVzZXJSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmF1dGhGdW5jdGlvbiksIHtcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnR29vZ2xlVXNlclZhbGlkYXRvcicsIHtcclxuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBPU1QgL2F1dGgvZ29vZ2xlIChsZWdhY3kgLSBrZWVwaW5nIGZvciBjb21wYXRpYmlsaXR5KVxyXG4gICAgY29uc3QgZ29vZ2xlQXV0aFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdnb29nbGUnKTtcclxuICAgIGdvb2dsZUF1dGhSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmdvb2dsZUF1dGhGdW5jdGlvbiksIHtcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnR29vZ2xlQXV0aFZhbGlkYXRvcicsIHtcclxuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdFVCAvYXV0aC9tZSAodXNpbmcgbmV3IHVuaWZpZWQgYXV0aCBmdW5jdGlvbilcclxuICAgIGNvbnN0IG1lUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ21lJyk7XHJcbiAgICBtZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5hdXRoRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyBIZWFsdGggY2hlY2sgZW5kcG9pbnRcclxuICAgIGNvbnN0IGhlYWx0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgc3RhdHVzOiAnaGVhbHRoeScsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogJyRjb250ZXh0LnJlcXVlc3RUaW1lJyxcclxuICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBhcGlnYXRld2F5Lk1vZGVsLkVNUFRZX01PREVMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IEFQSSBHYXRld2F5IFVSTFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1BcGlHYXRld2F5VXJsYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5yZXN0QXBpSWQsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1BcGlHYXRld2F5SWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IExhbWJkYSBmdW5jdGlvbiBBUk5zXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUGxhblRyaXBGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMucGxhblRyaXBGdW5jdGlvbi5mdW5jdGlvbkFybixcclxuICAgICAgZXhwb3J0TmFtZTogYCR7ZW52aXJvbm1lbnR9LVBsYW5UcmlwRnVuY3Rpb25Bcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NyZWF0ZUJvb2tpbmdGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuY3JlYXRlQm9va2luZ0Z1bmN0aW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tQ3JlYXRlQm9va2luZ0Z1bmN0aW9uQXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhZ3MgZm9yIGNvc3QgdHJhY2tpbmdcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdUcmF2ZWxDb21wYW5pb24nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0NvbXBvbmVudCcsICdBUEknKTtcclxuICB9XHJcbn0iXX0=