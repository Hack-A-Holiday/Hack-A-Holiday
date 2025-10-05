import * as cdk from 'aws-cdk-lib';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface SageMakerStackProps extends cdk.StackProps {
  environment: string;
}

export class SageMakerStack extends cdk.Stack {
  public readonly endpoint: sagemaker.CfnEndpoint;
  public readonly endpointName: string;

  constructor(scope: Construct, id: string, props: SageMakerStackProps) {
    super(scope, id, props);

    // Create IAM role for SageMaker
    const sagemakerRole = new iam.Role(this, 'SageMakerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    // Hugging Face container image (for text generation)
    // This uses the AWS Deep Learning Container for Hugging Face
    const containerImage = '763104351884.dkr.ecr.' + this.region + 
      '.amazonaws.com/huggingface-pytorch-inference:2.0.0-transformers4.28.1-gpu-py310-cu118-ubuntu20.04';

    // Create SageMaker Model
    const model = new sagemaker.CfnModel(this, 'TravelAssistantModel', {
      modelName: `travel-assistant-model-${props.environment}`,
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: containerImage,
        environment: {
          // Use Hugging Face model (you can change this to your custom model)
          HF_MODEL_ID: 'meta-llama/Llama-2-7b-chat-hf', // Or 'mistralai/Mistral-7B-Instruct-v0.1'
          HF_TASK: 'text-generation',
          MAX_INPUT_LENGTH: '2048',
          MAX_TOTAL_TOKENS: '4096',
          // If you have a custom model in S3, uncomment and set:
          // MODEL_DATA: 's3://your-bucket/model.tar.gz',
        },
      },
    });

    // Create Endpoint Configuration
    const endpointConfig = new sagemaker.CfnEndpointConfig(
      this,
      'TravelAssistantEndpointConfig',
      {
        endpointConfigName: `travel-assistant-config-${props.environment}`,
        productionVariants: [
          {
            modelName: model.attrModelName,
            variantName: 'AllTraffic',
            initialInstanceCount: 1,
            // Choose instance type based on budget:
            // - ml.m5.large: CPU, cheaper (~$0.115/hr)
            // - ml.g4dn.xlarge: GPU, faster (~$0.736/hr)
            instanceType: 'ml.m5.large', // Change to ml.g4dn.xlarge for GPU
            initialVariantWeight: 1.0,
          },
        ],
        // Optional: Enable data capture for monitoring
        // dataCaptureConfig: {
        //   enableCapture: true,
        //   initialSamplingPercentage: 100,
        //   destinationS3Uri: 's3://your-bucket/sagemaker-capture',
        //   captureOptions: [
        //     { captureMode: 'Input' },
        //     { captureMode: 'Output' },
        //   ],
        // },
      }
    );
    endpointConfig.addDependency(model);

    // Create Endpoint
    this.endpoint = new sagemaker.CfnEndpoint(this, 'TravelAssistantEndpoint', {
      endpointName: `travel-assistant-endpoint-${props.environment}`,
      endpointConfigName: endpointConfig.attrEndpointConfigName,
      tags: [
        { key: 'Purpose', value: 'AI-Travel-Assistant' },
        { key: 'Environment', value: props.environment },
      ],
    });
    this.endpoint.addDependency(endpointConfig);

    this.endpointName = this.endpoint.endpointName!;

    // Outputs
    new cdk.CfnOutput(this, 'EndpointName', {
      value: this.endpointName,
      description: 'SageMaker Endpoint Name for AI Travel Assistant',
      exportName: `${props.environment}-sagemaker-endpoint-name`,
    });

    new cdk.CfnOutput(this, 'EndpointArn', {
      value: this.endpoint.attrEndpointArn,
      description: 'SageMaker Endpoint ARN',
    });

    new cdk.CfnOutput(this, 'ModelName', {
      value: model.attrModelName,
      description: 'SageMaker Model Name',
    });

    // Add tags
    cdk.Tags.of(this).add('Component', 'SageMaker');
    cdk.Tags.of(this).add('Purpose', 'AI-Travel-Assistant');
  }
}
