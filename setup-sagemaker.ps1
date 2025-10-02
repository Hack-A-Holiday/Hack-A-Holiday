# SageMaker Integration Setup Script for Windows
# This script helps set up AWS SageMaker integration for the Travel Companion app

param(
    [Parameter(Position=0)]
    [ValidateSet("install", "deploy", "test", "status", "cleanup", "help")]
    [string]$Action = "help",
    
    [Parameter()]
    [string]$EndpointName = "travel-assistant-endpoint",
    
    [Parameter()]
    [string]$Region = "us-east-1"
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Checking prerequisites..." $InfoColor
    
    $allGood = $true
    
    # Check AWS CLI
    try {
        $awsVersion = aws --version 2>$null
        if ($awsVersion) {
            Write-ColorOutput "✅ AWS CLI installed: $($awsVersion.Split()[0])" $SuccessColor
        } else {
            throw "AWS CLI not found"
        }
    } catch {
        Write-ColorOutput "❌ AWS CLI not installed or not in PATH" $ErrorColor
        Write-ColorOutput "💡 Install from: https://aws.amazon.com/cli/" $InfoColor
        $allGood = $false
    }
    
    # Check Python
    try {
        $pythonVersion = python --version 2>$null
        if ($pythonVersion) {
            Write-ColorOutput "✅ Python installed: $pythonVersion" $SuccessColor
        } else {
            throw "Python not found"
        }
    } catch {
        Write-ColorOutput "❌ Python not installed or not in PATH" $ErrorColor
        Write-ColorOutput "💡 Install from: https://python.org" $InfoColor
        $allGood = $false
    }
    
    # Check AWS credentials
    try {
        $awsIdentity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
        if ($awsIdentity) {
            Write-ColorOutput "✅ AWS credentials configured for: $($awsIdentity.Arn)" $SuccessColor
        } else {
            throw "No AWS credentials"
        }
    } catch {
        Write-ColorOutput "❌ AWS credentials not configured" $ErrorColor
        Write-ColorOutput "💡 Run: aws configure" $InfoColor
        $allGood = $false
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-ColorOutput "✅ Node.js installed: $nodeVersion" $SuccessColor
        } else {
            throw "Node.js not found"
        }
    } catch {
        Write-ColorOutput "❌ Node.js not installed or not in PATH" $ErrorColor
        Write-ColorOutput "💡 Install from: https://nodejs.org" $InfoColor
        $allGood = $false
    }
    
    return $allGood
}

function Install-SageMakerDependencies {
    Write-ColorOutput "📦 Installing SageMaker dependencies..." $InfoColor
    
    # Install Python packages
    Write-ColorOutput "Installing Python packages..." $InfoColor
    pip install sagemaker boto3 transformers torch
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Python packages installed successfully" $SuccessColor
    } else {
        Write-ColorOutput "❌ Failed to install Python packages" $ErrorColor
        return $false
    }
    
    # Install Node.js packages
    Write-ColorOutput "Installing Node.js packages..." $InfoColor
    npm install axios
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Node.js packages installed successfully" $SuccessColor
    } else {
        Write-ColorOutput "❌ Failed to install Node.js packages" $ErrorColor
        return $false
    }
    
    return $true
}

function Deploy-SageMakerModel {
    Write-ColorOutput "🚀 Deploying SageMaker model..." $InfoColor
    
    if (-not (Test-Path "scripts\deploy-sagemaker.py")) {
        Write-ColorOutput "❌ Deploy script not found at scripts\deploy-sagemaker.py" $ErrorColor
        return $false
    }
    
    try {
        python scripts\deploy-sagemaker.py --action deploy --endpoint $EndpointName
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ SageMaker model deployed successfully" $SuccessColor
            Write-ColorOutput "📝 Update your .env file with: SAGEMAKER_ENDPOINT_NAME=$EndpointName" $InfoColor
            return $true
        } else {
            Write-ColorOutput "❌ Model deployment failed" $ErrorColor
            return $false
        }
    } catch {
        Write-ColorOutput "❌ Error during deployment: $($_.Exception.Message)" $ErrorColor
        return $false
    }
}

function Test-SageMakerIntegration {
    Write-ColorOutput "🧪 Testing SageMaker integration..." $InfoColor
    
    if (-not (Test-Path "scripts\test-sagemaker.js")) {
        Write-ColorOutput "❌ Test script not found at scripts\test-sagemaker.js" $ErrorColor
        return $false
    }
    
    try {
        node scripts\test-sagemaker.js test
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ SageMaker integration tests completed" $SuccessColor
            return $true
        } else {
            Write-ColorOutput "❌ Integration tests failed" $ErrorColor
            return $false
        }
    } catch {
        Write-ColorOutput "❌ Error during testing: $($_.Exception.Message)" $ErrorColor
        return $false
    }
}

