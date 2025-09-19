import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface S3StackProps extends cdk.StackProps {
  environment: string;
}

export class S3Stack extends cdk.Stack {
  public readonly itineraryBucket: s3.Bucket;
  public readonly staticWebsiteBucket: s3.Bucket;
  public readonly cloudFrontDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Itinerary storage bucket
    this.itineraryBucket = new s3.Bucket(this, 'ItineraryBucket', {
      bucketName: `travel-companion-itineraries-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'], // In production, restrict to your domain
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Static website bucket for frontend
    this.staticWebsiteBucket = new s3.Bucket(this, 'StaticWebsiteBucket', {
      bucketName: `travel-companion-frontend-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {
        comment: `OAI for Travel Companion ${environment}`,
      }
    );

    // Grant CloudFront access to the static website bucket
    this.staticWebsiteBucket.grantRead(originAccessIdentity);

    // CloudFront distribution for frontend
    this.cloudFrontDistribution = new cloudfront.Distribution(
      this,
      'CloudFrontDistribution',
      {
        defaultBehavior: {
          origin: new origins.S3Origin(this.staticWebsiteBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        additionalBehaviors: {
          '/api/*': {
            origin: new origins.HttpOrigin('api.example.com'), // Will be replaced with actual API Gateway domain
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          },
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
        enabled: true,
        comment: `Travel Companion Frontend Distribution - ${environment}`,
      }
    );

    // IAM policy for Lambda functions to access itinerary bucket
    const itineraryBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      resources: [
        this.itineraryBucket.bucketArn,
        `${this.itineraryBucket.bucketArn}/*`,
      ],
    });

    // Create a managed policy for Lambda functions
    const lambdaS3Policy = new iam.ManagedPolicy(this, 'LambdaS3Policy', {
      managedPolicyName: `TravelCompanion-Lambda-S3-Policy-${environment}`,
      description: 'Policy for Lambda functions to access S3 buckets',
      statements: [itineraryBucketPolicy],
    });

    // Output bucket names and ARNs
    new cdk.CfnOutput(this, 'ItineraryBucketName', {
      value: this.itineraryBucket.bucketName,
      exportName: `${environment}-ItineraryBucketName`,
    });

    new cdk.CfnOutput(this, 'ItineraryBucketArn', {
      value: this.itineraryBucket.bucketArn,
      exportName: `${environment}-ItineraryBucketArn`,
    });

    new cdk.CfnOutput(this, 'StaticWebsiteBucketName', {
      value: this.staticWebsiteBucket.bucketName,
      exportName: `${environment}-StaticWebsiteBucketName`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.cloudFrontDistribution.distributionId,
      exportName: `${environment}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.cloudFrontDistribution.distributionDomainName,
      exportName: `${environment}-CloudFrontDomainName`,
    });

    new cdk.CfnOutput(this, 'LambdaS3PolicyArn', {
      value: lambdaS3Policy.managedPolicyArn,
      exportName: `${environment}-LambdaS3PolicyArn`,
    });

    // Tags for cost tracking
    cdk.Tags.of(this).add('Project', 'TravelCompanion');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Component', 'Storage');
  }
}