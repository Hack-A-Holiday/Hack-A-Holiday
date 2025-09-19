import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
export interface S3StackProps extends cdk.StackProps {
    environment: string;
}
export declare class S3Stack extends cdk.Stack {
    readonly itineraryBucket: s3.Bucket;
    readonly staticWebsiteBucket: s3.Bucket;
    readonly cloudFrontDistribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props: S3StackProps);
}