function Get-EndpointStatus {
    Write-ColorOutput "📊 Checking endpoint status..." $InfoColor
    
    try {
        $endpointInfo = aws sagemaker describe-endpoint --endpoint-name $EndpointName --region $Region 2>$null | ConvertFrom-Json
        
        if ($endpointInfo) {
            $status = $endpointInfo.EndpointStatus
            $instanceType = $endpointInfo.ProductionVariants[0].InstanceType
            $creationTime = $endpointInfo.CreationTime
            
            Write-ColorOutput "📋 Endpoint Information:" $InfoColor
            Write-ColorOutput "  Name: $EndpointName" $SuccessColor
            Write-ColorOutput "  Status: $status" $SuccessColor
            Write-ColorOutput "  Instance Type: $instanceType" $SuccessColor
            Write-ColorOutput "  Created: $creationTime" $SuccessColor
            
            if ($status -eq "InService") {
                Write-ColorOutput "✅ Endpoint is ready for inference!" $SuccessColor
            } elseif ($status -in @("Creating", "Updating")) {
                Write-ColorOutput "⏳ Endpoint is being deployed..." $WarningColor
            } else {
                Write-ColorOutput "⚠️ Endpoint status: $status" $WarningColor
            }
        } else {
            Write-ColorOutput "❌ Endpoint '$EndpointName' not found" $ErrorColor
        }
    } catch {
        Write-ColorOutput "❌ Error checking endpoint status: $($_.Exception.Message)" $ErrorColor
    }
}

function Remove-SageMakerEndpoint {
    Write-ColorOutput "🗑️ Cleaning up SageMaker endpoint..." $InfoColor
    
    $confirmation = Read-Host "Are you sure you want to delete endpoint '$EndpointName'? (y/N)"
    
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-ColorOutput "❌ Cleanup cancelled" $WarningColor
        return
    }
    
    try {
        aws sagemaker delete-endpoint --endpoint-name $EndpointName --region $Region
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Endpoint deletion initiated" $SuccessColor
            
            # Also delete endpoint configuration
            aws sagemaker delete-endpoint-config --endpoint-config-name $EndpointName --region $Region 2>$null
            Write-ColorOutput "✅ Endpoint configuration deleted" $SuccessColor
        } else {
            Write-ColorOutput "❌ Failed to delete endpoint" $ErrorColor
        }
    } catch {
        Write-ColorOutput "❌ Error during cleanup: $($_.Exception.Message)" $ErrorColor
    }
}

function Show-Help {
    Write-ColorOutput "🎯 SageMaker Integration Setup Script" $InfoColor
    Write-ColorOutput ""
    Write-ColorOutput "Usage: .\setup-sagemaker.ps1 [action] [options]" $InfoColor
    Write-ColorOutput ""
    Write-ColorOutput "Actions:" $InfoColor
    Write-ColorOutput "  install   - Install required dependencies" $SuccessColor
    Write-ColorOutput "  deploy    - Deploy SageMaker model endpoint" $SuccessColor
    Write-ColorOutput "  test      - Test the integration" $SuccessColor
    Write-ColorOutput "  status    - Check endpoint status" $SuccessColor
    Write-ColorOutput "  cleanup   - Delete the endpoint (saves costs)" $SuccessColor
    Write-ColorOutput "  help      - Show this help message" $SuccessColor
    Write-ColorOutput ""
    Write-ColorOutput "Options:" $InfoColor
    Write-ColorOutput "  -EndpointName  SageMaker endpoint name (default: travel-assistant-endpoint)" $InfoColor
    Write-ColorOutput "  -Region        AWS region (default: us-east-1)" $InfoColor
    Write-ColorOutput ""
    Write-ColorOutput "Examples:" $InfoColor
    Write-ColorOutput "  .\setup-sagemaker.ps1 install" $SuccessColor
    Write-ColorOutput "  .\setup-sagemaker.ps1 deploy -EndpointName my-travel-bot" $SuccessColor
    Write-ColorOutput "  .\setup-sagemaker.ps1 status" $SuccessColor
    Write-ColorOutput "  .\setup-sagemaker.ps1 cleanup" $SuccessColor
}

# Main execution
Write-ColorOutput "🎯 SageMaker Integration Setup" $InfoColor
Write-ColorOutput "================================" $InfoColor

switch ($Action) {
    "install" {
        if (Test-Prerequisites) {
            Install-SageMakerDependencies
        } else {
            Write-ColorOutput "❌ Prerequisites not met. Please install required tools first." $ErrorColor
        }
    }
    
    "deploy" {
        if (Test-Prerequisites) {
            Deploy-SageMakerModel
        } else {
            Write-ColorOutput "❌ Prerequisites not met. Run with 'install' action first." $ErrorColor
        }
    }
    
    "test" {
        Test-SageMakerIntegration
    }
    
    "status" {
        Get-EndpointStatus
    }
    
    "cleanup" {
        Remove-SageMakerEndpoint
    }
    
    "help" {
        Show-Help
    }
    
    default {
        Write-ColorOutput "❌ Unknown action: $Action" $ErrorColor
        Show-Help
    }
}

Write-ColorOutput ""
Write-ColorOutput "✨ Script completed!" $InfoColor