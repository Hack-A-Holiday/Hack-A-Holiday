import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export interface DynamoDBStackProps extends cdk.StackProps {
    environment: string;
}
export declare class DynamoDBStack extends cdk.Stack {
    readonly usersTable: dynamodb.Table;
    readonly tripsTable: dynamodb.Table;
    readonly bookingsTable: dynamodb.Table;
    readonly chatHistoryTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: DynamoDBStackProps);
}
