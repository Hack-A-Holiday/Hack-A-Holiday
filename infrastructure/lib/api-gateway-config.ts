import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends cdk.StackProps {
  stageName: string;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    this.api = new apigateway.RestApi(this, 'TravelCompanionApi', {
      restApiName: 'Travel Companion API',
      description: 'API for the Autonomous Travel Companion',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['*'],
        allowCredentials: true,
        maxAge: cdk.Duration.seconds(86400)
      },
      binaryMediaTypes: ['*/*'],
      deploy: true,
      deployOptions: {
        stageName: props.stageName,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });
  }
}