"""
SageMaker Model Deployment Script for Travel AI Assistant

This script deploys a Hugging Face conversational model to Amazon SageMaker.
The model will be used to power the AI Travel Assistant chatbot.

Requirements:
- boto3
- sagemaker
- AWS credentials configured

Usage:
    python deploy-sagemaker-model.py [--instance-type ml.t2.medium] [--endpoint-name travel-assistant-endpoint]
"""

import boto3
import sagemaker
from sagemaker.huggingface import HuggingFaceModel
import argparse
import json
import time

def get_execution_role():
    """Get or create SageMaker execution role"""
    try:
        iam = boto3.client('iam')
        
        role_name = 'SageMakerTravelAssistantRole'
        
        try:
            role = iam.get_role(RoleName=role_name)
            print(f"✓ Using existing role: {role['Role']['Arn']}")
            return role['Role']['Arn']
        except iam.exceptions.NoSuchEntityException:
            print(f"Creating new IAM role: {role_name}")
            
            # Trust policy for SageMaker
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "sagemaker.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Create role
            role = iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Execution role for Travel Assistant SageMaker endpoint'
            )
            
            # Attach SageMaker full access policy
            iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn='arn:aws:iam::aws:policy/AmazonSageMakerFullAccess'
            )
            
            # Wait for role to be ready
            print("Waiting for role to propagate...")
            time.sleep(10)
            
            print(f"✓ Created role: {role['Role']['Arn']}")
            return role['Role']['Arn']
            
    except Exception as e:
        print(f"Error with IAM role: {e}")
        print("\nPlease manually create a SageMaker execution role with:")
        print("1. Trust policy for sagemaker.amazonaws.com")
        print("2. AmazonSageMakerFullAccess policy attached")
        raise

def deploy_model(instance_type='ml.t2.medium', endpoint_name='travel-assistant-endpoint'):
    """
    Deploy Hugging Face model to SageMaker
    
    Args:
        instance_type: SageMaker instance type (e.g., ml.t2.medium, ml.g4dn.xlarge)
        endpoint_name: Name for the SageMaker endpoint
    """
    
    print("\n" + "="*60)
    print("🚀 SageMaker Travel AI Assistant Deployment")
    print("="*60 + "\n")
    
    # Get execution role
    try:
        role = get_execution_role()
    except Exception as e:
        print(f"❌ Failed to get execution role: {e}")
        return
    
    print(f"\n📦 Preparing Hugging Face model...")
    print(f"   Model: facebook/blenderbot-400M-distill")
    print(f"   Instance: {instance_type}")
    print(f"   Endpoint: {endpoint_name}")
    
    # Create Hugging Face Model
    try:
        huggingface_model = HuggingFaceModel(
            model_data={
                'HF_MODEL_ID': 'facebook/blenderbot-400M-distill',
                'HF_TASK': 'conversational'
            },
            transformers_version='4.26.0',
            pytorch_version='1.13.1',
            py_version='py39',
            role=role,
            env={
                'HF_MODEL_ID': 'facebook/blenderbot-400M-distill',
                'HF_TASK': 'conversational',
                'MAX_LENGTH': '512',
                'TEMPERATURE': '0.7'
            }
        )
        
        print("✓ Model configuration created")
        
    except Exception as e:
        print(f"❌ Failed to create model: {e}")
        return
    
    # Deploy model
    print(f"\n🚀 Deploying model to endpoint: {endpoint_name}")
    print("⏳ This may take 5-10 minutes...")
    
    try:
        predictor = huggingface_model.deploy(
            initial_instance_count=1,
            instance_type=instance_type,
            endpoint_name=endpoint_name
        )
        
        print("\n" + "="*60)
        print("✅ DEPLOYMENT SUCCESSFUL!")
        print("="*60)
        print(f"\n📍 Endpoint Name: {endpoint_name}")
        print(f"🔗 Region: {boto3.Session().region_name}")
        print(f"💰 Instance Type: {instance_type}")
        
        print(f"\n⚙️  Update your backend .env file:")
        print(f"   SAGEMAKER_ENDPOINT_NAME={endpoint_name}")
        print(f"   AWS_REGION={boto3.Session().region_name}")
        
        # Test the endpoint
        print("\n🧪 Testing endpoint...")
        test_payload = {
            "inputs": "Hello! I want to plan a trip to Japan."
        }
        
        response = predictor.predict(test_payload)
        print(f"✓ Test response: {response}")
        
        print("\n📊 Estimated Cost:")
        print(f"   ~${get_estimated_cost(instance_type)}/hour")
        print("\n💡 To delete endpoint later, run:")
        print(f"   aws sagemaker delete-endpoint --endpoint-name {endpoint_name}")
        
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check AWS credentials are configured")
        print("2. Verify IAM role has correct permissions")
        print("3. Ensure you have SageMaker quota for instance type")
        print("4. Check CloudWatch logs for details")

