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
exports.LambdaStack = LambdaStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFZN0MsTUFBYSxXQUFZLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRXJILGtFQUFrRTtRQUNsRSxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ2pFLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtTQUNGLENBQUMsQ0FBQztRQUVILHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDM0MsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1Asa0JBQWtCO2dCQUNsQixrQkFBa0I7Z0JBQ2xCLHFCQUFxQjtnQkFDckIscUJBQXFCO2dCQUNyQixlQUFlO2dCQUNmLGdCQUFnQjthQUNqQjtZQUNELFNBQVMsRUFBRTtnQkFDVCxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxVQUFVLGNBQWMsRUFBRTtnQkFD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Q0FBQyxDQUFDO0lBQzlELENBQUM7Q0FDRjtBQXZRRCxrQ0F1UUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTGFtYmRhU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIHVzZXJzVGFibGVOYW1lOiBzdHJpbmc7XHJcbiAgdHJpcHNUYWJsZU5hbWU6IHN0cmluZztcclxuICBib29raW5nc1RhYmxlTmFtZTogc3RyaW5nO1xyXG4gIGNoYXRIaXN0b3J5VGFibGVOYW1lOiBzdHJpbmc7XHJcbiAgczNCdWNrZXROYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMYW1iZGFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHVzZXJzVGFibGVOYW1lLCB0cmlwc1RhYmxlTmFtZSwgYm9va2luZ3NUYWJsZU5hbWUsIGNoYXRIaXN0b3J5VGFibGVOYW1lLCBzM0J1Y2tldE5hbWUgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIENyZWF0ZSBJQU0gcm9sZSB3aXRoIGNvbXByZWhlbnNpdmUgcGVybWlzc2lvbnMgZm9yIEFJIGZ1bmN0aW9uc1xyXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnVHJhdmVsQ29tcGFuaW9uTGFtYmRhUm9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xyXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRHluYW1vREIgcGVybWlzc2lvbnNcclxuICAgIGNvbnN0IGR5bmFtb1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHt1c2Vyc1RhYmxlTmFtZX1gLFxyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke3RyaXBzVGFibGVOYW1lfWAsXHJcbiAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7Ym9va2luZ3NUYWJsZU5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpkeW5hbW9kYjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvJHtjaGF0SGlzdG9yeVRhYmxlTmFtZX1gLFxyXG4gICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp0YWJsZS8ke2NoYXRIaXN0b3J5VGFibGVOYW1lfS9pbmRleC8qYCxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJlZHJvY2sgcGVybWlzc2lvbnMgZm9yIEFJXHJcbiAgICBjb25zdCBiZWRyb2NrUG9saWN5ID0gbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXHJcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICAgICdiZWRyb2NrOkdldEZvdW5kYXRpb25Nb2RlbCcsXHJcbiAgICAgICAgJ2JlZHJvY2s6TGlzdEZvdW5kYXRpb25Nb2RlbHMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAnYXJuOmF3czpiZWRyb2NrOio6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS0zLSonLFxyXG4gICAgICAgICdhcm46YXdzOmJlZHJvY2s6Kjo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLSonLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2FnZU1ha2VyIHBlcm1pc3Npb25zIGZvciBjdXN0b20gbW9kZWxzXHJcbiAgICBjb25zdCBzYWdlbWFrZXJQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzYWdlbWFrZXI6SW52b2tlRW5kcG9pbnQnLFxyXG4gICAgICAgICdzYWdlbWFrZXI6RGVzY3JpYmVFbmRwb2ludCcsXHJcbiAgICAgICAgJ3NhZ2VtYWtlcjpMaXN0RW5kcG9pbnRzJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYGFybjphd3M6c2FnZW1ha2VyOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTplbmRwb2ludC90cmF2ZWwtYXNzaXN0YW50LWVuZHBvaW50YCxcclxuICAgICAgICBgYXJuOmF3czpzYWdlbWFrZXI6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmVuZHBvaW50Lyp0cmF2ZWwqYCxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFMzIHBlcm1pc3Npb25zXHJcbiAgICBjb25zdCBzM1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOkdldE9iamVjdCcsXHJcbiAgICAgICAgJ3MzOlB1dE9iamVjdCcsXHJcbiAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXHJcbiAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBgYXJuOmF3czpzMzo6OiR7czNCdWNrZXROYW1lfWAsXHJcbiAgICAgICAgYGFybjphd3M6czM6Ojoke3MzQnVja2V0TmFtZX0vKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgcG9saWNpZXMgdG8gdGhlIHJvbGVcclxuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3koZHluYW1vUG9saWN5KTtcclxuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3koYmVkcm9ja1BvbGljeSk7XHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KHNhZ2VtYWtlclBvbGljeSk7XHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KHMzUG9saWN5KTtcclxuXHJcbiAgICAvLyBDb21tb24gZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY29tbW9uRW52aXJvbm1lbnQgPSB7XHJcbiAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGVOYW1lLFxyXG4gICAgICBUUklQU19UQUJMRV9OQU1FOiB0cmlwc1RhYmxlTmFtZSxcclxuICAgICAgQk9PS0lOR1NfVEFCTEVfTkFNRTogYm9va2luZ3NUYWJsZU5hbWUsXHJcbiAgICAgIENIQVRfSElTVE9SWV9UQUJMRV9OQU1FOiBjaGF0SGlzdG9yeVRhYmxlTmFtZSxcclxuICAgICAgUzNfQlVDS0VUX05BTUU6IHMzQnVja2V0TmFtZSxcclxuICAgICAgU0FHRU1BS0VSX0VORFBPSU5UX05BTUU6IHByb2Nlc3MuZW52LlNBR0VNQUtFUl9FTkRQT0lOVF9OQU1FIHx8ICd0cmF2ZWwtYXNzaXN0YW50LWVuZHBvaW50JyxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQUkgQWdlbnQgTGFtYmRhIGZvciBCZWRyb2NrIENsYXVkZS00IGNoYXRcclxuICAgIGNvbnN0IGFpQWdlbnRMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUFnZW50TGFtYmRhJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9haS1hZ2VudC5oYW5kbGVyJyxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSBBZ2VudCBMYW1iZGEgZm9yIFNhZ2VNYWtlciBpbnRlZ3JhdGlvblxyXG4gICAgY29uc3QgYWlBZ2VudFNhZ2VNYWtlckxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJQWdlbnRTYWdlTWFrZXJMYW1iZGEnLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZGlzdCcpLFxyXG4gICAgICBoYW5kbGVyOiAnZnVuY3Rpb25zL2FpLWFnZW50LXNhZ2VtYWtlci5oYW5kbGVyJyxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksIC8vIExvbmdlciB0aW1lb3V0IGZvciBTYWdlTWFrZXJcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFJIENoYXQgQVBJIExhbWJkYSBmb3IgbWFuYWdpbmcgY2hhdCBoaXN0b3J5IGFuZCBwcmVmZXJlbmNlc1xyXG4gICAgY29uc3QgYWlDaGF0QXBpTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQWlDaGF0QXBpTGFtYmRhJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Rpc3QnKSxcclxuICAgICAgaGFuZGxlcjogJ2Z1bmN0aW9ucy9haS1jaGF0LWFwaS5oYW5kbGVyJyxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBhdXRoTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQXV0aExhbWJkYScsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvYXV0aC5oYW5kbGVyJyxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmlwIFBsYW5uaW5nIExhbWJkYVxyXG4gICAgY29uc3QgcGxhblRyaXBMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQbGFuVHJpcExhbWJkYScsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvcGxhbi10cmlwLmhhbmRsZXInLFxyXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxyXG4gICAgICBlbnZpcm9ubWVudDogY29tbW9uRW52aXJvbm1lbnQsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJvb2tpbmcgTGFtYmRhXHJcbiAgICBjb25zdCBib29raW5nTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQm9va2luZ0xhbWJkYScsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9kaXN0JyksXHJcbiAgICAgIGhhbmRsZXI6ICdmdW5jdGlvbnMvYm9va2luZy5oYW5kbGVyJyxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSB3aXRoIHByb3BlciBDT1JTIGFuZCByb3V0ZXNcclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1RyYXZlbENvbXBhbmlvbkFwaScsIHtcclxuICAgICAgcmVzdEFwaU5hbWU6IGBUcmF2ZWxDb21wYW5pb24tJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RyYXZlbCBDb21wYW5pb24gQVBJIHdpdGggQUkgYW5kIFNhZ2VNYWtlciBpbnRlZ3JhdGlvbicsXHJcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnWC1BbXotRGF0ZScsICdBdXRob3JpemF0aW9uJywgJ1gtQXBpLUtleScsICdYLUFtei1TZWN1cml0eS1Ub2tlbiddLFxyXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6IGVudmlyb25tZW50LFxyXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcclxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQUkgQWdlbnQgZW5kcG9pbnRzXHJcbiAgICBjb25zdCBhaVJlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FpLWFnZW50Jyk7XHJcbiAgICBhaVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFpQWdlbnRMYW1iZGEpKTtcclxuXHJcbiAgICAvLyBTYWdlTWFrZXIgQUkgQWdlbnQgZW5kcG9pbnRcclxuICAgIGNvbnN0IGFpU2FnZU1ha2VyUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnYWktYWdlbnQtc2FnZW1ha2VyJyk7XHJcbiAgICBhaVNhZ2VNYWtlclJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFpQWdlbnRTYWdlTWFrZXJMYW1iZGEpKTtcclxuXHJcbiAgICAvLyBBdXRoIGVuZHBvaW50c1xyXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKTtcclxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XHJcbiAgICBjb25zdCBzaWdudXBSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnc2lnbnVwJyk7XHJcbiAgICBcclxuICAgIGxvZ2luUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExhbWJkYSkpO1xyXG4gICAgc2lnbnVwUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExhbWJkYSkpO1xyXG5cclxuICAgIC8vIFRyaXAgcGxhbm5pbmcgZW5kcG9pbnRzXHJcbiAgICBjb25zdCB0cmlwc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3RyaXBzJyk7XHJcbiAgICBjb25zdCBwbGFuUmVzb3VyY2UgPSB0cmlwc1Jlc291cmNlLmFkZFJlc291cmNlKCdwbGFuJyk7XHJcbiAgICBcclxuICAgIHBsYW5SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwbGFuVHJpcExhbWJkYSkpO1xyXG4gICAgdHJpcHNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBsYW5UcmlwTGFtYmRhKSk7XHJcblxyXG4gICAgLy8gQm9va2luZyBlbmRwb2ludHNcclxuICAgIGNvbnN0IGJvb2tpbmdzUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnYm9va2luZ3MnKTtcclxuICAgIGJvb2tpbmdzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYm9va2luZ0xhbWJkYSkpO1xyXG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdMYW1iZGEpKTtcclxuXHJcbiAgICAgICAgLy8gQUkgQ2hhdCBBUEkgZW5kcG9pbnRzXHJcbiAgICBjb25zdCBhaUNoYXRSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdhaS1jaGF0Jyk7XHJcbiAgICBjb25zdCBoaXN0b3J5UmVzb3VyY2UgPSBhaUNoYXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGlzdG9yeScpO1xyXG4gICAgY29uc3Qgc2F2ZVJlc291cmNlID0gYWlDaGF0UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3NhdmUnKTtcclxuICAgIFxyXG4gICAgaGlzdG9yeVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWlDaGF0QXBpTGFtYmRhKSk7XHJcbiAgICBzYXZlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWlDaGF0QXBpTGFtYmRhKSk7XHJcblxyXG4gICAgLy8gVXNlciBwcmVmZXJlbmNlcyBlbmRwb2ludFxyXG4gICAgY29uc3QgdXNlclJlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXInKTtcclxuICAgIGNvbnN0IHByZWZlcmVuY2VzUmVzb3VyY2UgPSB1c2VyUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3ByZWZlcmVuY2VzJyk7XHJcbiAgICBwcmVmZXJlbmNlc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWlDaGF0QXBpTGFtYmRhKSk7XHJcbiAgICBwcmVmZXJlbmNlc1Jlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWlDaGF0QXBpTGFtYmRhKSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCB2YWx1ZXNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xyXG4gICAgICB2YWx1ZTogYXBpLnVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tQXBpR2F0ZXdheVVybGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlcnNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB1c2Vyc1RhYmxlTmFtZSxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7ZW52aXJvbm1lbnR9LVVzZXJzVGFibGVOYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUcmlwc1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRyaXBzVGFibGVOYW1lLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tVHJpcHNUYWJsZU5hbWVgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Jvb2tpbmdzVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogYm9va2luZ3NUYWJsZU5hbWUsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1Cb29raW5nc1RhYmxlTmFtZWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUzNCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogczNCdWNrZXROYW1lLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tUzNCdWNrZXROYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTYWdlTWFrZXJFbmRwb2ludE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBjb21tb25FbnZpcm9ubWVudC5TQUdFTUFLRVJfRU5EUE9JTlRfTkFNRSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTYWdlTWFrZXIgZW5kcG9pbnQgbmFtZSBmb3IgQUkgbW9kZWwnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tU2FnZU1ha2VyRW5kcG9pbnROYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ1Byb2plY3QnLCAnVHJhdmVsQ29tcGFuaW9uJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdBSUludGVncmF0aW9uJywgJ0JlZHJvY2stU2FnZU1ha2VyJyk7XHJcbiAgfVxyXG59Il19