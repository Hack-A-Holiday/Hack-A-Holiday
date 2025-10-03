import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface LambdaStackProps extends cdk.StackProps {
    environment: string;
    usersTableName: string;
    tripsTableName: string;
    bookingsTableName: string;
    chatHistoryTableName: string;
    s3BucketName: string;
}
export declare class LambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: LambdaStackProps);
}
