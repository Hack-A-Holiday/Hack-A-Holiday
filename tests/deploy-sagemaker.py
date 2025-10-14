#!/usr/bin/env python3
"""
SageMaker Model Deployment Script for Travel Assistant
This script deploys a Hugging Face model optimized for travel conversations
"""

import boto3
import sagemaker
from sagemaker.huggingface import HuggingFaceModel
from sagemaker.serverless import ServerlessInferenceConfig
import json
import time

def deploy_travel_model():
    """Deploy a travel-optimized conversational model to SageMaker"""
    
    print("🚀 Starting SageMaker model deployment for Travel Assistant...")
    
    # Initialize SageMaker session
    try:
        sess = sagemaker.Session()
        role = sagemaker.get_execution_role()
        print(f"✅ Using SageMaker execution role: {role}")
    except Exception as e:
        print(f"❌ Error getting SageMaker role: {e}")
        print("💡 Make sure you're running this from a SageMaker environment or set the role manually")
        return None
    
    # Define the Hugging Face model optimized for travel conversations
    huggingface_model = HuggingFaceModel(
        transformers_version="4.28",
        pytorch_version="2.0",
        py_version="py310",
        role=role,
        env={
            # Use a model optimized for conversational AI
            'HF_MODEL_ID': 'microsoft/DialoGPT-large',
            'HF_TASK': 'text-generation',
            'MAX_LENGTH': '1000',
            'TEMPERATURE': '0.7',
            'TOP_P': '0.9',
            'DO_SAMPLE': 'true',
            'REPETITION_PENALTY': '1.1',
            # Travel-specific configuration
            'TRAVEL_CONTEXT': 'true',
            'SYSTEM_PROMPT': 'You are an expert AI travel assistant. Help users plan trips, provide travel advice, and answer travel-related questions with enthusiasm and detailed information.'
        }
    )
    
    # Configure serverless inference (cost-effective for variable workloads)
    serverless_config = ServerlessInferenceConfig(
        memory_size_in_mb=4096,  # Sufficient for DialoGPT-large
        max_concurrency=10,      # Adjust based on expected traffic
    )
    
    try:
        print("📦 Deploying model to SageMaker serverless endpoint...")
        print("⏳ This may take 5-10 minutes...")
        
        predictor = huggingface_model.deploy(
            endpoint_name='travel-assistant-endpoint',
            serverless_inference_config=serverless_config,
            wait=True,
            tags=[
                {'Key': 'Project', 'Value': 'TravelCompanion'},
                {'Key': 'Environment', 'Value': 'Production'},
                {'Key': 'Model', 'Value': 'DialoGPT-Travel'}
            ]
        )
        
        print(f"✅ Model deployed successfully!")
        print(f"🔗 Endpoint name: {predictor.endpoint_name}")
        
        # Test the deployed model
        test_model(predictor)
        
        return predictor.endpoint_name
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        return None

def test_model(predictor):
    """Test the deployed model with travel-related queries"""
    
    print("\n🧪 Testing deployed model...")
    
    test_queries = [
        "Plan a 3-day itinerary for Paris",
        "What are the best travel tips for Japan?",
        "Recommend activities for a family vacation in Orlando"
    ]
    
    for i, query in enumerate(test_queries, 1):
        try:
            print(f"\n🔍 Test {i}: {query}")
            
            response = predictor.predict({
                "inputs": f"You are a helpful travel assistant. {query}",
                "parameters": {
                    "max_new_tokens": 200,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "do_sample": True
                }
            })
            
            generated_text = response[0].get('generated_text', 'No response')
            print(f"✅ Response: {generated_text[:200]}...")
            
        except Exception as e:
            print(f"❌ Test {i} failed: {e}")

def check_endpoint_status(endpoint_name):
    """Check the status of a SageMaker endpoint"""
    
    client = boto3.client('sagemaker')
    
    try:
        response = client.describe_endpoint(EndpointName=endpoint_name)
        status = response['EndpointStatus']
        print(f"📊 Endpoint '{endpoint_name}' status: {status}")
        
        if status == 'InService':
            print("✅ Endpoint is ready for inference!")
        elif status in ['Creating', 'Updating']:
            print("⏳ Endpoint is being deployed...")
        else:
            print(f"⚠️ Endpoint status: {status}")
            
        return status
        
    except client.exceptions.ClientError as e:
        if 'ValidationException' in str(e):
            print(f"❌ Endpoint '{endpoint_name}' not found")
        else:
            print(f"❌ Error checking endpoint: {e}")
        return None

def cleanup_endpoint(endpoint_name):
    """Delete a SageMaker endpoint (to save costs)"""
    
    client = boto3.client('sagemaker')
    
    try:
        print(f"🗑️ Deleting endpoint: {endpoint_name}")
        client.delete_endpoint(EndpointName=endpoint_name)
        print("✅ Endpoint deletion initiated")
        
        # Also delete the endpoint configuration
        try:
            client.delete_endpoint_config(EndpointConfigName=endpoint_name)
            print("✅ Endpoint configuration deleted")
        except:
            pass
            
    except Exception as e:
        print(f"❌ Error deleting endpoint: {e}")

def main():
    """Main deployment function"""
    
    import argparse
    
    parser = argparse.ArgumentParser(description='Deploy or manage SageMaker travel assistant model')
    parser.add_argument('--action', choices=['deploy', 'status', 'test', 'cleanup'], 
                       default='deploy', help='Action to perform')
    parser.add_argument('--endpoint', default='travel-assistant-endpoint', 
                       help='Endpoint name')
    
    args = parser.parse_args()
    
    if args.action == 'deploy':
        endpoint_name = deploy_travel_model()
        if endpoint_name:
            print(f"\n🎉 Deployment complete!")
            print(f"📝 Update your .env file with: SAGEMAKER_ENDPOINT_NAME={endpoint_name}")
            
    elif args.action == 'status':
        check_endpoint_status(args.endpoint)
        
    elif args.action == 'test':
        # Create a predictor for testing
        predictor = sagemaker.predictor.Predictor(
            endpoint_name=args.endpoint,
            sagemaker_session=sagemaker.Session()
        )
        test_model(predictor)
        
    elif args.action == 'cleanup':
        cleanup_endpoint(args.endpoint)

if __name__ == "__main__":
    main()