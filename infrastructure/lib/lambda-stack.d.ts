import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
export interface LambdaStackProps extends cdk.StackProps {
    environment: string;
    usersTableName: string;
    tripsTableName: string;
    bookingsTableName: string;
    s3BucketName: string;
}
export declare class LambdaStack extends cdk.Stack {
    readonly api: apigateway.RestApi;
    readonly planTripFunction: lambda.Function;
    readonly getTripFunction: lambda.Function;
    readonly listTripsFunction: lambda.Function;
    readonly createBookingFunction: lambda.Function;
    readonly getTripBookingsFunction: lambda.Function;
    readonly getUserBookingsFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: LambdaStackProps);
}
