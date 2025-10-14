/**
 * AWS CDK Stack for Bedrock Agent Core Infrastructure
 * 
 * Deploys:
 * - Lambda function for Bedrock Agent
 * - API Gateway endpoints
 * - DynamoDB table for user preferences
 * - IAM roles and permissions
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class BedrockAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for user preferences
    const userPreferencesTable = new dynamodb.Table(this, 'TravelUserPreferences', {
      tableName: 'travel-users',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep data on stack deletion
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });

    // DynamoDB table for session storage
    const sessionTable = new dynamodb.Table(this, 'TravelAgentSessions', {
      tableName: 'travel-agent-sessions',
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING
      },
      timeToLiveAttribute: 'expiresAt',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });

    // IAM role for Lambda with Bedrock and DynamoDB permissions
    const lambdaRole = new iam.Role(this, 'BedrockAgentLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Bedrock Agent Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Add Bedrock permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        'bedrock-runtime:InvokeModel',
        'bedrock-runtime:InvokeModelWithResponseStream'
      ],
      resources: [
        `arn:aws:bedrock:*::foundation-model/us.amazon.nova-pro*`,
        `arn:aws:bedrock:*::foundation-model/us.amazon.nova-lite*`,
        `arn:aws:bedrock:*::foundation-model/amazon.nova-pro*`,
        `arn:aws:bedrock:*::foundation-model/amazon.nova-lite*`
      ]
    }));

    // Add DynamoDB permissions
    userPreferencesTable.grantReadWriteData(lambdaRole);
    sessionTable.grantReadWriteData(lambdaRole);

    // Lambda function for Bedrock Agent
    const bedrockAgentFunction = new lambda.Function(this, 'BedrockAgentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'bedrock-agent-handler.handler',
      code: lambda.Code.fromAsset('../backend_test', {
        exclude: ['node_modules', 'test-*.js', '*.md']
      }),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(300), // 5 minutes for complex agent operations
      memorySize: 1024,
      environment: {
        DYNAMODB_USER_TABLE: userPreferencesTable.tableName,
        DYNAMODB_SESSION_TABLE: sessionTable.tableName,
        AWS_REGION: this.region,
        NODE_ENV: 'production',
        REASONING_MODEL: 'us.amazon.nova-pro-v1:0',
        FAST_MODEL: 'us.amazon.nova-lite-v1:0'
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    // API Gateway REST API
    const api = new apigateway.RestApi(this, 'BedrockAgentAPI', {
      restApiName: 'Travel Agent Bedrock API',
      description: 'API for AWS Bedrock Agent Core travel agent',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ]
      }
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(bedrockAgentFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    // API Resources and Methods
    const bedrockAgentResource = api.root.addResource('bedrock-agent');

    // Health check
    const healthResource = bedrockAgentResource.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration);

    // Main agent endpoints
    const processResource = bedrockAgentResource.addResource('process');
    processResource.addMethod('POST', lambdaIntegration);

    const chatResource = bedrockAgentResource.addResource('chat');
    chatResource.addMethod('POST', lambdaIntegration);

    const planTripResource = bedrockAgentResource.addResource('plan-trip');
    planTripResource.addMethod('POST', lambdaIntegration);

    const recommendResource = bedrockAgentResource.addResource('recommend');
    recommendResource.addMethod('POST', lambdaIntegration);

    // Tools endpoints
    const toolsResource = bedrockAgentResource.addResource('tools');
    toolsResource.addMethod('GET', lambdaIntegration);

    const toolResource = toolsResource.addResource('{toolName}');
    toolResource.addMethod('POST', lambdaIntegration);

    // Session endpoints
    const sessionResource = bedrockAgentResource.addResource('session');
    const sessionIdResource = sessionResource.addResource('{sessionId}');
    sessionIdResource.addMethod('GET', lambdaIntegration);

    // CloudWatch Dashboard
    const dashboard = new cdk.aws_cloudwatch.Dashboard(this, 'BedrockAgentDashboard', {
      dashboardName: 'TravelAgentBedrockMetrics'
    });

    dashboard.addWidgets(
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Lambda Invocations',
        left: [bedrockAgentFunction.metricInvocations()]
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Lambda Duration',
        left: [bedrockAgentFunction.metricDuration()]
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Lambda Errors',
        left: [bedrockAgentFunction.metricErrors()]
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [
          api.metricCount(),
          api.metricClientError(),
          api.metricServerError()
        ]
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'BedrockAgentApiUrl'
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: bedrockAgentFunction.functionName,
      description: 'Lambda function name'
    });

    new cdk.CfnOutput(this, 'UserPreferencesTableName', {
      value: userPreferencesTable.tableName,
      description: 'DynamoDB user preferences table'
    });

    new cdk.CfnOutput(this, 'SessionTableName', {
      value: sessionTable.tableName,
      description: 'DynamoDB session table'
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=TravelAgentBedrockMetrics`,
      description: 'CloudWatch Dashboard URL'
    });

    // Usage instructions
    new cdk.CfnOutput(this, 'TestCommand', {
      value: `curl -X POST ${api.url}bedrock-agent/chat -H "Content-Type: application/json" -d '{"message":"Plan a trip to Paris","userId":"test_user"}'`,
      description: 'Test command'
    });
  }
}

// Lambda handler adapter
export class BedrockAgentHandler {
  /**
   * Lambda handler function
   */
  static async handler(event: any, context: any) {
    const BedrockAgentCore = require('./services/BedrockAgentCore');
    const agent = new BedrockAgentCore();

    // Parse request
    const path = event.path || event.resource;
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    console.log('Lambda invoked:', { path, method, body });

    try {
      let response;

      // Route to appropriate handler
      if (path.includes('/health')) {
        response = {
          success: true,
          service: 'Bedrock Agent Core',
          status: 'operational',
          capabilities: {
            reasoning: true,
            autonomous: true,
            toolCalling: true,
            multiTurn: true
          },
          tools: agent.tools.length,
          models: {
            reasoning: agent.reasoningModel,
            fast: agent.fastModel
          },
          timestamp: new Date().toISOString()
        };
      } 
      else if (path.includes('/process')) {
        response = await agent.processRequest(body);
      }
      else if (path.includes('/chat')) {
        const session = agent.getOrCreateSession(
          body.sessionId || `session_${Date.now()}`,
          body.userId || 'anonymous'
        );
        response = await agent.processRequest({
          ...body,
          sessionId: session.sessionId,
          conversationHistory: session.history
        });
      }
      else if (path.includes('/plan-trip')) {
        const message = `Plan a complete ${body.duration}-day trip to ${body.destination} for ${body.travelers} ${body.travelers === 1 ? 'person' : 'people'} with a ${body.budget || 'moderate'} budget.`;
        response = await agent.processRequest({
          message,
          userId: body.userId || 'anonymous',
          sessionId: `trip_${Date.now()}`,
          maxIterations: 15
        });
      }
      else if (path.includes('/recommend')) {
        const message = `Recommend ${body.type} based on preferences: ${JSON.stringify(body.preferences)}`;
        response = await agent.processRequest({
          message,
          userId: body.userId || 'anonymous',
          sessionId: `recommend_${Date.now()}`,
          maxIterations: 8
        });
      }
      else if (path.includes('/tools') && !path.includes('{toolName}')) {
        response = {
          success: true,
          tools: agent.tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          })),
          totalTools: agent.tools.length
        };
      }
      else {
        response = {
          success: false,
          error: 'Endpoint not found'
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(response)
      };

    } catch (error: any) {
      console.error('Handler error:', error);
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Agent processing failed',
          message: error.message
        })
      };
    }
  }
}
