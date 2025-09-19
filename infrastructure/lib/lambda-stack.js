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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFXN0MsTUFBYSxXQUFZLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFTeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRS9GLHVDQUF1QztRQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNELFFBQVEsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtTQUNGLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM3QyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRTtnQkFDVCxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENB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WUFDdkMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRztZQUNuQixVQUFVLEVBQUUsR0FBRyxXQUFXLGdCQUFnQjtTQUMzQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTO1lBQ3pCLFVBQVUsRUFBRSxHQUFHLFdBQVcsZUFBZTtTQUMxQyxDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVc7WUFDeEMsVUFBVSxFQUFFLEdBQUcsV0FBVyxzQkFBc0I7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVc7WUFDN0MsVUFBVSxFQUFFLEdBQUcsV0FBVywyQkFBMkI7U0FDdEQsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNwRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNGO0FBeFFELGtDQXdRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgdXNlcnNUYWJsZU5hbWU6IHN0cmluZztcclxuICB0cmlwc1RhYmxlTmFtZTogc3RyaW5nO1xyXG4gIGJvb2tpbmdzVGFibGVOYW1lOiBzdHJpbmc7XHJcbiAgczNCdWNrZXROYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMYW1iZGFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG4gIHB1YmxpYyByZWFkb25seSBwbGFuVHJpcEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGdldFRyaXBGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBsaXN0VHJpcHNGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBjcmVhdGVCb29raW5nRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ2V0VHJpcEJvb2tpbmdzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ2V0VXNlckJvb2tpbmdzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHVzZXJzVGFibGVOYW1lLCB0cmlwc1RhYmxlTmFtZSwgYm9va2luZ3NUYWJsZU5hbWUsIHMzQnVja2V0TmFtZSB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIElBTSByb2xlIGZvciBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogYFRyYXZlbENvbXBhbmlvbi1MYW1iZGEtUm9sZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xyXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dXNlcnNUYWJsZU5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt1c2Vyc1RhYmxlTmFtZX0vaW5kZXgvKmAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7dHJpcHNUYWJsZU5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt0cmlwc1RhYmxlTmFtZX0vaW5kZXgvKmAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7Ym9va2luZ3NUYWJsZU5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHtib29raW5nc1RhYmxlTmFtZX0vaW5kZXgvKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQWRkIFMzIHBlcm1pc3Npb25zXHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOkdldE9iamVjdCcsXHJcbiAgICAgICAgJ3MzOlB1dE9iamVjdCcsXHJcbiAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXHJcbiAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBgYXJuOmF3czpzMzo6OiR7czNCdWNrZXROYW1lfWAsXHJcbiAgICAgICAgYGFybjphd3M6czM6Ojoke3MzQnVja2V0TmFtZX0vKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQWRkIEJlZHJvY2sgcGVybWlzc2lvbnMgKGZvciBmdXR1cmUgdXNlKVxyXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VBZ2VudCcsXHJcbiAgICAgICAgJ2JlZHJvY2s6R2V0QWdlbnQnLFxyXG4gICAgICAgICdiZWRyb2NrOkxpc3RBZ2VudHMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIENvbW1vbiBMYW1iZGEgZnVuY3Rpb24gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgY29tbW9uTGFtYmRhUHJvcHMgPSB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT0RFX0VOVjogZW52aXJvbm1lbnQsXHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZU5hbWUsXHJcbiAgICAgICAgVFJJUFNfVEFCTEVfTkFNRTogdHJpcHNUYWJsZU5hbWUsXHJcbiAgICAgICAgQk9PS0lOR1NfVEFCTEVfTkFNRTogYm9va2luZ3NUYWJsZU5hbWUsXHJcbiAgICAgICAgUzNfQlVDS0VUX05BTUU6IHMzQnVja2V0TmFtZSxcclxuICAgICAgICBMT0dfTEVWRUw6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAnaW5mbycgOiAnZGVidWcnLFxyXG4gICAgICB9LFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgIH07XHJcblxyXG4gICAgLy8gUGxhbiBUcmlwIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5wbGFuVHJpcEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGxhblRyaXBGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYFRyYXZlbENvbXBhbmlvbi1QbGFuVHJpcC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvcGxhbi10cmlwLnBsYW5UcmlwJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGVzIG5ldyB0cmlwIHBsYW5zIGJhc2VkIG9uIHVzZXIgcHJlZmVyZW5jZXMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IFRyaXAgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmdldFRyaXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFRyaXBGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYFRyYXZlbENvbXBhbmlvbi1HZXRUcmlwLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9wbGFuLXRyaXAuZ2V0VHJpcCcsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmV0cmlldmVzIHRyaXAgZGV0YWlscyBieSBJRCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMaXN0IFRyaXBzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5saXN0VHJpcHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0xpc3RUcmlwc0Z1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUxpc3RUcmlwcy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvcGxhbi10cmlwLmxpc3RUcmlwcycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdHMgdHJpcHMgZm9yIGEgdXNlciB3aXRoIHBhZ2luYXRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEJvb2tpbmcgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICB0aGlzLmNyZWF0ZUJvb2tpbmdGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NyZWF0ZUJvb2tpbmdGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYFRyYXZlbENvbXBhbmlvbi1DcmVhdGVCb29raW5nLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9ib29raW5nLmNyZWF0ZUJvb2tpbmcnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2Nlc3NlcyBib29raW5nIGNvbmZpcm1hdGlvbnMgZm9yIHRyaXBzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBUcmlwIEJvb2tpbmdzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5nZXRUcmlwQm9va2luZ3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFRyaXBCb29raW5nc0Z1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUdldFRyaXBCb29raW5ncy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvYm9va2luZy5nZXRUcmlwQm9va2luZ3MnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JldHJpZXZlcyBib29raW5ncyBmb3IgYSBzcGVjaWZpYyB0cmlwJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBVc2VyIEJvb2tpbmdzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgdGhpcy5nZXRVc2VyQm9va2luZ3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFVzZXJCb29raW5nc0Z1bmN0aW9uJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgVHJhdmVsQ29tcGFuaW9uLUdldFVzZXJCb29raW5ncy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvYm9va2luZy5nZXRVc2VyQm9va2luZ3MnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JldHJpZXZlcyBib29raW5nIGhpc3RvcnkgZm9yIGEgdXNlcicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXlcclxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnVHJhdmVsQ29tcGFuaW9uQXBpJywge1xyXG4gICAgICByZXN0QXBpTmFtZTogYFRyYXZlbENvbXBhbmlvbi1BUEktJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBmb3IgVHJhdmVsIENvbXBhbmlvbiBhcHBsaWNhdGlvbicsXHJcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1BcGktS2V5JyxcclxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXHJcbiAgICAgICAgICAnWC1Vc2VyLUlkJyxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XHJcbiAgICAgICAgc3RhZ2VOYW1lOiBlbnZpcm9ubWVudCxcclxuICAgICAgICB0aHJvdHRsaW5nUmF0ZUxpbWl0OiAxMDAwLFxyXG4gICAgICAgIHRocm90dGxpbmdCdXJzdExpbWl0OiAyMDAwLFxyXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcclxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXkgUmVzb3VyY2VzIGFuZCBNZXRob2RzXHJcblxyXG4gICAgLy8gL3BsYW4tdHJpcCBlbmRwb2ludFxyXG4gICAgY29uc3QgcGxhblRyaXBSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BsYW4tdHJpcCcpO1xyXG4gICAgcGxhblRyaXBSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLnBsYW5UcmlwRnVuY3Rpb24pLCB7XHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnUGxhblRyaXBWYWxpZGF0b3InLCB7XHJcbiAgICAgICAgcmVzdEFwaTogdGhpcy5hcGksXHJcbiAgICAgICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiBmYWxzZSxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyAvdHJpcHMgZW5kcG9pbnRcclxuICAgIGNvbnN0IHRyaXBzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd0cmlwcycpO1xyXG4gICAgXHJcbiAgICAvLyBHRVQgL3RyaXBzIChsaXN0IHVzZXIgdHJpcHMpXHJcbiAgICB0cmlwc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5saXN0VHJpcHNGdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIC90cmlwcy97dHJpcElkfSBlbmRwb2ludFxyXG4gICAgY29uc3QgdHJpcFJlc291cmNlID0gdHJpcHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3RyaXBJZH0nKTtcclxuICAgIFxyXG4gICAgLy8gR0VUIC90cmlwcy97dHJpcElkfVxyXG4gICAgdHJpcFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odGhpcy5nZXRUcmlwRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyAvdHJpcHMve3RyaXBJZH0vYm9va2luZ3MgZW5kcG9pbnRcclxuICAgIGNvbnN0IHRyaXBCb29raW5nc1Jlc291cmNlID0gdHJpcFJlc291cmNlLmFkZFJlc291cmNlKCdib29raW5ncycpO1xyXG4gICAgdHJpcEJvb2tpbmdzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmdldFRyaXBCb29raW5nc0Z1bmN0aW9uKSk7XHJcblxyXG4gICAgLy8gL2Jvb2tpbmdzIGVuZHBvaW50XHJcbiAgICBjb25zdCBib29raW5nc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYm9va2luZ3MnKTtcclxuICAgIFxyXG4gICAgLy8gUE9TVCAvYm9va2luZ3MgKGNyZWF0ZSBib29raW5nKVxyXG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0aGlzLmNyZWF0ZUJvb2tpbmdGdW5jdGlvbiksIHtcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnQm9va2luZ1ZhbGlkYXRvcicsIHtcclxuICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IGZhbHNlLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdFVCAvYm9va2luZ3MgKGdldCB1c2VyIGJvb2tpbmdzKVxyXG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRoaXMuZ2V0VXNlckJvb2tpbmdzRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyBIZWFsdGggY2hlY2sgZW5kcG9pbnRcclxuICAgIGNvbnN0IGhlYWx0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgc3RhdHVzOiAnaGVhbHRoeScsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogJyRjb250ZXh0LnJlcXVlc3RUaW1lJyxcclxuICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBhcGlnYXRld2F5Lk1vZGVsLkVNUFRZX01PREVMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IEFQSSBHYXRld2F5IFVSTFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1BcGlHYXRld2F5VXJsYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5yZXN0QXBpSWQsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1BcGlHYXRld2F5SWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IExhbWJkYSBmdW5jdGlvbiBBUk5zXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUGxhblRyaXBGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMucGxhblRyaXBGdW5jdGlvbi5mdW5jdGlvbkFybixcclxuICAgICAgZXhwb3J0TmFtZTogYCR7ZW52aXJvbm1lbnR9LVBsYW5UcmlwRnVuY3Rpb25Bcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NyZWF0ZUJvb2tpbmdGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuY3JlYXRlQm9va2luZ0Z1bmN0aW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tQ3JlYXRlQm9va2luZ0Z1bmN0aW9uQXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhZ3MgZm9yIGNvc3QgdHJhY2tpbmdcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdUcmF2ZWxDb21wYW5pb24nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0NvbXBvbmVudCcsICdBUEknKTtcclxuICB9XHJcbn0iXX0=