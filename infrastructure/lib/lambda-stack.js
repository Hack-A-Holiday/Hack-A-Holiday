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
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/plan-trip.handler',
            description: 'Creates new trip plans based on user preferences',
            logGroup: new logs.LogGroup(this, 'PlanTripLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Get Trip Lambda Function
        this.getTripFunction = new lambda.Function(this, 'GetTripFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GetTrip-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/plan-trip.handler',
            description: 'Retrieves trip details by ID',
            logGroup: new logs.LogGroup(this, 'GetTripLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // List Trips Lambda Function
        this.listTripsFunction = new lambda.Function(this, 'ListTripsFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-ListTrips-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/plan-trip.handler',
            description: 'Lists trips for a user with pagination',
            logGroup: new logs.LogGroup(this, 'ListTripsLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Create Booking Lambda Function
        this.createBookingFunction = new lambda.Function(this, 'CreateBookingFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-CreateBooking-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/booking.handler',
            description: 'Processes booking confirmations for trips',
            logGroup: new logs.LogGroup(this, 'CreateBookingLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Get Trip Bookings Lambda Function
        this.getTripBookingsFunction = new lambda.Function(this, 'GetTripBookingsFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GetTripBookings-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/booking.handler',
            description: 'Retrieves bookings for a specific trip',
            logGroup: new logs.LogGroup(this, 'GetTripBookingsLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Get User Bookings Lambda Function
        this.getUserBookingsFunction = new lambda.Function(this, 'GetUserBookingsFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GetUserBookings-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/booking.handler',
            description: 'Retrieves booking history for a user',
            logGroup: new logs.LogGroup(this, 'GetUserBookingsLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Authentication Lambda Functions
        // Signup Lambda Function
        this.signupFunction = new lambda.Function(this, 'SignupFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-Signup-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/signup.signup',
            description: 'User registration with email and password',
            logGroup: new logs.LogGroup(this, 'SignupLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Login Lambda Function
        this.loginFunction = new lambda.Function(this, 'LoginFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-Login-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/login.login',
            description: 'User authentication with email and password',
            logGroup: new logs.LogGroup(this, 'LoginLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Google OAuth Lambda Function
        this.googleAuthFunction = new lambda.Function(this, 'GoogleAuthFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-GoogleAuth-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/google-auth.googleAuth',
            description: 'Google OAuth authentication',
            logGroup: new logs.LogGroup(this, 'GoogleAuthLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Me (Get Current User) Lambda Function
        this.meFunction = new lambda.Function(this, 'MeFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-Me-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
            handler: 'dist/functions/auth-middleware.me',
            description: 'Get current authenticated user profile',
            logGroup: new logs.LogGroup(this, 'MeLogGroup', { retention: logs.RetentionDays.ONE_WEEK }),
        });
        // Unified Auth Lambda Function (New)
        this.authFunction = new lambda.Function(this, 'AuthFunction', {
            ...commonLambdaProps,
            functionName: `TravelCompanion-Auth-${environment}`,
            code: lambda.Code.fromAsset('../backend/extracted-lambda/lambda-package'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFXN0MsTUFBYSxXQUFZLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFjeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRS9GLHVDQUF1QztRQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNELFFBQVEsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtTQUNGLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM3QyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRTtnQkFDVCxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENB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QUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVztZQUM3QyxVQUFVLEVBQUUsR0FBRyxXQUFXLDJCQUEyQjtTQUN0RCxDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBQ0Y7QUF2WEQsa0NBdVhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIExhbWJkYVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcclxuICB1c2Vyc1RhYmxlTmFtZTogc3RyaW5nO1xyXG4gIHRyaXBzVGFibGVOYW1lOiBzdHJpbmc7XHJcbiAgYm9va2luZ3NUYWJsZU5hbWU6IHN0cmluZztcclxuICBzM0J1Y2tldE5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIExhbWJkYVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XHJcbiAgcHVibGljIHJlYWRvbmx5IHBsYW5UcmlwRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ2V0VHJpcEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGxpc3RUcmlwc0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGNyZWF0ZUJvb2tpbmdGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnZXRUcmlwQm9va2luZ3NGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnZXRVc2VyQm9va2luZ3NGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBzaWdudXBGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBsb2dpbkZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGdvb2dsZUF1dGhGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBtZUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGF1dGhGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgdXNlcnNUYWJsZU5hbWUsIHRyaXBzVGFibGVOYW1lLCBib29raW5nc1RhYmxlTmFtZSwgczNCdWNrZXROYW1lIH0gPSBwcm9wcztcclxuXHJcbiAgICAvLyBDcmVhdGUgSUFNIHJvbGUgZm9yIExhbWJkYSBmdW5jdGlvbnNcclxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGUnLCB7XHJcbiAgICAgIHJvbGVOYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUxhbWJkYS1Sb2xlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xyXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIER5bmFtb0RCIHBlcm1pc3Npb25zXHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt1c2Vyc1RhYmxlTmFtZX1gLFxyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke3VzZXJzVGFibGVOYW1lfS9pbmRleC8qYCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt0cmlwc1RhYmxlTmFtZX1gLFxyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke3RyaXBzVGFibGVOYW1lfS9pbmRleC8qYCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHtib29raW5nc1RhYmxlTmFtZX1gLFxyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke2Jvb2tpbmdzVGFibGVOYW1lfS9pbmRleC8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBBZGQgUzMgcGVybWlzc2lvbnNcclxuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6R2V0T2JqZWN0JyxcclxuICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcclxuICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIGBhcm46YXdzOnMzOjo6JHtzM0J1Y2tldE5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpzMzo6OiR7czNCdWNrZXROYW1lfS8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBBZGQgQmVkcm9jayBwZXJtaXNzaW9ucyAoZm9yIGZ1dHVyZSB1c2UpXHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxyXG4gICAgICAgICdiZWRyb2NrOkludm9rZUFnZW50JyxcclxuICAgICAgICAnYmVkcm9jazpHZXRBZ2VudCcsXHJcbiAgICAgICAgJ2JlZHJvY2s6TGlzdEFnZW50cycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ29tbW9uIExhbWJkYSBmdW5jdGlvbiBjb25maWd1cmF0aW9uIChubyBEb2NrZXIsIHVzZXMgZGlzdClcclxuICAgIGNvbnN0IGNvbW1vbkxhbWJkYVByb3BzID0ge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9ERV9FTlY6IGVudmlyb25tZW50LFxyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGVOYW1lLFxyXG4gICAgICAgIFRSSVBTX1RBQkxFX05BTUU6IHRyaXBzVGFibGVOYW1lLFxyXG4gICAgICAgIEJPT0tJTkdTX1RBQkxFX05BTUU6IGJvb2tpbmdzVGFibGVOYW1lLFxyXG4gICAgICAgIFMzX0JVQ0tFVF9OQU1FOiBzM0J1Y2tldE5hbWUsXHJcbiAgICAgICAgTE9HX0xFVkVMOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gJ2luZm8nIDogJ2RlYnVnJyxcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gUGxhbiBUcmlwIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5wbGFuVHJpcEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGxhblRyaXBGdW5jdGlvbicsIHtcclxuICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tUGxhblRyaXAtJHtlbnZpcm9ubWVudH1gLFxyXG4gIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9leHRyYWN0ZWQtbGFtYmRhL2xhbWJkYS1wYWNrYWdlJyksXHJcbiAgaGFuZGxlcjogJ2Rpc3QvZnVuY3Rpb25zL3BsYW4tdHJpcC5oYW5kbGVyJyxcclxuICBkZXNjcmlwdGlvbjogJ0NyZWF0ZXMgbmV3IHRyaXAgcGxhbnMgYmFzZWQgb24gdXNlciBwcmVmZXJlbmNlcycsXHJcbiAgbG9nR3JvdXA6IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdQbGFuVHJpcExvZ0dyb3VwJywgeyByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBUcmlwIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5nZXRUcmlwRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRUcmlwRnVuY3Rpb24nLCB7XHJcbiAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUdldFRyaXAtJHtlbnZpcm9ubWVudH1gLFxyXG4gIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9leHRyYWN0ZWQtbGFtYmRhL2xhbWJkYS1wYWNrYWdlJyksXHJcbiAgaGFuZGxlcjogJ2Rpc3QvZnVuY3Rpb25zL3BsYW4tdHJpcC5oYW5kbGVyJyxcclxuICBkZXNjcmlwdGlvbjogJ1JldHJpZXZlcyB0cmlwIGRldGFpbHMgYnkgSUQnLFxyXG4gIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnR2V0VHJpcExvZ0dyb3VwJywgeyByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExpc3QgVHJpcHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmxpc3RUcmlwc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTGlzdFRyaXBzRnVuY3Rpb24nLCB7XHJcbiAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUxpc3RUcmlwcy0ke2Vudmlyb25tZW50fWAsXHJcbiAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2V4dHJhY3RlZC1sYW1iZGEvbGFtYmRhLXBhY2thZ2UnKSxcclxuICBoYW5kbGVyOiAnZGlzdC9mdW5jdGlvbnMvcGxhbi10cmlwLmhhbmRsZXInLFxyXG4gIGRlc2NyaXB0aW9uOiAnTGlzdHMgdHJpcHMgZm9yIGEgdXNlciB3aXRoIHBhZ2luYXRpb24nLFxyXG4gIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTGlzdFRyaXBzTG9nR3JvdXAnLCB7IHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEJvb2tpbmcgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmNyZWF0ZUJvb2tpbmdGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NyZWF0ZUJvb2tpbmdGdW5jdGlvbicsIHtcclxuICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tQ3JlYXRlQm9va2luZy0ke2Vudmlyb25tZW50fWAsXHJcbiAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2V4dHJhY3RlZC1sYW1iZGEvbGFtYmRhLXBhY2thZ2UnKSxcclxuICBoYW5kbGVyOiAnZGlzdC9mdW5jdGlvbnMvYm9va2luZy5oYW5kbGVyJyxcclxuICBkZXNjcmlwdGlvbjogJ1Byb2Nlc3NlcyBib29raW5nIGNvbmZpcm1hdGlvbnMgZm9yIHRyaXBzJyxcclxuICBsb2dHcm91cDogbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0NyZWF0ZUJvb2tpbmdMb2dHcm91cCcsIHsgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUsgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZXQgVHJpcCBCb29raW5ncyBMYW1iZGEgRnVuY3Rpb25cclxuICAgIHRoaXMuZ2V0VHJpcEJvb2tpbmdzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRUcmlwQm9va2luZ3NGdW5jdGlvbicsIHtcclxuICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tR2V0VHJpcEJvb2tpbmdzLSR7ZW52aXJvbm1lbnR9YCxcclxuICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZXh0cmFjdGVkLWxhbWJkYS9sYW1iZGEtcGFja2FnZScpLFxyXG4gIGhhbmRsZXI6ICdkaXN0L2Z1bmN0aW9ucy9ib29raW5nLmhhbmRsZXInLFxyXG4gIGRlc2NyaXB0aW9uOiAnUmV0cmlldmVzIGJvb2tpbmdzIGZvciBhIHNwZWNpZmljIHRyaXAnLFxyXG4gIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnR2V0VHJpcEJvb2tpbmdzTG9nR3JvdXAnLCB7IHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IFVzZXIgQm9va2luZ3MgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmdldFVzZXJCb29raW5nc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VXNlckJvb2tpbmdzRnVuY3Rpb24nLCB7XHJcbiAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUdldFVzZXJCb29raW5ncy0ke2Vudmlyb25tZW50fWAsXHJcbiAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2V4dHJhY3RlZC1sYW1iZGEvbGFtYmRhLXBhY2thZ2UnKSxcclxuICBoYW5kbGVyOiAnZGlzdC9mdW5jdGlvbnMvYm9va2luZy5oYW5kbGVyJyxcclxuICBkZXNjcmlwdGlvbjogJ1JldHJpZXZlcyBib29raW5nIGhpc3RvcnkgZm9yIGEgdXNlcicsXHJcbiAgbG9nR3JvdXA6IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdHZXRVc2VyQm9va2luZ3NMb2dHcm91cCcsIHsgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUsgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBcclxuICAgIC8vIFNpZ251cCBMYW1iZGEgRnVuY3Rpb25cclxuICAgIHRoaXMuc2lnbnVwRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTaWdudXBGdW5jdGlvbicsIHtcclxuICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tU2lnbnVwLSR7ZW52aXJvbm1lbnR9YCxcclxuICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZXh0cmFjdGVkLWxhbWJkYS9sYW1iZGEtcGFja2FnZScpLFxyXG4gIGhhbmRsZXI6ICdkaXN0L2Z1bmN0aW9ucy9zaWdudXAuc2lnbnVwJyxcclxuICBkZXNjcmlwdGlvbjogJ1VzZXIgcmVnaXN0cmF0aW9uIHdpdGggZW1haWwgYW5kIHBhc3N3b3JkJyxcclxuICBsb2dHcm91cDogbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1NpZ251cExvZ0dyb3VwJywgeyByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExvZ2luIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5sb2dpbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTG9naW5GdW5jdGlvbicsIHtcclxuICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tTG9naW4tJHtlbnZpcm9ubWVudH1gLFxyXG4gIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9leHRyYWN0ZWQtbGFtYmRhL2xhbWJkYS1wYWNrYWdlJyksXHJcbiAgaGFuZGxlcjogJ2Rpc3QvZnVuY3Rpb25zL2xvZ2luLmxvZ2luJyxcclxuICBkZXNjcmlwdGlvbjogJ1VzZXIgYXV0aGVudGljYXRpb24gd2l0aCBlbWFpbCBhbmQgcGFzc3dvcmQnLFxyXG4gIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTG9naW5Mb2dHcm91cCcsIHsgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUsgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHb29nbGUgT0F1dGggTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmdvb2dsZUF1dGhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dvb2dsZUF1dGhGdW5jdGlvbicsIHtcclxuICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tR29vZ2xlQXV0aC0ke2Vudmlyb25tZW50fWAsXHJcbiAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2V4dHJhY3RlZC1sYW1iZGEvbGFtYmRhLXBhY2thZ2UnKSxcclxuICBoYW5kbGVyOiAnZGlzdC9mdW5jdGlvbnMvZ29vZ2xlLWF1dGguZ29vZ2xlQXV0aCcsXHJcbiAgZGVzY3JpcHRpb246ICdHb29nbGUgT0F1dGggYXV0aGVudGljYXRpb24nLFxyXG4gIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnR29vZ2xlQXV0aExvZ0dyb3VwJywgeyByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1lIChHZXQgQ3VycmVudCBVc2VyKSBMYW1iZGEgRnVuY3Rpb25cclxuICAgIHRoaXMubWVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ01lRnVuY3Rpb24nLCB7XHJcbiAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLU1lLSR7ZW52aXJvbm1lbnR9YCxcclxuICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZXh0cmFjdGVkLWxhbWJkYS9sYW1iZGEtcGFja2FnZScpLFxyXG4gIGhhbmRsZXI6ICdkaXN0L2Z1bmN0aW9ucy9hdXRoLW1pZGRsZXdhcmUubWUnLFxyXG4gIGRlc2NyaXB0aW9uOiAnR2V0IGN1cnJlbnQgYXV0aGVudGljYXRlZCB1c2VyIHByb2ZpbGUnLFxyXG4gIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTWVMb2dHcm91cCcsIHsgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUsgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVbmlmaWVkIEF1dGggTGFtYmRhIEZ1bmN0aW9uIChOZXcpXHJcbiAgICB0aGlzLmF1dGhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhGdW5jdGlvbicsIHtcclxuICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICBmdW5jdGlvbk5hbWU6IGBUcmF2ZWxDb21wYW5pb24tQXV0aC0ke2Vudmlyb25tZW50fWAsXHJcbiAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2V4dHJhY3RlZC1sYW1iZGEvbGFtYmRhLXBhY2thZ2UnKSxcclxuICBoYW5kbGVyOiAnZGlzdC9mdW5jdGlvbnMvYXV0aC5oYW5kbGVyJyxcclxuICBkZXNjcmlwdGlvbjogJ1VuaWZpZWQgYXV0aGVudGljYXRpb24gaGFuZGxlciBmb3IgYWxsIGF1dGggcm91dGVzIHdpdGggYnVuZGxlZCBkZXBlbmRlbmNpZXMnLFxyXG4gIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQXV0aExvZ0dyb3VwJywgeyByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheVxyXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdUcmF2ZWxDb21wYW5pb25BcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUFQSS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBUcmF2ZWwgQ29tcGFuaW9uIGFwcGxpY2F0aW9uJyxcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCddLCAvLyBBZGRlZCBsb2NhbGhvc3QgZm9yIGRldmVsb3BtZW50XHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICdYLUFtei1EYXRlJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcclxuICAgICAgICAgICdYLUFwaS1LZXknLFxyXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcclxuICAgICAgICAgICdYLVVzZXItSWQnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6IGVudmlyb25tZW50LFxyXG4gICAgICAgIHRocm90dGxpbmdSYXRlTGltaXQ6IDEwMDAsXHJcbiAgICAgICAgdGhyb3R0bGluZ0J1cnN0TGltaXQ6IDIwMDAsXHJcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxyXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSBSZXNvdXJjZXMgYW5kIE1ldGhvZHNcclxuXHJcbiAgICAvLyAvcGxhbi10cmlwIGVuZHBvaW50XHJcbiAgICBjb25zdCBwbGFuVHJpcFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGxhbi10cmlwJyk7XHJcbiAgICBwbGFuVHJpcFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMucGxhblRyaXBGdW5jdGlvbiksIHtcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdQbGFuVHJpcFZhbGlkYXRvcicsIHtcclxuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC90cmlwcyBlbmRwb2ludFxyXG4gICAgY29uc3QgdHJpcHNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3RyaXBzJyk7XHJcbiAgICBcclxuICAgIC8vIEdFVCAvdHJpcHMgKGxpc3QgdXNlciB0cmlwcylcclxuICAgIHRyaXBzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmxpc3RUcmlwc0Z1bmN0aW9uKSk7XHJcblxyXG4gICAgLy8gL3RyaXBzL3t0cmlwSWR9IGVuZHBvaW50XHJcbiAgICBjb25zdCB0cmlwUmVzb3VyY2UgPSB0cmlwc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dHJpcElkfScpO1xyXG4gICAgXHJcbiAgICAvLyBHRVQgL3RyaXBzL3t0cmlwSWR9XHJcbiAgICB0cmlwUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmdldFRyaXBGdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIC90cmlwcy97dHJpcElkfS9ib29raW5ncyBlbmRwb2ludFxyXG4gICAgY29uc3QgdHJpcEJvb2tpbmdzUmVzb3VyY2UgPSB0cmlwUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2Jvb2tpbmdzJyk7XHJcbiAgICB0cmlwQm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZ2V0VHJpcEJvb2tpbmdzRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyAvYm9va2luZ3MgZW5kcG9pbnRcclxuICAgIGNvbnN0IGJvb2tpbmdzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdib29raW5ncycpO1xyXG4gICAgXHJcbiAgICAvLyBQT1NUIC9ib29raW5ncyAoY3JlYXRlIGJvb2tpbmcpXHJcbiAgICBib29raW5nc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuY3JlYXRlQm9va2luZ0Z1bmN0aW9uKSwge1xyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdCb29raW5nVmFsaWRhdG9yJywge1xyXG4gICAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXHJcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogZmFsc2UsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR0VUIC9ib29raW5ncyAoZ2V0IHVzZXIgYm9va2luZ3MpXHJcbiAgICBib29raW5nc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5nZXRVc2VyQm9va2luZ3NGdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIGVuZHBvaW50c1xyXG4gICAgXHJcbiAgICAvLyAvYXV0aCByZXNvdXJjZVxyXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xyXG4gICAgXHJcbiAgICAvLyBQT1NUIC9hdXRoL3NpZ251cCAodXNpbmcgbmV3IHVuaWZpZWQgYXV0aCBmdW5jdGlvbilcclxuICAgIGNvbnN0IHNpZ251cFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdzaWdudXAnKTtcclxuICAgIHNpZ251cFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuYXV0aEZ1bmN0aW9uKSwge1xyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdTaWdudXBWYWxpZGF0b3InLCB7XHJcbiAgICAgICAgcmVzdEFwaTogdGhpcy5hcGksXHJcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiBmYWxzZSxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQT1NUIC9hdXRoL2xvZ2luICh1c2luZyBuZXcgdW5pZmllZCBhdXRoIGZ1bmN0aW9uKVxyXG4gICAgY29uc3QgbG9naW5SZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9naW4nKTtcclxuICAgIGxvZ2luUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5hdXRoRnVuY3Rpb24pLCB7XHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0xvZ2luVmFsaWRhdG9yJywge1xyXG4gICAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXHJcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogZmFsc2UsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUE9TVCAvYXV0aC9nb29nbGUtdXNlciAobmV3IGVuZHBvaW50IHVzaW5nIHVuaWZpZWQgYXV0aCBmdW5jdGlvbilcclxuICAgIGNvbnN0IGdvb2dsZVVzZXJSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZ29vZ2xlLXVzZXInKTtcclxuICAgIGdvb2dsZVVzZXJSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmF1dGhGdW5jdGlvbiksIHtcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnR29vZ2xlVXNlclZhbGlkYXRvcicsIHtcclxuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBPU1QgL2F1dGgvZ29vZ2xlIChsZWdhY3kgLSBrZWVwaW5nIGZvciBjb21wYXRpYmlsaXR5KVxyXG4gICAgY29uc3QgZ29vZ2xlQXV0aFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdnb29nbGUnKTtcclxuICAgIGdvb2dsZUF1dGhSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmdvb2dsZUF1dGhGdW5jdGlvbiksIHtcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnR29vZ2xlQXV0aFZhbGlkYXRvcicsIHtcclxuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdFVCAvYXV0aC9tZSAodXNpbmcgbmV3IHVuaWZpZWQgYXV0aCBmdW5jdGlvbilcclxuICAgIGNvbnN0IG1lUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ21lJyk7XHJcbiAgICBtZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5hdXRoRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyBIZWFsdGggY2hlY2sgZW5kcG9pbnRcclxuICAgIGNvbnN0IGhlYWx0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgc3RhdHVzOiAnaGVhbHRoeScsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogJyRjb250ZXh0LnJlcXVlc3RUaW1lJyxcclxuICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBhcGlnYXRld2F5Lk1vZGVsLkVNUFRZX01PREVMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IEFQSSBHYXRld2F5IFVSTFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1BcGlHYXRld2F5VXJsYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5yZXN0QXBpSWQsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1BcGlHYXRld2F5SWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IExhbWJkYSBmdW5jdGlvbiBBUk5zXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUGxhblRyaXBGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMucGxhblRyaXBGdW5jdGlvbi5mdW5jdGlvbkFybixcclxuICAgICAgZXhwb3J0TmFtZTogYCR7ZW52aXJvbm1lbnR9LVBsYW5UcmlwRnVuY3Rpb25Bcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NyZWF0ZUJvb2tpbmdGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuY3JlYXRlQm9va2luZ0Z1bmN0aW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tQ3JlYXRlQm9va2luZ0Z1bmN0aW9uQXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhZ3MgZm9yIGNvc3QgdHJhY2tpbmdcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdUcmF2ZWxDb21wYW5pb24nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0NvbXBvbmVudCcsICdBUEknKTtcclxuICB9XHJcbn0iXX0=