# Tests & Scripts Directory

This directory contains all test files, deployment scripts, and utility scripts for the Hack-A-Holiday project.

## 📁 Contents

### Test Scripts
- `test-*.js` - JavaScript test files
- `test-*.ps1` - PowerShell test scripts
- `test-*.sh` - Shell test scripts

### Deployment Scripts
- `deploy.ps1` / `deploy.sh` - Main deployment scripts
- `deploy-simple.ps1` - Simplified deployment
- `deploy-sagemaker-model.py` - SageMaker deployment
- `deploy-sagemaker.py` - SageMaker deployment utilities

### Setup Scripts
- `setup-*.ps1` / `setup-*.sh` - Environment setup scripts
- `simple-setup.ps1` - Quick setup script
- `quick-setup-real-data.sh` - Setup with real data

### Utility Scripts
- `start-ai-agent.ps1` - Start AI agent service
- `start-frontend-with-api.sh` - Start frontend with API
- `run-tests.ps1` - Run all tests
- `fix-frontend.ps1` - Frontend fix utilities
- `verify-bedrock-setup.js` - Verify AWS Bedrock setup
- `debug-api-connection.js` - Debug API connections
- `list-models.js` - List available AI models

## 🚀 Quick Start

### Run Tests
```powershell
.\run-tests.ps1
```

### Deploy
```powershell
.\deploy.ps1
```

### Setup Environment
```powershell
.\simple-setup.ps1
```

## 📝 Notes
- All scripts assume they are run from the project root directory
- Make sure to configure `.env` files before running deployment scripts
- Test scripts may require AWS credentials and API keys to be configured
