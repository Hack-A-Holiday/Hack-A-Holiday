import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface ApiGatewayStackProps extends cdk.StackProps {
    stageName: string;
}
export declare class ApiGatewayStack extends cdk.Stack {
    readonly api: apigateway.RestApi;
    constructor(scope: Construct, id: string, props: ApiGatewayStackProps);
}