def get_estimated_cost(instance_type):
    """Get estimated hourly cost for instance type"""
    costs = {
        'ml.t2.medium': '0.065',
        'ml.t2.large': '0.130',
        'ml.m5.large': '0.134',
        'ml.g4dn.xlarge': '0.736',
        'ml.inf1.xlarge': '0.228'
    }
    return costs.get(instance_type, 'unknown')

def deploy_serverless(endpoint_name='travel-assistant-serverless'):
    """
    Deploy using SageMaker Serverless Inference (cost-effective for variable traffic)
    """
    
    print("\n" + "="*60)
    print("🚀 SageMaker Serverless Deployment")
    print("="*60 + "\n")
    
    try:
        role = get_execution_role()
    except Exception as e:
        print(f"❌ Failed to get execution role: {e}")
        return
    
    print(f"\n📦 Preparing serverless deployment...")
    
    try:
        from sagemaker.serverless import ServerlessInferenceConfig
        
        huggingface_model = HuggingFaceModel(
            model_data={
                'HF_MODEL_ID': 'facebook/blenderbot-400M-distill',
                'HF_TASK': 'conversational'
            },
            transformers_version='4.26.0',
            pytorch_version='1.13.1',
            py_version='py39',
            role=role
        )
        
        serverless_config = ServerlessInferenceConfig(
            memory_size_in_mb=4096,
            max_concurrency=10
        )
        
        print("🚀 Deploying serverless endpoint...")
        predictor = huggingface_model.deploy(
            serverless_inference_config=serverless_config,
            endpoint_name=endpoint_name
        )
        
        print("\n✅ Serverless deployment successful!")
        print(f"📍 Endpoint: {endpoint_name}")
        print("\n💰 Pricing: Pay only for inference time")
        print("   No charges when idle!")
        
    except Exception as e:
        print(f"❌ Serverless deployment failed: {e}")

def list_endpoints():
    """List all SageMaker endpoints"""
    try:
        sm = boto3.client('sagemaker')
        response = sm.list_endpoints()
        
        if not response['Endpoints']:
            print("No endpoints found")
            return
        
        print("\n📍 Existing SageMaker Endpoints:")
        print("-" * 60)
        for endpoint in response['Endpoints']:
            print(f"   Name: {endpoint['EndpointName']}")
            print(f"   Status: {endpoint['EndpointStatus']}")
            print(f"   Created: {endpoint['CreationTime']}")
            print("-" * 60)
            
    except Exception as e:
        print(f"Error listing endpoints: {e}")

def delete_endpoint(endpoint_name):
    """Delete a SageMaker endpoint"""
    try:
        sm = boto3.client('sagemaker')
        
        print(f"🗑️  Deleting endpoint: {endpoint_name}")
        sm.delete_endpoint(EndpointName=endpoint_name)
        print("✓ Endpoint deleted successfully")
        
        # Also delete endpoint config
        try:
            sm.delete_endpoint_config(EndpointConfigName=endpoint_name)
            print("✓ Endpoint config deleted")
        except:
            pass
            
    except Exception as e:
        print(f"Error deleting endpoint: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Deploy Travel AI Assistant to SageMaker')
    parser.add_argument('--instance-type', default='ml.t2.medium',
                       help='SageMaker instance type (default: ml.t2.medium)')
    parser.add_argument('--endpoint-name', default='travel-assistant-endpoint',
                       help='Endpoint name (default: travel-assistant-endpoint)')
    parser.add_argument('--serverless', action='store_true',
                       help='Deploy using serverless inference')
    parser.add_argument('--list', action='store_true',
                       help='List existing endpoints')
    parser.add_argument('--delete', type=str,
                       help='Delete endpoint by name')
    
    args = parser.parse_args()
    
    if args.list:
        list_endpoints()
    elif args.delete:
        delete_endpoint(args.delete)
    elif args.serverless:
        deploy_serverless(args.endpoint_name)
    else:
        deploy_model(args.instance_type, args.endpoint_name)
