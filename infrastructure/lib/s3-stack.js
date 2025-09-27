"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Stack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const iam = require("aws-cdk-lib/aws-iam");
class S3Stack extends cdk.Stack {
    constructor(scope, id, props) {
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
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
            comment: `OAI for Travel Companion ${environment}`,
        });
        // Grant CloudFront access to the static website bucket
        this.staticWebsiteBucket.grantRead(originAccessIdentity);
        // CloudFront distribution for frontend
        this.cloudFrontDistribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
            defaultBehavior: {
                origin: new origins.S3BucketOrigin(this.staticWebsiteBucket, {
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
        });
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
exports.S3Stack = S3Stack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzMy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMseUNBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCw4REFBOEQ7QUFDOUQsMkNBQTJDO0FBTzNDLE1BQWEsT0FBUSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBS3BDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBbUI7UUFDM0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUU5QiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQzVELFVBQVUsRUFBRSxnQ0FBZ0MsV0FBVyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDekUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFNBQVMsRUFBRSxJQUFJO1lBQ2YsY0FBYyxFQUFFO2dCQUNkO29CQUNFLEVBQUUsRUFBRSxtQkFBbUI7b0JBQ3ZCLE9BQU8sRUFBRSxJQUFJO29CQUNiLDJCQUEyQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztpQkFDbkQ7Z0JBQ0Q7b0JBQ0UsRUFBRSxFQUFFLGdCQUFnQjtvQkFDcEIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsV0FBVyxFQUFFO3dCQUNYOzRCQUNFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQjs0QkFDL0MsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzt5QkFDdkM7d0JBQ0Q7NEJBQ0UsWUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTzs0QkFDckMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzt5QkFDdkM7cUJBQ0Y7aUJBQ0Y7YUFDRjtZQUNELElBQUksRUFBRTtnQkFDSjtvQkFDRSxjQUFjLEVBQUU7d0JBQ2QsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHO3dCQUNsQixFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUc7d0JBQ2xCLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSTt3QkFDbkIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNO3FCQUN0QjtvQkFDRCxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSx5Q0FBeUM7b0JBQ2hFLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDO29CQUN4QixNQUFNLEVBQUUsSUFBSTtpQkFDYjthQUNGO1lBQ0QsYUFBYSxFQUFFLFdBQVcsS0FBSyxNQUFNO2dCQUNuQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO2dCQUMxQixDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQzlCLENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNwRSxVQUFVLEVBQUUsNkJBQTZCLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3RFLFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDMUMsZUFBZSxFQUFFLElBQUk7Z0JBQ3JCLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLHFCQUFxQixFQUFFLElBQUk7YUFDNUIsQ0FBQztZQUNGLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTTtnQkFDbkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtnQkFDMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUM5QixDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsQ0FDOUQsSUFBSSxFQUNKLHNCQUFzQixFQUN0QjtZQUNFLE9BQU8sRUFBRSw0QkFBNEIsV0FBVyxFQUFFO1NBQ25ELENBQ0YsQ0FBQztRQUVGLHVEQUF1RDtRQUN2RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFekQsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQ3ZELElBQUksRUFDSix3QkFBd0IsRUFDeEI7WUFDRSxlQUFlLEVBQUU7Z0JBQ2YsTUFBTSxFQUFFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7b0JBQ3JELG9CQUFvQjtpQkFDckIsQ0FBQztnQkFDRixvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCO2dCQUN2RSxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUI7Z0JBQ3JELFFBQVEsRUFBRSxJQUFJO2FBQ2Y7WUFDRCxtQkFBbUIsRUFBRTtnQkFDbkIsUUFBUSxFQUFFO29CQUNSLE1BQU0sRUFBRSxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRSxrREFBa0Q7b0JBQ3JHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVO29CQUNoRSxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0I7b0JBQ3BELGNBQWMsRUFBRSxVQUFVLENBQUMsY0FBYyxDQUFDLFNBQVM7aUJBQ3BEO2FBQ0Y7WUFDRCxpQkFBaUIsRUFBRSxZQUFZO1lBQy9CLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxVQUFVLEVBQUUsR0FBRztvQkFDZixrQkFBa0IsRUFBRSxHQUFHO29CQUN2QixnQkFBZ0IsRUFBRSxhQUFhO29CQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUM3QjtnQkFDRDtvQkFDRSxVQUFVLEVBQUUsR0FBRztvQkFDZixrQkFBa0IsRUFBRSxHQUFHO29CQUN2QixnQkFBZ0IsRUFBRSxhQUFhO29CQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUM3QjthQUNGO1lBQ0QsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLG9DQUFvQztZQUN2RixPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRSw0Q0FBNEMsV0FBVyxFQUFFO1NBQ25FLENBQ0YsQ0FBQztRQUVGLDZEQUE2RDtRQUM3RCxNQUFNLHFCQUFxQixHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNwRCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxjQUFjO2dCQUNkLGNBQWM7Z0JBQ2QsaUJBQWlCO2dCQUNqQixlQUFlO2FBQ2hCO1lBQ0QsU0FBUyxFQUFFO2dCQUNULElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUztnQkFDOUIsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsSUFBSTthQUN0QztTQUNGLENBQUMsQ0FBQztRQUVILCtDQUErQztRQUMvQyxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ25FLGlCQUFpQixFQUFFLG9DQUFvQyxXQUFXLEVBQUU7WUFDcEUsV0FBVyxFQUFFLGtEQUFrRDtZQUMvRCxVQUFVLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQztTQUNwQyxDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQ3RDLFVBQVUsRUFBRSxHQUFHLFdBQVcsc0JBQXNCO1NBQ2pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUztZQUNyQyxVQUFVLEVBQUUsR0FBRyxXQUFXLHFCQUFxQjtTQUNoRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVTtZQUMxQyxVQUFVLEVBQUUsR0FBRyxXQUFXLDBCQUEwQjtTQUNyRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYztZQUNqRCxVQUFVLEVBQUUsR0FBRyxXQUFXLDJCQUEyQjtTQUN0RCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsc0JBQXNCO1lBQ3pELFVBQVUsRUFBRSxHQUFHLFdBQVcsdUJBQXVCO1NBQ2xELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDM0MsS0FBSyxFQUFFLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDdEMsVUFBVSxFQUFFLEdBQUcsV0FBVyxvQkFBb0I7U0FDL0MsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNwRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDaEQsQ0FBQztDQUNGO0FBdkxELDBCQXVMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUzNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUzNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBpdGluZXJhcnlCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcHVibGljIHJlYWRvbmx5IHN0YXRpY1dlYnNpdGVCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcHVibGljIHJlYWRvbmx5IGNsb3VkRnJvbnREaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTM1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQgfSA9IHByb3BzO1xuXG4gICAgLy8gSXRpbmVyYXJ5IHN0b3JhZ2UgYnVja2V0XG4gICAgdGhpcy5pdGluZXJhcnlCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdJdGluZXJhcnlCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgdHJhdmVsLWNvbXBhbmlvbi1pdGluZXJhcmllcy0ke2Vudmlyb25tZW50fS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdUcmFuc2l0aW9uVG9JQScsXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB0cmFuc2l0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBjb3JzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW1xuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuR0VULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkRFTEVURSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgLy8gSW4gcHJvZHVjdGlvbiwgcmVzdHJpY3QgdG8geW91ciBkb21haW5cbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogWycqJ10sXG4gICAgICAgICAgZXhwb3NlZEhlYWRlcnM6IFsnRVRhZyddLFxuICAgICAgICAgIG1heEFnZTogMzAwMCxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnIFxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gU3RhdGljIHdlYnNpdGUgYnVja2V0IGZvciBmcm9udGVuZFxuICAgIHRoaXMuc3RhdGljV2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1N0YXRpY1dlYnNpdGVCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgdHJhdmVsLWNvbXBhbmlvbi1mcm9udGVuZC0ke2Vudmlyb25tZW50fS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IG5ldyBzMy5CbG9ja1B1YmxpY0FjY2Vzcyh7XG4gICAgICAgIGJsb2NrUHVibGljQWNsczogdHJ1ZSxcbiAgICAgICAgYmxvY2tQdWJsaWNQb2xpY3k6IHRydWUsXG4gICAgICAgIGlnbm9yZVB1YmxpY0FjbHM6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0UHVibGljQnVja2V0czogdHJ1ZSxcbiAgICAgIH0pLFxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyBcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIE9yaWdpbiBBY2Nlc3MgSWRlbnRpdHkgZm9yIENsb3VkRnJvbnRcbiAgICBjb25zdCBvcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KFxuICAgICAgdGhpcyxcbiAgICAgICdPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICB7XG4gICAgICAgIGNvbW1lbnQ6IGBPQUkgZm9yIFRyYXZlbCBDb21wYW5pb24gJHtlbnZpcm9ubWVudH1gLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byB0aGUgc3RhdGljIHdlYnNpdGUgYnVja2V0XG4gICAgdGhpcy5zdGF0aWNXZWJzaXRlQnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSk7XG5cbiAgICAvLyBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBmb3IgZnJvbnRlbmRcbiAgICB0aGlzLmNsb3VkRnJvbnREaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24oXG4gICAgICB0aGlzLFxuICAgICAgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb24nLFxuICAgICAge1xuICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuc3RhdGljV2Vic2l0ZUJ1Y2tldCwge1xuICAgICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICAgICAgfSksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgICAgY29tcHJlc3M6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgICAnL2FwaS8qJzoge1xuICAgICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5IdHRwT3JpZ2luKCdhcGkuZXhhbXBsZS5jb20nKSwgLy8gV2lsbCBiZSByZXBsYWNlZCB3aXRoIGFjdHVhbCBBUEkgR2F0ZXdheSBkb21haW5cbiAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LkhUVFBTX09OTFksXG4gICAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXG4gICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCwgLy8gVXNlIG9ubHkgTm9ydGggQW1lcmljYSBhbmQgRXVyb3BlXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgIGNvbW1lbnQ6IGBUcmF2ZWwgQ29tcGFuaW9uIEZyb250ZW5kIERpc3RyaWJ1dGlvbiAtICR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gSUFNIHBvbGljeSBmb3IgTGFtYmRhIGZ1bmN0aW9ucyB0byBhY2Nlc3MgaXRpbmVyYXJ5IGJ1Y2tldFxuICAgIGNvbnN0IGl0aW5lcmFyeUJ1Y2tldFBvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcbiAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICB0aGlzLml0aW5lcmFyeUJ1Y2tldC5idWNrZXRBcm4sXG4gICAgICAgIGAke3RoaXMuaXRpbmVyYXJ5QnVja2V0LmJ1Y2tldEFybn0vKmAsXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGEgbWFuYWdlZCBwb2xpY3kgZm9yIExhbWJkYSBmdW5jdGlvbnNcbiAgICBjb25zdCBsYW1iZGFTM1BvbGljeSA9IG5ldyBpYW0uTWFuYWdlZFBvbGljeSh0aGlzLCAnTGFtYmRhUzNQb2xpY3knLCB7XG4gICAgICBtYW5hZ2VkUG9saWN5TmFtZTogYFRyYXZlbENvbXBhbmlvbi1MYW1iZGEtUzMtUG9saWN5LSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUG9saWN5IGZvciBMYW1iZGEgZnVuY3Rpb25zIHRvIGFjY2VzcyBTMyBidWNrZXRzJyxcbiAgICAgIHN0YXRlbWVudHM6IFtpdGluZXJhcnlCdWNrZXRQb2xpY3ldLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IGJ1Y2tldCBuYW1lcyBhbmQgQVJOc1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdJdGluZXJhcnlCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuaXRpbmVyYXJ5QnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tSXRpbmVyYXJ5QnVja2V0TmFtZWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSXRpbmVyYXJ5QnVja2V0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuaXRpbmVyYXJ5QnVja2V0LmJ1Y2tldEFybixcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Vudmlyb25tZW50fS1JdGluZXJhcnlCdWNrZXRBcm5gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1N0YXRpY1dlYnNpdGVCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuc3RhdGljV2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZXhwb3J0TmFtZTogYCR7ZW52aXJvbm1lbnR9LVN0YXRpY1dlYnNpdGVCdWNrZXROYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jbG91ZEZyb250RGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZXhwb3J0TmFtZTogYCR7ZW52aXJvbm1lbnR9LUNsb3VkRnJvbnREaXN0cmlidXRpb25JZGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERvbWFpbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jbG91ZEZyb250RGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUsXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tQ2xvdWRGcm9udERvbWFpbk5hbWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xhbWJkYVMzUG9saWN5QXJuJywge1xuICAgICAgdmFsdWU6IGxhbWJkYVMzUG9saWN5Lm1hbmFnZWRQb2xpY3lBcm4sXG4gICAgICBleHBvcnROYW1lOiBgJHtlbnZpcm9ubWVudH0tTGFtYmRhUzNQb2xpY3lBcm5gLFxuICAgIH0pO1xuXG4gICAgLy8gVGFncyBmb3IgY29zdCB0cmFja2luZ1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdUcmF2ZWxDb21wYW5pb24nKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnQ29tcG9uZW50JywgJ1N0b3JhZ2UnKTtcbiAgfVxufSJdfQ==
